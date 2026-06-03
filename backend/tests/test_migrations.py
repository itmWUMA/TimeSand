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


def test_upgrade_backfills_owner_id_before_not_null(
    migration_engine,
) -> None:
    from alembic import command
    from alembic.config import Config

    alembic_cfg = Config(database.ALEMBIC_INI_PATH.as_posix())
    alembic_cfg.attributes["skip_logging_config"] = True

    command.upgrade(alembic_cfg, "003_auth_skeleton")

    with migration_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO user (id, username, display_name, password_hash, role, is_active, created_at)
                VALUES (1, 'admin', 'Admin', 'fake', 'admin', 1, '2026-05-10 00:00:00')
                """
            )
        )
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

    command.upgrade(alembic_cfg, "head")

    with migration_engine.connect() as connection:
        owner_id = connection.execute(text("SELECT owner_id FROM photo")).scalar_one()
        photo_columns = inspect(migration_engine).get_columns("photo")

    assert owner_id == 1
    assert next(column for column in photo_columns if column["name"] == "owner_id")["nullable"] is False


def test_upgrade_creates_admin_and_backfills_legacy_data(
    migration_engine,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from alembic import command
    from alembic.config import Config

    monkeypatch.setattr(settings, "admin_username", "admin")
    monkeypatch.setattr(settings, "admin_password", "testpassword123")
    alembic_cfg = Config(database.ALEMBIC_INI_PATH.as_posix())
    alembic_cfg.attributes["skip_logging_config"] = True

    command.upgrade(alembic_cfg, "002_add_indexes")

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
                    'legacy.jpg',
                    '/photos/legacy.jpg',
                    '/photos/thumbs/legacy.jpg',
                    456,
                    800,
                    600,
                    '2026-05-10 00:00:00',
                    'image/jpeg',
                    0
                )
                """
            )
        )

    command.upgrade(alembic_cfg, "head")

    with migration_engine.connect() as connection:
        row = connection.execute(
            text(
                """
                SELECT photo.owner_id, user.username, user.role, usersetting.user_id
                FROM photo
                JOIN user ON user.id = photo.owner_id
                JOIN usersetting ON usersetting.user_id = user.id
                """
            )
        ).one()

    assert row == (1, "admin", "admin", 1)


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
                INSERT INTO user (id, username, display_name, password_hash, role, is_active, created_at)
                VALUES (1, 'admin', 'Admin', 'fake', 'admin', 1, '2026-05-10 00:00:00')
                """
            )
        )
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
                    is_demo,
                    owner_id
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
                    0,
                    1
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

    # SQLite cannot add FK constraints to existing tables, so migrations intentionally
    # omit them. Filter them out so the test only checks structural drift.
    non_fk_differences = [d for d in baseline_differences if d[0] != "add_fk"]

    assert not non_fk_differences, "Schema should match before adding probe column"

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

    # Also filter out FK diffs in the candidate comparison
    non_fk_differences = [d for d in differences if d[0] != "add_fk"]

    assert len(non_fk_differences) == 1, f"Expected exactly 1 difference, got {len(non_fk_differences)}: {non_fk_differences}"
    assert non_fk_differences[0][0] == "add_column"
    assert non_fk_differences[0][2] == "photo"
    assert non_fk_differences[0][3].name == "temporary_autogenerate_probe"
