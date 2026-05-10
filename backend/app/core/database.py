from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import inspect
from sqlalchemy import text
from sqlmodel import Session, create_engine

from .config import settings
from .logging import get_logger


logger = get_logger(__name__)
BACKEND_DIR = Path(__file__).resolve().parents[2]
ALEMBIC_INI_PATH = BACKEND_DIR / "alembic.ini"
ALEMBIC_SCRIPT_LOCATION = BACKEND_DIR / "alembic"
SCHEMA_TABLES = {
    "album",
    "albumplaylist",
    "music",
    "photo",
    "photoalbum",
    "phototag",
    "playlist",
    "playlistmusic",
    "tag",
}

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}
)


def _build_alembic_config() -> Config:
    alembic_cfg = Config(ALEMBIC_INI_PATH.as_posix())
    alembic_cfg.set_main_option("script_location", ALEMBIC_SCRIPT_LOCATION.as_posix())
    alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)
    alembic_cfg.attributes["skip_logging_config"] = True
    return alembic_cfg


def _is_unversioned_existing_database() -> bool:
    table_names = set(inspect(engine).get_table_names())
    return "alembic_version" not in table_names and bool(table_names & SCHEMA_TABLES)


def _pending_revisions(alembic_cfg: Config):
    script = ScriptDirectory.from_config(alembic_cfg)
    target_revision = script.get_current_head()
    with engine.connect() as connection:
        context = MigrationContext.configure(connection)
        current_revision = context.get_current_revision()

    if current_revision == target_revision:
        return []

    lower_revision = current_revision or "base"
    return list(reversed(list(script.iterate_revisions(target_revision, lower_revision))))


def run_migrations() -> None:
    """Run pending Alembic migrations on startup."""
    settings.data_dir.mkdir(parents=True, exist_ok=True)

    with engine.begin() as connection:
        connection.execute(text("SELECT 1"))

    alembic_cfg = _build_alembic_config()
    logger.info("migration_started", database_url=settings.database_url)

    if _is_unversioned_existing_database():
        command.stamp(alembic_cfg, "head")
        logger.info("migration_skipped", reason="pre_alembic_database_stamped")
        logger.info("migration_completed")
        return

    revisions = _pending_revisions(alembic_cfg)
    if not revisions:
        logger.info("migration_skipped", reason="already_at_latest")
        logger.info("migration_completed")
        return

    command.upgrade(alembic_cfg, "head")
    for revision in revisions:
        logger.info(
            "migration_applied",
            revision=revision.revision,
            description=revision.doc,
        )
    logger.info("migration_completed")


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
