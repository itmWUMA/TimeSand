from __future__ import annotations

import json
import wave
from datetime import date
from pathlib import Path

from PIL import Image
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import hash_password
from app.models.album import Album
from app.models.music import Music, Playlist
from app.models.photo import Photo
from app.models.user import User, UserRole
from app.services import demo_service


def write_demo_photo(path: Path, color: tuple[int, int, int]) -> None:
    image = Image.new("RGB", (1280, 720), color=color)
    image.save(path, format="PNG")


def write_demo_audio(path: Path, duration_seconds: int = 1) -> None:
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(44_100)
        wav_file.writeframes(b"\x00\x00" * 44_100 * duration_seconds)


def create_test_admin(session: Session) -> User:
    existing = session.exec(select(User).where(User.username == "admin")).first()
    if existing is not None:
        return existing

    admin = User(
        username="admin",
        display_name="Admin",
        password_hash=hash_password("testpassword123"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)
    return admin


def prepare_demo_fixture(demo_data_dir: Path) -> None:
    demo_data_dir.mkdir(parents=True, exist_ok=True)

    photos: list[dict[str, object]] = []
    for index in range(1, 9):
        filename = f"demo-{index:02d}.png"
        write_demo_photo(demo_data_dir / filename, color=(index * 20, 120, 80))
        photos.append(
            {
                "filename": filename,
                "taken_at_years_ago": index if index <= 4 else None,
                "taken_at_today": index in {1, 2},
            },
        )

    write_demo_audio(demo_data_dir / "demo-ambient.wav")
    metadata = {
        "photos": photos,
        "music": [
            {
                "filename": "demo-ambient.wav",
                "title": "Gentle Drift",
                "artist": "TimeSand Demo",
            },
        ],
    }

    (demo_data_dir / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def test_seed_creates_demo_data(
    session: Session,
    tmp_path: Path,
    monkeypatch,
) -> None:
    create_test_admin(session)
    demo_data_dir = tmp_path / "demo_data"
    prepare_demo_fixture(demo_data_dir)
    monkeypatch.setattr(demo_service, "DEMO_DATA_DIR", demo_data_dir)

    demo_service.seed_demo_data(session)

    photos = session.exec(select(Photo).where(Photo.is_demo.is_(True))).all()
    tracks = session.exec(select(Music).where(Music.is_demo.is_(True))).all()
    demo_album = session.exec(
        select(Album).where(Album.name == demo_service.DEMO_ALBUM_NAME),
    ).first()
    demo_playlist = session.exec(
        select(Playlist).where(Playlist.name == demo_service.DEMO_PLAYLIST_NAME),
    ).first()

    assert len(photos) == 8
    assert len(tracks) == 1
    assert demo_album is not None
    assert demo_playlist is not None

    today = date.today()
    anniversary_count = sum(
        1
        for photo in photos
        if photo.taken_at is not None
        and photo.taken_at.date().month == today.month
        and photo.taken_at.date().day == today.day
    )
    assert anniversary_count >= 2

    for photo in photos:
        assert (settings.data_dir / "photos" / "originals" / photo.file_path).is_file()
        assert (settings.data_dir / "photos" / "thumbnails" / photo.thumbnail_path).is_file()

    for track in tracks:
        assert (settings.data_dir / "music" / "files" / track.file_path).is_file()


def test_seed_is_idempotent(session: Session, tmp_path: Path, monkeypatch) -> None:
    create_test_admin(session)
    demo_data_dir = tmp_path / "demo_data"
    prepare_demo_fixture(demo_data_dir)
    monkeypatch.setattr(demo_service, "DEMO_DATA_DIR", demo_data_dir)

    demo_service.seed_demo_data(session)
    demo_service.seed_demo_data(session)

    photos = session.exec(select(Photo).where(Photo.is_demo.is_(True))).all()
    tracks = session.exec(select(Music).where(Music.is_demo.is_(True))).all()

    assert len(photos) == 8
    assert len(tracks) == 1


def test_seed_skips_when_photos_exist(session: Session, tmp_path: Path, monkeypatch) -> None:
    create_test_admin(session)
    demo_data_dir = tmp_path / "demo_data"
    prepare_demo_fixture(demo_data_dir)
    monkeypatch.setattr(demo_service, "DEMO_DATA_DIR", demo_data_dir)

    session.add(
        Photo(
            filename="user-photo.jpg",
            file_path="user-photo.jpg",
            thumbnail_path="user-photo-thumb.jpg",
            file_size=10,
            width=1,
            height=1,
            mime_type="image/jpeg",
            is_demo=False,
            owner_id=1,
        ),
    )
    session.commit()

    demo_service.seed_demo_data(session)

    demo_photos = session.exec(select(Photo).where(Photo.is_demo.is_(True))).all()
    demo_tracks = session.exec(select(Music).where(Music.is_demo.is_(True))).all()
    assert len(demo_photos) == 0
    assert len(demo_tracks) == 0


def test_cleanup_removes_demo_data(session: Session, tmp_path: Path, monkeypatch) -> None:
    create_test_admin(session)
    demo_data_dir = tmp_path / "demo_data"
    prepare_demo_fixture(demo_data_dir)
    monkeypatch.setattr(demo_service, "DEMO_DATA_DIR", demo_data_dir)
    demo_service.seed_demo_data(session)

    photos = session.exec(select(Photo).where(Photo.is_demo.is_(True))).all()
    tracks = session.exec(select(Music).where(Music.is_demo.is_(True))).all()
    photo_paths = [(photo.file_path, photo.thumbnail_path) for photo in photos]
    track_paths = [track.file_path for track in tracks]

    removed = demo_service.cleanup_demo_data(session)

    assert removed == 9
    assert session.exec(select(Photo).where(Photo.is_demo.is_(True))).all() == []
    assert session.exec(select(Music).where(Music.is_demo.is_(True))).all() == []
    assert session.exec(
        select(Album).where(Album.name == demo_service.DEMO_ALBUM_NAME),
    ).first() is None
    assert session.exec(
        select(Playlist).where(Playlist.name == demo_service.DEMO_PLAYLIST_NAME),
    ).first() is None

    for file_path, thumbnail_path in photo_paths:
        assert not (settings.data_dir / "photos" / "originals" / file_path).exists()
        assert not (settings.data_dir / "photos" / "thumbnails" / thumbnail_path).exists()

    for file_path in track_paths:
        assert not (settings.data_dir / "music" / "files" / file_path).exists()


def test_delete_demo_endpoint(
    auth_client: TestClient,
    session: Session,
    tmp_path: Path,
    monkeypatch,
) -> None:
    create_test_admin(session)
    demo_data_dir = tmp_path / "demo_data"
    prepare_demo_fixture(demo_data_dir)
    monkeypatch.setattr(demo_service, "DEMO_DATA_DIR", demo_data_dir)
    demo_service.seed_demo_data(session)

    response = auth_client.delete("/api/demo")

    assert response.status_code == 200
    assert response.json() == {"removed": 9}
