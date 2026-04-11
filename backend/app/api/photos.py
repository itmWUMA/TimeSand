from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.album import PhotoAlbum, PhotoTag
from app.models.photo import Photo
from app.services import photo_service
from app.services.photo_service import InvalidPhotoUploadError

router = APIRouter(prefix="/api/photos", tags=["photos"])
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
UPLOAD_CHUNK_SIZE = 1024 * 1024


class UploadPhotosResponse(BaseModel):
    photos: list[Photo]


class ListPhotosResponse(BaseModel):
    items: list[Photo]
    total: int
    page: int
    page_size: int


class DeletePhotoResponse(BaseModel):
    ok: bool


def build_filtered_photos_query(album_id: int | None, tag_id: int | None):
    query = select(Photo)

    if album_id is not None:
        query = query.join(PhotoAlbum, PhotoAlbum.photo_id == Photo.id).where(
            PhotoAlbum.album_id == album_id
        )

    if tag_id is not None:
        query = query.join(PhotoTag, PhotoTag.photo_id == Photo.id).where(
            PhotoTag.tag_id == tag_id
        )

    if album_id is not None or tag_id is not None:
        query = query.distinct()

    return query


def get_photo_or_404(photo_id: int, session: Session) -> Photo:
    photo = session.get(Photo, photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")

    return photo


async def read_upload_file_with_limit(upload_file: UploadFile, max_bytes: int | None = None) -> bytes:
    size_limit = max_bytes if max_bytes is not None else MAX_UPLOAD_BYTES
    buffer = bytearray()

    while True:
        chunk = await upload_file.read(UPLOAD_CHUNK_SIZE)
        if not chunk:
            break

        buffer.extend(chunk)
        if len(buffer) > size_limit:
            raise HTTPException(status_code=413, detail="File too large")

    return bytes(buffer)


@router.post("/upload", response_model=UploadPhotosResponse, status_code=201)
async def upload_photos(
    files: list[UploadFile] | None = File(default=None),
    session: Session = Depends(get_session)
) -> UploadPhotosResponse:
    uploaded: list[Photo] = []

    try:
        for upload_file in files or []:
            try:
                file_bytes = await read_upload_file_with_limit(upload_file)
                photo = photo_service.create_photo_from_upload(
                    filename=upload_file.filename,
                    mime_type=upload_file.content_type,
                    data=file_bytes
                )
            except InvalidPhotoUploadError:
                continue
            finally:
                await upload_file.close()

            session.add(photo)
            uploaded.append(photo)

        if not uploaded:
            raise HTTPException(status_code=400, detail="No valid image files provided")

        session.commit()
    except Exception:
        session.rollback()
        for photo in uploaded:
            photo_service.delete_photo_files(photo)
        raise

    for photo in uploaded:
        session.refresh(photo)

    return UploadPhotosResponse(photos=uploaded)


@router.get("", response_model=ListPhotosResponse)
def list_photos(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    album_id: int | None = Query(default=None, ge=1),
    tag_id: int | None = Query(default=None, ge=1),
    session: Session = Depends(get_session)
) -> ListPhotosResponse:
    base_query = build_filtered_photos_query(album_id=album_id, tag_id=tag_id)
    total = session.exec(select(func.count()).select_from(base_query.order_by(None).subquery())).one()
    items = session.exec(
        base_query
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
