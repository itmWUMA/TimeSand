from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.photos import router as photos_router
from app.core.config import settings
from app.core.database import create_db_and_tables
from app.services.photo_service import ensure_storage_directories


def ensure_data_directories() -> None:
    for directory in (
        settings.data_dir / "photos" / "originals",
        settings.data_dir / "photos" / "thumbnails",
        settings.data_dir / "music" / "files",
    ):
        directory.mkdir(parents=True, exist_ok=True)


def resolve_frontend_dist() -> Path | None:
    project_root = Path(__file__).resolve().parents[2]
    candidates = (
        project_root / "static",
        project_root / "frontend_dist",
        project_root / "frontend" / "dist",
    )

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return None


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_data_directories()
    create_db_and_tables()
    ensure_storage_directories()
    yield


def configure_spa_routes(app: FastAPI, frontend_dist: Path | None) -> None:
    if not frontend_dist:
        return

    frontend_dist = frontend_dist.resolve()
    index_file = frontend_dist / "index.html"

    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404)

        if full_path:
            requested_file = (frontend_dist / full_path).resolve()
            if requested_file.is_relative_to(frontend_dist) and requested_file.is_file():
                return FileResponse(requested_file)

        if index_file.is_file():
            return FileResponse(index_file)

        raise HTTPException(status_code=404)


def create_app(frontend_dist: Path | None = None) -> FastAPI:
    app = FastAPI(title="TimeSand API", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    def health_check() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(photos_router)

    resolved_frontend_dist = resolve_frontend_dist() if frontend_dist is None else frontend_dist
    configure_spa_routes(app, resolved_frontend_dist)
    return app


app = create_app()
