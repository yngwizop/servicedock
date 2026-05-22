"""
Automatic Alembic migration runner invoked from backend startup.

Goal: end users only need to `docker compose pull && docker compose up -d`.
On every backend start we run `alembic upgrade head` against the database,
which is idempotent — already-applied revisions are skipped and pending ones
are applied transactionally before the API starts serving traffic.

A PostgreSQL advisory lock prevents two backend instances (or a slow
container restart followed by a fresh boot) from racing on the same DB.

If a migration fails we re-raise so the container exits with a clear log
line instead of serving traffic on a broken schema.
"""

import logging
import os
import pathlib

import psycopg2

logger = logging.getLogger("dashboard")

# Arbitrary 64-bit identifier shared by all backend instances of this app.
# pg_try_advisory_lock takes a bigint — picking a fixed namespace value
# keeps migrations serialised across processes / containers.
_MIGRATION_ADVISORY_LOCK_ID = 7341907432110001


def _acquire_advisory_lock(dsn: str):
    """Open a dedicated connection holding a Postgres advisory lock.

    The lock is released automatically when this connection is closed.
    Returns the open connection or raises if the lock cannot be obtained.
    """
    conn = psycopg2.connect(dsn)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT pg_advisory_lock(%s)", (_MIGRATION_ADVISORY_LOCK_ID,))
    cur.close()
    return conn


def _release_advisory_lock(conn) -> None:
    try:
        cur = conn.cursor()
        cur.execute("SELECT pg_advisory_unlock(%s)", (_MIGRATION_ADVISORY_LOCK_ID,))
        cur.close()
    except Exception:
        pass
    try:
        conn.close()
    except Exception:
        pass


def run_alembic_upgrade() -> None:
    """Apply pending Alembic migrations on startup.

    Safe to call on every boot — idempotent thanks to Alembic's
    `alembic_version` table and the `IF NOT EXISTS` style migrations.
    """
    db_url = os.getenv("DATABASE_URL", "").strip()
    if not db_url:
        raise RuntimeError("DATABASE_URL is required to run database migrations")

    backend_dir = pathlib.Path(__file__).resolve().parent.parent
    alembic_ini = backend_dir / "alembic.ini"
    if not alembic_ini.exists():
        raise RuntimeError(f"alembic.ini not found at {alembic_ini}")

    # Import lazily — alembic pulls in sqlalchemy which we otherwise avoid.
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(alembic_ini))
    cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    cfg.set_main_option("sqlalchemy.url", db_url)
    # Prevents alembic from reconfiguring Python logging (which would
    # silence our 'dashboard' logger after migrations finish).
    cfg.attributes["configure_logger"] = False

    logger.info("Running database migrations (alembic upgrade head)...")
    lock_conn = None
    try:
        lock_conn = _acquire_advisory_lock(db_url)
        command.upgrade(cfg, "head")
        logger.info("Database migrations completed (head reached).")
    except Exception:
        logger.error("Database migration failed — backend will not start.", exc_info=True)
        raise
    finally:
        if lock_conn is not None:
            _release_advisory_lock(lock_conn)
