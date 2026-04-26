from __future__ import annotations

import uuid
import wave
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient
from mutagen.id3 import TIT2, TPE1
from mutagen.wave import WAVE

from app.core.config import settings


def build_wav_bytes(*, with_tags: bool, duration_seconds: int = 1) -> bytes:
    with TemporaryDirectory() as temp_dir:
        file_path = Path(temp_dir) / "sample.wav"
        with wave.open(str(file_path), "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(44100)
            wav_file.writeframes(b"\x00\x00" * 44100 * duration_seconds)

        if with_tags:
            tagged = WAVE(str(file_path))
            if tagged.tags is None:
                tagged.add_tags()
            tagged.tags.add(TIT2(encoding=3, text=["Unit Test Title"]))
            tagged.tags.add(TPE1(encoding=3, text=["Unit Test Artist"]))
            tagged.save()

        return file_path.read_bytes()


def upload_wav_track(
    client: TestClient,
    filename: str = "sample.wav",
    *,
    with_tags: bool = True,
) -> dict:
    response = client.post(
        "/api/music/upload",
        files=[("files", (filename, build_wav_bytes(with_tags=with_tags), "audio/wav"))],
    )

    assert response.status_code == 201
    return response.json()["tracks"][0]


def test_upload_wav_extracts_metadata(client: TestClient) -> None:
    response = client.post(
        "/api/music/upload",
        files=[("files", ("tagged.wav", build_wav_bytes(with_tags=True), "audio/wav"))],
    )

    assert response.status_code == 201
    payload = response.json()
    assert len(payload["tracks"]) == 1

    track = payload["tracks"][0]
    assert track["title"] == "Unit Test Title"
    assert track["artist"] == "Unit Test Artist"
    assert track["duration"] is not None and track["duration"] > 0
    uuid.UUID(Path(track["file_path"]).stem)

    stored_file = settings.data_dir / "music" / "files" / track["file_path"]
    assert stored_file.exists()


def test_upload_without_tags_uses_filename_as_title(client: TestClient) -> None:
    response = client.post(
        "/api/music/upload",
        files=[("files", ("untagged-track.wav", build_wav_bytes(with_tags=False), "audio/wav"))],
    )

    assert response.status_code == 201
    track = response.json()["tracks"][0]
    assert track["title"] == "untagged-track"
    assert track["artist"] is None


def test_upload_non_audio_returns_400(client: TestClient) -> None:
    response = client.post(
        "/api/music/upload",
        files=[("files", ("notes.txt", b"plain text", "text/plain"))],
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "No valid audio files provided"}


def test_upload_corrupt_audio_returns_400(client: TestClient) -> None:
    corrupt_bytes = b"this is not a real mp3 file at all"
    response = client.post(
        "/api/music/upload",
        files=[("files", ("corrupt.mp3", corrupt_bytes, "audio/mpeg"))],
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "No valid audio files provided"}

    stored = list((settings.data_dir / "music" / "files").glob("*.mp3"))
    assert stored == []


def test_list_music_returns_paginated_response(client: TestClient) -> None:
    upload_wav_track(client, filename="first.wav")
    upload_wav_track(client, filename="second.wav")
    upload_wav_track(client, filename="third.wav")

    response = client.get("/api/music", params={"page": 1, "page_size": 2})

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 3
    assert payload["page"] == 1
    assert payload["page_size"] == 2
    assert len(payload["items"]) == 2


def test_get_music_file_includes_accept_ranges_header(client: TestClient) -> None:
    track = upload_wav_track(client, filename="playback.wav")

    response = client.get(f"/api/music/{track['id']}/file")

    assert response.status_code == 200
    assert response.headers["accept-ranges"] == "bytes"
    assert response.headers["content-type"] == "audio/wav"
    assert len(response.content) > 0


def test_delete_music_removes_file_and_playlist_associations(client: TestClient) -> None:
    track = upload_wav_track(client, filename="delete-me.wav")
    playlist_response = client.post("/api/playlists", json={"name": "Deletion Test"})
    assert playlist_response.status_code == 201
    playlist_id = playlist_response.json()["id"]

    add_response = client.post(
        f"/api/playlists/{playlist_id}/tracks",
        json={"music_id": track["id"]},
    )
    assert add_response.status_code == 200

    stored_file = settings.data_dir / "music" / "files" / track["file_path"]
    assert stored_file.exists()

    delete_response = client.delete(f"/api/music/{track['id']}")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"ok": True}
    assert not stored_file.exists()

    playlist_detail = client.get(f"/api/playlists/{playlist_id}")
    assert playlist_detail.status_code == 200
    assert playlist_detail.json()["track_count"] == 0
