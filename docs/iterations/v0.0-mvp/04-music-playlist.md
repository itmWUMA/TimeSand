---
type: task
iteration: "0.0"
status: done
branch: "feat/music-playlist"
pr: 7
completed: 2026-04-12
tags:
  - mvp
---

# Task 4: Music & Playlist

- **Branch**: `feat/music-playlist`
- **Scope**: Music and Playlist SQLModel models with ordered join table (PlaylistMusic with position) and album-playlist association (AlbumPlaylist). Music upload with metadata extraction (title, artist, duration via mutagen). Playlist CRUD with track ordering. Frontend music management page.
- **Dependencies**: Task 1 (project-foundation) and Task 3 (album-tag-management) must be merged into `dev` first

## Files

### Backend

- `backend/app/models/music.py` (create) — Music, Playlist, PlaylistMusic, AlbumPlaylist SQLModels
- `backend/app/models/__init__.py` (modify) — Add music model exports
- `backend/app/api/music.py` (create) — Music router
- `backend/app/api/playlists.py` (create) — Playlist router
- `backend/app/services/music_service.py` (create) — File handling, metadata extraction with mutagen
- `backend/app/main.py` (modify) — Register music and playlist routers, create music data directory on startup
- `backend/app/core/database.py` (modify) — Import music models for table creation
- `backend/tests/test_music.py` (create)
- `backend/tests/test_playlists.py` (create)

### Frontend

- `frontend/src/types/music.ts` (create) — Music, Playlist TypeScript interfaces
- `frontend/src/services/music.ts` (create) — Music API client
- `frontend/src/services/playlist.ts` (create) — Playlist API client
- `frontend/src/pages/MusicPage.vue` (modify) — Music list + playlist management UI
- `frontend/src/components/MusicUploader.vue` (create) — Music file upload component
- `frontend/src/components/PlaylistEditor.vue` (create) — Playlist track list with drag-to-reorder

## API Contracts

### Music

#### `POST /api/music/upload`

- Request: `multipart/form-data`, field `files` (multiple)
- Accept: MP3, WAV, FLAC, OGG, AAC (validate MIME type)
- On upload: save with UUID filename → extract metadata via mutagen → create DB record
- If metadata unavailable: `title` defaults to original filename (without extension), `artist` and `duration` nullable
- Response 201:
  ```json
  { "tracks": [Music] }
  ```
- Response 400: `{ "detail": "No valid audio files provided" }`

#### `GET /api/music`

- Query params: `page` (default 1), `page_size` (default 20)
- Response 200:
  ```json
  { "items": [Music], "total": int, "page": int, "page_size": int }
  ```

#### `GET /api/music/{id}`

- Response 200: `Music`
- Response 404: `{ "detail": "Music not found" }`

#### `DELETE /api/music/{id}`

- Removes DB record + file from disk + removes from all playlists
- Response 200: `{ "ok": true }`

#### `GET /api/music/{id}/file`

- Response 200: Binary audio with correct `Content-Type`
- Must include `Accept-Ranges: bytes` header for seeking support

### Playlists

#### `POST /api/playlists`

- Request: `{ "name": "Chill Vibes" }`
- Response 201: `Playlist`

#### `GET /api/playlists`

- Response 200: `{ "items": [Playlist] }` (each includes `track_count`)

#### `GET /api/playlists/{id}`

- Response 200: `Playlist` with `tracks: [Music]` ordered by position

#### `PUT /api/playlists/{id}`

- Request: `{ "name": "New Name", "track_ids": [3, 1, 2] }`
- `track_ids` sets the new order (position = array index)
- Response 200: `Playlist`

#### `DELETE /api/playlists/{id}`

- Does NOT delete music files — only removes playlist and track associations
- Cannot delete the default playlist (return 400)
- Response 200: `{ "ok": true }`

#### `POST /api/playlists/{id}/tracks`

- Request: `{ "music_id": 5 }`
- Appends to end of playlist
- Response 200: `{ "ok": true }`

#### `DELETE /api/playlists/{id}/tracks/{music_id}`

- Response 200: `{ "ok": true }`

### Album-Playlist Association

#### `PUT /api/albums/{id}/playlist`

- Request: `{ "playlist_id": 2 }`
- Response 200: `{ "ok": true }`

#### `DELETE /api/albums/{id}/playlist`

- Response 200: `{ "ok": true }`

Note: `GET /api/albums/{id}` response should include `playlist_id` field (nullable) once this task is merged.

**Default playlist auto-creation**: On app startup (in `main.py` lifespan event), check if a playlist with `is_default=true` exists. If not, create one named "Default Playlist".

### Music Schema

```json
{
  "id": 1,
  "title": "Sunset Dreams",
  "artist": "Lo-fi Beats",
  "filename": "sunset_dreams.mp3",
  "file_path": "e5f6g7h8-9012-3456-abcd-ef1234567890.mp3",
  "file_size": 5242880,
  "duration": 234.5,
  "mime_type": "audio/mpeg",
  "uploaded_at": "2026-04-06T12:00:00Z"
}
```

### Playlist Schema

```json
{
  "id": 1,
  "name": "Chill Vibes",
  "is_default": false,
  "track_count": 5,
  "created_at": "2026-04-06T12:00:00Z",
  "tracks": [Music]
}
```

## Acceptance Criteria

- [ ] Upload MP3 → creates DB record with extracted title, artist, duration via mutagen
- [ ] Upload file without metadata → title defaults to filename (without extension)
- [ ] Non-audio files rejected with 400
- [ ] UUID-based filenames for storage
- [ ] GET /api/music/{id}/file streams audio with `Accept-Ranges` header
- [ ] DELETE music → removes from all playlists + deletes file from disk
- [ ] Create playlist, add tracks, reorder tracks via PUT with `track_ids`
- [ ] Playlist tracks returned in correct position order
- [ ] Cannot delete the default playlist
- [ ] Associate playlist with album via PUT /api/albums/{id}/playlist
- [ ] Album detail response includes `playlist_id`
- [ ] A default playlist is auto-created on first startup (`is_default=true`)
- [ ] Frontend: music upload with file picker
- [ ] Frontend: music list showing title, artist, duration
- [ ] Frontend: playlist creation and track management
- [ ] Frontend: drag-to-reorder tracks in playlist
- [ ] All tests pass, lint passes, type-check passes

## Tests

### Backend

- Upload valid MP3 → verify DB record with extracted metadata (title, artist, duration)
- Upload file without tags → verify title defaults to filename
- Upload non-audio file → verify 400
- GET /api/music → verify pagination response
- DELETE music → verify file deleted from disk, removed from all playlists
- GET /api/music/{id}/file → verify audio response with `Accept-Ranges` header
- Playlist CRUD lifecycle: create → add tracks → reorder via PUT → list → delete
- Verify playlist tracks are ordered by position after reorder
- Cannot delete default playlist → verify 400
- Album-playlist association: set → verify in album detail → remove → verify null
- Default playlist exists after app startup

### Frontend

- Test MusicUploader renders upload zone and file input
- Test PlaylistEditor renders track list and allows removal
