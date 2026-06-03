"""make owner_id not null

Revision ID: 005_owner_id_not_null
Revises: 004_add_owner_id
Create Date: 2026-06-03 00:00:00
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op

from app.core.config import settings
from app.core.security import hash_password

# revision identifiers, used by Alembic.
revision: str = "005_owner_id_not_null"
down_revision: str | None = "004_add_owner_id"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None
OWNER_TABLES = ("photo", "album", "music", "playlist", "tag")


def _table_exists(table_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def _has_null_owner_rows(connection: sa.Connection) -> bool:
    for table_name in OWNER_TABLES:
        if not _column_exists(table_name, "owner_id"):
            continue
        count = connection.execute(
            sa.text(f"SELECT COUNT(*) FROM {table_name} WHERE owner_id IS NULL")
        ).scalar_one()
        if count:
            return True
    return False


def _get_first_admin_id(connection: sa.Connection) -> int | None:
    if not _table_exists("user"):
        return None
    return connection.execute(
        sa.text('SELECT id FROM "user" WHERE role = :role ORDER BY id LIMIT 1'),
        {"role": "admin"},
    ).scalar_one_or_none()


def _create_initial_admin(connection: sa.Connection) -> int:
    if not settings.admin_password or len(settings.admin_password) < 8:
        raise RuntimeError(
            "Cannot backfill owner_id without an admin user. "
            "Set TIMESAND_ADMIN_PASSWORD to at least 8 characters and rerun migrations."
        )

    now = datetime.now(timezone.utc).isoformat()
    result = connection.execute(
        sa.text(
            """
            INSERT INTO "user" (username, display_name, password_hash, role, is_active, created_at)
            VALUES (:username, :display_name, :password_hash, :role, :is_active, :created_at)
            """
        ),
        {
            "username": settings.admin_username,
            "display_name": settings.admin_username,
            "password_hash": hash_password(settings.admin_password),
            "role": "admin",
            "is_active": True,
            "created_at": now,
        },
    )
    admin_id = int(result.lastrowid)
    connection.execute(
        sa.text(
            """
            INSERT INTO usersetting (
                user_id,
                language,
                theme,
                draw_weight_mode,
                draw_date_range_days,
                draw_default_album_id,
                slideshow_interval_seconds,
                slideshow_ken_burns,
                slideshow_shuffle,
                music_volume,
                music_auto_play
            )
            VALUES (
                :user_id,
                'auto',
                'dark',
                'time_weak',
                3,
                NULL,
                5,
                1,
                0,
                0.8,
                1
            )
            """
        ),
        {"user_id": admin_id},
    )
    return admin_id


def _backfill_owner_ids() -> None:
    connection = op.get_bind()
    if not _has_null_owner_rows(connection):
        return

    admin_id = _get_first_admin_id(connection)
    if admin_id is None:
        admin_id = _create_initial_admin(connection)

    for table_name in OWNER_TABLES:
        if _column_exists(table_name, "owner_id"):
            connection.execute(
                sa.text(f"UPDATE {table_name} SET owner_id = :admin_id WHERE owner_id IS NULL"),
                {"admin_id": admin_id},
            )


def _make_not_null(table_name: str) -> None:
    if not _column_exists(table_name, "owner_id"):
        return
    with op.batch_alter_table(table_name) as batch_op:
        batch_op.alter_column("owner_id", existing_type=sa.Integer(), nullable=False)


def _cleanup_alembic_tmp_tables() -> None:
    connection = op.get_bind()
    result = connection.execute(
        sa.text("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '_alembic_tmp_%'")
    )
    for row in result:
        connection.execute(sa.text(f"DROP TABLE IF EXISTS {row[0]}"))


def upgrade() -> None:
    _cleanup_alembic_tmp_tables()
    _backfill_owner_ids()
    for table in OWNER_TABLES:
        _make_not_null(table)


def downgrade() -> None:
    _cleanup_alembic_tmp_tables()
    for table in reversed(OWNER_TABLES):
        if _column_exists(table, "owner_id"):
            with op.batch_alter_table(table) as batch_op:
                batch_op.alter_column("owner_id", existing_type=sa.Integer(), nullable=True)
