from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy import Column, MetaData, String, inspect, text
from sqlmodel import SQLModel, create_engine

from app.core import database
from app.core.config import settings
from app.models import album, music, photo  # noqa: F401


EXPECTED_SCHEMA_TABLES = {
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
EXPECTED_PERFORMANCE_INDEXES = {
    "albumplaylist": {
        ("ix_albumplaylist_album_id", ("album_id",)),
        ("ix_albumplaylist_playlist_id", ("playlist_id",)),
    },
    "music": {
        ("ix_music_uploaded_at", ("uploaded_at",)),
    },
    "photo": {
        ("ix_photo_taken_at", ("taken_at",)),
        ("ix_photo_uploaded_at", ("uploaded_at",)),
    },
    "photoalbum": {
        ("ix_photoalbum_album_id", ("album_id",)),
        ("ix_photoalbum_photo_id", ("photo_id",)),
    },
    "phototag": {
        ("ix_phototag_photo_id", ("photo_id",)),
        ("ix_phototag_tag_id", ("tag_id",)),
    },
    "playlistmusic": {
        ("ix_playlistmusic_music_id", ("music_id",)),
        ("ix_playlistmusic_playlist_id", ("playlist_id",)),
    },
}


class CapturingLogger:
    def __init__(self) -> None:
        self.events: list[tuple[str, dict[str, object]]] = []

    def info(self, event: str, **kwargs: object) -> None:
        self.events.append((event, kwargs))


@pytest.fixture
def migration_engine(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True)
    monkeypatch.setattr(settings, "data_dir", data_dir)
    engine = create_engine(
        f"sqlite:///{(data_dir / 'timesand.db').as_posix()}",
        connect_args={"check_same_thread": False},
    )
    monkeypatch.setattr(database, "engine", engine)

    try:
        yield engine
    finally:
        engine.dispose()


def test_run_migrations_creates_schema_on_fresh_database(migration_engine) -> None:
    database.run_migrations()

    inspector = inspect(migration_engine)
    table_names = set(inspector.get_table_names())

    assert EXPECTED_SCHEMA_TABLES <= table_names
    assert "alembic_version" in table_names
    assert {column["name"] for column in inspector.get_columns("photo")} >= {
        "id",
        "filename",
        "thumbnail_path",
        "uploaded_at",
        "is_demo",
    }
    assert {column["name"] for column in inspector.get_columns("music")} >= {
        "id",
        "title",
        "uploaded_at",
        "is_demo",
    }


def test_run_migrations_creates_performance_indexes(migration_engine) -> None:
    database.run_migrations()
    migration_engine.dispose()

    with migration_engine.connect() as connection:
        for table_name, expected_indexes in EXPECTED_PERFORMANCE_INDEXES.items():
            actual_indexes = set()
            index_rows = connection.exec_driver_sql(f"PRAGMA index_list({table_name})").all()
            for index_row in index_rows:
                index_name = index_row[1]
                column_rows = connection.exec_driver_sql(f"PRAGMA index_info({index_name})").all()
                actual_indexes.add((index_name, tuple(row[2] for row in column_rows)))

            assert expected_indexes <= actual_indexes


def test_alembic_cli_config_creates_data_directory(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from alembic import command
    from alembic.config import Config

    data_dir = tmp_path / "missing" / "data"
    monkeypatch.setattr(settings, "data_dir", data_dir)

    alembic_cfg = Config(database.ALEMBIC_INI_PATH.as_posix())

    command.upgrade(alembic_cfg, "head")

    assert data_dir.exists()
    assert (data_dir / "timesand.db").exists()


def test_run_migrations_is_idempotent_and_logs_skip(
    migration_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    logger = CapturingLogger()
    monkeypatch.setattr(database, "logger", logger)

    database.run_migrations()
    database.run_migrations()

    with migration_engine.connect() as connection:
        versions = connection.execute(text("SELECT version_num FROM alembic_version")).all()

    assert len(versions) == 1
    assert "migration_started" in [event for event, _ in logger.events]
    assert "migration_applied" in [event for event, _ in logger.events]
    assert "migration_completed" in [event for event, _ in logger.events]
    assert "migration_skipped" in [event for event, _ in logger.events]


def test_run_migrations_stamps_existing_pre_alembic_database(
    migration_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    logger = CapturingLogger()
    monkeypatch.setattr(database, "logger", logger)
    SQLModel.metadata.create_all(migration_engine)

    with migration_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO photo (
                    filename,
                    file_path,
                    thumbnail_path,
                    file_size,
                    width,
                    height,
                    uploaded_at,
                    mime_type,
                    is_demo
                )
                VALUES (
                    'existing.jpg',
                    '/photos/existing.jpg',
                    '/photos/thumbs/existing.jpg',
                    123,
                    640,
                    480,
                    '2026-05-10 00:00:00',
                    'image/jpeg',
                    0
                )
                """
            )
        )

    database.run_migrations()

    with migration_engine.connect() as connection:
        photo_count = connection.execute(text("SELECT COUNT(*) FROM photo")).scalar_one()
        version_count = connection.execute(text("SELECT COUNT(*) FROM alembic_version")).scalar_one()

    assert photo_count == 1
    assert version_count == 1
    assert ("migration_skipped", {"reason": "pre_alembic_database_stamped"}) in logger.events


def test_autogenerate_detects_model_changes(migration_engine) -> None:
    from alembic.autogenerate import compare_metadata
    from alembic.migration import MigrationContext

    database.run_migrations()

    with migration_engine.connect() as connection:
        context = MigrationContext.configure(
            connection,
            opts={
                "compare_type": True,
                "render_as_batch": True,
                "target_metadata": SQLModel.metadata,
            },
        )
        baseline_differences = compare_metadata(context, SQLModel.metadata)

    assert not baseline_differences, "Schema should match before adding probe column"

    candidate_metadata = MetaData()
    for table in SQLModel.metadata.tables.values():
        table.to_metadata(candidate_metadata)
    candidate_metadata.tables["photo"].append_column(
        Column("temporary_autogenerate_probe", String())
    )

    with migration_engine.connect() as connection:
        context = MigrationContext.configure(
            connection,
            opts={
                "compare_type": True,
                "render_as_batch": True,
                "target_metadata": candidate_metadata,
            },
        )
        differences = compare_metadata(context, candidate_metadata)

    assert len(differences) == 1, f"Expected exactly 1 difference, got {len(differences)}"
    assert differences[0][0] == "add_column"
    assert differences[0][2] == "photo"
    assert differences[0][3].name == "temporary_autogenerate_probe"
