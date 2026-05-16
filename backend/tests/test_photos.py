from __future__ import annotations

import uuid
from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image
from PIL.TiffImagePlugin import IFDRational
from fastapi.testclient import TestClient
from sqlmodel import create_engine

from app.api import photos as photos_api
from app.core import database
from app.core.config import settings
from app.services import photo_service


IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable"


def build_jpeg_bytes(width: int = 1200, height: int = 800, with_exif: bool = True) -> bytes:
    image = Image.new("RGB", (width, height), color=(255, 170, 0))
    buffer = BytesIO()

    if with_exif:
        exif = Image.Exif()
        exif[36867] = "2023:07:15 10:30:00"  # DateTimeOriginal
        exif[34853] = {
            1: "N",
            2: (IFDRational(35, 1), IFDRational(40, 1), IFDRational(3432, 100)),
            3: "E",
            4: (IFDRational(139, 1), IFDRational(39, 1), IFDRational(1080, 100))
        }
        image.save(buffer, format="JPEG", exif=exif)
    else:
        image.save(buffer, format="JPEG")

    return buffer.getvalue()


def build_heic_bytes(width: int = 800, height: int = 600, with_exif: bool = True) -> bytes:
    from pillow_heif import register_heif_opener

    register_heif_opener()

    image = Image.new("RGB", (width, height), color=(100, 200, 50))
    buffer = BytesIO()

    if with_exif:
        exif = Image.Exif()
        exif[36867] = "2024:01:20 14:30:00"
        image.save(buffer, format="HEIF", exif=exif)
    else:
        image.save(buffer, format="HEIF")

    return buffer.getvalue()


def upload_photo(client: TestClient) -> dict:
    response = client.post(
        "/api/photos/upload",
        files=[("files", ("photo.jpg", build_jpeg_bytes(), "image/jpeg"))]
    )

    assert response.status_code == 201
    return response.json()["photos"][0]


def create_album(client: TestClient, name: str = "Album") -> dict:
    response = client.post(
        "/api/albums",
        json={"name": name, "description": None},
    )
    assert response.status_code == 201
    return response.json()


def add_photos_to_album(client: TestClient, album_id: int, photo_ids: list[int]) -> None:
    response = client.post(
        f"/api/albums/{album_id}/photos",
        json={"photo_ids": photo_ids},
    )
    assert response.status_code == 200


def test_upload_single_creates_files_and_db_record(client: TestClient) -> None:
    response = client.post(
        "/api/photos/upload",
        files=[("files", ("photo.jpg", build_jpeg_bytes(), "image/jpeg"))]
    )

    assert response.status_code == 201
    payload = response.json()
    assert len(payload["photos"]) == 1

    photo = payload["photos"][0]
    uuid.UUID(Path(photo["file_path"]).stem)

    original = settings.data_dir / "photos" / "originals" / photo["file_path"]
    thumbnail = settings.data_dir / "photos" / "thumbnails" / photo["thumbnail_path"]

    assert original.exists()
    assert thumbnail.exists()
    assert photo["taken_at"] is not None
    assert photo["latitude"] is not None
    assert photo["longitude"] is not None

    with Image.open(thumbnail) as image:
        assert max(image.size) <= 400


def test_upload_multiple_files(client: TestClient) -> None:
    response = client.post(
        "/api/photos/upload",
        files=[
            ("files", ("photo-1.jpg", build_jpeg_bytes(), "image/jpeg")),
            ("files", ("photo-2.jpg", build_jpeg_bytes(width=900), "image/jpeg"))
        ]
    )

    assert response.status_code == 201
    assert len(response.json()["photos"]) == 2


def test_upload_rejects_non_image(client: TestClient) -> None:
    response = client.post(
        "/api/photos/upload",
        files=[("files", ("notes.txt", b"plain text", "text/plain"))]
    )

    assert response.status_code == 400
    assert response.json() == {
        "error": "bad_request",
        "message": "No valid image files provided",
        "status_code": 400,
    }


def test_upload_rejects_oversized_file(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(photos_api, "MAX_UPLOAD_BYTES", 1024)

    response = client.post(
        "/api/photos/upload",
        files=[("files", ("too-large.jpg", build_jpeg_bytes(), "image/jpeg"))]
    )

    assert response.status_code == 413
    assert response.json() == {
        "error": "file_too_large",
        "message": "File too large",
        "status_code": 413,
    }


def test_upload_heic_converts_to_jpeg(client: TestClient) -> None:
    heic_data = build_heic_bytes()

    response = client.post(
        "/api/photos/upload",
        files=[("files", ("photo.heic", heic_data, "image/heic"))]
    )

    assert response.status_code == 201
    photo = response.json()["photos"][0]

    assert photo["mime_type"] == "image/jpeg"
    assert photo["filename"] == "photo.heic"
    assert photo["file_path"].endswith(".jpg")
    assert photo["thumbnail_path"].endswith(".jpg")
    assert photo["width"] == 800
    assert photo["height"] == 600


def test_upload_heic_preserves_exif(client: TestClient) -> None:
    heic_data = build_heic_bytes(with_exif=True)

    response = client.post(
        "/api/photos/upload",
        files=[("files", ("exif.heic", heic_data, "image/heic"))]
    )

    assert response.status_code == 201
    photo = response.json()["photos"][0]
    assert photo["taken_at"] is not None


def test_upload_heif_mime_type_accepted(client: TestClient) -> None:
    heic_data = build_heic_bytes(with_exif=False)

    response = client.post(
        "/api/photos/upload",
        files=[("files", ("photo.heif", heic_data, "image/heif"))]
    )

    assert response.status_code == 201
    photo = response.json()["photos"][0]
    assert photo["mime_type"] == "image/jpeg"


def test_upload_heic_sequence_mime_type_accepted(client: TestClient) -> None:
    heic_data = build_heic_bytes(with_exif=False)

    response = client.post(
        "/api/photos/upload",
        files=[("files", ("photo.heic", heic_data, "image/heic-sequence"))]
    )

    assert response.status_code == 201
    photo = response.json()["photos"][0]
    assert photo["mime_type"] == "image/jpeg"
    assert photo["file_path"].endswith(".jpg")


def test_upload_heic_octet_stream_with_extension_accepted(client: TestClient) -> None:
    heic_data = build_heic_bytes(with_exif=False)

    response = client.post(
        "/api/photos/upload",
        files=[("files", ("IMG_1205.HEIC", heic_data, "application/octet-stream"))]
    )

    assert response.status_code == 201
    photo = response.json()["photos"][0]
    assert photo["mime_type"] == "image/jpeg"
    assert photo["file_path"].endswith(".jpg")


def test_create_photo_rolls_back_file_on_thumbnail_failure(
    test_data_dir: Path,
    monkeypatch: pytest.MonkeyPatch
) -> None:
    def fail_thumbnail(*_args, **_kwargs):
        raise OSError("disk full")

    monkeypatch.setattr(photo_service, "save_thumbnail", fail_thumbnail)

    with pytest.raises(OSError):
        photo_service.create_photo_from_upload(
            filename="photo.jpg",
            mime_type="image/jpeg",
            data=build_jpeg_bytes(with_exif=False)
        )

    originals_dir = test_data_dir / "photos" / "originals"
    thumbnails_dir = test_data_dir / "photos" / "thumbnails"
    assert list(originals_dir.glob("*")) == []
    assert list(thumbnails_dir.glob("*")) == []


def test_run_migrations_creates_data_directory(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch
) -> None:
    data_dir = tmp_path / "missing-parent" / "data"
    test_engine = create_engine(
        f"sqlite:///{(data_dir / 'timesand.db').as_posix()}",
        connect_args={"check_same_thread": False}
    )

    monkeypatch.setattr(settings, "data_dir", data_dir)
    monkeypatch.setattr(database, "engine", test_engine)

    database.run_migrations()

    assert data_dir.exists()
    assert (data_dir / "timesand.db").exists()

    test_engine.dispose()


def test_get_photos_returns_paginated_response(client: TestClient) -> None:
    upload_photo(client)
    upload_photo(client)
    upload_photo(client)

    response = client.get("/api/photos", params={"page": 1, "page_size": 2})

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["items"]) == 2
    assert payload["total"] == 3
    assert payload["page"] == 1
    assert payload["page_size"] == 2


def test_get_photo_by_id_and_404(client: TestClient) -> None:
    photo = upload_photo(client)

    get_response = client.get(f"/api/photos/{photo['id']}")
    missing_response = client.get("/api/photos/999999")

    assert get_response.status_code == 200
    assert get_response.json()["id"] == photo["id"]
    assert missing_response.status_code == 404
    assert missing_response.json() == {
        "error": "not_found",
        "message": "Photo not found",
        "status_code": 404,
    }


def test_get_file_and_thumbnail(client: TestClient) -> None:
    photo = upload_photo(client)

    file_response = client.get(f"/api/photos/{photo['id']}/file")
    thumbnail_response = client.get(f"/api/photos/{photo['id']}/thumbnail")

    assert file_response.status_code == 200
    assert thumbnail_response.status_code == 200
    assert file_response.headers["content-type"] == "image/jpeg"
    assert thumbnail_response.headers["content-type"] == "image/jpeg"
    assert file_response.headers["cache-control"] == IMMUTABLE_CACHE_CONTROL
    assert thumbnail_response.headers["cache-control"] == IMMUTABLE_CACHE_CONTROL
    assert "pragma" not in file_response.headers
    assert "pragma" not in thumbnail_response.headers
    assert "expires" not in file_response.headers
    assert "expires" not in thumbnail_response.headers
    assert len(file_response.content) > 0
    assert len(thumbnail_response.content) > 0


def test_delete_photo_removes_db_record_and_files(client: TestClient) -> None:
    photo = upload_photo(client)

    original = settings.data_dir / "photos" / "originals" / photo["file_path"]
    thumbnail = settings.data_dir / "photos" / "thumbnails" / photo["thumbnail_path"]

    assert original.exists()
    assert thumbnail.exists()

    delete_response = client.delete(f"/api/photos/{photo['id']}")

    assert delete_response.status_code == 200
    assert delete_response.json() == {"ok": True}
    assert not original.exists()
    assert not thumbnail.exists()

    get_response = client.get(f"/api/photos/{photo['id']}")
    assert get_response.status_code == 404


def test_delete_photo_cleans_album_links_and_counts(client: TestClient) -> None:
    target_photo = upload_photo(client)
    retained_photo = upload_photo(client)
    first_album = create_album(client, "Album One")
    second_album = create_album(client, "Album Two")

    add_photos_to_album(client, first_album["id"], [target_photo["id"], retained_photo["id"]])
    add_photos_to_album(client, second_album["id"], [target_photo["id"]])

    delete_response = client.delete(f"/api/photos/{target_photo['id']}")

    assert delete_response.status_code == 200
    assert delete_response.json() == {"ok": True}

    first_album_payload = client.get(f"/api/albums/{first_album['id']}").json()
    second_album_payload = client.get(f"/api/albums/{second_album['id']}").json()
    first_album_photo_list = client.get(
        "/api/photos",
        params={"album_id": first_album["id"], "page_size": 100},
    ).json()
    second_album_photo_list = client.get(
        "/api/photos",
        params={"album_id": second_album["id"], "page_size": 100},
    ).json()

    assert first_album_payload["photo_count"] == 1
    assert second_album_payload["photo_count"] == 0
    assert first_album_photo_list["total"] == 1
    assert second_album_photo_list["total"] == 0
    assert {item["id"] for item in first_album_photo_list["items"]} == {retained_photo["id"]}


def test_delete_photo_clears_cover_photo_reference(client: TestClient) -> None:
    cover_photo = upload_photo(client)
    album = create_album(client, "Cover Album")
    add_photos_to_album(client, album["id"], [cover_photo["id"]])

    set_cover_response = client.put(
        f"/api/albums/{album['id']}",
        json={
            "name": album["name"],
            "description": album["description"],
            "cover_photo_id": cover_photo["id"],
        },
    )
    assert set_cover_response.status_code == 200

    delete_response = client.delete(f"/api/photos/{cover_photo['id']}")
    assert delete_response.status_code == 200

    album_payload = client.get(f"/api/albums/{album['id']}").json()
    assert album_payload["cover_photo_id"] is None
    assert album_payload["cover_photo"] is None


def test_upload_returns_400_when_thumbnail_generation_fails(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    def fail_thumbnail(*_args, **_kwargs):
        raise ValueError("broken tiny image")

    monkeypatch.setattr(Image.Image, "thumbnail", fail_thumbnail)

    response = client.post(
        "/api/photos/upload",
        files=[("files", ("tiny.jpg", build_jpeg_bytes(width=1, height=1, with_exif=False), "image/jpeg"))],
    )

    assert response.status_code == 400
    assert response.json() == {
        "error": "bad_request",
        "message": "Invalid image file",
        "status_code": 400,
    }


def test_upload_returns_400_when_exif_extraction_fails(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    def fail_extract(*_args, **_kwargs):
        raise ValueError("invalid exif payload")

    monkeypatch.setattr(photo_service, "extract_exif_metadata", fail_extract)

    response = client.post(
        "/api/photos/upload",
        files=[("files", ("tiny.jpg", build_jpeg_bytes(width=1, height=1, with_exif=False), "image/jpeg"))],
    )

    assert response.status_code == 400
    assert response.json() == {
        "error": "bad_request",
        "message": "Invalid image file",
        "status_code": 400,
    }
