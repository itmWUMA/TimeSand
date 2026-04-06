from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(slots=True)
class Settings:
    data_dir: Path = field(default_factory=lambda: Path(os.getenv("DATA_DIR", "../data")).resolve())
    cors_origins: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        cors_value = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
        self.cors_origins = [origin.strip() for origin in cors_value.split(",") if origin.strip()]

    @property
    def database_path(self) -> Path:
        return self.data_dir / "timesand.db"

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.database_path.as_posix()}"


settings = Settings()
