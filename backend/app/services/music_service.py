from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from mutagen import File as MutagenFile, MutagenError

from app.core.config import settings
from app.models.music import Music

ALLOWED_MIME_TYPES: dict[str, str] = {
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/flac": ".flac",
    "audio/ogg": ".ogg",
    "audio/aac": ".aac",
    "audio/x-aac": ".aac",
}


class InvalidMusicUploadError(ValueError):
    pass


def music_directory() -> Path:
    return settings.data_dir / "music" / "files"


def ensure_music_storage_directory() -> None:
    music_directory().mkdir(parents=True, exist_ok=True)


def get_music_path(relative_path: str) -> Path:
    return music_directory() / relative_path


def create_music_from_upload(filename: str | None, mime_type: str | None, data: bytes) -> Music:
    normalized_mime_type = (mime_type or "").lower()
    suffix = ALLOWED_MIME_TYPES.get(normalized_mime_type)
    if suffix is None:
        raise InvalidMusicUploadError("Unsupported file type")

    if not data:
        raise InvalidMusicUploadError("Empty upload")

    ensure_music_storage_directory()

    storage_name = f"{uuid4()}{suffix}"
    storage_path = get_music_path(storage_name)

    try:
        storage_path.write_bytes(data)
        title, artist, duration = extract_audio_metadata(storage_path)
    except Exception:
        storage_path.unlink(missing_ok=True)
        raise

    fallback_name = Path(filename or storage_name).stem
    return Music(
        title=title or fallback_name,
        artist=artist,
        filename=filename or storage_name,
        file_path=storage_name,
        file_size=len(data),
        duration=duration,
        mime_type=normalized_mime_type,
    )


def extract_audio_metadata(file_path: Path) -> tuple[str | None, str | None, float | None]:
    try:
        audio_full = MutagenFile(file_path, easy=False)
    except MutagenError as exc:
        raise InvalidMusicUploadError("File is not a valid audio file") from exc
    if audio_full is None:
        raise InvalidMusicUploadError("File is not a valid audio file")

    try:
        audio_easy = MutagenFile(file_path, easy=True)
    except MutagenError:
        audio_easy = None

    title = extract_tag_value(audio_easy, ("title", "TIT2"))
    artist = extract_tag_value(audio_easy, ("artist", "TPE1"))

    duration = None
    if getattr(audio_full, "info", None) is not None:
        length = getattr(audio_full.info, "length", None)
        if length is not None:
            duration = float(length)

    return title, artist, duration


def extract_tag_value(audio: object, keys: tuple[str, ...]) -> str | None:
    tags = getattr(audio, "tags", None)
    if tags is None:
        return None

    for key in keys:
        value = None
        if hasattr(tags, "get"):
            value = tags.get(key)
        if value is None:
            continue

        resolved = normalize_tag_value(value)
        if resolved:
            return resolved

    return None


def normalize_tag_value(value: object) -> str | None:
    if isinstance(value, str):
        return value.strip() or None

    if isinstance(value, list):
        for item in value:
            normalized = normalize_tag_value(item)
            if normalized:
                return normalized
        return None

    text = getattr(value, "text", None)
    if isinstance(text, list):
        for item in text:
            normalized = normalize_tag_value(item)
            if normalized:
                return normalized
        return None
    if isinstance(text, str):
        normalized = text.strip()
        return normalized or None

    normalized = str(value).strip()
    return normalized or None


def delete_music_file(music: Music) -> None:
    get_music_path(music.file_path).unlink(missing_ok=True)
