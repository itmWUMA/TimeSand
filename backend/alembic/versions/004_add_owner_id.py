"""add owner_id to existing tables

Revision ID: 004_add_owner_id
Revises: 003_auth_skeleton
Create Date: 2026-06-03 00:00:00
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
# revision identifiers, used by Alembic.
revision: str = "004_add_owner_id"
down_revision: str | None = "003_auth_skeleton"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def _add_owner_id(table_name: str) -> None:
    if _column_exists(table_name, "owner_id"):
        return
    op.add_column(table_name, sa.Column("owner_id", sa.Integer(), nullable=True))
    op.create_index(f"ix_{table_name}_owner_id", table_name, ["owner_id"], unique=False)


def upgrade() -> None:
    for table in ("photo", "album", "music", "playlist", "tag"):
        _add_owner_id(table)


def downgrade() -> None:
    for table in ("tag", "playlist", "music", "album", "photo"):
        if _column_exists(table, "owner_id"):
            op.drop_index(f"ix_{table}_owner_id", table_name=table)
            op.drop_column(table, "owner_id")
