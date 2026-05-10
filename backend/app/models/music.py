from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Music(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str
    artist: str | None = None
    filename: str
    file_path: str
    file_size: int
    duration: float | None = None
    mime_type: str
    uploaded_at: datetime = Field(default_factory=utc_now, index=True)
    is_demo: bool = False


class Playlist(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    is_default: bool = False
    created_at: datetime = Field(default_factory=utc_now)


class PlaylistMusic(SQLModel, table=True):
    playlist_id: int = Field(foreign_key="playlist.id", primary_key=True, index=True)
    music_id: int = Field(foreign_key="music.id", primary_key=True, index=True)
    position: int


class AlbumPlaylist(SQLModel, table=True):
    album_id: int = Field(foreign_key="album.id", primary_key=True, index=True)
    playlist_id: int = Field(foreign_key="playlist.id", index=True)
