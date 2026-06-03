from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Column, String
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserRole:
    ADMIN = "admin"
    MEMBER = "member"


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(sa_column=Column(String, unique=True, index=True, nullable=False))
    display_name: str
    password_hash: str
    role: str = Field(default=UserRole.MEMBER, index=True)
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=utc_now)


class UserSetting(SQLModel, table=True):
    user_id: int = Field(foreign_key="user.id", primary_key=True)
    language: str = "auto"
    theme: str = "dark"
    draw_weight_mode: str = "time_weak"
    draw_date_range_days: int = 3
    draw_default_album_id: int | None = Field(default=None, foreign_key="album.id")
    slideshow_interval_seconds: int = 5
    slideshow_ken_burns: bool = True
    slideshow_shuffle: bool = False
    music_volume: float = 0.8
    music_auto_play: bool = True


class Session(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    token_hash: str = Field(sa_column=Column(String, unique=True, index=True, nullable=False))
    user_id: int = Field(foreign_key="user.id", index=True)
    ip_address: str | None = None
    user_agent: str | None = None
    expires_at: datetime
    created_at: datetime = Field(default_factory=utc_now)
