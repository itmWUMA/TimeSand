from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import get_session
from app.models.music import Music
from app.models.photo import Photo

router = APIRouter(prefix="/api/settings", tags=["settings"])


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


@router.get("/storage", response_model=StorageInfoResponse)
def get_storage_info(session: Session = Depends(get_session)) -> StorageInfoResponse:
    photo_count = session.exec(select(func.count()).select_from(Photo)).one()
    music_count = session.exec(select(func.count()).select_from(Music)).one()

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
