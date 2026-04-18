---
type: task
iteration: "0.0"
status: done
branch: "feat/photo-management"
pr: 3
completed: 2026-04-06
tags:
  - mvp
---

# Task 2: Photo Management

- **Branch**: `feat/photo-management`
- **Scope**: Photo SQLModel model, batch upload with UUID-based filenames, Pillow thumbnail generation (max 400px longest side), EXIF extraction (taken_at), CRUD API, file serving endpoints, frontend upload page with drag-and-drop and photo grid display.
- **Dependencies**: Task 1 (project-foundation) must be merged into `dev` first

## Files

### Backend

- `backend/app/models/__init__.py` (create) — Model re-exports
- `backend/app/models/photo.py` (create) — Photo SQLModel
- `backend/app/api/photos.py` (create) — Photo router with all endpoints
- `backend/app/services/photo_service.py` (create) — Upload processing, thumbnail generation (Pillow), EXIF extraction
- `backend/app/main.py` (modify) — Register photo router, ensure data directories exist on startup
- `backend/app/core/database.py` (modify) — Import Photo model for table creation
- `backend/tests/__init__.py` (create)
- `backend/tests/conftest.py` (create) — Test fixtures: temp data dir, test DB session, TestClient
- `backend/tests/test_photos.py` (create)

### Frontend

- `frontend/src/types/photo.ts` (create) — Photo TypeScript interface
- `frontend/src/services/photo.ts` (create) — Photo API client functions
- `frontend/src/pages/UploadPage.vue` (modify) — Implement photo upload UI
- `frontend/src/components/PhotoUploader.vue` (create) — Drag-and-drop batch upload with progress indication
- `frontend/src/components/PhotoGrid.vue` (create) — Responsive thumbnail grid

## API Contracts

### `POST /api/photos/upload`

- Request: `multipart/form-data`, field `files` (multiple files)
- Accept: JPEG, PNG, WebP, GIF (validate MIME type)
- On upload: save original → generate thumbnail (max 400px longest side) → extract EXIF → create DB record
- Filename: UUID-based (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg`)
- Response 201:
  ```json
  { "photos": [Photo] }
  ```
- Response 400: `{ "detail": "No valid image files provided" }`

### `GET /api/photos`

- Query params: `page` (default 1), `page_size` (default 20), `album_id` (optional), `tag_id` (optional)
- Response 200:
  ```json
  { "items": [Photo], "total": 42, "page": 1, "page_size": 20 }
  ```

### `GET /api/photos/{id}`

- Response 200: `Photo`
- Response 404: `{ "detail": "Photo not found" }`

### `DELETE /api/photos/{id}`

- Deletes DB record + original file + thumbnail file from disk
- Response 200: `{ "ok": true }`
- Response 404: `{ "detail": "Photo not found" }`

### `GET /api/photos/{id}/file`

- Response 200: Binary original file with correct `Content-Type`

### `GET /api/photos/{id}/thumbnail`

- Response 200: Binary thumbnail with correct `Content-Type`

### Photo Schema

```json
{
  "id": 1,
  "filename": "vacation.jpg",
  "file_path": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
  "thumbnail_path": "a1b2c3d4-e5f6-7890-abcd-ef1234567890_thumb.jpg",
  "file_size": 2048576,
  "width": 1920,
  "height": 1080,
  "taken_at": "2023-07-15T10:30:00Z",
  "latitude": 35.6762,
  "longitude": 139.6503,
  "uploaded_at": "2026-04-06T12:00:00Z",
  "mime_type": "image/jpeg"
}
```

- `taken_at`: Extracted from EXIF `DateTimeOriginal`, converted to UTC. Nullable if EXIF not available.
- `latitude` / `longitude`: Extracted from EXIF GPS data. Both nullable if GPS not available.
- `file_path` / `thumbnail_path`: Relative to `/data/photos/originals/` and `/data/photos/thumbnails/` respectively.

## Acceptance Criteria

- [ ] Upload single JPEG → creates original + thumbnail + DB record
- [ ] Upload multiple files in one request → all processed
- [ ] Thumbnail is max 400px on longest side
- [ ] EXIF `DateTimeOriginal` extracted and stored as `taken_at` (UTC)
- [ ] EXIF GPS coordinates extracted and stored as `latitude`/`longitude` (nullable)
- [ ] UUID-based filenames used for storage (no conflicts)
- [ ] Non-image files rejected with 400
- [ ] GET /api/photos returns paginated list with correct total
- [ ] GET /api/photos/{id}/file serves original image with correct Content-Type
- [ ] GET /api/photos/{id}/thumbnail serves thumbnail with correct Content-Type
- [ ] DELETE removes DB record + both files from disk
- [ ] Frontend upload page: drag-and-drop zone, file picker button, upload progress indication
- [ ] Frontend shows uploaded photos in a responsive thumbnail grid
- [ ] `uv run pytest` passes
- [ ] `uv run ruff check .` passes
- [ ] `bun run type-check` passes

## Tests

### Backend

- Upload a valid JPEG → verify DB record created, original file exists on disk, thumbnail exists, thumbnail dimensions ≤ 400px
- Upload multiple files → verify all records created
- Upload non-image file (e.g., .txt) → verify 400 rejection
- GET /api/photos → verify `items`, `total`, `page`, `page_size` fields
- GET /api/photos/{id} with valid id → verify correct photo returned
- GET /api/photos/{id} with invalid id → verify 404
- DELETE /api/photos/{id} → verify DB record removed, original + thumbnail files deleted from disk
- GET /api/photos/{id}/file → verify binary response with correct Content-Type header
- GET /api/photos/{id}/thumbnail → verify binary response

### Frontend

- Test PhotoUploader component renders drop zone and file input
- Test PhotoGrid component renders thumbnail images from props
