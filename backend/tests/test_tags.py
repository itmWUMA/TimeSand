from __future__ import annotations

from io import BytesIO

from PIL import Image
from fastapi.testclient import TestClient


def build_jpeg_bytes(width: int = 640, height: int = 480) -> bytes:
    image = Image.new("RGB", (width, height), color=(80, 180, 255))
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


def create_tag(auth_client: TestClient, name: str) -> dict:
    response = auth_client.post("/api/tags", json={"name": name})
    assert response.status_code == 201
    return response.json()


def test_tag_crud_and_duplicate_name(auth_client: TestClient) -> None:
    tag = create_tag(auth_client, "sunset")

    list_response = auth_client.get("/api/tags")
    assert list_response.status_code == 200
    assert list_response.json()["items"] == [tag]

    duplicate_response = auth_client.post("/api/tags", json={"name": "sunset"})
    assert duplicate_response.status_code == 409

    delete_response = auth_client.delete(f"/api/tags/{tag['id']}")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"ok": True}

    list_after_delete = auth_client.get("/api/tags")
    assert list_after_delete.status_code == 200
    assert list_after_delete.json()["items"] == []


def test_add_and_remove_tags_on_photo(auth_client: TestClient) -> None:
    photo = upload_photo(auth_client)
    first_tag = create_tag(auth_client, "travel")
    second_tag = create_tag(auth_client, "night")

    add_response = auth_client.post(
        f"/api/photos/{photo['id']}/tags",
        json={"tag_ids": [first_tag["id"], second_tag["id"]]},
    )
    assert add_response.status_code == 200
    assert add_response.json() == {"ok": True}

    filtered_response = auth_client.get("/api/photos", params={"tag_id": first_tag["id"], "page_size": 50})
    assert filtered_response.status_code == 200
    filtered_payload = filtered_response.json()
    assert filtered_payload["total"] == 1
    assert filtered_payload["items"][0]["id"] == photo["id"]

    remove_response = auth_client.delete(f"/api/photos/{photo['id']}/tags/{first_tag['id']}")
    assert remove_response.status_code == 200
    assert remove_response.json() == {"ok": True}

    filtered_after_remove = auth_client.get("/api/photos", params={"tag_id": first_tag["id"]})
    assert filtered_after_remove.status_code == 200
    assert filtered_after_remove.json()["total"] == 0


def test_delete_tag_removes_all_photo_associations(auth_client: TestClient) -> None:
    photo = upload_photo(auth_client)
    tag = create_tag(auth_client, "portrait")

    add_response = auth_client.post(
        f"/api/photos/{photo['id']}/tags",
        json={"tag_ids": [tag["id"]]},
    )
    assert add_response.status_code == 200

    filtered_before_delete = auth_client.get("/api/photos", params={"tag_id": tag["id"]})
    assert filtered_before_delete.status_code == 200
    assert filtered_before_delete.json()["total"] == 1

    delete_response = auth_client.delete(f"/api/tags/{tag['id']}")
    assert delete_response.status_code == 200

    filtered_after_delete = auth_client.get("/api/photos", params={"tag_id": tag["id"]})
    assert filtered_after_delete.status_code == 200
    assert filtered_after_delete.json()["total"] == 0


def test_remove_missing_tag_association_returns_404(auth_client: TestClient) -> None:
    photo = upload_photo(auth_client)
    tag = create_tag(auth_client, "detached")

    response = auth_client.delete(f"/api/photos/{photo['id']}/tags/{tag['id']}")

    assert response.status_code == 404
    assert response.json() == {
        "error": "not_found",
        "message": "Tag is not attached to photo",
        "status_code": 404,
    }


def test_tag_name_rejects_more_than_255_characters(auth_client: TestClient) -> None:
    response = auth_client.post("/api/tags", json={"name": "x" * 256})

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"] == "validation_error"
    assert "name" in payload["message"]
