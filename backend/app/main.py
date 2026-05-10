from __future__ import annotations

from contextlib import asynccontextmanager
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.albums import router as albums_router
from app.api.demo import router as demo_router
from app.api.draw import router as draw_router
from app.api.music import router as music_router
from app.api.playlists import router as playlists_router
from app.api.photos import router as photos_router
from app.api.settings import router as settings_router
from app.api.slideshow import router as slideshow_router
from app.api.tags import router as tags_router
from app.core import database as database_module
from app.core.config import settings
from app.core.database import create_db_and_tables
from app.core.errors import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logging import get_logger, setup_logging
from app.models.music import Playlist
from app.services.demo_service import seed_demo_data
from app.services.photo_service import ensure_storage_directories


logger = get_logger(__name__)


def ensure_data_directories() -> None:
    for directory in (
        settings.data_dir / "photos" / "originals",
        settings.data_dir / "photos" / "thumbnails",
        settings.data_dir / "music" / "files",
    ):
        directory.mkdir(parents=True, exist_ok=True)


def ensure_default_playlist() -> None:
    with Session(database_module.engine) as session:
        default_playlist = session.exec(select(Playlist).where(Playlist.is_default)).first()
        if default_playlist is None:
            session.add(Playlist(name="Default Playlist", is_default=True))
            session.commit()


def resolve_frontend_dist() -> Path | None:
    project_root = Path(__file__).resolve().parents[2]
    candidates = (
        project_root / "static",
        project_root / "frontend_dist",
        project_root / "frontend" / "dist",
    )

    for candidate in candidates:
        if candidate.is_dir() and (candidate / "index.html").is_file():
            return candidate

    return None


def resolve_app_version() -> str:
    try:
        return version("timesand-backend")
    except PackageNotFoundError:
        return "unknown"


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_logging(log_level=settings.log_level, log_format=settings.log_format)
    logger.info(
        "app_started",
        version=resolve_app_version(),
        data_dir=settings.data_dir.as_posix(),
        log_level=settings.log_level,
        log_format=settings.log_format,
        demo_seed_enabled=settings.enable_demo_seed,
        cors_origins_count=len(settings.cors_origins),
    )
    ensure_data_directories()
    create_db_and_tables()
    ensure_storage_directories()
    ensure_default_playlist()
    if settings.enable_demo_seed:
        with Session(database_module.engine) as session:
            seed_demo_data(session)
    yield


def configure_spa_routes(app: FastAPI, frontend_dist: Path | None) -> None:
    if not frontend_dist:
        return

    frontend_dist = frontend_dist.resolve()
    index_file = frontend_dist / "index.html"

    reserved_paths: set[str] = {"api"}
    for route_path in (app.docs_url, app.redoc_url, app.openapi_url):
        if route_path:
            reserved_paths.add(route_path.lstrip("/"))

    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        if full_path in reserved_paths or any(
            full_path.startswith(f"{p}/") for p in reserved_paths
        ):
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
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    @app.get("/api/health")
    def health_check() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(photos_router)
    app.include_router(albums_router)
    app.include_router(tags_router)
    app.include_router(music_router)
    app.include_router(playlists_router)
    app.include_router(demo_router)
    app.include_router(draw_router)
    app.include_router(slideshow_router)
    app.include_router(settings_router)

    resolved_frontend_dist = resolve_frontend_dist() if frontend_dist is None else frontend_dist
    configure_spa_routes(app, resolved_frontend_dist)
    return app


app = create_app()
