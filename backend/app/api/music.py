from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import delete, func
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.music import Music, PlaylistMusic
from app.services import music_service
from app.services.music_service import InvalidMusicUploadError

router = APIRouter(prefix="/api/music", tags=["music"])
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
UPLOAD_CHUNK_SIZE = 1024 * 1024


class UploadMusicResponse(BaseModel):
    tracks: list[Music]


class ListMusicResponse(BaseModel):
    items: list[Music]
    total: int
    page: int
    page_size: int


class OkResponse(BaseModel):
    ok: bool


def get_music_or_404(music_id: int, session: Session) -> Music:
    music = session.get(Music, music_id)
    if music is None:
        raise HTTPException(status_code=404, detail="Music not found")

    return music


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


@router.post("/upload", response_model=UploadMusicResponse, status_code=201)
async def upload_music(
    files: list[UploadFile] | None = File(default=None),
    session: Session = Depends(get_session),
) -> UploadMusicResponse:
    uploaded: list[Music] = []

    try:
        for upload_file in files or []:
            try:
                file_bytes = await read_upload_file_with_limit(upload_file)
                track = music_service.create_music_from_upload(
                    filename=upload_file.filename,
                    mime_type=upload_file.content_type,
                    data=file_bytes,
                )
            except InvalidMusicUploadError:
                continue
            finally:
                await upload_file.close()

            session.add(track)
            uploaded.append(track)

        if not uploaded:
            raise HTTPException(status_code=400, detail="No valid audio files provided")

        session.commit()
    except Exception:
        session.rollback()
        for track in uploaded:
            music_service.delete_music_file(track)
        raise

    for track in uploaded:
        session.refresh(track)

    return UploadMusicResponse(tracks=uploaded)


@router.get("", response_model=ListMusicResponse)
def list_music(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
) -> ListMusicResponse:
    total = session.exec(select(func.count()).select_from(Music)).one()
    items = session.exec(
        select(Music)
        .order_by(Music.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return ListMusicResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{music_id}", response_model=Music)
def get_music(music_id: int, session: Session = Depends(get_session)) -> Music:
    return get_music_or_404(music_id, session)


@router.delete("/{music_id}", response_model=OkResponse)
def delete_music(music_id: int, session: Session = Depends(get_session)) -> OkResponse:
    track = get_music_or_404(music_id, session)

    music_service.delete_music_file(track)
    session.exec(delete(PlaylistMusic).where(PlaylistMusic.music_id == music_id))
    session.delete(track)
    session.commit()

    return OkResponse(ok=True)


@router.get("/{music_id}/file")
def get_music_file(music_id: int, session: Session = Depends(get_session)) -> FileResponse:
    track = get_music_or_404(music_id, session)
    file_path = music_service.get_music_path(track.file_path)

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Music file not found")

    return FileResponse(
        path=file_path,
        media_type=track.mime_type,
        filename=track.filename,
        headers={"Accept-Ranges": "bytes"},
    )
