---
type: task
iteration: "1.5"
status: done
branch: "feat/alembic-migration"
pr:
completed: 2026-05-10
tags:
  - v1.5
  - infrastructure
  - database
  - migration
---

# Task 2: Database Migration (Alembic)

- **Branch**: `feat/alembic-migration`
- **Scope**: Integrate Alembic for database schema versioning, generate baseline migration, replace `create_all()` with automatic migration on startup
- **Dependencies**: Task 1 (Structured Logging) must be merged first — migration events are logged

## Files

### Backend

- `backend/pyproject.toml` (modify — add `alembic` dependency)
- `backend/alembic.ini` (create — Alembic configuration)
- `backend/alembic/env.py` (create — migration environment linking to SQLModel metadata)
- `backend/alembic/script.py.mako` (create — migration script template)
- `backend/alembic/versions/001_initial_schema.py` (create — baseline migration for current schema)
- `backend/app/core/database.py` (modify — replace `create_all()` with `alembic upgrade head`, add migration runner)
- `backend/app/main.py` (modify — update lifespan to call migration runner instead of `create_db_and_tables`)

## Design Details

### Alembic Configuration

`alembic.ini`:
- `script_location = alembic`
- `sqlalchemy.url` is NOT set here (configured programmatically in `env.py` from app settings)

`alembic/env.py`:
- Imports `SQLModel.metadata` as the target metadata
- Imports all model modules to ensure metadata is populated
- Reads database URL from `app.core.config.settings`
- Enables `render_as_batch=True` for SQLite compatibility (SQLite has limited ALTER TABLE)
- Configures `compare_type=True` for type change detection

### Baseline Migration

The initial migration (`001_initial_schema.py`) captures the complete current schema:
- All tables: `photo`, `album`, `tag`, `photoalbum`, `phototag`, `music`, `playlist`, `playlistmusic`, `albumplaylist`
- All columns with their types, constraints, and defaults
- Existing indexes (e.g., `Tag.name` unique index)

This migration is **safe for existing databases**: Alembic's `upgrade head` on an existing database will stamp the version without re-creating tables (using the `alembic stamp head` approach for initial adoption).

### Startup Migration Runner

```python
# app/core/database.py
from alembic.config import Config
from alembic import command

def run_migrations() -> None:
    """Run pending Alembic migrations on startup."""
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
```

The `lifespan` in `main.py` calls `run_migrations()` instead of `create_db_and_tables()`.

### Handling Existing Databases

For users upgrading from pre-Alembic versions:
1. If `alembic_version` table does not exist → this is a pre-migration database
2. Run `alembic stamp head` to mark the database as current without applying changes
3. Future migrations will apply normally

This logic is handled in `run_migrations()`.

### Logging

Log these events using structlog (from Task 1):
- `migration_started`: when migration runner begins
- `migration_applied`: for each migration applied (revision, description)
- `migration_completed`: when all pending migrations are done
- `migration_skipped`: when database is already at latest version

## Acceptance Criteria

- [ ] Alembic is installed and configured
- [ ] `alembic/env.py` correctly references SQLModel metadata and database URL
- [ ] Baseline migration (`001_initial_schema.py`) exists and captures current schema
- [ ] `create_all()` is removed from startup path
- [ ] Application starts successfully with a fresh database (migrations create all tables)
- [ ] Application starts successfully with an existing pre-Alembic database (stamps version without changes)
- [ ] `alembic revision --autogenerate -m "test"` correctly detects model changes
- [ ] Migration events are logged
- [ ] Existing tests still pass
- [ ] Clean-install verification: `cd backend && rm -rf .venv && uv venv -p 3.12 && uv sync && uv run pytest`

## Tests

### Backend

- Test `run_migrations()` succeeds on a fresh (empty) database
- Test `run_migrations()` is idempotent (running twice does not error)
- Test autogenerate detects a model change (add a temporary column, verify migration is generated)
