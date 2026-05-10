"""Add updated_at for dashboards and proxmox_config

Revision ID: 0002_settings_updated_at
Revises: 0001_baseline
"""

from alembic import op

revision = "0002_settings_updated_at"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE dashboards
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
        """
    )
    op.execute(
        """
        UPDATE dashboards
        SET updated_at = COALESCE(updated_at, created_at, NOW());
        """
    )
    op.execute(
        """
        ALTER TABLE proxmox_config
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
        """
    )
    op.execute(
        """
        UPDATE proxmox_config
        SET updated_at = COALESCE(updated_at, token_created_at, NOW());
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE proxmox_config DROP COLUMN IF EXISTS updated_at;")
    op.execute("ALTER TABLE dashboards DROP COLUMN IF EXISTS updated_at;")
