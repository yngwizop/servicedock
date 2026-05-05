"""baseline

Revision ID: 0001_baseline
Revises: 
Create Date: 2026-05-05

This baseline migration intentionally does not create/alter tables.
It only establishes Alembic versioning on existing databases.
"""

from alembic import op


revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
  # No-op baseline.
  op.execute("SELECT 1;")


def downgrade() -> None:
  # No-op.
  op.execute("SELECT 1;")

