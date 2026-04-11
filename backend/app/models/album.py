from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Column, String
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class PhotoAlbum(SQLModel, table=True):
    photo_id: int = Field(foreign_key="photo.id", primary_key=True)
    album_id: int = Field(foreign_key="album.id", primary_key=True)


class PhotoTag(SQLModel, table=True):
    photo_id: int = Field(foreign_key="photo.id", primary_key=True)
    tag_id: int = Field(foreign_key="tag.id", primary_key=True)


class Album(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    description: str | None = None
    cover_photo_id: int | None = Field(default=None, foreign_key="photo.id")
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class Tag(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String, unique=True, index=True, nullable=False))

