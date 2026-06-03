---
type: task
iteration: "2.1"
task: "data-ownership"
dependencies: ["auth-skeleton"]
created: 2026-06-03
tags:
  - v2.1
  - ownership
  - migration
  - backend
  - frontend
---

# Task: Data Ownership

**Scope**: Add `owner_id` to all existing data models (Photo, Album, Music, Playlist, Tag), enforce ownership on all existing API endpoints, backfill existing data on upgrade, and adapt the frontend to work in the authenticated environment.

**Branch**: `feat/data-ownership`

---

## Files to Modify

### Backend Models

| File | Action | Description |
|------|--------|-------------|
| `backend/app/models/photo.py` | Modify | Add `owner_id: int = Field(foreign_key="user.id")` to `Photo` |
| `backend/app/models/album.py` | Modify | Add `owner_id: int = Field(foreign_key="user.id")` to `Album`, `Playlist` (in music.py), `Tag` |
| `backend/app/models/music.py` | Modify | Add `owner_id: int = Field(foreign_key="user.id")` to `Music`, `Playlist` |

Wait — `Tag` is in `album.py`. And `Playlist` is in `music.py`. Let me be precise:

| File | Action | Description |
|------|--------|-------------|
| `backend/app/models/photo.py` | Modify | Add `owner_id` to `Photo` |
| `backend/app/models/album.py` | Modify | Add `owner_id` to `Album` and `Tag` |
| `backend/app/models/music.py` | Modify | Add `owner_id` to `Music` and `Playlist` |

### Backend API & Services

| File | Action | Description |
|------|--------|-------------|
| `backend/app/api/photos.py` | Modify | All endpoints: inject `current_user`, filter by `owner_id`, enforce ownership on mutations |
| `backend/app/api/albums.py` | Modify | Same for albums |
| `backend/app/api/tags.py` | Modify | Same for tags |
| `backend/app/api/music.py` | Modify | Same for music |
| `backend/app/api/playlists.py` | Modify | Same for playlists |
| `backend/app/api/draw.py` | Modify | Same for draw |
| `backend/app/api/slideshow.py` | Modify | Same for slideshow |
| `backend/app/api/settings.py` | Modify | Return per-user settings; storage stats filtered by owner (admin sees total) |
| `backend/app/api/backup.py` | Modify | Backup/restore scoped to current user (admin can backup all?) |
| `backend/app/services/photo_service.py` | Modify | Pass `owner_id` into queries if service functions are used |
| `backend/app/services/album_service.py` | Modify | Same |
| `backend/app/services/music_service.py` | Modify | Same |

### Backend Migration & Startup

| File | Action | Description |
|------|--------|-------------|
| `backend/alembic/versions/` | Create | Alembic migration: add nullable `owner_id` to `photo`, `album`, `music`, `playlist`, `tag` |
| `backend/app/core/startup.py` or `main.py` | Modify | Startup hook: if `owner_id` is NULL anywhere, backfill to first admin user's ID |
| `backend/alembic/versions/` | Create (or combine) | Second migration: make `owner_id` NOT NULL |

### Frontend

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/services/api.ts` | Modify | Ensure all API calls carry credentials; 401 handling already done in Task 1 |
| `frontend/src/services/*.ts` | Modify | No signature changes needed if backend filters server-side, but verify all calls still succeed |
| `frontend/src/stores/settings.ts` | Modify | Load/save per-user settings from `/api/settings` instead of global/localStorage |
| `frontend/src/pages/SettingsPage.vue` | Modify | Wire up per-user settings; add "Account" section (display name, password change) |
| `frontend/src/layouts/AppShell.vue` or rail | Modify | Add user info display (avatar + display name) |

---

## Acceptance Criteria

### Backend

- [ ] Alembic migration adds `owner_id` (nullable) to `photo`, `album`, `music`, `playlist`, `tag`.
- [ ] Startup backfill logic: on app start, if any `owner_id` is NULL and at least one admin exists, assign all NULL rows to the first admin's ID.
- [ ] Alembic migration (or combined) makes `owner_id` NOT NULL.
- [ ] Every existing list endpoint filters by `current_user.id` (admin can optionally see all for management endpoints, but normal usage is filtered).
- [ ] Every existing mutation endpoint verifies that `owner_id == current_user.id` or `current_user.role == "admin"`.
- [ ] `POST /api/photos/upload` sets `owner_id = current_user.id`.
- [ ] `POST /api/albums` sets `owner_id = current_user.id`.
- [ ] `POST /api/music/upload` sets `owner_id = current_user.id`.
- [ ] `POST /api/playlists` sets `owner_id = current_user.id`.
- [ ] `POST /api/tags` sets `owner_id = current_user.id`.
- [ ] Settings endpoints (`GET/PUT /api/settings`) work with `UserSetting` table.
- [ ] `pytest` passes for all modified endpoints.
- [ ] `ruff check .` passes.

### Frontend

- [ ] All existing pages (`/draw`, `/albums`, `/upload`, `/music`, `/slideshow`, `/settings`) load and function correctly with authenticated requests.
- [ ] Settings page loads/saves per-user settings from backend.
- [ ] Settings page has "Account" section with display name and password change form.
- [ ] AppShell shows current user display name.
- [ ] No unauthenticated API calls are made on protected routes.
- [ ] `bun run lint && bun run type-check && bun run test` passes.

### Integration

- [ ] Docker build succeeds.
- [ ] Fresh container: setup → upload photo → photo's `owner_id` is the admin's ID.
- [ ] Upgrade scenario: existing data without `owner_id` → start container → backfill → login → all old data visible to admin.
- [ ] Core manual flow passes: upload → album → draw → slideshow → settings.

---

## Notes

- **Admin data visibility**: Admin endpoints (`/api/users`) can see all data. Normal endpoints (`/api/photos`, `/api/albums`, etc.) should filter by `current_user.id` even for admins, to avoid confusing UX where admin sees everyone's photos mixed together. Admin can see all data only via explicit admin endpoints.
- **Backup/restore**: For simplicity in this task, backup/restore should probably remain admin-only and include all data. Or, per-user backup only includes their own data. Document the chosen behavior.
- **Demo data**: The `is_demo` flag on photos/music should probably also be associated with a system or admin user on creation.
- **Database indices**: Add indexes on `owner_id` for query performance.
