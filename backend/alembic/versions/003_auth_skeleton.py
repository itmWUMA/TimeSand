"""add auth skeleton tables

Revision ID: 003_auth_skeleton
Revises: 002_add_indexes
Create Date: 2026-06-03 00:00:00
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003_auth_skeleton"
down_revision: str | None = "002_add_indexes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_username", "user", ["username"], unique=True)
    op.create_index("ix_user_role", "user", ["role"], unique=False)
    op.create_index("ix_user_is_active", "user", ["is_active"], unique=False)

    op.create_table(
        "usersetting",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("language", sa.String(), nullable=False),
        sa.Column("theme", sa.String(), nullable=False),
        sa.Column("draw_weight_mode", sa.String(), nullable=False),
        sa.Column("draw_date_range_days", sa.Integer(), nullable=False),
        sa.Column("draw_default_album_id", sa.Integer(), nullable=True),
        sa.Column("slideshow_interval_seconds", sa.Integer(), nullable=False),
        sa.Column("slideshow_ken_burns", sa.Boolean(), nullable=False),
        sa.Column("slideshow_shuffle", sa.Boolean(), nullable=False),
        sa.Column("music_volume", sa.Float(), nullable=False),
        sa.Column("music_auto_play", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["draw_default_album_id"], ["album.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("user_id"),
    )

    op.create_table(
        "session",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_session_token_hash", "session", ["token_hash"], unique=True)
    op.create_index("ix_session_user_id", "session", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_session_user_id", table_name="session")
    op.drop_index("ix_session_token_hash", table_name="session")
    op.drop_table("session")
    op.drop_table("usersetting")
    op.drop_index("ix_user_is_active", table_name="user")
    op.drop_index("ix_user_role", table_name="user")
    op.drop_index("ix_user_username", table_name="user")
    op.drop_table("user")
