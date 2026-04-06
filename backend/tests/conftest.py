from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from app.core import database
from app.core.config import settings
from app.main import app


@pytest.fixture
def test_data_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    data_dir = tmp_path / "data"
    monkeypatch.setattr(settings, "data_dir", data_dir)
    return data_dir


@pytest.fixture
def test_engine(
    test_data_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> Generator:
    test_data_dir.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        f"sqlite:///{(test_data_dir / 'timesand.db').as_posix()}",
        connect_args={"check_same_thread": False}
    )
    monkeypatch.setattr(database, "engine", engine)
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)

    try:
        yield engine
    finally:
        SQLModel.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture
def session(test_engine) -> Generator[Session, None, None]:
    with Session(test_engine) as db_session:
        yield db_session


@pytest.fixture
def client(test_engine) -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client
