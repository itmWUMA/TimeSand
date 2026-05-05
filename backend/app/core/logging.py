from __future__ import annotations

import logging
import sys
from typing import TextIO

import structlog

VALID_LOG_FORMATS = {"json", "console"}


def normalize_log_level(log_level: str) -> str:
    normalized = log_level.upper()
    if normalized in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
        return normalized
    return "INFO"


def normalize_log_format(log_format: str) -> str:
    normalized = log_format.lower()
    if normalized in VALID_LOG_FORMATS:
        return normalized
    return "json"


def setup_logging(
    log_level: str = "INFO",
    log_format: str = "json",
    *,
    stream: TextIO | None = None,
) -> None:
    resolved_level_name = normalize_log_level(log_level)
    resolved_format = normalize_log_format(log_format)
    resolved_level = logging.getLevelName(resolved_level_name)

    timestamper = structlog.processors.TimeStamper(fmt="iso", utc=True)
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        timestamper,
    ]

    renderer = (
        structlog.dev.ConsoleRenderer()
        if resolved_format == "console"
        else structlog.processors.JSONRenderer()
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(stream or sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.setLevel(resolved_level)
    root_logger.addHandler(handler)

    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logger = logging.getLogger(logger_name)
        logger.handlers.clear()
        logger.propagate = True
        logger.setLevel(resolved_level)

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)

