---
type: spec
iteration: "1.5"
created: 2026-05-05
tags:
  - v1.5
  - infrastructure
  - ci-cd
  - database
  - backup
---

# Design Spec: Infrastructure

## Overview

TimeSand is approaching feature completeness for Phase 1. This iteration establishes the engineering foundation needed for sustainable iteration and data safety: automated quality gates (CI), safe schema evolution (database migrations), data protection (backup/restore), unified error handling, performance baselines, and structured logging.

No user-facing features are added. The goal is to make the product production-ready from an operations and maintenance perspective, so that a self-hosted user can confidently run TimeSand knowing their data is safe and upgrades are smooth.

## Requirements

### Functional Requirements

- **PR CI**: Every pull request to `dev` must pass automated lint, type-check, tests, and Docker build verification before merge.
- **Release Enhancement**: The existing release workflow must additionally build and push a Docker image to GHCR, allowing users to `docker pull` instead of building from source.
- **Database Migration**: Schema changes must be versioned and applied automatically on application startup. Users upgrading to a new version should have their database updated seamlessly.
- **Backup & Restore**: Users can export all data (database + photos + music) as a single zip file from the Settings page, and restore from a previously exported backup.
- **Unified Error Handling**: All API errors follow a consistent response format. Frontend displays user-friendly error toasts automatically for API failures.
- **Performance Baselines**: Static file responses include proper cache headers. Database queries use indexes on frequently queried columns.
- **Structured Logging**: Backend emits JSON-formatted log entries for key business operations, readable via `docker logs`.

### Non-Functional Requirements

- CI pipeline completes in under 5 minutes for typical PRs.
- Backup export supports data volumes up to 10GB (streaming, not in-memory).
- Database migrations are idempotent — re-running a migration that was already applied is a no-op.
- Logging does not noticeably impact request latency.

## Design

### 1. GitHub Actions PR CI

**Trigger**: Pull request opened/synchronized/reopened targeting `dev`.

**Jobs** (run in parallel where possible):

| Job | Steps |
|-----|-------|
| `lint-frontend` | Checkout → Setup Bun → `bun install --frozen-lockfile` → `bun run lint` |
| `typecheck-frontend` | Checkout → Setup Bun → `bun install --frozen-lockfile` → `bun run type-check` |
| `test-frontend` | Checkout → Setup Bun → `bun install --frozen-lockfile` → `bun run test` |
| `lint-backend` | Checkout → Setup Python 3.12 → Install uv → `uv sync` → `uv run ruff check .` |
| `test-backend` | Checkout → Setup Python 3.12 → Install uv → `uv sync` → `uv run pytest` |
| `docker-build` | Checkout → `docker build --build-arg IMAGE_REGISTRY="" .` |

**Files**: `.github/workflows/ci.yml` (create)

**Notes**:
- Existing `release.yml` and `pr-target-check.yml` remain unchanged.
- GitHub Actions runners are outside China — the Docker build uses `IMAGE_REGISTRY=""` to pull base images from Docker Hub directly (same as current release workflow).

### 2. Release Workflow Enhancement (GHCR Push)

**Change to existing** `.github/workflows/release.yml`:

After the existing `release` job (which creates a git tag and GitHub Release), add a new job `docker-publish` that:

1. Checks out code at the newly created tag
2. Logs in to GHCR via `docker/login-action` using `GITHUB_TOKEN`
3. Builds the Docker image with tags:
   - `ghcr.io/itmwuma/timesand:<version>` (e.g., `ghcr.io/itmwuma/timesand:0.1.0`)
   - `ghcr.io/itmwuma/timesand:latest` (only for non-prerelease)
4. Pushes to GHCR via `docker/build-push-action`

**Required permissions**: Add `packages: write` to the workflow's permissions block.

**User impact**: After release, users can deploy with:
```yaml
# docker-compose.yml
services:
  timesand:
    image: ghcr.io/itmwuma/timesand:0.1.0
    ports: ["8080:8080"]
    volumes: ["./data:/data"]
```

### 3. Database Migration (Alembic)

**Tool**: Alembic (standard migration tool for SQLAlchemy/SQLModel).

**Integration approach**:
- Initialize Alembic within `backend/` directory
- Configure `env.py` to use the same SQLModel metadata and database URL from `app.core.config`
- Generate a baseline migration capturing the current schema (all existing tables)
- Remove `SQLModel.metadata.create_all(engine)` from `database.py`
- Add `alembic upgrade head` call to the FastAPI lifespan startup (replacing `create_db_and_tables()`)

**Migration workflow for developers**:
1. Modify SQLModel models
2. Run `alembic revision --autogenerate -m "description"` to generate migration script
3. Review the generated script (especially for NOT NULL columns needing `server_default`)
4. Commit the migration file to git
5. On next app startup, migration runs automatically

**File structure**:
```
backend/
├── alembic.ini                    (create)
├── alembic/
│   ├── env.py                     (create)
│   ├── script.py.mako             (create)
│   └── versions/
│       └── 001_initial_schema.py  (create — baseline)
├── app/
│   ├── core/database.py           (modify — replace create_all with alembic upgrade)
│   └── main.py                    (modify — update lifespan)
```

**New dependency**: `alembic` added to `backend/pyproject.toml`

### 4. Backup & Restore

**Backend API**:

#### `POST /api/backup/export`

- Generates a zip archive containing:
  - `timesand.db` (SQLite database file, copied safely using SQLite backup API)
  - `photos/originals/**` (all original photo files)
  - `music/files/**` (all music files)
- Thumbnails are **excluded** — they are regenerated after restore.
- Returns the zip as a streaming `FileResponse` with `Content-Disposition: attachment`.
- Zip is created using Python's `zipfile` module in streaming mode to handle large data volumes without loading everything into memory.
- A temporary file is used for the zip assembly, cleaned up after response completes.

#### `POST /api/backup/import`

- Accepts a multipart upload of a zip file.
- Validates zip structure (must contain `timesand.db` at the root, `photos/originals/` directory, `music/files/` directory).
- The restore operation is synchronous — the endpoint blocks until complete. No concurrent request protection is needed since TimeSand is single-user.
- Replaces current data:
  1. Backs up current `timesand.db` to `timesand.db.pre-restore`
  2. Extracts zip contents to the data directory
  3. Runs `alembic upgrade head` on the restored database (in case the backup is from an older version)
  4. Triggers thumbnail regeneration for all photos
- Returns success/failure status.
- **Requires application restart** after restore to reinitialize database connections.

**Frontend UI** (Settings page):

- "Export Backup" button → triggers download of the zip file, shows progress
- "Import Backup" button → file picker for zip, confirmation dialog ("This will replace all existing data. Are you sure?"), upload progress, success/restart prompt

**File structure**:
```
backend/
├── app/
│   ├── api/backup.py              (create — export/import endpoints)
│   ├── services/backup_service.py (create — zip creation/extraction logic)
│   └── main.py                    (modify — register backup router)
frontend/
├── src/
│   ├── services/backup.ts         (create — API client)
│   └── pages/SettingsPage.vue     (modify — add backup/restore UI)
```

### 5. Unified Error Handling

**Backend — Unified error response format**:

All API error responses follow this structure:
```json
{
  "error": "not_found",
  "message": "Photo with id 'abc-123' not found",
  "status_code": 404
}
```

Implementation:
- Add a global exception handler in `main.py` that catches `HTTPException` and unhandled exceptions, formatting them consistently.
- Catch unhandled `Exception` as 500 with a generic message (no internal details leaked).
- Existing `HTTPException` usage throughout API routes continues to work — the handler normalizes the output format.

**Frontend — Axios response interceptor**:

Add a response error interceptor to the Axios instance in `services/api.ts`:
- On 4xx/5xx responses, extract the error message from the unified format.
- Display a Toast notification using the existing `TsToast` component.
- Specific handling:
  - 401/403: "Permission denied" (future-proofing for auth)
  - 404: "Resource not found"
  - 413: "File too large"
  - 500: "Server error, please try again"
  - Network error (no response): "Cannot connect to server"
- Individual API calls can still catch errors locally for custom handling (the interceptor is a fallback).

**Toast composable**: Create a `useToast` composable (or Pinia store) that provides `showToast(title, description, variant)` for programmatic toast triggering. The current `TsToast` component requires `v-model:open` binding — the composable wraps this into an imperative API.

**File structure**:
```
backend/
├── app/
│   ├── core/errors.py             (create — error response model, exception handler)
│   └── main.py                    (modify — register exception handlers)
frontend/
├── src/
│   ├── composables/useToast.ts    (create — programmatic toast API)
│   ├── services/api.ts            (modify — add response interceptor)
│   └── App.vue or layouts/        (modify — integrate toast composable)
```

### 6. Performance Baselines

**Static file cache headers**:

Add `Cache-Control` headers to file-serving endpoints:
- Photo originals and thumbnails: `Cache-Control: public, max-age=31536000, immutable` (files are UUID-named, content never changes)
- Music files: Same cache policy (UUID-named)
- Frontend static assets (already handled by Vite's hashed filenames in production)

Implementation: Modify the photo/music file-serving API endpoints to include the `Cache-Control` header in the `FileResponse`.

**Database index optimization**:

Add indexes to frequently queried columns via Alembic migration:

| Model | Column(s) | Rationale |
|-------|-----------|-----------|
| `Photo` | `uploaded_at` | Sort by upload date (default listing) |
| `Photo` | `taken_at` | Time-weighted draw algorithm queries |
| `PhotoAlbum` | `album_id` | Album photo listing |
| `PhotoAlbum` | `photo_id` | Photo's album lookup |
| `PhotoTag` | `tag_id` | Tag photo listing |
| `PhotoTag` | `photo_id` | Photo's tag lookup |
| `PlaylistMusic` | `playlist_id` | Playlist track listing |
| `PlaylistMusic` | `music_id` | Track's playlist lookup |
| `AlbumPlaylist` | `album_id` | Album playlist association |
| `AlbumPlaylist` | `playlist_id` | Playlist album association |
| `Music` | `uploaded_at` | Sort by upload date |

Implementation: Add `index=True` to the relevant fields in SQLModel models, then generate an Alembic migration.

### 7. Structured Logging

**Library**: `structlog` (structured logging for Python, outputs JSON).

**Configuration**:
- JSON output format for production (Docker)
- Pretty-printed colored output for local development (detect via `LOG_FORMAT` env var)
- Log levels configurable via `LOG_LEVEL` env var (default: `INFO`)
- Integrate with Uvicorn's logging to unify access logs and application logs

**Key business events to log**:

| Event | Level | Context Fields |
|-------|-------|----------------|
| `app_started` | INFO | version, data_dir, log_level |
| `migration_applied` | INFO | revision, description, duration_ms |
| `photo_uploaded` | INFO | photo_id, filename, size_bytes, has_exif, duration_ms |
| `heic_converted` | INFO | photo_id, input_format, duration_ms |
| `thumbnail_generated` | INFO | photo_id, duration_ms |
| `card_drawn` | INFO | photo_id, is_time_weighted |
| `backup_export_started` | INFO | — |
| `backup_export_completed` | INFO | size_bytes, photo_count, music_count, duration_ms |
| `backup_import_started` | INFO | filename, size_bytes |
| `backup_import_completed` | INFO | photo_count, music_count, duration_ms |
| `photo_upload_failed` | ERROR | filename, error |
| `backup_import_failed` | ERROR | filename, error |

**File structure**:
```
backend/
├── app/
│   ├── core/logging.py            (create — structlog configuration)
│   ├── core/config.py             (modify — add LOG_LEVEL, LOG_FORMAT settings)
│   └── main.py                    (modify — initialize logging in lifespan)
│   ├── services/photo_service.py  (modify — add log calls)
│   ├── services/backup_service.py (modify — add log calls)
│   └── ...other services          (modify — add log calls at key points)
```

**New dependency**: `structlog` added to `backend/pyproject.toml`

## Technical Notes

- **Alembic + SQLite**: SQLite has limited ALTER TABLE support (no DROP COLUMN before 3.35, no RENAME COLUMN before 3.25). Alembic's `batch_alter_table` context manager handles this by recreating the table. The Alembic `env.py` should enable `render_as_batch=True` for SQLite compatibility.
- **Backup atomicity**: The SQLite backup uses `sqlite3.backup()` API for a consistent snapshot, not a raw file copy (which could capture a partially written state).
- **CI Docker build**: Uses `--build-arg IMAGE_REGISTRY=""` to override the China mirror registry configured in the Dockerfile, since GitHub Actions runners have better connectivity to Docker Hub directly.
- **GHCR visibility**: The container package will default to private. After the first push, configure it as public in GitHub package settings (or add a `docker-publish` step that sets visibility).

## Out of Scope

- Virtual scrolling for photo grids (deferred — not needed at current data scale)
- Frontend error boundary components (Vue `onErrorCaptured`)
- Error tracking service integration (Sentry, etc.)
- Log aggregation or monitoring dashboards
- Scheduled/automatic backups (only manual export/import)
- Rate limiting or request throttling
- API versioning strategy
- Docker health check endpoint (existing `/api/health` can be used manually)
- Dependabot or dependency security scanning
