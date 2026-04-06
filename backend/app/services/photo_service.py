from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any
from uuid import uuid4

from PIL import Image, UnidentifiedImageError
from PIL.ExifTags import GPSTAGS

from app.core.config import settings
from app.models.photo import Photo

ALLOWED_MIME_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif"
}

IMAGE_FORMAT_BY_SUFFIX: dict[str, str] = {
    ".jpg": "JPEG",
    ".jpeg": "JPEG",
    ".png": "PNG",
    ".webp": "WEBP",
    ".gif": "GIF"
}


class InvalidPhotoUploadError(ValueError):
    pass


def originals_directory() -> Path:
    return settings.data_dir / "photos" / "originals"


def thumbnails_directory() -> Path:
    return settings.data_dir / "photos" / "thumbnails"


def ensure_storage_directories() -> None:
    originals_directory().mkdir(parents=True, exist_ok=True)
    thumbnails_directory().mkdir(parents=True, exist_ok=True)


def get_original_path(relative_path: str) -> Path:
    return originals_directory() / relative_path


def get_thumbnail_path(relative_path: str) -> Path:
    return thumbnails_directory() / relative_path


def create_photo_from_upload(filename: str | None, mime_type: str | None, data: bytes) -> Photo:
    normalized_mime_type = (mime_type or "").lower()
    suffix = ALLOWED_MIME_TYPES.get(normalized_mime_type)
    if suffix is None:
        raise InvalidPhotoUploadError("Unsupported file type")

    if not data:
        raise InvalidPhotoUploadError("Empty upload")

    ensure_storage_directories()

    try:
        with Image.open(BytesIO(data)) as image:
            image.load()
            width, height = image.size
            taken_at, latitude, longitude = extract_exif_metadata(image)

            storage_id = str(uuid4())
            original_name = f"{storage_id}{suffix}"
            thumbnail_name = f"{storage_id}_thumb{suffix}"

            original_path = get_original_path(original_name)
            thumbnail_path = get_thumbnail_path(thumbnail_name)

            original_path.write_bytes(data)
            save_thumbnail(image, thumbnail_path, suffix)

    except UnidentifiedImageError as exc:
        raise InvalidPhotoUploadError("Invalid image file") from exc

    return Photo(
        filename=filename or original_name,
        file_path=original_name,
        thumbnail_path=thumbnail_name,
        file_size=len(data),
        width=width,
        height=height,
        taken_at=taken_at,
        latitude=latitude,
        longitude=longitude,
        mime_type=normalized_mime_type
    )


def save_thumbnail(image: Image.Image, path: Path, suffix: str) -> None:
    thumbnail = image.copy()
    thumbnail.thumbnail((400, 400), Image.Resampling.LANCZOS)

    format_name = IMAGE_FORMAT_BY_SUFFIX[suffix]
    if format_name == "JPEG" and thumbnail.mode not in ("RGB", "L"):
        thumbnail = thumbnail.convert("RGB")

    thumbnail.save(path, format=format_name)


def extract_exif_metadata(image: Image.Image) -> tuple[datetime | None, float | None, float | None]:
    exif_data = image.getexif()
    if not exif_data:
        return None, None, None

    taken_at = parse_exif_datetime(
        exif_data.get(36867),
        exif_data.get(36880),
        exif_data.get(36881)
    )

    gps_value = None
    if hasattr(exif_data, "get_ifd"):
        try:
            gps_value = exif_data.get_ifd(34853)
        except KeyError:
            gps_value = exif_data.get(34853)
    else:
        gps_value = exif_data.get(34853)

    latitude, longitude = parse_exif_gps(gps_value)

    return taken_at, latitude, longitude


def parse_exif_datetime(
    value: Any,
    offset_time: Any,
    offset_time_original: Any
) -> datetime | None:
    if not value:
        return None

    if isinstance(value, bytes):
        raw_value = value.decode(errors="ignore")
    else:
        raw_value = str(value)

    try:
        base_time = datetime.strptime(raw_value, "%Y:%m:%d %H:%M:%S")
    except ValueError:
        return None

    offset = None
    if offset_time_original:
        offset = str(offset_time_original)
    elif offset_time:
        offset = str(offset_time)

    if offset:
        try:
            with_offset = datetime.fromisoformat(base_time.strftime("%Y-%m-%dT%H:%M:%S") + offset)
            return with_offset.astimezone(timezone.utc)
        except ValueError:
            pass

    return base_time.replace(tzinfo=timezone.utc)


def parse_exif_gps(value: Any) -> tuple[float | None, float | None]:
    gps_items: dict[Any, Any] | None = None

    if isinstance(value, dict):
        gps_items = value
    elif hasattr(value, "items"):
        gps_items = dict(value.items())

    if gps_items is None:
        return None, None

    gps_data = {GPSTAGS.get(key, key): gps_value for key, gps_value in gps_items.items()}

    latitude = convert_gps_to_decimal(
        gps_data.get("GPSLatitude"),
        gps_data.get("GPSLatitudeRef")
    )
    longitude = convert_gps_to_decimal(
        gps_data.get("GPSLongitude"),
        gps_data.get("GPSLongitudeRef")
    )

    return latitude, longitude


def convert_gps_to_decimal(value: Any, direction: Any) -> float | None:
    if not isinstance(value, tuple) or len(value) != 3:
        return None

    degrees = float(value[0])
    minutes = float(value[1])
    seconds = float(value[2])

    decimal = degrees + minutes / 60 + seconds / 3600

    if isinstance(direction, bytes):
        normalized_direction = direction.decode(errors="ignore").upper()
    else:
        normalized_direction = str(direction).upper()

    if normalized_direction in {"S", "W"}:
        decimal *= -1

    return decimal


def delete_photo_files(photo: Photo) -> None:
    for path in (get_original_path(photo.file_path), get_thumbnail_path(photo.thumbnail_path)):
        if path.exists():
            path.unlink()
