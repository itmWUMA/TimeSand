from __future__ import annotations

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api import albums as albums_api


def test_http_exception_404_returns_unified_shape(client: TestClient) -> None:
    response = client.get("/api/albums/999999")

    assert response.status_code == 404
    assert response.json() == {
        "error": "not_found",
        "message": "Album not found",
        "status_code": 404,
    }


def test_http_exception_400_returns_unified_shape(client: TestClient) -> None:
    response = client.post("/api/albums", json={"name": "   "})

    assert response.status_code == 400
    assert response.json() == {
        "error": "bad_request",
        "message": "Album name is required",
        "status_code": 400,
    }


def test_validation_error_returns_unified_shape_with_field_details(client: TestClient) -> None:
    response = client.post("/api/albums", json={"description": "missing-name"})

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"] == "validation_error"
    assert payload["status_code"] == 422
    assert "name" in payload["message"]


def test_unhandled_exception_returns_generic_internal_error(
    client: TestClient,
    monkeypatch,
) -> None:
    def raise_runtime_error(_: str) -> str:
        raise RuntimeError("boom")

    monkeypatch.setattr(albums_api, "normalize_album_name", raise_runtime_error)
    with TestClient(client.app, raise_server_exceptions=False) as error_client:
        response = error_client.post("/api/albums", json={"name": "trigger"})

    assert response.status_code == 500
    assert response.json() == {
        "error": "internal_error",
        "message": "An unexpected error occurred",
        "status_code": 500,
    }


def test_http_exception_500_uses_generic_message(client: TestClient, monkeypatch) -> None:
    def raise_http_500(_: str) -> str:
        raise HTTPException(status_code=500, detail="sensitive internal detail")

    monkeypatch.setattr(albums_api, "normalize_album_name", raise_http_500)
    response = client.post("/api/albums", json={"name": "trigger"})

    assert response.status_code == 500
    assert response.json() == {
        "error": "internal_error",
        "message": "An unexpected error occurred",
        "status_code": 500,
    }
