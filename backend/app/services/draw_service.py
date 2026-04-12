from __future__ import annotations

from datetime import date, datetime, timezone
import random

from sqlmodel import Session, select

from app.models.album import PhotoAlbum
from app.models.photo import Photo

EXACT_MATCH_WEIGHT = 3.0
NEAR_ONE_DAY_WEIGHT = 2.0
NEAR_THREE_DAYS_WEIGHT = 1.5
BASE_WEIGHT = 1.0
REFERENCE_LEAP_YEAR = 2000
REFERENCE_YEAR_DAYS = 366


class NoAvailablePhotosError(ValueError):
    pass


def calculate_draw_weight(
    taken_at: datetime | None,
    *,
    today: date | None = None,
) -> tuple[float, str | None]:
    if taken_at is None:
        return BASE_WEIGHT, None

    now = today or datetime.now(timezone.utc).date()
    taken_date = taken_at.astimezone(timezone.utc).date()
    years_ago = now.year - taken_date.year

    if years_ago <= 0:
        return BASE_WEIGHT, None

    day_distance = circular_month_day_distance(taken_date, now)
    if day_distance == 0:
        return EXACT_MATCH_WEIGHT, f"{years_ago}_years_ago_today"
    if day_distance == 1:
        return NEAR_ONE_DAY_WEIGHT, f"{years_ago}_years_ago_nearby"
    if 2 <= day_distance <= 3:
        return NEAR_THREE_DAYS_WEIGHT, f"{years_ago}_years_ago_nearby"

    return BASE_WEIGHT, None


def circular_month_day_distance(left: date, right: date) -> int:
    left_ordinal = month_day_ordinal(left)
    right_ordinal = month_day_ordinal(right)
    distance = abs(left_ordinal - right_ordinal)
    return min(distance, REFERENCE_YEAR_DAYS - distance)


def month_day_ordinal(value: date) -> int:
    reference_date = date(REFERENCE_LEAP_YEAR, value.month, value.day)
    return reference_date.timetuple().tm_yday


def query_draw_pool(
    session: Session,
    *,
    album_id: int | None = None,
    exclude_ids: list[int] | None = None,
) -> list[Photo]:
    query = select(Photo)

    if album_id is not None:
        query = query.join(PhotoAlbum, PhotoAlbum.photo_id == Photo.id).where(
            PhotoAlbum.album_id == album_id
        )

    excluded = [photo_id for photo_id in (exclude_ids or []) if photo_id is not None]
    if excluded:
        query = query.where(Photo.id.notin_(excluded))

    if album_id is not None:
        query = query.distinct()

    return list(session.exec(query).all())


def choose_weighted_photo(
    candidates: list[Photo],
    *,
    today: date | None = None,
) -> tuple[Photo, str | None]:
    weighted_candidates = [
        (photo, *calculate_draw_weight(photo.taken_at, today=today))
        for photo in candidates
    ]

    weights = [item[1] for item in weighted_candidates]
    selected = random.choices([item[0] for item in weighted_candidates], weights=weights, k=1)[0]

    for photo, _, reason in weighted_candidates:
        if photo.id == selected.id:
            return selected, reason

    return selected, None


def draw_photo(
    session: Session,
    *,
    album_id: int | None = None,
    exclude_ids: list[int] | None = None,
    today: date | None = None,
) -> tuple[Photo, str | None]:
    candidates = query_draw_pool(
        session,
        album_id=album_id,
        exclude_ids=exclude_ids,
    )
    if not candidates:
        raise NoAvailablePhotosError

    return choose_weighted_photo(candidates, today=today)


def count_available_photos(session: Session) -> int:
    return len(query_draw_pool(session))
