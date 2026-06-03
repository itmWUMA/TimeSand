from __future__ import annotations

from io import BytesIO

from PIL import Image
from fastapi.testclient import TestClient


def build_jpeg_bytes(width: int = 640, height: int = 480) -> bytes:
    image = Image.new("RGB", (width, height), color=(255, 180, 80))
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def upload_photo(auth_client: TestClient, filename: str = "photo.jpg") -> dict:
    response = auth_client.post(
        "/api/photos/upload",
        files=[("files", (filename, build_jpeg_bytes(), "image/jpeg"))],
    )
    assert response.status_code == 201
    return response.json()["photos"][0]


def create_album(auth_client: TestClient, name: str = "Vacation 2023", description: str = "Summer trip") -> dict:
    response = auth_client.post(
        "/api/albums",
        json={"name": name, "description": description},
    )
    assert response.status_code == 201
    return response.json()


def test_album_crud_lifecycle(auth_client: TestClient) -> None:
    album = create_album(auth_client)

    get_response = auth_client.get(f"/api/albums/{album['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Vacation 2023"
    assert get_response.json()["photo_count"] == 0

    update_response = auth_client.put(
        f"/api/albums/{album['id']}",
        json={
            "name": "Vacation 2024",
            "description": "Updated",
            "cover_photo_id": None,
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Vacation 2024"
    assert update_response.json()["description"] == "Updated"

    list_response = auth_client.get("/api/albums")
    assert list_response.status_code == 200
    payload = list_response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["id"] == album["id"]

    delete_response = auth_client.delete(f"/api/albums/{album['id']}")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"ok": True}

    missing_response = auth_client.get(f"/api/albums/{album['id']}")
    assert missing_response.status_code == 404
    assert missing_response.json() == {
        "error": "not_found",
        "message": "Album not found",
        "status_code": 404,
    }


def test_add_and_remove_photos_in_album(auth_client: TestClient) -> None:
    first = upload_photo(auth_client, "first.jpg")
    second = upload_photo(auth_client, "second.jpg")
    album = create_album(auth_client)

    add_response = auth_client.post(
        f"/api/albums/{album['id']}/photos",
        json={"photo_ids": [first["id"], second["id"]]},
    )
    assert add_response.status_code == 200
    assert add_response.json() == {"ok": True}

    detail_response = auth_client.get(f"/api/albums/{album['id']}")
    assert detail_response.status_code == 200
    assert detail_response.json()["photo_count"] == 2

    filtered_response = auth_client.get("/api/photos", params={"album_id": album["id"], "page_size": 50})
    assert filtered_response.status_code == 200
    filtered_payload = filtered_response.json()
    assert filtered_payload["total"] == 2
    assert {item["id"] for item in filtered_payload["items"]} == {first["id"], second["id"]}

    remove_response = auth_client.delete(f"/api/albums/{album['id']}/photos/{first['id']}")
    assert remove_response.status_code == 200
    assert remove_response.json() == {"ok": True}

    still_exists = auth_client.get(f"/api/photos/{first['id']}")
    assert still_exists.status_code == 200

    detail_after_remove = auth_client.get(f"/api/albums/{album['id']}")
    assert detail_after_remove.status_code == 200
    assert detail_after_remove.json()["photo_count"] == 1


def test_delete_album_keeps_photos(auth_client: TestClient) -> None:
    photo = upload_photo(auth_client)
    album = create_album(auth_client)

    link_response = auth_client.post(
        f"/api/albums/{album['id']}/photos",
        json={"photo_ids": [photo["id"]]},
    )
    assert link_response.status_code == 200

    delete_album = auth_client.delete(f"/api/albums/{album['id']}")
    assert delete_album.status_code == 200

    photo_response = auth_client.get(f"/api/photos/{photo['id']}")
    assert photo_response.status_code == 200

    filtered_response = auth_client.get("/api/photos", params={"album_id": album["id"]})
    assert filtered_response.status_code == 200
    assert filtered_response.json()["total"] == 0


def test_set_album_cover_photo(auth_client: TestClient) -> None:
    photo = upload_photo(auth_client)
    album = create_album(auth_client)

    link_response = auth_client.post(
        f"/api/albums/{album['id']}/photos",
        json={"photo_ids": [photo["id"]]},
    )
    assert link_response.status_code == 200

    update_response = auth_client.put(
        f"/api/albums/{album['id']}",
        json={
            "name": "Vacation 2023",
            "description": "Summer trip",
            "cover_photo_id": photo["id"],
        },
    )
    assert update_response.status_code == 200

    detail_response = auth_client.get(f"/api/albums/{album['id']}")
    assert detail_response.status_code == 200
    payload = detail_response.json()
    assert payload["cover_photo_id"] == photo["id"]
    assert payload["cover_photo"].startswith(f"/api/photos/{photo['id']}/thumbnail?v=")


def test_remove_missing_photo_association_returns_404(auth_client: TestClient) -> None:
    photo = upload_photo(auth_client)
    album = create_album(auth_client)

    response = auth_client.delete(f"/api/albums/{album['id']}/photos/{photo['id']}")

    assert response.status_code == 404
    assert response.json() == {
        "error": "not_found",
        "message": "Photo is not in album",
        "status_code": 404,
    }


def test_album_name_rejects_more_than_80_characters(auth_client: TestClient) -> None:
    long_name = "a" * 81

    create_response = auth_client.post(
        "/api/albums",
        json={"name": long_name, "description": "too long"},
    )
    assert create_response.status_code == 422
    create_payload = create_response.json()
    assert create_payload["error"] == "validation_error"
    assert "name" in create_payload["message"]

    album = create_album(auth_client)
    update_response = auth_client.put(
        f"/api/albums/{album['id']}",
        json={"name": long_name, "description": "too long", "cover_photo_id": None},
    )
    assert update_response.status_code == 422
    update_payload = update_response.json()
    assert update_payload["error"] == "validation_error"
    assert "name" in update_payload["message"]


def test_album_name_is_trimmed_before_saving(auth_client: TestClient) -> None:
    create_response = auth_client.post(
        "/api/albums",
        json={"name": "  Trimmed Album  ", "description": None},
    )

    assert create_response.status_code == 201
    assert create_response.json()["name"] == "Trimmed Album"

    update_response = auth_client.put(
        f"/api/albums/{create_response.json()['id']}",
        json={"name": "  Updated Album  ", "description": None, "cover_photo_id": None},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Updated Album"
