from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.photo import Photo
from app.services import photo_service
from app.services.photo_service import InvalidPhotoUploadError

router = APIRouter(prefix="/api/photos", tags=["photos"])


class UploadPhotosResponse(BaseModel):
    photos: list[Photo]


class ListPhotosResponse(BaseModel):
    items: list[Photo]
    total: int
    page: int
    page_size: int


class DeletePhotoResponse(BaseModel):
    ok: bool


def get_photo_or_404(photo_id: int, session: Session) -> Photo:
    photo = session.get(Photo, photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")

    return photo


@router.post("/upload", response_model=UploadPhotosResponse, status_code=201)
async def upload_photos(
    files: list[UploadFile] | None = File(default=None),
    session: Session = Depends(get_session)
) -> UploadPhotosResponse:
    uploaded: list[Photo] = []

    for upload_file in files or []:
        file_bytes = await upload_file.read()
        try:
            photo = photo_service.create_photo_from_upload(
                filename=upload_file.filename,
                mime_type=upload_file.content_type,
                data=file_bytes
            )
        except InvalidPhotoUploadError:
            continue

        session.add(photo)
        uploaded.append(photo)

    if not uploaded:
        raise HTTPException(status_code=400, detail="No valid image files provided")

    session.commit()
    for photo in uploaded:
        session.refresh(photo)

    return UploadPhotosResponse(photos=uploaded)


@router.get("", response_model=ListPhotosResponse)
def list_photos(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    album_id: int | None = None,
    tag_id: int | None = None,
    session: Session = Depends(get_session)
) -> ListPhotosResponse:
    del album_id
    del tag_id

    total = session.exec(select(func.count()).select_from(Photo)).one()
    items = session.exec(
        select(Photo)
        .order_by(Photo.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return ListPhotosResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{photo_id}", response_model=Photo)
def get_photo(photo_id: int, session: Session = Depends(get_session)) -> Photo:
    return get_photo_or_404(photo_id, session)


@router.delete("/{photo_id}", response_model=DeletePhotoResponse)
def delete_photo(photo_id: int, session: Session = Depends(get_session)) -> DeletePhotoResponse:
    photo = get_photo_or_404(photo_id, session)

    photo_service.delete_photo_files(photo)
    session.delete(photo)
    session.commit()

    return DeletePhotoResponse(ok=True)


@router.get("/{photo_id}/file")
def get_photo_file(photo_id: int, session: Session = Depends(get_session)) -> FileResponse:
    photo = get_photo_or_404(photo_id, session)
    file_path = photo_service.get_original_path(photo.file_path)

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Photo file not found")

    return FileResponse(path=file_path, media_type=photo.mime_type, filename=photo.filename)


@router.get("/{photo_id}/thumbnail")
def get_photo_thumbnail(photo_id: int, session: Session = Depends(get_session)) -> FileResponse:
    photo = get_photo_or_404(photo_id, session)
    thumbnail_path = photo_service.get_thumbnail_path(photo.thumbnail_path)

    if not thumbnail_path.exists():
        raise HTTPException(status_code=404, detail="Photo thumbnail not found")

    return FileResponse(path=thumbnail_path, media_type=photo.mime_type, filename=Path(photo.thumbnail_path).name)
