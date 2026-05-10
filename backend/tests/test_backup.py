from __future__ import annotations

import wave
import zipfile
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import settings


def build_jpeg_bytes(width: int = 1200, height: int = 800) -> bytes:
    image = Image.new("RGB", (width, height), color=(255, 170, 0))
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def build_wav_bytes(duration_seconds: int = 1) -> bytes:
    with TemporaryDirectory() as temp_dir:
        file_path = Path(temp_dir) / "sample.wav"
        with wave.open(str(file_path), "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(44100)
            wav_file.writeframes(b"\x00\x00" * 44100 * duration_seconds)
        return file_path.read_bytes()


def upload_photo(client: TestClient, filename: str) -> dict:
    response = client.post(
        "/api/photos/upload",
        files=[("files", (filename, build_jpeg_bytes(), "image/jpeg"))],
    )
    assert response.status_code == 201
    return response.json()["photos"][0]


def upload_music(client: TestClient, filename: str) -> dict:
    response = client.post(
        "/api/music/upload",
        files=[("files", (filename, build_wav_bytes(), "audio/wav"))],
    )
    assert response.status_code == 201
    return response.json()["tracks"][0]


def test_export_backup_returns_expected_zip_structure(client: TestClient) -> None:
    upload_photo(client, "photo-export.jpg")
    upload_music(client, "track-export.wav")

    response = client.post("/api/backup/export")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert "attachment; filename=" in response.headers["content-disposition"]

    with zipfile.ZipFile(BytesIO(response.content), "r") as archive:
        members = archive.namelist()
        assert "timesand.db" in members
        assert any(member.startswith("photos/originals/") for member in members)
        assert any(member.startswith("music/files/") for member in members)
        assert not any(member.startswith("photos/thumbnails/") for member in members)


def test_import_backup_rejects_archive_without_database(client: TestClient) -> None:
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("photos/originals/", b"")
        archive.writestr("music/files/", b"")
    buffer.seek(0)

    response = client.post(
        "/api/backup/import",
        files=[("file", ("invalid-backup.zip", buffer.read(), "application/zip"))],
    )

    assert response.status_code == 400
    assert response.json() == {
        "error": "invalid_backup",
        "message": "Backup archive is missing timesand.db",
        "status_code": 400,
    }


def test_import_backup_replaces_data_and_creates_pre_restore_backup(client: TestClient) -> None:
    replacement_photo = upload_photo(client, "replacement-photo.jpg")
    replacement_track = upload_music(client, "replacement-track.wav")

    export_response = client.post("/api/backup/export")
    assert export_response.status_code == 200
    backup_zip_bytes = export_response.content

    client.delete(f"/api/photos/{replacement_photo['id']}")
    client.delete(f"/api/music/{replacement_track['id']}")
    upload_photo(client, "current-photo.jpg")
    upload_music(client, "current-track.wav")

    import_response = client.post(
        "/api/backup/import",
        files=[("file", ("restore-target.zip", backup_zip_bytes, "application/zip"))],
    )

    assert import_response.status_code == 200
    assert import_response.json() == {
        "message": "Backup restored successfully. Please restart the application.",
        "photo_count": 1,
        "music_count": 1,
        "thumbnails_regenerated": True,
    }

    photos_response = client.get("/api/photos", params={"page": 1, "page_size": 20})
    music_response = client.get("/api/music", params={"page": 1, "page_size": 20})
    assert photos_response.status_code == 200
    assert music_response.status_code == 200

    photos_payload = photos_response.json()
    music_payload = music_response.json()
    assert photos_payload["total"] == 1
    assert photos_payload["items"][0]["filename"] == "replacement-photo.jpg"
    assert music_payload["total"] == 1
    assert music_payload["items"][0]["filename"] == "replacement-track.wav"

    thumbnail_name = photos_payload["items"][0]["thumbnail_path"]
    thumbnail_path = settings.data_dir / "photos" / "thumbnails" / thumbnail_name
    assert thumbnail_path.exists()

    pre_restore_database = settings.data_dir / "timesand.db.pre-restore"
    assert pre_restore_database.exists()
    assert pre_restore_database.stat().st_size > 0
