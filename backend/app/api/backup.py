from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from starlette.background import BackgroundTask

from app.core.auth import require_admin
from app.models.user import User
from app.services import backup_service
from app.services.backup_service import (
    BackupExportError,
    BackupRestoreError,
    BackupValidationError,
)

router = APIRouter(prefix="/api/backup", tags=["backup"])
UPLOAD_CHUNK_SIZE = 1024 * 1024
MAX_UPLOAD_BYTES = 500 * 1024 * 1024  # 500MB


class BackupImportResponse(BaseModel):
    message: str
    photo_count: int
    music_count: int
    thumbnails_regenerated: bool


def build_error_response(*, status_code: int, error: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": error,
            "message": message,
            "status_code": status_code,
        },
    )


def cleanup_temporary_file(path: Path) -> None:
    path.unlink(missing_ok=True)


async def save_upload_to_temporary_zip(upload: UploadFile) -> Path:
    with NamedTemporaryFile(prefix="timesand-restore-", suffix=".zip", delete=False) as temp_file:
        temp_path = Path(temp_file.name)

    total_bytes = 0
    with temp_path.open("wb") as file_pointer:
        while True:
            chunk = await upload.read(UPLOAD_CHUNK_SIZE)
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > MAX_UPLOAD_BYTES:
                temp_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail=f"Upload exceeds maximum size of {MAX_UPLOAD_BYTES} bytes",
                )
            file_pointer.write(chunk)

    return temp_path


@router.post("/export")
def export_backup(
    _: User = Depends(require_admin),
) -> FileResponse:
    try:
        archive_path = backup_service.create_backup_archive()
    except BackupExportError as exc:
        return build_error_response(
            status_code=500,
            error="backup_failed",
            message=str(exc),
        )

    return FileResponse(
        path=archive_path,
        media_type="application/zip",
        filename=backup_service.build_backup_download_filename(),
        background=BackgroundTask(cleanup_temporary_file, archive_path),
    )


@router.post("/import", response_model=BackupImportResponse)
async def import_backup(
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
) -> BackupImportResponse:
    temporary_zip: Path | None = None

    try:
        temporary_zip = await save_upload_to_temporary_zip(file)
        result = backup_service.restore_from_backup_archive(
            temporary_zip,
            source_filename=file.filename,
        )
        return BackupImportResponse(
            message="Backup restored successfully. Please restart the application.",
            photo_count=result.photo_count,
            music_count=result.music_count,
            thumbnails_regenerated=result.thumbnails_regenerated,
        )
    except BackupValidationError as exc:
        return build_error_response(
            status_code=400,
            error="invalid_backup",
            message=str(exc),
        )
    except BackupRestoreError as exc:
        return build_error_response(
            status_code=500,
            error="restore_failed",
            message=str(exc),
        )
    finally:
        if temporary_zip is not None:
            temporary_zip.unlink(missing_ok=True)
        await file.close()
