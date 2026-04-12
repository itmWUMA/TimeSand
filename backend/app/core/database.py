from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

from .config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}
)


def create_db_and_tables() -> None:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    from app.models import album, music, photo  # noqa: F401

    with engine.begin() as connection:
        connection.execute(text("SELECT 1"))
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
