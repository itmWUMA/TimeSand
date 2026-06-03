from __future__ import annotations

from datetime import datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, func
from sqlmodel import Session, select

from app.core.auth import get_current_active_user
from app.core.database import get_session
from app.models.album import Album, PhotoAlbum, utc_now
from app.models.music import AlbumPlaylist, Playlist
from app.models.photo import Photo
from app.models.user import User

router = APIRouter(prefix="/api/albums", tags=["albums"])
ALBUM_NAME_MAX_LENGTH = 80


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
    playlist_id: int | None = None
    cover_photo: str | None = None
    photo_count: int
    created_at: datetime
    updated_at: datetime


class ListAlbumsResponse(BaseModel):
    items: list[AlbumResponse]
    total: int


class OkResponse(BaseModel):
    ok: bool


class SetAlbumPlaylistRequest(BaseModel):
    playlist_id: int


def get_album_or_404(album_id: int, session: Session, current_user: User) -> Album:
    album = session.get(Album, album_id)
    if album is None:
        raise HTTPException(status_code=404, detail="Album not found")
    if album.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return album


def normalize_album_name(name: str) -> str:
    normalized = name.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="Album name is required")
    if len(normalized) > ALBUM_NAME_MAX_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"Album name must be {ALBUM_NAME_MAX_LENGTH} characters or fewer",
        )

    return normalized


def get_album_photo_count(session: Session, album_id: int) -> int:
    return session.exec(
        select(func.count()).select_from(PhotoAlbum).where(PhotoAlbum.album_id == album_id)
    ).one()


def resolve_album_cover_photo_id(session: Session, album: Album, current_user: User) -> int | None:
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


def serialize_album(session: Session, album: Album, current_user: User) -> AlbumResponse:
    resolved_cover_photo_id = resolve_album_cover_photo_id(session, album, current_user)
    playlist_id = session.exec(
        select(AlbumPlaylist.playlist_id).where(AlbumPlaylist.album_id == (album.id or 0))
    ).first()
    cover_photo = None
    if resolved_cover_photo_id is not None:
        cover = session.get(Photo, resolved_cover_photo_id)
        if cover is not None and cover.owner_id == current_user.id:
            version = quote(cover.thumbnail_path, safe="")
            cover_photo = f"/api/photos/{resolved_cover_photo_id}/thumbnail?v={version}"
    photo_count = get_album_photo_count(session, album.id or 0)

    return AlbumResponse(
        id=album.id or 0,
        name=album.name,
        description=album.description,
        cover_photo_id=resolved_cover_photo_id,
        playlist_id=playlist_id,
        cover_photo=cover_photo,
        photo_count=photo_count,
        created_at=album.created_at,
        updated_at=album.updated_at,
    )


@router.post("", response_model=AlbumResponse, status_code=201)
def create_album(
    request: AlbumCreateRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> AlbumResponse:
    album = Album(
        name=normalize_album_name(request.name),
        description=request.description,
        owner_id=current_user.id,
    )
    session.add(album)
    session.commit()
    session.refresh(album)

    return serialize_album(session, album, current_user)


@router.get("", response_model=ListAlbumsResponse)
def list_albums(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> ListAlbumsResponse:
    albums = session.exec(
        select(Album).where(Album.owner_id == current_user.id).order_by(Album.id.desc())
    ).all()
    total = session.exec(
        select(func.count()).select_from(Album).where(Album.owner_id == current_user.id)
    ).one()

    return ListAlbumsResponse(
        items=[serialize_album(session, album, current_user) for album in albums],
        total=total,
    )


@router.get("/{album_id}", response_model=AlbumResponse)
def get_album(
    album_id: int,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> AlbumResponse:
    album = get_album_or_404(album_id, session, current_user)
    return serialize_album(session, album, current_user)


@router.put("/{album_id}", response_model=AlbumResponse)
def update_album(
    album_id: int,
    request: AlbumUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> AlbumResponse:
    album = get_album_or_404(album_id, session, current_user)

    if request.cover_photo_id is not None:
        photo = session.get(Photo, request.cover_photo_id)
        if photo is None or photo.owner_id != current_user.id:
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

    return serialize_album(session, album, current_user)


@router.delete("/{album_id}", response_model=OkResponse)
def delete_album(
    album_id: int,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> OkResponse:
    album = get_album_or_404(album_id, session, current_user)

    session.exec(delete(AlbumPlaylist).where(AlbumPlaylist.album_id == album_id))
    session.exec(delete(PhotoAlbum).where(PhotoAlbum.album_id == album_id))
    session.delete(album)
    session.commit()

    return OkResponse(ok=True)


@router.post("/{album_id}/photos", response_model=OkResponse)
def add_photos_to_album(
    album_id: int,
    request: AddAlbumPhotosRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> OkResponse:
    get_album_or_404(album_id, session, current_user)

    requested_ids = list(dict.fromkeys(request.photo_ids))
    if not requested_ids:
        return OkResponse(ok=True)

    existing_photo_ids = set(
        session.exec(
            select(Photo.id).where(Photo.id.in_(requested_ids), Photo.owner_id == current_user.id)
        ).all()
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
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> OkResponse:
    album = get_album_or_404(album_id, session, current_user)

    link = session.exec(
        select(PhotoAlbum).where(
            PhotoAlbum.album_id == album_id,
            PhotoAlbum.photo_id == photo_id,
        )
    ).first()
    if link is None:
        raise HTTPException(status_code=404, detail="Photo is not in album")

    session.delete(link)

    if album.cover_photo_id == photo_id:
        album.cover_photo_id = None
        album.updated_at = utc_now()
        session.add(album)

    session.commit()
    return OkResponse(ok=True)


@router.put("/{album_id}/playlist", response_model=OkResponse)
def set_album_playlist(
    album_id: int,
    request: SetAlbumPlaylistRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> OkResponse:
    get_album_or_404(album_id, session, current_user)

    playlist = session.get(Playlist, request.playlist_id)
    if playlist is None or playlist.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Playlist not found")

    existing = session.exec(
        select(AlbumPlaylist).where(AlbumPlaylist.album_id == album_id)
    ).first()
    if existing is None:
        session.add(AlbumPlaylist(album_id=album_id, playlist_id=request.playlist_id))
    else:
        existing.playlist_id = request.playlist_id
        session.add(existing)

    session.commit()
    return OkResponse(ok=True)


@router.delete("/{album_id}/playlist", response_model=OkResponse)
def clear_album_playlist(
    album_id: int,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> OkResponse:
    get_album_or_404(album_id, session, current_user)

    existing = session.exec(
        select(AlbumPlaylist).where(AlbumPlaylist.album_id == album_id)
    ).first()
    if existing is not None:
        session.delete(existing)
        session.commit()

    return OkResponse(ok=True)
