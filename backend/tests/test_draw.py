from __future__ import annotations

from datetime import date, datetime, timezone
import re

from fastapi.testclient import TestClient
import pytest
from sqlmodel import Session

from app.models.album import Album, PhotoAlbum
from app.models.photo import Photo
from app.services import draw_service


def create_photo(
    session: Session,
    *,
    filename: str,
    taken_at: datetime | None = None,
) -> Photo:
    photo = Photo(
        filename=filename,
        file_path=f"{filename}.jpg",
        thumbnail_path=f"{filename}_thumb.jpg",
        file_size=2048,
        width=1920,
        height=1080,
        taken_at=taken_at,
        mime_type="image/jpeg",
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)
    return photo


def test_draw_returns_valid_photo(client: TestClient, session: Session) -> None:
    photo_ids = {
        create_photo(session, filename=f"photo-{index}").id or 0
        for index in range(10)
    }

    response = client.post("/api/draw", json={"exclude_ids": []})

    assert response.status_code == 200
    payload = response.json()
    photo = payload["photo"]
    assert photo["id"] in photo_ids
    assert set(photo).issuperset(
        {
            "id",
            "filename",
            "file_path",
            "thumbnail_path",
            "file_size",
            "width",
            "height",
            "taken_at",
            "uploaded_at",
            "mime_type",
        }
    )
    assert payload["weight_reason"] is None


def test_draw_with_all_excluded_returns_pool_empty(client: TestClient, session: Session) -> None:
    first = create_photo(session, filename="first")
    second = create_photo(session, filename="second")

    response = client.post("/api/draw", json={"exclude_ids": [first.id, second.id]})

    assert response.status_code == 200
    assert response.json() == {"pool_empty": True}


def test_draw_with_album_filter_returns_only_album_photo(client: TestClient, session: Session) -> None:
    in_album = create_photo(session, filename="in-album")
    create_photo(session, filename="out-of-album")

    album = Album(name="Travel")
    session.add(album)
    session.commit()
    session.refresh(album)

    session.add(PhotoAlbum(photo_id=in_album.id or 0, album_id=album.id or 0))
    session.commit()

    response = client.post(
        "/api/draw",
        json={"album_id": album.id, "exclude_ids": []},
    )

    assert response.status_code == 200
    assert response.json()["photo"]["id"] == in_album.id


def test_draw_with_nonexistent_album_returns_404(client: TestClient) -> None:
    response = client.post("/api/draw", json={"album_id": 999999, "exclude_ids": []})

    assert response.status_code == 404
    assert response.json() == {
        "error": "not_found",
        "message": "Album not found",
        "status_code": 404,
    }


def test_draw_with_empty_album_returns_404(client: TestClient, session: Session) -> None:
    album = Album(name="Empty")
    session.add(album)
    session.commit()
    session.refresh(album)

    response = client.post("/api/draw", json={"album_id": album.id, "exclude_ids": []})

    assert response.status_code == 404
    assert response.json() == {
        "error": "not_found",
        "message": "No more photos available to draw",
        "status_code": 404,
    }


def test_draw_reset_returns_total_available(client: TestClient, session: Session) -> None:
    create_photo(session, filename="first")
    create_photo(session, filename="second")

    response = client.post("/api/draw/reset")

    assert response.status_code == 200
    assert response.json() == {"ok": True, "total_available": 2}


def test_calculate_draw_weight_for_time_matches() -> None:
    today = date(2026, 4, 12)

    exact_weight, exact_reason = draw_service.calculate_draw_weight(
        datetime(2023, 4, 12, tzinfo=timezone.utc),
        today=today,
    )
    one_day_weight, one_day_reason = draw_service.calculate_draw_weight(
        datetime(2024, 4, 11, tzinfo=timezone.utc),
        today=today,
    )
    three_days_weight, three_days_reason = draw_service.calculate_draw_weight(
        datetime(2021, 4, 15, tzinfo=timezone.utc),
        today=today,
    )
    base_weight, base_reason = draw_service.calculate_draw_weight(None, today=today)

    assert (exact_weight, exact_reason) == (3.0, "3_years_ago_today")
    assert (one_day_weight, one_day_reason) == (2.0, "2_years_ago_nearby")
    assert (three_days_weight, three_days_reason) == (1.5, "5_years_ago_nearby")
    assert (base_weight, base_reason) == (1.0, None)


@pytest.mark.parametrize(
    ("weight_mode", "expected_exact", "expected_near_one", "expected_near_far"),
    [
        ("off", 1.0, 1.0, 1.0),
        ("light", 1.8, 1.4, 1.2),
        ("standard", 3.0, 2.0, 1.5),
        ("strong", 5.0, 3.0, 2.0),
    ],
)
def test_calculate_draw_weight_with_weight_mode_presets(
    weight_mode: str,
    expected_exact: float,
    expected_near_one: float,
    expected_near_far: float,
) -> None:
    today = date(2026, 4, 12)

    exact_weight, exact_reason = draw_service.calculate_draw_weight(
        datetime(2023, 4, 12, tzinfo=timezone.utc),
        today=today,
        weight_mode=weight_mode,
    )
    near_one_weight, near_one_reason = draw_service.calculate_draw_weight(
        datetime(2024, 4, 11, tzinfo=timezone.utc),
        today=today,
        weight_mode=weight_mode,
    )
    near_far_weight, near_far_reason = draw_service.calculate_draw_weight(
        datetime(2021, 4, 15, tzinfo=timezone.utc),
        today=today,
        weight_mode=weight_mode,
    )

    assert (exact_weight, exact_reason) == (expected_exact, "3_years_ago_today")
    assert (near_one_weight, near_one_reason) == (expected_near_one, "2_years_ago_nearby")
    assert (near_far_weight, near_far_reason) == (expected_near_far, "5_years_ago_nearby")


def test_calculate_draw_weight_with_nearby_days_one_only_matches_exact() -> None:
    today = date(2026, 4, 12)

    exact_weight, exact_reason = draw_service.calculate_draw_weight(
        datetime(2023, 4, 12, tzinfo=timezone.utc),
        today=today,
        nearby_days=1,
    )
    one_day_weight, one_day_reason = draw_service.calculate_draw_weight(
        datetime(2024, 4, 11, tzinfo=timezone.utc),
        today=today,
        nearby_days=1,
    )

    assert (exact_weight, exact_reason) == (3.0, "3_years_ago_today")
    assert (one_day_weight, one_day_reason) == (1.0, None)


def test_calculate_draw_weight_with_nearby_days_seven_matches_far_days() -> None:
    today = date(2026, 4, 12)

    five_days_weight, five_days_reason = draw_service.calculate_draw_weight(
        datetime(2021, 4, 17, tzinfo=timezone.utc),
        today=today,
        nearby_days=7,
    )

    assert (five_days_weight, five_days_reason) == (1.5, "5_years_ago_nearby")


def test_draw_rejects_invalid_weight_mode(client: TestClient) -> None:
    response = client.post("/api/draw", json={"weight_mode": "invalid"})

    assert response.status_code == 422


@pytest.mark.parametrize("nearby_days", [0, 8])
def test_draw_rejects_out_of_range_nearby_days(client: TestClient, nearby_days: int) -> None:
    response = client.post("/api/draw", json={"nearby_days": nearby_days})

    assert response.status_code == 422


def test_draw_weight_reason_format(client: TestClient, session: Session, monkeypatch) -> None:
    target = create_photo(
        session,
        filename="anniversary",
        taken_at=datetime.now(timezone.utc).replace(year=datetime.now(timezone.utc).year - 3),
    )
    create_photo(session, filename="fallback", taken_at=None)

    def choose_highest_weight(population: list[Photo], weights: list[float], k: int) -> list[Photo]:
        assert k == 1
        selected_index = max(range(len(population)), key=lambda index: weights[index])
        return [population[selected_index]]

    monkeypatch.setattr(draw_service.random, "choices", choose_highest_weight)

    response = client.post("/api/draw", json={"exclude_ids": []})

    assert response.status_code == 200
    payload = response.json()
    assert payload["photo"]["id"] == target.id
    assert re.match(r"^\d+_years_ago_(today|nearby)$", payload["weight_reason"] or "")
