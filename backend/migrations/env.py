import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Alembic Config object (reads alembic.ini)
config = context.config

if config.config_file_name is not None:
  fileConfig(config.config_file_name)

# We don't use ORM metadata yet (raw SQL project).
target_metadata = None


def _get_database_url() -> str:
  url = os.getenv("DATABASE_URL", "").strip()
  if not url:
    raise RuntimeError("DATABASE_URL is required for migrations")
  return url


def run_migrations_offline() -> None:
  context.configure(
    url=_get_database_url(),
    literal_binds=True,
    dialect_opts={"paramstyle": "named"},
  )

  with context.begin_transaction():
    context.run_migrations()


def run_migrations_online() -> None:
  ini_section = config.get_section(config.config_ini_section) or {}
  ini_section["sqlalchemy.url"] = _get_database_url()

  connectable = engine_from_config(
    ini_section,
    prefix="sqlalchemy.",
    poolclass=pool.NullPool,
  )

  with connectable.connect() as connection:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
      context.run_migrations()


if context.is_offline_mode():
  run_migrations_offline()
else:
  run_migrations_online()

