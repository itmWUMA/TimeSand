---
type: task
iteration: "1.5"
status: done
branch: "feat/structured-logging"
pr:
completed: 2026-05-05
tags:
  - v1.5
  - infrastructure
  - logging
---

# Task 1: Structured Logging

- **Branch**: `feat/structured-logging`
- **Scope**: Set up structlog with JSON output, configure log levels, unify Uvicorn access logs, add log calls to existing key business flows
- **Dependencies**: None

## Files

### Backend

- `backend/pyproject.toml` (modify — add `structlog` dependency)
- `backend/app/core/logging.py` (create — structlog configuration, logger factory)
- `backend/app/core/config.py` (modify — add `log_level` and `log_format` settings)
- `backend/app/main.py` (modify — initialize logging in lifespan, before all other startup steps)
- `backend/app/services/photo_service.py` (modify — add log calls for upload, HEIC conversion, thumbnail generation)
- `backend/app/services/music_service.py` (modify — add log calls for music upload)
- `backend/app/api/draw.py` (modify — add log call for card draw)

## Design Details

### structlog Configuration

```python
# app/core/logging.py
import structlog

def setup_logging(log_level: str = "INFO", log_format: str = "json") -> None:
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
    ]
    if log_format == "console":
        processors.append(structlog.dev.ConsoleRenderer())
    else:
        processors.append(structlog.processors.JSONRenderer())

    structlog.configure(
        processors=processors,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | Minimum log level (DEBUG, INFO, WARNING, ERROR) |
| `LOG_FORMAT` | `json` | Output format: `json` for production, `console` for local dev |

### Log Events to Add

| Location | Event | Level |
|----------|-------|-------|
| `main.py` lifespan startup | `app_started` | INFO |
| `photo_service.upload_photo` | `photo_uploaded` | INFO |
| `photo_service` HEIC conversion | `heic_converted` | INFO |
| `photo_service` thumbnail generation | `thumbnail_generated` | INFO |
| `photo_service` upload failure | `photo_upload_failed` | ERROR |
| `music_service` upload | `music_uploaded` | INFO |
| `draw.py` draw endpoint | `card_drawn` | INFO |

### Uvicorn Integration

Configure Uvicorn to use structlog for its access logs by overriding the `uvicorn.access` logger's handlers. This ensures all log output (access + application) follows the same JSON format.

## Acceptance Criteria

- [ ] `structlog` is installed and configured
- [ ] JSON log output in production mode (`LOG_FORMAT=json`)
- [ ] Console-friendly output in dev mode (`LOG_FORMAT=console`)
- [ ] `LOG_LEVEL` env var controls minimum log level
- [ ] Key business events are logged (photo upload, HEIC conversion, thumbnail generation, card draw)
- [ ] Error events include error details
- [ ] `app_started` event logged on startup with version and config summary
- [ ] Uvicorn access logs unified with application logs
- [ ] Existing tests still pass
- [ ] Clean-install verification: `cd backend && rm -rf .venv && uv venv -p 3.12 && uv sync && uv run pytest`

## Tests

### Backend

- Verify `setup_logging` does not raise with valid config
- Verify log output format is JSON when `log_format="json"`
- Verify log output includes expected fields (timestamp, level, event)
