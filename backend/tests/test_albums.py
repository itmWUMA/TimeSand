from __future__ import annotations

from io import BytesIO

from PIL import Image
from fastapi.testclient import TestClient


def build_jpeg_bytes(width: int = 640, height: int = 480) -> bytes:
    image = Image.new("RGB", (width, height), color=(255, 180, 80))
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def upload_photo(client: TestClient, filename: str = "photo.jpg") -> dict:
    response = client.post(
        "/api/photos/upload",
        files=[("files", (filename, build_jpeg_bytes(), "image/jpeg"))],
    )
    assert response.status_code == 201
    return response.json()["photos"][0]


def create_album(client: TestClient, name: str = "Vacation 2023", description: str = "Summer trip") -> dict:
    response = client.post(
        "/api/albums",
        json={"name": name, "description": description},
    )
    assert response.status_code == 201
    return response.json()


def test_album_crud_lifecycle(client: TestClient) -> None:
    album = create_album(client)

    get_response = client.get(f"/api/albums/{album['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Vacation 2023"
    assert get_response.json()["photo_count"] == 0

    update_response = client.put(
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

    list_response = client.get("/api/albums")
    assert list_response.status_code == 200
    payload = list_response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["id"] == album["id"]

    delete_response = client.delete(f"/api/albums/{album['id']}")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"ok": True}

    missing_response = client.get(f"/api/albums/{album['id']}")
    assert missing_response.status_code == 404
    assert missing_response.json() == {"detail": "Album not found"}


def test_add_and_remove_photos_in_album(client: TestClient) -> None:
    first = upload_photo(client, "first.jpg")
    second = upload_photo(client, "second.jpg")
    album = create_album(client)

    add_response = client.post(
        f"/api/albums/{album['id']}/photos",
        json={"photo_ids": [first["id"], second["id"]]},
    )
    assert add_response.status_code == 200
    assert add_response.json() == {"ok": True}

    detail_response = client.get(f"/api/albums/{album['id']}")
    assert detail_response.status_code == 200
    assert detail_response.json()["photo_count"] == 2

    filtered_response = client.get("/api/photos", params={"album_id": album["id"], "page_size": 50})
    assert filtered_response.status_code == 200
    filtered_payload = filtered_response.json()
    assert filtered_payload["total"] == 2
    assert {item["id"] for item in filtered_payload["items"]} == {first["id"], second["id"]}

    remove_response = client.delete(f"/api/albums/{album['id']}/photos/{first['id']}")
    assert remove_response.status_code == 200
    assert remove_response.json() == {"ok": True}

    still_exists = client.get(f"/api/photos/{first['id']}")
    assert still_exists.status_code == 200

    detail_after_remove = client.get(f"/api/albums/{album['id']}")
    assert detail_after_remove.status_code == 200
    assert detail_after_remove.json()["photo_count"] == 1


def test_delete_album_keeps_photos(client: TestClient) -> None:
    photo = upload_photo(client)
    album = create_album(client)

    link_response = client.post(
        f"/api/albums/{album['id']}/photos",
        json={"photo_ids": [photo["id"]]},
    )
    assert link_response.status_code == 200

    delete_album = client.delete(f"/api/albums/{album['id']}")
    assert delete_album.status_code == 200

    photo_response = client.get(f"/api/photos/{photo['id']}")
    assert photo_response.status_code == 200

    filtered_response = client.get("/api/photos", params={"album_id": album["id"]})
    assert filtered_response.status_code == 200
    assert filtered_response.json()["total"] == 0


def test_set_album_cover_photo(client: TestClient) -> None:
    photo = upload_photo(client)
    album = create_album(client)

    link_response = client.post(
        f"/api/albums/{album['id']}/photos",
        json={"photo_ids": [photo["id"]]},
    )
    assert link_response.status_code == 200

    update_response = client.put(
        f"/api/albums/{album['id']}",
        json={
            "name": "Vacation 2023",
            "description": "Summer trip",
            "cover_photo_id": photo["id"],
        },
    )
    assert update_response.status_code == 200

    detail_response = client.get(f"/api/albums/{album['id']}")
    assert detail_response.status_code == 200
    payload = detail_response.json()
    assert payload["cover_photo_id"] == photo["id"]
    assert payload["cover_photo"] == f"/api/photos/{photo['id']}/thumbnail"
