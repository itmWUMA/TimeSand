from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Session, select

from app.core.auth import get_current_active_user
from app.core.config import settings
from app.core.database import get_session
from app.models.music import Music
from app.models.photo import Photo
from app.models.user import User, UserSetting

router = APIRouter(prefix="/api/settings", tags=["settings"])


class UserSettingResponse(BaseModel):
    language: str
    theme: str
    draw_weight_mode: str
    draw_date_range_days: int
    draw_default_album_id: int | None
    slideshow_interval_seconds: int
    slideshow_ken_burns: bool
    slideshow_shuffle: bool
    music_volume: float
    music_auto_play: bool


class UpdateUserSettingRequest(BaseModel):
    language: str | None = None
    theme: str | None = None
    draw_weight_mode: str | None = None
    draw_date_range_days: int | None = None
    draw_default_album_id: int | None = None
    slideshow_interval_seconds: int | None = None
    slideshow_ken_burns: bool | None = None
    slideshow_shuffle: bool | None = None
    music_volume: float | None = None
    music_auto_play: bool | None = None


class StorageInfoResponse(BaseModel):
    photo_count: int
    music_count: int
    photo_storage_bytes: int
    music_storage_bytes: int
    total_storage_bytes: int
    thumbnail_count: int


def count_files(directory: Path) -> int:
    if not directory.exists():
        return 0

    return sum(1 for path in directory.rglob("*") if path.is_file())


def sum_file_sizes(directory: Path) -> int:
    if not directory.exists():
        return 0

    return sum(path.stat().st_size for path in directory.rglob("*") if path.is_file())


@router.get("", response_model=UserSettingResponse)
def get_user_settings(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> UserSettingResponse:
    user_setting = session.get(UserSetting, current_user.id)
    if user_setting is None:
        raise HTTPException(status_code=404, detail="User settings not found")

    return UserSettingResponse(
        language=user_setting.language,
        theme=user_setting.theme,
        draw_weight_mode=user_setting.draw_weight_mode,
        draw_date_range_days=user_setting.draw_date_range_days,
        draw_default_album_id=user_setting.draw_default_album_id,
        slideshow_interval_seconds=user_setting.slideshow_interval_seconds,
        slideshow_ken_burns=user_setting.slideshow_ken_burns,
        slideshow_shuffle=user_setting.slideshow_shuffle,
        music_volume=user_setting.music_volume,
        music_auto_play=user_setting.music_auto_play,
    )


@router.put("", response_model=UserSettingResponse)
def update_user_settings(
    request: UpdateUserSettingRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> UserSettingResponse:
    user_setting = session.get(UserSetting, current_user.id)
    if user_setting is None:
        raise HTTPException(status_code=404, detail="User settings not found")

    for field, value in request.model_dump(exclude_unset=True).items():
        setattr(user_setting, field, value)

    session.add(user_setting)
    session.commit()
    session.refresh(user_setting)

    return UserSettingResponse(
        language=user_setting.language,
        theme=user_setting.theme,
        draw_weight_mode=user_setting.draw_weight_mode,
        draw_date_range_days=user_setting.draw_date_range_days,
        draw_default_album_id=user_setting.draw_default_album_id,
        slideshow_interval_seconds=user_setting.slideshow_interval_seconds,
        slideshow_ken_burns=user_setting.slideshow_ken_burns,
        slideshow_shuffle=user_setting.slideshow_shuffle,
        music_volume=user_setting.music_volume,
        music_auto_play=user_setting.music_auto_play,
    )


@router.get("/storage", response_model=StorageInfoResponse)
def get_storage_info(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> StorageInfoResponse:
    photo_count = session.exec(
        select(func.count()).select_from(Photo).where(Photo.owner_id == current_user.id)
    ).one()
    music_count = session.exec(
        select(func.count()).select_from(Music).where(Music.owner_id == current_user.id)
    ).one()

    photos_originals_dir = settings.data_dir / "photos" / "originals"
    photos_thumbnails_dir = settings.data_dir / "photos" / "thumbnails"
    music_files_dir = settings.data_dir / "music" / "files"

    photo_storage_bytes = sum_file_sizes(photos_originals_dir)
    music_storage_bytes = sum_file_sizes(music_files_dir)
    thumbnail_count = count_files(photos_thumbnails_dir)

    return StorageInfoResponse(
        photo_count=photo_count,
        music_count=music_count,
        photo_storage_bytes=photo_storage_bytes,
        music_storage_bytes=music_storage_bytes,
        total_storage_bytes=photo_storage_bytes + music_storage_bytes,
        thumbnail_count=thumbnail_count,
    )
