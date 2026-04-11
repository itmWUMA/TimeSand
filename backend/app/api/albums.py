from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, func
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.album import Album, PhotoAlbum, utc_now
from app.models.photo import Photo

router = APIRouter(prefix="/api/albums", tags=["albums"])


class AlbumCreateRequest(BaseModel):
    name: str
    description: str | None = None


class AlbumUpdateRequest(BaseModel):
    name: str
    description: str | None = None
    cover_photo_id: int | None = None


class AddAlbumPhotosRequest(BaseModel):
    photo_ids: list[int]


class AlbumResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    cover_photo_id: int | None = None
    cover_photo: str | None = None
    photo_count: int
    created_at: datetime
    updated_at: datetime


class ListAlbumsResponse(BaseModel):
    items: list[AlbumResponse]
    total: int


class OkResponse(BaseModel):
    ok: bool


def get_album_or_404(album_id: int, session: Session) -> Album:
    album = session.get(Album, album_id)
    if album is None:
        raise HTTPException(status_code=404, detail="Album not found")

    return album


def normalize_album_name(name: str) -> str:
    normalized = name.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="Album name is required")

    return normalized


def get_album_photo_count(session: Session, album_id: int) -> int:
    return session.exec(
        select(func.count()).select_from(PhotoAlbum).where(PhotoAlbum.album_id == album_id)
    ).one()


def resolve_album_cover_photo_id(session: Session, album: Album) -> int | None:
    if album.id is None:
        return None

    if album.cover_photo_id is not None:
        cover_link = session.exec(
            select(PhotoAlbum).where(
                PhotoAlbum.album_id == album.id,
                PhotoAlbum.photo_id == album.cover_photo_id,
            )
        ).first()
        if cover_link is not None:
            return album.cover_photo_id

    return session.exec(
        select(PhotoAlbum.photo_id)
        .where(PhotoAlbum.album_id == album.id)
        .order_by(PhotoAlbum.photo_id.desc())
        .limit(1)
    ).first()


def serialize_album(session: Session, album: Album) -> AlbumResponse:
    resolved_cover_photo_id = resolve_album_cover_photo_id(session, album)
    cover_photo = (
        f"/api/photos/{resolved_cover_photo_id}/thumbnail"
        if resolved_cover_photo_id is not None
        else None
    )
    photo_count = get_album_photo_count(session, album.id or 0)

    return AlbumResponse(
        id=album.id or 0,
        name=album.name,
        description=album.description,
        cover_photo_id=resolved_cover_photo_id,
        cover_photo=cover_photo,
        photo_count=photo_count,
        created_at=album.created_at,
        updated_at=album.updated_at,
    )


@router.post("", response_model=AlbumResponse, status_code=201)
def create_album(
    request: AlbumCreateRequest,
    session: Session = Depends(get_session),
) -> AlbumResponse:
    album = Album(
        name=normalize_album_name(request.name),
        description=request.description,
    )
    session.add(album)
    session.commit()
    session.refresh(album)

    return serialize_album(session, album)


@router.get("", response_model=ListAlbumsResponse)
def list_albums(session: Session = Depends(get_session)) -> ListAlbumsResponse:
    albums = session.exec(select(Album).order_by(Album.id.desc())).all()
    total = session.exec(select(func.count()).select_from(Album)).one()

    return ListAlbumsResponse(
        items=[serialize_album(session, album) for album in albums],
        total=total,
    )


@router.get("/{album_id}", response_model=AlbumResponse)
def get_album(album_id: int, session: Session = Depends(get_session)) -> AlbumResponse:
    album = get_album_or_404(album_id, session)
    return serialize_album(session, album)


@router.put("/{album_id}", response_model=AlbumResponse)
def update_album(
    album_id: int,
    request: AlbumUpdateRequest,
    session: Session = Depends(get_session),
) -> AlbumResponse:
    album = get_album_or_404(album_id, session)

    if request.cover_photo_id is not None:
        photo = session.get(Photo, request.cover_photo_id)
        if photo is None:
            raise HTTPException(status_code=404, detail="Photo not found")

        cover_link = session.exec(
            select(PhotoAlbum).where(
                PhotoAlbum.album_id == album_id,
                PhotoAlbum.photo_id == request.cover_photo_id,
            )
        ).first()
        if cover_link is None:
            raise HTTPException(status_code=400, detail="Cover photo must belong to album")

    album.name = normalize_album_name(request.name)
    album.description = request.description
    album.cover_photo_id = request.cover_photo_id
    album.updated_at = utc_now()

    session.add(album)
    session.commit()
    session.refresh(album)

    return serialize_album(session, album)


@router.delete("/{album_id}", response_model=OkResponse)
def delete_album(album_id: int, session: Session = Depends(get_session)) -> OkResponse:
    album = get_album_or_404(album_id, session)

    session.exec(delete(PhotoAlbum).where(PhotoAlbum.album_id == album_id))
    session.delete(album)
    session.commit()

    return OkResponse(ok=True)


@router.post("/{album_id}/photos", response_model=OkResponse)
def add_photos_to_album(
    album_id: int,
    request: AddAlbumPhotosRequest,
    session: Session = Depends(get_session),
) -> OkResponse:
    get_album_or_404(album_id, session)

    requested_ids = list(dict.fromkeys(request.photo_ids))
    if not requested_ids:
        return OkResponse(ok=True)

    existing_photo_ids = set(
        session.exec(select(Photo.id).where(Photo.id.in_(requested_ids))).all()
    )
    missing_ids = [photo_id for photo_id in requested_ids if photo_id not in existing_photo_ids]
    if missing_ids:
        raise HTTPException(status_code=404, detail="Photo not found")

    existing_links = set(
        session.exec(
            select(PhotoAlbum.photo_id).where(
                PhotoAlbum.album_id == album_id,
                PhotoAlbum.photo_id.in_(requested_ids),
            )
        ).all()
    )

    for photo_id in requested_ids:
        if photo_id in existing_links:
            continue
        session.add(PhotoAlbum(photo_id=photo_id, album_id=album_id))

    session.commit()
    return OkResponse(ok=True)


@router.delete("/{album_id}/photos/{photo_id}", response_model=OkResponse)
def remove_photo_from_album(
    album_id: int,
    photo_id: int,
    session: Session = Depends(get_session),
) -> OkResponse:
    album = get_album_or_404(album_id, session)

    link = session.exec(
        select(PhotoAlbum).where(
            PhotoAlbum.album_id == album_id,
            PhotoAlbum.photo_id == photo_id,
        )
    ).first()
    if link is not None:
        session.delete(link)

    if album.cover_photo_id == photo_id:
        album.cover_photo_id = None
        album.updated_at = utc_now()
        session.add(album)

    session.commit()
    return OkResponse(ok=True)
