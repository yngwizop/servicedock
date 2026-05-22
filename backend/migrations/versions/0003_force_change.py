"""Add force_change column to admin_auth and local_users

Revision ID: 0003_force_change
Revises: 0002_settings_updated_at

Existing installs that pre-date the force-change feature get the column
added with DEFAULT FALSE, so upgrading users are not unexpectedly forced
into a password change. Fresh installs receive the seeded admin row from
db/init.sql with force_change=TRUE for the initial 'admin / changeme'
flow — that row already exists by the time this migration runs.
"""

from alembic import op


revision = "0003_force_change"
down_revision = "0002_settings_updated_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'admin_auth'
            ) THEN
                ALTER TABLE admin_auth
                    ADD COLUMN IF NOT EXISTS force_change BOOLEAN NOT NULL DEFAULT FALSE;
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'local_users'
            ) THEN
                ALTER TABLE local_users
                    ADD COLUMN IF NOT EXISTS force_change BOOLEAN NOT NULL DEFAULT FALSE;
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE local_users DROP COLUMN IF EXISTS force_change;
        """
    )
    op.execute(
        """
        ALTER TABLE admin_auth DROP COLUMN IF EXISTS force_change;
        """
    )
