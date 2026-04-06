from __future__ import annotations

import uuid
from io import BytesIO
from pathlib import Path

from PIL import Image
from PIL.TiffImagePlugin import IFDRational
from fastapi.testclient import TestClient

from app.core.config import settings


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


def upload_photo(client: TestClient) -> dict:
    response = client.post(
        "/api/photos/upload",
        files=[("files", ("photo.jpg", build_jpeg_bytes(), "image/jpeg"))]
    )

    assert response.status_code == 201
    return response.json()["photos"][0]


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
    assert response.json() == {"detail": "No valid image files provided"}


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
    assert missing_response.json() == {"detail": "Photo not found"}


def test_get_file_and_thumbnail(client: TestClient) -> None:
    photo = upload_photo(client)

    file_response = client.get(f"/api/photos/{photo['id']}/file")
    thumbnail_response = client.get(f"/api/photos/{photo['id']}/thumbnail")

    assert file_response.status_code == 200
    assert thumbnail_response.status_code == 200
    assert file_response.headers["content-type"] == "image/jpeg"
    assert thumbnail_response.headers["content-type"] == "image/jpeg"
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
