from __future__ import annotations

import json
import mimetypes
import random
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

from sqlalchemy import delete
from sqlmodel import Session, select

from app.models.album import Album, PhotoAlbum, PhotoTag
from app.models.music import AlbumPlaylist, Music, Playlist, PlaylistMusic
from app.models.photo import Photo
from app.models.user import User, UserRole
from app.services import music_service, photo_service

DEMO_DATA_DIR = Path(__file__).resolve().parent.parent / "demo_data"
DEMO_ALBUM_NAME = "TimeSand Demo"
DEMO_ALBUM_DESCRIPTION = "Seeded demo album for first-time onboarding."
DEMO_PLAYLIST_NAME = "TimeSand Demo"

PHOTO_MIME_BY_SUFFIX: dict[str, str] = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".heic": "image/heic",
    ".heif": "image/heif",
}

MUSIC_MIME_BY_SUFFIX: dict[str, str] = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
    ".aac": "audio/aac",
}


def seed_demo_data(session: Session) -> None:
    """Seed demo records only when there are no photos in the database."""
    existing_photo_id = session.exec(select(Photo.id).limit(1)).first()
    if existing_photo_id is not None:
        return

    admin = session.exec(select(User).where(User.role == UserRole.ADMIN)).first()
    if admin is None:
        return

    owner_id = admin.id

    metadata = _load_metadata()
    today = date.today()
    created_photos: list[Photo] = []
    created_tracks: list[Music] = []

    demo_album = Album(
        name=DEMO_ALBUM_NAME,
        description=DEMO_ALBUM_DESCRIPTION,
        owner_id=owner_id,
    )
    session.add(demo_album)
    session.flush()

    try:
        for photo_meta in metadata["photos"]:
            photo = _create_demo_photo(photo_meta, today=today)
            photo.is_demo = True
            photo.owner_id = owner_id
            session.add(photo)
            session.flush()
            created_photos.append(photo)

            if photo.id is not None and demo_album.id is not None:
                session.add(PhotoAlbum(photo_id=photo.id, album_id=demo_album.id))

        demo_playlist = Playlist(name=DEMO_PLAYLIST_NAME, is_default=False, owner_id=owner_id)
        session.add(demo_playlist)
        session.flush()

        for position, music_meta in enumerate(metadata["music"]):
            track = _create_demo_track(music_meta)
            track.is_demo = True
            track.owner_id = owner_id
            session.add(track)
            session.flush()
            created_tracks.append(track)

            if track.id is not None and demo_playlist.id is not None:
                session.add(
                    PlaylistMusic(
                        playlist_id=demo_playlist.id,
                        music_id=track.id,
                        position=position,
                    ),
                )
    except Exception:
        session.rollback()
        for photo in created_photos:
            photo_service.delete_photo_files(photo)
        for track in created_tracks:
            music_service.delete_music_file(track)
        raise

    session.commit()


def cleanup_demo_data(session: Session) -> int:
    """Remove all demo records and files. Returns number of removed items."""
    photos = session.exec(select(Photo).where(Photo.is_demo.is_(True))).all()
    tracks = session.exec(select(Music).where(Music.is_demo.is_(True))).all()
    removed_count = len(photos) + len(tracks)

    photo_ids = [photo.id for photo in photos if photo.id is not None]
    track_ids = [track.id for track in tracks if track.id is not None]

    if photo_ids:
        session.exec(delete(PhotoAlbum).where(PhotoAlbum.photo_id.in_(photo_ids)))
        session.exec(delete(PhotoTag).where(PhotoTag.photo_id.in_(photo_ids)))

    if track_ids:
        session.exec(delete(PlaylistMusic).where(PlaylistMusic.music_id.in_(track_ids)))

    demo_album = session.exec(
        select(Album).where(
            Album.name == DEMO_ALBUM_NAME,
            Album.description == DEMO_ALBUM_DESCRIPTION,
        ),
    ).first()
    if demo_album is not None and demo_album.id is not None:
        session.exec(delete(PhotoAlbum).where(PhotoAlbum.album_id == demo_album.id))
        session.exec(delete(AlbumPlaylist).where(AlbumPlaylist.album_id == demo_album.id))
        session.delete(demo_album)

    demo_playlist = session.exec(
        select(Playlist).where(
            Playlist.name == DEMO_PLAYLIST_NAME,
            Playlist.is_default.is_(False),
        ),
    ).first()
    if demo_playlist is not None and demo_playlist.id is not None:
        session.exec(delete(PlaylistMusic).where(PlaylistMusic.playlist_id == demo_playlist.id))
        session.exec(delete(AlbumPlaylist).where(AlbumPlaylist.playlist_id == demo_playlist.id))
        session.delete(demo_playlist)

    for photo in photos:
        photo_service.delete_photo_files(photo)
        session.delete(photo)

    for track in tracks:
        music_service.delete_music_file(track)
        session.delete(track)

    session.commit()
    return removed_count


def _load_metadata() -> dict[str, list[dict[str, object]]]:
    metadata_path = DEMO_DATA_DIR / "metadata.json"
    if not metadata_path.is_file():
        raise FileNotFoundError(f"Demo metadata not found: {metadata_path}")

    payload = json.loads(metadata_path.read_text(encoding="utf-8"))
    photos = payload.get("photos")
    music = payload.get("music")
    if not isinstance(photos, list) or not isinstance(music, list):
        raise ValueError("metadata.json must contain photos and music arrays")

    return {
        "photos": [item for item in photos if isinstance(item, dict)],
        "music": [item for item in music if isinstance(item, dict)],
    }


def _create_demo_photo(meta: dict[str, object], today: date) -> Photo:
    filename = _required_text(meta, "filename")
    source_path = DEMO_DATA_DIR / filename
    if not source_path.is_file():
        raise FileNotFoundError(f"Demo photo file not found: {source_path}")

    photo = photo_service.create_photo_from_upload(
        filename=filename,
        mime_type=_detect_mime_type(source_path, PHOTO_MIME_BY_SUFFIX),
        data=source_path.read_bytes(),
    )
    photo.taken_at = _compute_taken_at(today, meta)
    return photo


def _create_demo_track(meta: dict[str, object]) -> Music:
    filename = _required_text(meta, "filename")
    source_path = DEMO_DATA_DIR / filename
    if not source_path.is_file():
        raise FileNotFoundError(f"Demo music file not found: {source_path}")

    track = music_service.create_music_from_upload(
        filename=filename,
        mime_type=_detect_mime_type(source_path, MUSIC_MIME_BY_SUFFIX),
        data=source_path.read_bytes(),
    )
    title = _optional_text(meta.get("title"))
    artist = _optional_text(meta.get("artist"))
    if title:
        track.title = title
    track.artist = artist
    return track


def _compute_taken_at(today: date, meta: dict[str, object]) -> datetime:
    years_ago = _optional_int(meta.get("taken_at_years_ago"))
    if years_ago is None:
        random_days = random.randint(365, 365 * 5)
        baseline = datetime.combine(today, time(hour=12, minute=0), tzinfo=timezone.utc)
        return baseline - timedelta(days=random_days)

    same_day_in_past = _years_ago_same_day(today, years_ago)
    baseline = datetime.combine(same_day_in_past, time(hour=12, minute=0), tzinfo=timezone.utc)
    if meta.get("taken_at_today") is True:
        return baseline

    offset_days = random.randint(10, 60)
    return baseline - timedelta(days=offset_days)


def _years_ago_same_day(today: date, years_ago: int) -> date:
    target_year = today.year - max(years_ago, 0)
    try:
        return today.replace(year=target_year)
    except ValueError:
        # Handles Feb 29 for non-leap target years.
        return today.replace(year=target_year, day=28)


def _detect_mime_type(path: Path, fallback_map: dict[str, str]) -> str:
    guessed, _ = mimetypes.guess_type(path.name)
    if guessed:
        return guessed

    suffix = path.suffix.lower()
    if suffix in fallback_map:
        return fallback_map[suffix]

    raise ValueError(f"Unsupported demo asset type: {path.name}")


def _required_text(meta: dict[str, object], key: str) -> str:
    value = meta.get(key)
    if isinstance(value, str) and value.strip():
        return value.strip()
    raise ValueError(f"Missing required field: {key}")


def _optional_text(value: object) -> str | None:
    if isinstance(value, str):
        normalized = value.strip()
        return normalized or None
    return None


def _optional_int(value: object) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            return int(stripped)
        except ValueError:
            return None
    return None
