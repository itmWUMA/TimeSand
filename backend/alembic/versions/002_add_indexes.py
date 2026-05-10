"""add performance indexes

Revision ID: 002_add_indexes
Revises: 20260503_01
Create Date: 2026-05-10 00:00:00
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002_add_indexes"
down_revision: str | None = "20260503_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index("ix_albumplaylist_album_id", "albumplaylist", ["album_id"], unique=False)
    op.create_index(
        "ix_albumplaylist_playlist_id", "albumplaylist", ["playlist_id"], unique=False
    )
    op.create_index("ix_music_uploaded_at", "music", ["uploaded_at"], unique=False)
    op.create_index("ix_photo_taken_at", "photo", ["taken_at"], unique=False)
    op.create_index("ix_photo_uploaded_at", "photo", ["uploaded_at"], unique=False)
    op.create_index("ix_photoalbum_album_id", "photoalbum", ["album_id"], unique=False)
    op.create_index("ix_photoalbum_photo_id", "photoalbum", ["photo_id"], unique=False)
    op.create_index("ix_phototag_photo_id", "phototag", ["photo_id"], unique=False)
    op.create_index("ix_phototag_tag_id", "phototag", ["tag_id"], unique=False)
    op.create_index("ix_playlistmusic_music_id", "playlistmusic", ["music_id"], unique=False)
    op.create_index(
        "ix_playlistmusic_playlist_id", "playlistmusic", ["playlist_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_playlistmusic_playlist_id", table_name="playlistmusic")
    op.drop_index("ix_playlistmusic_music_id", table_name="playlistmusic")
    op.drop_index("ix_phototag_tag_id", table_name="phototag")
    op.drop_index("ix_phototag_photo_id", table_name="phototag")
    op.drop_index("ix_photoalbum_photo_id", table_name="photoalbum")
    op.drop_index("ix_photoalbum_album_id", table_name="photoalbum")
    op.drop_index("ix_photo_uploaded_at", table_name="photo")
    op.drop_index("ix_photo_taken_at", table_name="photo")
    op.drop_index("ix_music_uploaded_at", table_name="music")
    op.drop_index("ix_albumplaylist_playlist_id", table_name="albumplaylist")
    op.drop_index("ix_albumplaylist_album_id", table_name="albumplaylist")
