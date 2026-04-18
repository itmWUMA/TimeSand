---
type: task
iteration: "0.0"
status: done
branch: "feat/album-tag-management"
pr: 5
completed: 2026-04-11
tags:
  - mvp
---

# Task 3: Album & Tag Management

- **Branch**: `feat/album-tag-management`
- **Scope**: Album and Tag SQLModel models with many-to-many join tables (PhotoAlbum, PhotoTag). Full CRUD APIs for albums and tags. Frontend album list page with cover thumbnails, album detail page showing photos with management controls, and tag management UI.
- **Dependencies**: Task 1 (project-foundation) and Task 2 (photo-management) must be merged into `dev` first

## Files

### Backend

- `backend/app/models/album.py` (create) — Album, PhotoAlbum, Tag, PhotoTag SQLModels
- `backend/app/models/__init__.py` (modify) — Add album/tag model exports
- `backend/app/api/albums.py` (create) — Album router with all endpoints
- `backend/app/api/tags.py` (create) — Tag router with all endpoints
- `backend/app/main.py` (modify) — Register album and tag routers
- `backend/app/core/database.py` (modify) — Import album/tag models for table creation
- `backend/tests/test_albums.py` (create)
- `backend/tests/test_tags.py` (create)

### Frontend

- `frontend/src/types/album.ts` (create) — Album, Tag TypeScript interfaces
- `frontend/src/services/album.ts` (create) — Album API client
- `frontend/src/services/tag.ts` (create) — Tag API client
- `frontend/src/pages/AlbumsPage.vue` (modify) — Album grid with cover photos
- `frontend/src/pages/AlbumDetailPage.vue` (modify) — Photo grid within album, add/remove photos, manage tags
- `frontend/src/components/AlbumCard.vue` (create) — Album cover thumbnail card with name and photo count
- `frontend/src/components/TagManager.vue` (create) — Tag add/remove for a photo, with tag autocomplete

## API Contracts

### Albums

#### `POST /api/albums`

- Request: `{ "name": "Vacation 2023", "description": "Summer trip" }`
- Response 201: `Album`

#### `GET /api/albums`

- Response 200: `{ "items": [Album], "total": int }`

#### `GET /api/albums/{id}`

- Response 200: `Album` (includes `photo_count` and `cover_photo` thumbnail URL)
- Response 404: `{ "detail": "Album not found" }`

#### `PUT /api/albums/{id}`

- Request: `{ "name": "...", "description": "...", "cover_photo_id": 5 }`
- Response 200: `Album`

#### `DELETE /api/albums/{id}`

- Does NOT delete photos — only removes the album and its photo associations
- Response 200: `{ "ok": true }`

#### `POST /api/albums/{id}/photos`

- Request: `{ "photo_ids": [1, 2, 3] }`
- Response 200: `{ "ok": true }`

#### `DELETE /api/albums/{id}/photos/{photo_id}`

- Response 200: `{ "ok": true }`

### Tags

#### `POST /api/tags`

- Request: `{ "name": "sunset" }`
- Response 201: `Tag`
- Duplicate name → 409 Conflict

#### `GET /api/tags`

- Response 200: `{ "items": [Tag] }` (all tags, no pagination for MVP)

#### `DELETE /api/tags/{id}`

- Removes tag and all its photo associations
- Response 200: `{ "ok": true }`

#### `POST /api/photos/{photo_id}/tags`

- Request: `{ "tag_ids": [1, 2] }`
- Response 200: `{ "ok": true }`

#### `DELETE /api/photos/{photo_id}/tags/{tag_id}`

- Response 200: `{ "ok": true }`

### Photo list filtering (extend existing endpoint)

- `GET /api/photos?album_id=1` → only photos in that album
- `GET /api/photos?tag_id=2` → only photos with that tag

### Album Schema

```json
{
  "id": 1,
  "name": "Vacation 2023",
  "description": "Summer trip to Japan",
  "cover_photo_id": 5,
  "photo_count": 42,
  "created_at": "2026-04-06T12:00:00Z",
  "updated_at": "2026-04-06T12:00:00Z"
}
```

### Tag Schema

```json
{ "id": 1, "name": "sunset" }
```

## Acceptance Criteria

- [ ] Create album with name and description
- [ ] List albums shows cover photo thumbnail and photo count
- [ ] Add photos to album → GET album detail shows those photos
- [ ] Remove photo from album → photo still exists in DB, just unlinked
- [ ] Delete album → photos remain, only album and associations removed
- [ ] Set album cover photo via PUT
- [ ] Create tag, list tags, delete tag
- [ ] Duplicate tag name returns 409
- [ ] Add tags to a photo, remove tag from a photo
- [ ] GET /api/photos?album_id=X filters correctly
- [ ] GET /api/photos?tag_id=X filters correctly
- [ ] Frontend: albums page shows grid of AlbumCard components with cover thumbnails
- [ ] Frontend: album detail page shows photos in that album
- [ ] Frontend: album detail page has controls to add/remove photos
- [ ] Frontend: TagManager component allows adding/removing tags on a photo
- [ ] All tests pass, lint passes, type-check passes

## Tests

### Backend

- Album CRUD lifecycle: create → get → update name → list → delete
- Add photos to album → verify photos appear in album detail and in `GET /api/photos?album_id=X`
- Remove photo from album → verify photo unlinked but still exists via `GET /api/photos/{id}`
- Delete album → verify photos not deleted
- Set cover_photo_id → verify in album detail
- Tag CRUD: create → list → delete
- Create duplicate tag → verify 409
- Add tags to photo → verify tags in photo response or via `GET /api/photos?tag_id=X`
- Remove tag from photo → verify removed
- Delete tag → verify all photo associations removed

### Frontend

- Test AlbumCard component renders album name, photo count, and cover image
- Test TagManager component renders existing tags and allows adding new ones
