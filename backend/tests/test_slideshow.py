from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.album import Album, PhotoAlbum
from app.models.photo import Photo


def create_photo(
    session: Session,
    *,
    name: str,
    taken_at: datetime | None,
    uploaded_at: datetime,
) -> Photo:
    photo = Photo(
        filename=f"{name}.jpg",
        file_path=f"{name}.jpg",
        thumbnail_path=f"{name}_thumb.jpg",
        file_size=1024,
        width=1280,
        height=720,
        taken_at=taken_at,
        uploaded_at=uploaded_at,
        mime_type="image/jpeg",
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)
    return photo


def create_album(session: Session, name: str = "Memories") -> Album:
    album = Album(name=name, description=None)
    session.add(album)
    session.commit()
    session.refresh(album)
    return album


def test_get_slideshow_photos_returns_array(client: TestClient, session: Session) -> None:
    first = create_photo(
        session,
        name="first",
        taken_at=datetime(2022, 5, 1, 12, 0, tzinfo=timezone.utc),
        uploaded_at=datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc),
    )
    second = create_photo(
        session,
        name="second",
        taken_at=datetime(2022, 6, 1, 12, 0, tzinfo=timezone.utc),
        uploaded_at=datetime(2026, 1, 2, 12, 0, tzinfo=timezone.utc),
    )

    response = client.get("/api/slideshow/photos")

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload["photos"], list)
    assert {item["id"] for item in payload["photos"]} == {first.id, second.id}


def test_get_slideshow_photos_filters_by_album(client: TestClient, session: Session) -> None:
    in_album = create_photo(
        session,
        name="in-album",
        taken_at=datetime(2021, 1, 1, 0, 0, tzinfo=timezone.utc),
        uploaded_at=datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc),
    )
    outside_album = create_photo(
        session,
        name="outside",
        taken_at=datetime(2021, 2, 1, 0, 0, tzinfo=timezone.utc),
        uploaded_at=datetime(2026, 1, 2, 0, 0, tzinfo=timezone.utc),
    )
    album = create_album(session)

    session.add(PhotoAlbum(photo_id=in_album.id or 0, album_id=album.id or 0))
    session.commit()

    response = client.get("/api/slideshow/photos", params={"album_id": album.id})

    assert response.status_code == 200
    payload = response.json()
    assert {item["id"] for item in payload["photos"]} == {in_album.id}
    assert all(item["id"] != outside_album.id for item in payload["photos"])


def test_get_slideshow_photos_chronological_order(client: TestClient, session: Session) -> None:
    latest = create_photo(
        session,
        name="latest",
        taken_at=datetime(2024, 3, 1, 0, 0, tzinfo=timezone.utc),
        uploaded_at=datetime(2026, 3, 1, 0, 0, tzinfo=timezone.utc),
    )
    first_uploaded = create_photo(
        session,
        name="first-uploaded",
        taken_at=datetime(2024, 1, 1, 0, 0, tzinfo=timezone.utc),
        uploaded_at=datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc),
    )
    second_uploaded = create_photo(
        session,
        name="second-uploaded",
        taken_at=datetime(2024, 1, 1, 0, 0, tzinfo=timezone.utc),
        uploaded_at=datetime(2026, 2, 1, 0, 0, tzinfo=timezone.utc),
    )

    response = client.get(
        "/api/slideshow/photos",
        params={"order": "chronological", "limit": 10},
    )

    assert response.status_code == 200
    payload = response.json()
    assert [item["id"] for item in payload["photos"]] == [
        first_uploaded.id,
        second_uploaded.id,
        latest.id,
    ]


def test_get_slideshow_photos_respects_limit(client: TestClient, session: Session) -> None:
    for index in range(8):
        create_photo(
            session,
            name=f"photo-{index}",
            taken_at=datetime(2023, 1, 1, 0, 0, tzinfo=timezone.utc),
            uploaded_at=datetime(2026, 1, 1, 0, index, tzinfo=timezone.utc),
        )

    response = client.get(
        "/api/slideshow/photos",
        params={"order": "chronological", "limit": 5},
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["photos"]) == 5


def test_get_slideshow_photos_returns_empty_list_when_no_match(client: TestClient) -> None:
    response = client.get("/api/slideshow/photos")

    assert response.status_code == 200
    assert response.json() == {"photos": []}