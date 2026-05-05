---
type: task
iteration: "1.5"
status: pending
branch: "feat/backup-restore"
pr:
completed:
tags:
  - v1.5
  - infrastructure
  - backup
---

# Task 5: Backup & Restore

- **Branch**: `feat/backup-restore`
- **Scope**: Backend API for exporting/importing data as a zip file; frontend UI in Settings page for one-click backup and restore
- **Dependencies**: Task 2 (Alembic) must be merged — restore runs migrations on imported database. Task 4 (Error Handling) must be merged — backup API uses unified error format.

## Files

### Backend

- `backend/app/api/backup.py` (create — export/import endpoints)
- `backend/app/services/backup_service.py` (create — zip creation/extraction, database backup, thumbnail rebuild)
- `backend/app/main.py` (modify — register backup router)

### Frontend

- `frontend/src/services/backup.ts` (create — API client for backup/restore)
- `frontend/src/pages/SettingsPage.vue` (modify — add backup/restore section with buttons, progress, confirmation dialog)
- `frontend/src/locales/zh.json` (modify — add backup-related i18n keys)
- `frontend/src/locales/en.json` (modify — add backup-related i18n keys)

## API Contracts

### `POST /api/backup/export`

- **Request**: No body
- **Response 200**: Streaming zip file download
  - `Content-Type: application/zip`
  - `Content-Disposition: attachment; filename="timesand-backup-2026-05-05.zip"`
- **Response 500**: `{error: "backup_failed", message: "...", status_code: 500}`

### `POST /api/backup/import`

- **Request**: `multipart/form-data` with `file` field (zip file)
- **Response 200**:
  ```json
  {
    "message": "Backup restored successfully. Please restart the application.",
    "photo_count": 42,
    "music_count": 10,
    "thumbnails_regenerated": true
  }
  ```
- **Response 400**: `{error: "invalid_backup", message: "...", status_code: 400}`
- **Response 500**: `{error: "restore_failed", message: "...", status_code: 500}`

## Design Details

### Backup Export

1. Create a temporary zip file using `zipfile.ZipFile`
2. Copy `timesand.db` using `sqlite3.backup()` API for consistency (not raw file copy)
3. Add all files from `photos/originals/` under `photos/originals/` in the zip
4. Add all files from `music/files/` under `music/files/` in the zip
5. **Exclude** `photos/thumbnails/` — regenerated after restore
6. Return as streaming `FileResponse`
7. Clean up temporary file after response completes (use `BackgroundTask`)

### Backup Import (Restore)

1. Validate uploaded zip structure:
   - Must contain `timesand.db` at root
   - Must contain `photos/originals/` directory
   - Must contain `music/files/` directory
2. Save uploaded zip to a temporary location
3. Create a safety backup: copy current `timesand.db` to `timesand.db.pre-restore`
4. Extract zip contents:
   - Replace `timesand.db` with the one from zip
   - Replace `photos/originals/` contents
   - Replace `music/files/` contents
5. Run `alembic upgrade head` on the restored database (handles version differences)
6. Trigger thumbnail regeneration for all photos (background or synchronous)
7. Return success response with data counts
8. **Note**: Application should be restarted after restore to reinitialize database connections. The response message instructs the user to restart.

### Zip Structure

```
timesand-backup-2026-05-05.zip
├── timesand.db
├── photos/
│   └── originals/
│       ├── abc-123.jpg
│       ├── def-456.heic
│       └── ...
└── music/
    └── files/
        ├── ghi-789.mp3
        └── ...
```

### Frontend UI (Settings Page)

Add a "Data Management" section to the Settings page:

**Export Backup**:
- Button labeled "Export Backup" / "导出备份"
- On click: POST to `/api/backup/export`, trigger browser download
- Show progress indicator during download
- Success toast on completion

**Import Backup**:
- Button labeled "Import Backup" / "恢复备份"
- On click: open file picker (accept `.zip`)
- Show confirmation dialog: "This will replace all existing data. This action cannot be undone. Continue?"
- On confirm: upload zip with progress bar
- On success: show "Restore complete. Please restart the application." message
- On failure: show error toast

### Logging

Log these events using structlog:
- `backup_export_started`
- `backup_export_completed` (size_bytes, photo_count, music_count, duration_ms)
- `backup_import_started` (filename, size_bytes)
- `backup_import_completed` (photo_count, music_count, duration_ms)
- `backup_import_failed` (filename, error)
- `thumbnail_rebuild_started` (photo_count)
- `thumbnail_rebuild_completed` (duration_ms)

## Acceptance Criteria

- [ ] Export endpoint generates a valid zip containing database + originals + music
- [ ] Exported zip does NOT contain thumbnails
- [ ] Database is backed up using `sqlite3.backup()` API (not raw file copy)
- [ ] Import endpoint validates zip structure and rejects invalid files
- [ ] Import replaces existing data and creates a `.pre-restore` safety backup
- [ ] Import runs Alembic migrations on the restored database
- [ ] Import triggers thumbnail regeneration for all photos
- [ ] Settings page has "Export Backup" button that downloads the zip
- [ ] Settings page has "Import Backup" button with file picker and confirmation dialog
- [ ] Import shows progress indicator during upload
- [ ] Success/error messages are displayed via toast
- [ ] All backup-related text is i18n'd (zh + en)
- [ ] Backup events are logged with structlog
- [ ] Existing tests still pass
- [ ] Frontend type-check passes: `bun run type-check`

## Tests

### Backend

- Test export creates a valid zip with expected structure
- Test export excludes thumbnails directory
- Test import with valid zip succeeds and replaces data
- Test import with invalid zip (missing timesand.db) returns 400
- Test import creates `.pre-restore` safety backup

### Frontend

- Test backup section renders in Settings page
- Test export button triggers download
- Test import shows confirmation dialog before upload
