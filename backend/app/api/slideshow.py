from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Session, select

from app.core.auth import get_current_active_user
from app.core.database import get_session
from app.models.album import Album, PhotoAlbum
from app.models.photo import Photo
from app.models.user import User

router = APIRouter(prefix="/api/slideshow", tags=["slideshow"])


class ListSlideshowPhotosResponse(BaseModel):
    photos: list[Photo]


@router.get("/photos", response_model=ListSlideshowPhotosResponse)
def list_slideshow_photos(
    album_id: int | None = Query(default=None, ge=1),
    order: Literal["random", "chronological"] = Query(default="random"),
    limit: int = Query(default=50, ge=1, le=500),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> ListSlideshowPhotosResponse:
    if album_id is not None:
        album = session.get(Album, album_id)
        if album is None or album.owner_id != current_user.id:
            raise HTTPException(status_code=404, detail="Album not found")

    query = select(Photo).where(Photo.owner_id == current_user.id)

    if album_id is not None:
        query = query.join(PhotoAlbum, PhotoAlbum.photo_id == Photo.id).where(
            PhotoAlbum.album_id == album_id
        )

    if order == "chronological":
        query = query.order_by(Photo.taken_at.asc(), Photo.uploaded_at.asc(), Photo.id.asc())
    else:
        query = query.order_by(func.random())

    photos = session.exec(query.limit(limit)).all()
    return ListSlideshowPhotosResponse(photos=photos)
