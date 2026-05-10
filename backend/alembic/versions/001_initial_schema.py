"""initial schema

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-05-10 00:00:00
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "music",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("artist", sa.String(), nullable=True),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("duration", sa.Float(), nullable=True),
        sa.Column("mime_type", sa.String(), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "photo",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("thumbnail_path", sa.String(), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("taken_at", sa.DateTime(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False),
        sa.Column("mime_type", sa.String(), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "playlist",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "tag",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tag_name", "tag", ["name"], unique=True)
    op.create_table(
        "album",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("cover_photo_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["cover_photo_id"], ["photo.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "phototag",
        sa.Column("photo_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["photo_id"], ["photo.id"]),
        sa.ForeignKeyConstraint(["tag_id"], ["tag.id"]),
        sa.PrimaryKeyConstraint("photo_id", "tag_id"),
    )
    op.create_table(
        "playlistmusic",
        sa.Column("playlist_id", sa.Integer(), nullable=False),
        sa.Column("music_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["music_id"], ["music.id"]),
        sa.ForeignKeyConstraint(["playlist_id"], ["playlist.id"]),
        sa.PrimaryKeyConstraint("playlist_id", "music_id"),
    )
    op.create_table(
        "albumplaylist",
        sa.Column("album_id", sa.Integer(), nullable=False),
        sa.Column("playlist_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["album_id"], ["album.id"]),
        sa.ForeignKeyConstraint(["playlist_id"], ["playlist.id"]),
        sa.PrimaryKeyConstraint("album_id"),
    )
    op.create_table(
        "photoalbum",
        sa.Column("photo_id", sa.Integer(), nullable=False),
        sa.Column("album_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["album_id"], ["album.id"]),
        sa.ForeignKeyConstraint(["photo_id"], ["photo.id"]),
        sa.PrimaryKeyConstraint("photo_id", "album_id"),
    )


def downgrade() -> None:
    op.drop_table("photoalbum")
    op.drop_table("albumplaylist")
    op.drop_table("playlistmusic")
    op.drop_table("phototag")
    op.drop_table("album")
    op.drop_index("ix_tag_name", table_name="tag")
    op.drop_table("tag")
    op.drop_table("playlist")
    op.drop_table("photo")
    op.drop_table("music")
