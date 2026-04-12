from __future__ import annotations

import wave
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient


def build_wav_bytes(duration_seconds: int = 1) -> bytes:
    with TemporaryDirectory() as temp_dir:
        file_path = Path(temp_dir) / "sample.wav"
        with wave.open(str(file_path), "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(44100)
            wav_file.writeframes(b"\x00\x00" * 44100 * duration_seconds)
        return file_path.read_bytes()


def upload_track(client: TestClient, filename: str) -> dict:
    response = client.post(
        "/api/music/upload",
        files=[("files", (filename, build_wav_bytes(), "audio/wav"))],
    )
    assert response.status_code == 201
    return response.json()["tracks"][0]


def create_album(client: TestClient, name: str = "Album For Playlist") -> dict:
    response = client.post("/api/albums", json={"name": name, "description": "testing"})
    assert response.status_code == 201
    return response.json()


def test_default_playlist_exists_after_startup(client: TestClient) -> None:
    response = client.get("/api/playlists")

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["is_default"] is True
    assert items[0]["name"] == "Default Playlist"


def test_playlist_crud_with_track_ordering(client: TestClient) -> None:
    first = upload_track(client, "first.wav")
    second = upload_track(client, "second.wav")
    third = upload_track(client, "third.wav")

    create_response = client.post("/api/playlists", json={"name": "Chill Vibes"})
    assert create_response.status_code == 201
    playlist = create_response.json()
    playlist_id = playlist["id"]

    for track in (first, second, third):
        add_response = client.post(
            f"/api/playlists/{playlist_id}/tracks",
            json={"music_id": track["id"]},
        )
        assert add_response.status_code == 200
        assert add_response.json() == {"ok": True}

    detail_response = client.get(f"/api/playlists/{playlist_id}")
    assert detail_response.status_code == 200
    assert [item["id"] for item in detail_response.json()["tracks"]] == [
        first["id"],
        second["id"],
        third["id"],
    ]

    reorder_response = client.put(
        f"/api/playlists/{playlist_id}",
        json={
            "name": "Reordered Playlist",
            "track_ids": [third["id"], first["id"], second["id"]],
        },
    )
    assert reorder_response.status_code == 200
    assert reorder_response.json()["name"] == "Reordered Playlist"
    assert [item["id"] for item in reorder_response.json()["tracks"]] == [
        third["id"],
        first["id"],
        second["id"],
    ]

    remove_response = client.delete(f"/api/playlists/{playlist_id}/tracks/{first['id']}")
    assert remove_response.status_code == 200
    assert remove_response.json() == {"ok": True}

    detail_after_remove = client.get(f"/api/playlists/{playlist_id}")
    assert detail_after_remove.status_code == 200
    assert [item["id"] for item in detail_after_remove.json()["tracks"]] == [
        third["id"],
        second["id"],
    ]
    assert detail_after_remove.json()["track_count"] == 2

    list_response = client.get("/api/playlists")
    assert list_response.status_code == 200
    listed = next(item for item in list_response.json()["items"] if item["id"] == playlist_id)
    assert listed["track_count"] == 2

    delete_response = client.delete(f"/api/playlists/{playlist_id}")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"ok": True}

    missing = client.get(f"/api/playlists/{playlist_id}")
    assert missing.status_code == 404
    assert missing.json() == {"detail": "Playlist not found"}


def test_cannot_delete_default_playlist(client: TestClient) -> None:
    list_response = client.get("/api/playlists")
    assert list_response.status_code == 200

    default_playlist = next(item for item in list_response.json()["items"] if item["is_default"])
    response = client.delete(f"/api/playlists/{default_playlist['id']}")

    assert response.status_code == 400
    assert response.json() == {"detail": "Default playlist cannot be deleted"}


def test_album_playlist_association_set_and_clear(client: TestClient) -> None:
    album = create_album(client)
    playlist_response = client.post("/api/playlists", json={"name": "Album Binding"})
    assert playlist_response.status_code == 201
    playlist_id = playlist_response.json()["id"]

    set_response = client.put(
        f"/api/albums/{album['id']}/playlist",
        json={"playlist_id": playlist_id},
    )
    assert set_response.status_code == 200
    assert set_response.json() == {"ok": True}

    album_detail = client.get(f"/api/albums/{album['id']}")
    assert album_detail.status_code == 200
    assert album_detail.json()["playlist_id"] == playlist_id

    clear_response = client.delete(f"/api/albums/{album['id']}/playlist")
    assert clear_response.status_code == 200
    assert clear_response.json() == {"ok": True}

    album_after_clear = client.get(f"/api/albums/{album['id']}")
    assert album_after_clear.status_code == 200
    assert album_after_clear.json()["playlist_id"] is None
