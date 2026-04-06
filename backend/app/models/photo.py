from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Photo(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    filename: str
    file_path: str
    thumbnail_path: str
    file_size: int
    width: int
    height: int
    taken_at: datetime | None = None
    latitude: float | None = None
    longitude: float | None = None
    uploaded_at: datetime = Field(default_factory=utc_now)
    mime_type: str
