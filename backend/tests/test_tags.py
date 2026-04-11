from __future__ import annotations

from io import BytesIO

from PIL import Image
from fastapi.testclient import TestClient


def build_jpeg_bytes(width: int = 640, height: int = 480) -> bytes:
    image = Image.new("RGB", (width, height), color=(80, 180, 255))
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


def create_tag(client: TestClient, name: str) -> dict:
    response = client.post("/api/tags", json={"name": name})
    assert response.status_code == 201
    return response.json()


def test_tag_crud_and_duplicate_name(client: TestClient) -> None:
    tag = create_tag(client, "sunset")

    list_response = client.get("/api/tags")
    assert list_response.status_code == 200
    assert list_response.json()["items"] == [tag]

    duplicate_response = client.post("/api/tags", json={"name": "sunset"})
    assert duplicate_response.status_code == 409

    delete_response = client.delete(f"/api/tags/{tag['id']}")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"ok": True}

    list_after_delete = client.get("/api/tags")
    assert list_after_delete.status_code == 200
    assert list_after_delete.json()["items"] == []


def test_add_and_remove_tags_on_photo(client: TestClient) -> None:
    photo = upload_photo(client)
    first_tag = create_tag(client, "travel")
    second_tag = create_tag(client, "night")

    add_response = client.post(
        f"/api/photos/{photo['id']}/tags",
        json={"tag_ids": [first_tag["id"], second_tag["id"]]},
    )
    assert add_response.status_code == 200
    assert add_response.json() == {"ok": True}

    filtered_response = client.get("/api/photos", params={"tag_id": first_tag["id"], "page_size": 50})
    assert filtered_response.status_code == 200
    filtered_payload = filtered_response.json()
    assert filtered_payload["total"] == 1
    assert filtered_payload["items"][0]["id"] == photo["id"]

    remove_response = client.delete(f"/api/photos/{photo['id']}/tags/{first_tag['id']}")
    assert remove_response.status_code == 200
    assert remove_response.json() == {"ok": True}

    filtered_after_remove = client.get("/api/photos", params={"tag_id": first_tag["id"]})
    assert filtered_after_remove.status_code == 200
    assert filtered_after_remove.json()["total"] == 0


def test_delete_tag_removes_all_photo_associations(client: TestClient) -> None:
    photo = upload_photo(client)
    tag = create_tag(client, "portrait")

    add_response = client.post(
        f"/api/photos/{photo['id']}/tags",
        json={"tag_ids": [tag["id"]]},
    )
    assert add_response.status_code == 200

    filtered_before_delete = client.get("/api/photos", params={"tag_id": tag["id"]})
    assert filtered_before_delete.status_code == 200
    assert filtered_before_delete.json()["total"] == 1

    delete_response = client.delete(f"/api/tags/{tag['id']}")
    assert delete_response.status_code == 200

    filtered_after_delete = client.get("/api/photos", params={"tag_id": tag["id"]})
    assert filtered_after_delete.status_code == 200
    assert filtered_after_delete.json()["total"] == 0
