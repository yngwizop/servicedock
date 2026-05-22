"""Local user accounts (multi-user without LDAP). Usernames stored lowercase."""
from __future__ import annotations

import os
import secrets
from typing import Any, Dict, List, Optional, Tuple

import config.database as database_module
from core.logging import logger
from core.security import get_password_hash


def _norm_username(username: str) -> str:
    return (username or "").strip().lower()


def ensure_local_users_schema_and_bootstrap() -> None:
    """
    Seed the initial admin user when no local user exists yet.

    The local_users / admin_auth schema is owned by Alembic
    (see backend/migrations/versions/), which runs before this function on
    startup. We keep a safety-net `CREATE TABLE IF NOT EXISTS` for setups
    that somehow boot the backend against an empty database without
    init.sql or Alembic having created the table — re-creating an existing
    table is a no-op.
    """
    pool = database_module.db_pool
    if pool is None:
        logger.warning("local_users bootstrap skipped: DB pool not ready")
        return

    db = pool.getconn()
    try:
        cur = db.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS local_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'admin'
                    CHECK (role IN ('admin', 'viewer')),
                display_name VARCHAR(255),
                enabled BOOLEAN NOT NULL DEFAULT TRUE,
                force_change BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            """
        )
        db.commit()
        cur.close()

        cur = db.cursor()
        cur.execute("SELECT COUNT(*) FROM local_users")
        (count,) = cur.fetchone()
        cur.close()

        if count == 0:
            _bootstrap_initial_admin(db)
    except Exception as e:
        logger.error(f"local_users bootstrap failed: {e}")
        db.rollback()
    finally:
        pool.putconn(db)


def _bootstrap_initial_admin(db) -> None:
    """
    Fallback: create admin user if it is missing (e.g. fresh DB without init.sql).
    Normally init.sql already seeds 'admin / changeme' with force_change=TRUE.
    Honors INITIAL_ADMIN_PASSWORD env var when set (>= 8 chars), otherwise uses 'changeme'.
    """
    cur = db.cursor()
    try:
        cur.execute("SELECT 1 FROM local_users WHERE username = 'admin' LIMIT 1")
        if cur.fetchone():
            return
    finally:
        cur.close()

    initial_pw = os.getenv("INITIAL_ADMIN_PASSWORD", "").strip()
    if initial_pw:
        if len(initial_pw) < 8:
            raise ValueError("INITIAL_ADMIN_PASSWORD must be at least 8 characters")
        plain = initial_pw
        logger.info("Bootstrapping admin user from INITIAL_ADMIN_PASSWORD environment variable")
    else:
        plain = "changeme"
        logger.warning("Bootstrapping admin user with default password 'changeme' — change after first login")

    ph = get_password_hash(plain)
    cur = db.cursor()
    try:
        cur.execute(
            """
            INSERT INTO local_users (username, password_hash, role, enabled, force_change)
            VALUES ('admin', %s, 'admin', TRUE, TRUE)
            ON CONFLICT (username) DO NOTHING
            """,
            (ph,),
        )
        cur.execute(
            """
            INSERT INTO admin_auth (id, password_hash, force_change)
            VALUES (1, %s, TRUE)
            ON CONFLICT (id) DO UPDATE SET
                password_hash = EXCLUDED.password_hash,
                force_change = TRUE,
                updated_at = NOW()
            """,
            (ph,),
        )
        db.commit()
        logger.info("Initial admin user created (force_change=TRUE)")
    finally:
        cur.close()


def count_local_users() -> int:
    pool = database_module.db_pool
    if pool is None:
        return 0
    db = pool.getconn()
    try:
        cur = db.cursor()
        cur.execute("SELECT COUNT(*) FROM local_users WHERE enabled = TRUE")
        (n,) = cur.fetchone()
        cur.close()
        return int(n or 0)
    finally:
        pool.putconn(db)


def count_all_local_users() -> int:
    pool = database_module.db_pool
    if pool is None:
        return 0
    db = pool.getconn()
    try:
        cur = db.cursor()
        cur.execute("SELECT COUNT(*) FROM local_users")
        (n,) = cur.fetchone()
        cur.close()
        return int(n or 0)
    finally:
        pool.putconn(db)


def get_sole_local_user_if_exactly_one() -> Optional[Dict[str, Any]]:
    """Wenn genau ein Eintrag in local_users existiert, diesen zurückgeben (für Passwort-only-Login)."""
    if count_all_local_users() != 1:
        return None
    pool = database_module.db_pool
    if pool is None:
        return None
    db = pool.getconn()
    try:
        cur = db.cursor()
        cur.execute(
            """
            SELECT id, username, password_hash, role, display_name, enabled, force_change,
                   created_at, updated_at
            FROM local_users LIMIT 1
            """
        )
        row = cur.fetchone()
        cur.close()
        if not row:
            return None
        return {
            "id": row[0],
            "username": row[1],
            "password_hash": row[2],
            "role": row[3],
            "display_name": row[4],
            "enabled": row[5],
            "force_change": row[6],
            "created_at": row[7],
            "updated_at": row[8],
        }
    finally:
        pool.putconn(db)


def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    u = _norm_username(username)
    if not u:
        return None
    pool = database_module.db_pool
    if pool is None:
        return None
    db = pool.getconn()
    try:
        cur = db.cursor()
        cur.execute(
            """
            SELECT id, username, password_hash, role, display_name, enabled, force_change,
                   created_at, updated_at
            FROM local_users WHERE lower(username) = %s
            """,
            (u,),
        )
        row = cur.fetchone()
        cur.close()
        if not row:
            return None
        return {
            "id": row[0],
            "username": row[1],
            "password_hash": row[2],
            "role": row[3],
            "display_name": row[4],
            "enabled": row[5],
            "force_change": row[6],
            "created_at": row[7],
            "updated_at": row[8],
        }
    finally:
        pool.putconn(db)


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    pool = database_module.db_pool
    if pool is None:
        return None
    db = pool.getconn()
    try:
        cur = db.cursor()
        cur.execute(
            """
            SELECT id, username, password_hash, role, display_name, enabled, force_change,
                   created_at, updated_at
            FROM local_users WHERE id = %s
            """,
            (user_id,),
        )
        row = cur.fetchone()
        cur.close()
        if not row:
            return None
        return {
            "id": row[0],
            "username": row[1],
            "password_hash": row[2],
            "role": row[3],
            "display_name": row[4],
            "enabled": row[5],
            "force_change": row[6],
            "created_at": row[7],
            "updated_at": row[8],
        }
    finally:
        pool.putconn(db)


def list_local_users(limit: int = 500, offset: int = 0) -> List[Dict[str, Any]]:
    pool = database_module.db_pool
    if pool is None:
        return []
    db = pool.getconn()
    try:
        cur = db.cursor()
        cur.execute(
            """
            SELECT id, username, role, display_name, enabled, force_change, created_at, updated_at
            FROM local_users ORDER BY lower(username)
            LIMIT %s OFFSET %s
            """,
            (limit, offset),
        )
        rows = cur.fetchall()
        cur.close()
        return [
            {
                "id": r[0],
                "username": r[1],
                "role": r[2],
                "display_name": r[3],
                "enabled": r[4],
                "force_change": r[5],
                "created_at": r[6].isoformat() if r[6] else None,
                "updated_at": r[7].isoformat() if r[7] else None,
            }
            for r in rows
        ]
    finally:
        pool.putconn(db)


def count_enabled_admins(exclude_user_id: Optional[int] = None) -> int:
    pool = database_module.db_pool
    if pool is None:
        return 0
    db = pool.getconn()
    try:
        cur = db.cursor()
        if exclude_user_id is not None:
            cur.execute(
                """
                SELECT COUNT(*) FROM local_users
                WHERE enabled = TRUE AND role = 'admin' AND id != %s
                """,
                (exclude_user_id,),
            )
        else:
            cur.execute(
                """
                SELECT COUNT(*) FROM local_users
                WHERE enabled = TRUE AND role = 'admin'
                """
            )
        (n,) = cur.fetchone()
        cur.close()
        return int(n or 0)
    finally:
        pool.putconn(db)


def insert_local_user(
    username: str,
    password_hash: str,
    role: str,
    display_name: Optional[str] = None,
    force_change: bool = False,
) -> int:
    u = _norm_username(username)
    pool = database_module.db_pool
    if pool is None:
        raise RuntimeError("Database not initialized")
    db = pool.getconn()
    try:
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO local_users (username, password_hash, role, display_name, enabled, force_change)
            VALUES (%s, %s, %s, %s, TRUE, %s)
            RETURNING id
            """,
            (u, password_hash, role, display_name, force_change),
        )
        new_id = cur.fetchone()[0]
        db.commit()
        cur.close()
        return int(new_id)
    finally:
        pool.putconn(db)


def update_local_user(
    user_id: int,
    *,
    role: Optional[str] = None,
    enabled: Optional[bool] = None,
    display_name: Optional[str] = None,
    password_hash: Optional[str] = None,
    force_change: Optional[bool] = None,
) -> bool:
    pool = database_module.db_pool
    if pool is None:
        raise RuntimeError("Database not initialized")
    db = pool.getconn()
    try:
        sets = []
        params: List[Any] = []
        if role is not None:
            sets.append("role = %s")
            params.append(role)
        if enabled is not None:
            sets.append("enabled = %s")
            params.append(enabled)
        if display_name is not None:
            sets.append("display_name = %s")
            params.append(display_name)
        if password_hash is not None:
            sets.append("password_hash = %s")
            params.append(password_hash)
        if force_change is not None:
            sets.append("force_change = %s")
            params.append(force_change)
        if not sets:
            return False
        sets.append("updated_at = NOW()")
        params.append(user_id)
        cur = db.cursor()
        cur.execute(
            f"UPDATE local_users SET {', '.join(sets)} WHERE id = %s",
            tuple(params),
        )
        updated = cur.rowcount > 0
        db.commit()
        cur.close()
        return updated
    finally:
        pool.putconn(db)


def delete_local_user(user_id: int) -> bool:
    pool = database_module.db_pool
    if pool is None:
        raise RuntimeError("Database not initialized")
    db = pool.getconn()
    try:
        cur = db.cursor()
        cur.execute("DELETE FROM local_users WHERE id = %s", (user_id,))
        deleted = cur.rowcount > 0
        db.commit()
        cur.close()
        return deleted
    finally:
        pool.putconn(db)


def sync_admin_auth_from_local_admin() -> None:
    """Keep legacy admin_auth row in sync with local user 'admin' (password + force_change)."""
    u = get_user_by_username("admin")
    if not u:
        return
    pool = database_module.db_pool
    if pool is None:
        return
    db = pool.getconn()
    try:
        cur = db.cursor()
        cur.execute(
            """
            UPDATE admin_auth SET password_hash = %s, force_change = %s, updated_at = NOW()
            WHERE id = 1
            """,
            (u["password_hash"], u["force_change"]),
        )
        db.commit()
        cur.close()
    finally:
        pool.putconn(db)
