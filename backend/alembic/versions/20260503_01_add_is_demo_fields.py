"""add is_demo fields to photo and music

Revision ID: 20260503_01
Revises:
Create Date: 2026-05-03 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260503_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "photo",
        sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "music",
        sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("music", "is_demo")
    op.drop_column("photo", "is_demo")
