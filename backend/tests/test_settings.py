from __future__ import annotations

from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image


def build_jpeg_bytes(width: int = 1200, height: int = 800) -> bytes:
    image = Image.new("RGB", (width, height), color=(255, 170, 0))
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def test_get_storage_info_returns_zero_when_empty(client: TestClient) -> None:
    response = client.get("/api/settings/storage")

    assert response.status_code == 200
    assert response.json() == {
        "photo_count": 0,
        "music_count": 0,
        "photo_storage_bytes": 0,
        "music_storage_bytes": 0,
        "total_storage_bytes": 0,
        "thumbnail_count": 0,
    }


def test_get_storage_info_counts_uploaded_photo(client: TestClient) -> None:
    upload_response = client.post(
        "/api/photos/upload",
        files=[("files", ("photo.jpg", build_jpeg_bytes(), "image/jpeg"))],
    )
    assert upload_response.status_code == 201

    response = client.get("/api/settings/storage")

    assert response.status_code == 200
    payload = response.json()
    assert payload["photo_count"] == 1
    assert payload["music_count"] == 0
    assert payload["photo_storage_bytes"] > 0
    assert payload["music_storage_bytes"] == 0
    assert payload["total_storage_bytes"] == payload["photo_storage_bytes"]
    assert payload["thumbnail_count"] == 1
