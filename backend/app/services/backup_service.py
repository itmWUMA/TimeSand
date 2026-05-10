from __future__ import annotations

import shutil
import sqlite3
import threading
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from tempfile import NamedTemporaryFile, TemporaryDirectory
from time import perf_counter

from PIL import Image
from sqlalchemy import func
from sqlmodel import Session, select

from app.core import database as database_module
from app.core.config import settings
from app.core.database import run_migrations
from app.core.logging import get_logger
from app.models.music import Music
from app.models.photo import Photo
from app.services import photo_service

logger = get_logger(__name__)

DATABASE_ARC_NAME = "timesand.db"
PHOTO_ARC_PREFIX = "photos/originals/"
MUSIC_ARC_PREFIX = "music/files/"

# Global lock for backup operations to prevent concurrent import/export
_backup_lock = threading.Lock()


class BackupError(RuntimeError):
    """Base class for backup/restore failures."""


class BackupExportError(BackupError):
    """Raised when backup export fails."""


class BackupValidationError(BackupError):
    """Raised when a backup archive does not match expected structure."""


class BackupRestoreError(BackupError):
    """Raised when backup restore fails."""


@dataclass(slots=True)
class BackupRestoreResult:
    photo_count: int
    music_count: int
    thumbnails_regenerated: bool


def originals_directory() -> Path:
    return settings.data_dir / "photos" / "originals"


def thumbnails_directory() -> Path:
    return settings.data_dir / "photos" / "thumbnails"


def music_directory() -> Path:
    return settings.data_dir / "music" / "files"


def build_backup_download_filename() -> str:
    date_segment = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"timesand-backup-{date_segment}.zip"


def create_backup_archive() -> Path:
    if not _backup_lock.acquire(blocking=False):
        raise BackupExportError("Another backup operation is in progress")

    try:
        started_at = perf_counter()
        snapshot_db_path = _create_database_snapshot_file()

        try:
            with NamedTemporaryFile(prefix="timesand-backup-", suffix=".zip", delete=False) as temp_file:
                archive_path = Path(temp_file.name)

            photo_count = 0
            music_count = 0

            logger.info("backup_export_started")

            with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                archive.write(snapshot_db_path, DATABASE_ARC_NAME)
                archive.writestr(PHOTO_ARC_PREFIX, b"")
                archive.writestr(MUSIC_ARC_PREFIX, b"")

                photo_count = _add_directory_to_archive(
                    archive=archive,
                    source_dir=originals_directory(),
                    arc_prefix=PHOTO_ARC_PREFIX,
                )
                music_count = _add_directory_to_archive(
                    archive=archive,
                    source_dir=music_directory(),
                    arc_prefix=MUSIC_ARC_PREFIX,
                )

            duration_ms = int((perf_counter() - started_at) * 1000)
            logger.info(
                "backup_export_completed",
                size_bytes=archive_path.stat().st_size,
                photo_count=photo_count,
                music_count=music_count,
                duration_ms=duration_ms,
            )
            return archive_path
        except Exception as exc:
            logger.error(
                "backup_export_failed",
                error_type=type(exc).__name__,
                error=str(exc),
            )
            if "archive_path" in locals():
                archive_path.unlink(missing_ok=True)
            raise BackupExportError("Failed to export backup archive") from exc
        finally:
            snapshot_db_path.unlink(missing_ok=True)
    finally:
        _backup_lock.release()


def restore_from_backup_archive(
    archive_path: Path,
    *,
    source_filename: str | None = None,
) -> BackupRestoreResult:
    if not _backup_lock.acquire(blocking=False):
        raise BackupRestoreError("Another backup operation is in progress")
    started_at = perf_counter()
    resolved_filename = source_filename or archive_path.name
    file_size = archive_path.stat().st_size if archive_path.exists() else 0
    logger.info(
        "backup_import_started",
        filename=resolved_filename,
        size_bytes=file_size,
    )

    try:
        validate_backup_archive(archive_path)

        with TemporaryDirectory(prefix="timesand-restore-") as temp_dir_value:
            temp_dir = Path(temp_dir_value)
            extracted_database_path = _extract_backup_archive(archive_path, temp_dir)
            _create_pre_restore_database_backup()
            _restore_database(extracted_database_path)
            _restore_media_directories(temp_dir)

        run_migrations()
        thumbnails_regenerated = rebuild_thumbnails_from_database()
        photo_count, music_count = _count_media_records()

        duration_ms = int((perf_counter() - started_at) * 1000)
        logger.info(
            "backup_import_completed",
            photo_count=photo_count,
            music_count=music_count,
            duration_ms=duration_ms,
        )
        return BackupRestoreResult(
            photo_count=photo_count,
            music_count=music_count,
            thumbnails_regenerated=thumbnails_regenerated,
        )
    except BackupValidationError as exc:
        logger.error(
            "backup_import_failed",
            filename=resolved_filename,
            error=str(exc),
        )
        raise
    except Exception as exc:
        logger.error(
            "backup_import_failed",
            filename=resolved_filename,
            error=str(exc),
        )
        raise BackupRestoreError("Failed to restore backup archive") from exc
    finally:
        _backup_lock.release()


def validate_backup_archive(archive_path: Path) -> None:
    try:
        with zipfile.ZipFile(archive_path, "r") as archive:
            members = archive.namelist()
    except zipfile.BadZipFile as exc:
        raise BackupValidationError("Uploaded file is not a valid zip archive") from exc

    if DATABASE_ARC_NAME not in members:
        raise BackupValidationError("Backup archive is missing timesand.db")

    if not any(name.startswith(PHOTO_ARC_PREFIX) for name in members):
        raise BackupValidationError("Backup archive is missing photos/originals/")

    if not any(name.startswith(MUSIC_ARC_PREFIX) for name in members):
        raise BackupValidationError("Backup archive is missing music/files/")


def rebuild_thumbnails_from_database() -> bool:
    with Session(database_module.engine) as session:
        photos = session.exec(select(Photo)).all()

    started_at = perf_counter()
    logger.info("thumbnail_rebuild_started", photo_count=len(photos))
    _reset_thumbnail_directory()

    for photo in photos:
        original_path = photo_service.get_original_path(photo.file_path)
        thumbnail_path = photo_service.get_thumbnail_path(photo.thumbnail_path)
        thumbnail_path.parent.mkdir(parents=True, exist_ok=True)

        if not original_path.exists():
            raise BackupRestoreError(
                f"Missing original photo file during thumbnail rebuild: {photo.file_path}"
            )

        thumbnail_suffix = Path(photo.thumbnail_path).suffix.lower()
        if thumbnail_suffix not in photo_service.IMAGE_FORMAT_BY_SUFFIX:
            thumbnail_suffix = ".jpg"

        with Image.open(original_path) as image:
            image.load()
            photo_service.save_thumbnail(image, thumbnail_path, thumbnail_suffix)

    duration_ms = int((perf_counter() - started_at) * 1000)
    logger.info("thumbnail_rebuild_completed", duration_ms=duration_ms)
    return True


def _create_database_snapshot_file() -> Path:
    with NamedTemporaryFile(prefix="timesand-db-snapshot-", suffix=".db", delete=False) as temp_file:
        snapshot_path = Path(temp_file.name)

    try:
        snapshot_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(settings.database_path.as_posix()) as source_connection:
            with sqlite3.connect(snapshot_path.as_posix()) as target_connection:
                source_connection.backup(target_connection)
        return snapshot_path
    except Exception:
        snapshot_path.unlink(missing_ok=True)
        raise


def _restore_database(source_database_path: Path) -> None:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    database_module.engine.dispose()

    with sqlite3.connect(source_database_path.as_posix()) as source_connection:
        with sqlite3.connect(settings.database_path.as_posix()) as target_connection:
            source_connection.backup(target_connection)

    database_module.engine.dispose()


def _create_pre_restore_database_backup() -> None:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    source_db = settings.database_path
    if not source_db.exists():
        return

    backup_path = settings.data_dir / "timesand.db.pre-restore"
    shutil.copy2(source_db, backup_path)


def _restore_media_directories(temp_root: Path) -> None:
    extracted_originals_dir = temp_root / PHOTO_ARC_PREFIX
    extracted_music_dir = temp_root / MUSIC_ARC_PREFIX

    if not extracted_originals_dir.exists():
        raise BackupValidationError("Backup archive is missing extracted photos/originals/")
    if not extracted_music_dir.exists():
        raise BackupValidationError("Backup archive is missing extracted music/files/")

    _replace_directory(source=extracted_originals_dir, target=originals_directory())
    _replace_directory(source=extracted_music_dir, target=music_directory())


def _replace_directory(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(source, target)


def _extract_backup_archive(archive_path: Path, temp_root: Path) -> Path:
    expected_db_path = (temp_root / DATABASE_ARC_NAME).resolve()
    base_resolved = temp_root.resolve()

    # Zip bomb protection limits
    MAX_SINGLE_FILE_SIZE = 100 * 1024 * 1024  # 100MB per file
    MAX_TOTAL_UNCOMPRESSED_SIZE = 500 * 1024 * 1024  # 500MB total
    MAX_COMPRESSION_RATIO = 100  # Reject if compressed:uncompressed > 1:100
    MAX_FILE_COUNT = 100_000  # Reject excessive file counts

    with zipfile.ZipFile(archive_path, "r") as archive:
        members = archive.infolist()

        # Check file count
        if len(members) > MAX_FILE_COUNT:
            raise BackupValidationError(
                f"Backup archive contains too many files ({len(members)} > {MAX_FILE_COUNT})"
            )

        # Check sizes and compression ratios
        total_uncompressed = 0
        total_compressed = 0
        for member in members:
            if member.is_dir():
                continue

            # Check single file size
            if member.file_size > MAX_SINGLE_FILE_SIZE:
                raise BackupValidationError(
                    f"File {member.filename} exceeds maximum size ({member.file_size} > {MAX_SINGLE_FILE_SIZE})"
                )

            total_uncompressed += member.file_size
            total_compressed += member.compress_size

            # Check compression ratio for individual file
            if member.compress_size > 0 and member.file_size / member.compress_size > MAX_COMPRESSION_RATIO:
                raise BackupValidationError(
                    f"File {member.filename} has suspicious compression ratio"
                )

        # Check total uncompressed size
        if total_uncompressed > MAX_TOTAL_UNCOMPRESSED_SIZE:
            raise BackupValidationError(
                f"Total uncompressed size exceeds limit ({total_uncompressed} > {MAX_TOTAL_UNCOMPRESSED_SIZE})"
            )

        # Check overall compression ratio
        if total_compressed > 0 and total_uncompressed / total_compressed > MAX_COMPRESSION_RATIO:
            raise BackupValidationError(
                "Archive has suspicious overall compression ratio"
            )

        # Extract files
        for member in members:
            member_path = PurePosixPath(member.filename)

            if member_path.is_absolute() or ".." in member_path.parts:
                raise BackupValidationError("Backup archive contains unsafe file paths")

            if not (
                member.filename == DATABASE_ARC_NAME
                or member.filename.startswith(PHOTO_ARC_PREFIX)
                or member.filename.startswith(MUSIC_ARC_PREFIX)
            ):
                continue

            target_path = (temp_root / member_path.as_posix()).resolve()
            if not target_path.is_relative_to(base_resolved):
                raise BackupValidationError("Backup archive contains unsafe extraction paths")

            if member.is_dir():
                target_path.mkdir(parents=True, exist_ok=True)
                continue

            target_path.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(member, "r") as source_file, target_path.open("wb") as target_file:
                shutil.copyfileobj(source_file, target_file)

    if not expected_db_path.exists():
        raise BackupValidationError("Backup archive is missing extractable timesand.db")

    return expected_db_path


def _count_media_records() -> tuple[int, int]:
    with Session(database_module.engine) as session:
        photo_count = session.exec(select(func.count()).select_from(Photo)).one()
        music_count = session.exec(select(func.count()).select_from(Music)).one()
    return photo_count, music_count


def _reset_thumbnail_directory() -> None:
    thumbnails_dir = thumbnails_directory()
    if thumbnails_dir.exists():
        shutil.rmtree(thumbnails_dir)
    thumbnails_dir.mkdir(parents=True, exist_ok=True)


def _add_directory_to_archive(archive: zipfile.ZipFile, source_dir: Path, arc_prefix: str) -> int:
    if not source_dir.exists():
        return 0

    added_files = 0
    for file_path in source_dir.rglob("*"):
        if not file_path.is_file():
            continue

        relative_path = file_path.relative_to(source_dir).as_posix()
        archive.write(file_path, arcname=f"{arc_prefix}{relative_path}")
        added_files += 1

    return added_files
