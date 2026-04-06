# Task 9: Settings Page

- **Branch**: `feat/settings-page`
- **Scope**: Settings page with storage usage info, slideshow defaults, and basic app configuration. Lightweight — mostly frontend display with one settings API endpoint.
- **Dependencies**: Task 1 (project-foundation) and Task 2 (photo-management) must be merged first. Best implemented after Task 6 (slideshow) for slideshow defaults.

## Files

### Backend

- `backend/app/api/settings.py` (create) — Settings router: storage info endpoint
- `backend/app/main.py` (modify) — Register settings router
- `backend/tests/test_settings.py` (create)

### Frontend

- `frontend/src/services/settings.ts` (create) — Settings API client
- `frontend/src/pages/SettingsPage.vue` (modify) — Implement settings UI
- `frontend/src/stores/settings.ts` (create) — Pinia store: slideshow interval, persisted to localStorage

## API Contracts

### `GET /api/settings/storage`

- Response 200:
  ```json
  {
    "photo_count": 142,
    "music_count": 23,
    "photo_storage_bytes": 524288000,
    "music_storage_bytes": 104857600,
    "total_storage_bytes": 629145600,
    "thumbnail_count": 142
  }
  ```

## Frontend Sections

### Storage Info

- Display: total photos, total music tracks, storage used (formatted as MB/GB)
- Read-only informational display

### Slideshow Defaults

- Default interval setting (3s, 5s, 8s, 10s, 15s) — saved to localStorage via Pinia persisted store
- Applied when entering slideshow without explicit interval override

### About

- App name and version
- Link to GitHub repository

## Acceptance Criteria

- [ ] GET /api/settings/storage returns correct counts and storage sizes
- [ ] Settings page displays photo count, music count, and formatted storage usage
- [ ] Slideshow default interval is configurable and persisted to localStorage
- [ ] Slideshow uses the configured default interval when launched without override
- [ ] About section shows app name
- [ ] All tests pass, lint passes, type-check passes

## Tests

### Backend

- GET /api/settings/storage with no data → all counts 0
- Upload a photo, then GET /api/settings/storage → photo_count=1, photo_storage_bytes > 0

### Frontend

- Test settings store: setInterval persists value, getInterval returns persisted value
- Test SettingsPage renders storage info section
