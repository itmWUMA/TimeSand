from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, func
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.music import AlbumPlaylist, Music, Playlist, PlaylistMusic

router = APIRouter(prefix="/api/playlists", tags=["playlists"])


class PlaylistCreateRequest(BaseModel):
    name: str


class PlaylistUpdateRequest(BaseModel):
    name: str
    track_ids: list[int]


class PlaylistTrackRequest(BaseModel):
    music_id: int


class PlaylistResponse(BaseModel):
    id: int
    name: str
    is_default: bool
    track_count: int
    created_at: datetime
    tracks: list[Music] = []


class ListPlaylistsResponse(BaseModel):
    items: list[PlaylistResponse]


class OkResponse(BaseModel):
    ok: bool


def normalize_playlist_name(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="Playlist name is required")
    return normalized


def get_playlist_or_404(playlist_id: int, session: Session) -> Playlist:
    playlist = session.get(Playlist, playlist_id)
    if playlist is None:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return playlist


def get_music_or_404(music_id: int, session: Session) -> Music:
    track = session.get(Music, music_id)
    if track is None:
        raise HTTPException(status_code=404, detail="Music not found")
    return track


def get_playlist_track_count(session: Session, playlist_id: int) -> int:
    return session.exec(
        select(func.count()).select_from(PlaylistMusic).where(PlaylistMusic.playlist_id == playlist_id)
    ).one()


def get_playlist_tracks(session: Session, playlist_id: int) -> list[Music]:
    return session.exec(
        select(Music)
        .join(PlaylistMusic, PlaylistMusic.music_id == Music.id)
        .where(PlaylistMusic.playlist_id == playlist_id)
        .order_by(PlaylistMusic.position.asc())
    ).all()


def serialize_playlist(
    session: Session,
    playlist: Playlist,
    include_tracks: bool,
) -> PlaylistResponse:
    tracks = get_playlist_tracks(session, playlist.id or 0) if include_tracks else []
    return PlaylistResponse(
        id=playlist.id or 0,
        name=playlist.name,
        is_default=playlist.is_default,
        track_count=get_playlist_track_count(session, playlist.id or 0),
        created_at=playlist.created_at,
        tracks=tracks,
    )


def compact_playlist_positions(session: Session, playlist_id: int) -> None:
    links = session.exec(
        select(PlaylistMusic)
        .where(PlaylistMusic.playlist_id == playlist_id)
        .order_by(PlaylistMusic.position.asc(), PlaylistMusic.music_id.asc())
    ).all()
    for index, link in enumerate(links):
        link.position = index
        session.add(link)


def assert_music_ids_exist(track_ids: list[int], session: Session) -> None:
    if not track_ids:
        return

    unique_ids = list(dict.fromkeys(track_ids))
    existing_ids = set(session.exec(select(Music.id).where(Music.id.in_(unique_ids))).all())
    missing_ids = [music_id for music_id in unique_ids if music_id not in existing_ids]
    if missing_ids:
        raise HTTPException(status_code=404, detail="Music not found")


@router.post("", response_model=PlaylistResponse, status_code=201)
def create_playlist(
    request: PlaylistCreateRequest,
    session: Session = Depends(get_session),
) -> PlaylistResponse:
    playlist = Playlist(name=normalize_playlist_name(request.name), is_default=False)
    session.add(playlist)
    session.commit()
    session.refresh(playlist)

    return serialize_playlist(session, playlist, include_tracks=False)


@router.get("", response_model=ListPlaylistsResponse)
def list_playlists(session: Session = Depends(get_session)) -> ListPlaylistsResponse:
    playlists = session.exec(
        select(Playlist).order_by(Playlist.is_default.desc(), Playlist.id.desc())
    ).all()
    return ListPlaylistsResponse(
        items=[serialize_playlist(session, playlist, include_tracks=False) for playlist in playlists]
    )


@router.get("/{playlist_id}", response_model=PlaylistResponse)
def get_playlist(playlist_id: int, session: Session = Depends(get_session)) -> PlaylistResponse:
    playlist = get_playlist_or_404(playlist_id, session)
    return serialize_playlist(session, playlist, include_tracks=True)


@router.put("/{playlist_id}", response_model=PlaylistResponse)
def update_playlist(
    playlist_id: int,
    request: PlaylistUpdateRequest,
    session: Session = Depends(get_session),
) -> PlaylistResponse:
    playlist = get_playlist_or_404(playlist_id, session)

    new_order = list(dict.fromkeys(request.track_ids))
    assert_music_ids_exist(new_order, session)

    session.exec(delete(PlaylistMusic).where(PlaylistMusic.playlist_id == playlist_id))
    for position, music_id in enumerate(new_order):
        session.add(PlaylistMusic(playlist_id=playlist_id, music_id=music_id, position=position))

    playlist.name = normalize_playlist_name(request.name)
    session.add(playlist)
    session.commit()
    session.refresh(playlist)

    return serialize_playlist(session, playlist, include_tracks=True)


@router.delete("/{playlist_id}", response_model=OkResponse)
def delete_playlist(playlist_id: int, session: Session = Depends(get_session)) -> OkResponse:
    playlist = get_playlist_or_404(playlist_id, session)
    if playlist.is_default:
        raise HTTPException(status_code=400, detail="Default playlist cannot be deleted")

    session.exec(delete(PlaylistMusic).where(PlaylistMusic.playlist_id == playlist_id))
    session.exec(delete(AlbumPlaylist).where(AlbumPlaylist.playlist_id == playlist_id))
    session.delete(playlist)
    session.commit()

    return OkResponse(ok=True)


@router.post("/{playlist_id}/tracks", response_model=OkResponse)
def add_track_to_playlist(
    playlist_id: int,
    request: PlaylistTrackRequest,
    session: Session = Depends(get_session),
) -> OkResponse:
    get_playlist_or_404(playlist_id, session)
    get_music_or_404(request.music_id, session)

    existing_link = session.exec(
        select(PlaylistMusic).where(
            PlaylistMusic.playlist_id == playlist_id,
            PlaylistMusic.music_id == request.music_id,
        )
    ).first()
    if existing_link is not None:
        return OkResponse(ok=True)

    max_position = session.exec(
        select(func.max(PlaylistMusic.position)).where(PlaylistMusic.playlist_id == playlist_id)
    ).one()
    next_position = (max_position + 1) if max_position is not None else 0

    session.add(
        PlaylistMusic(
            playlist_id=playlist_id,
            music_id=request.music_id,
            position=next_position,
        )
    )
    session.commit()

    return OkResponse(ok=True)


@router.delete("/{playlist_id}/tracks/{music_id}", response_model=OkResponse)
def remove_track_from_playlist(
    playlist_id: int,
    music_id: int,
    session: Session = Depends(get_session),
) -> OkResponse:
    get_playlist_or_404(playlist_id, session)

    link = session.exec(
        select(PlaylistMusic).where(
            PlaylistMusic.playlist_id == playlist_id,
            PlaylistMusic.music_id == music_id,
        )
    ).first()

    if link is not None:
        session.delete(link)
        session.flush()
        compact_playlist_positions(session, playlist_id)
        session.commit()

    return OkResponse(ok=True)
