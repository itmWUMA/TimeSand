from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

from app.core.logging import normalize_log_format, normalize_log_level

# Load environment variables from `.env` before building Settings.
# This allows local development without exporting variables manually.
# In production (Docker, systemd, etc.) real env vars already exist and
# `load_dotenv` only adds missing keys, so it is safe to call here.
load_dotenv()


@dataclass(slots=True)
class Settings:
    data_dir: Path = field(default_factory=lambda: Path(os.getenv("DATA_DIR", "../data")).resolve())
    cors_origins: list[str] = field(default_factory=list)
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    log_format: str = field(default_factory=lambda: os.getenv("LOG_FORMAT", "json"))
    admin_username: str = field(
        default_factory=lambda: os.getenv("TIMESAND_ADMIN_USERNAME", "admin")
    )
    admin_password: str | None = field(
        default_factory=lambda: os.getenv("TIMESAND_ADMIN_PASSWORD") or None
    )
    enable_demo_seed: bool = field(
        default_factory=lambda: os.getenv("ENABLE_DEMO_SEED", "true").lower()
        not in {"0", "false", "no", "off"}
    )

    def __post_init__(self) -> None:
        cors_value = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
        self.cors_origins = [origin.strip() for origin in cors_value.split(",") if origin.strip()]
        self.log_level = normalize_log_level(self.log_level)
        self.log_format = normalize_log_format(self.log_format)

    @property
    def database_path(self) -> Path:
        return self.data_dir / "timesand.db"

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.database_path.as_posix()}"


settings = Settings()
