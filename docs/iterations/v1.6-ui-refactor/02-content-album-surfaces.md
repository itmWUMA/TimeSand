---
type: task
iteration: "1.6"
status: pending
branch: "feat/ui-refactor-library"
pr:
completed:
tags:
  - v1.6
  - ui-refactor
  - upload
  - albums
---

# Task 2: Upload + Album Surfaces

- **Branch**: `feat/ui-refactor-library`
- **Scope**: Migrate `upload.html`, `albums.html`, and `album-detail.html` into production Vue surfaces while preserving real upload, album, tag, playlist, and photo APIs.
- **Dependencies**: Task 1

## Files

### Frontend

- `frontend/src/pages/UploadPage.vue` (modify)
- `frontend/src/pages/AlbumsPage.vue` (modify)
- `frontend/src/pages/AlbumDetailPage.vue` (modify)
- `frontend/src/components/PhotoUploader.vue` (modify)
- `frontend/src/components/AlbumCard.vue` (modify)
- `frontend/src/components/PhotoGrid.vue` (modify)
- `frontend/src/components/PhotoGridItem.vue` (modify)
- `frontend/src/components/TsLightbox.vue` (modify if album detail uses exported full-photo behavior)
- `frontend/src/services/photo.ts` (modify only if upload cancellation/progress contract needs adapter support)
- `frontend/src/services/album.ts` (modify only if view data needs adapter helpers)
- `frontend/src/i18n/locales/zh-CN.ts` (modify)
- `frontend/src/i18n/locales/en.ts` (modify)
- Existing tests under `frontend/src/pages/__tests__/` and `frontend/src/components/__tests__/` (modify)

## Design Details

- Reference address: `docs/assets/ui-refactor/`.
- Primary files for this task: `upload.html`, `albums.html`, `album-detail.html`, `styles.css`, and `shell.js`.
- The target is to reproduce these exported screens as closely as practical while replacing demo data with real API data.
- Upload page must preserve the "把照片请进来" visual rhythm, drop zone, upload queue, progress, retry, and cancel states.
- Album list must preserve the exported collection cards: cover collage, photo count, updated metadata, and restrained CTA treatment.
- Album detail must preserve the large hero/header, date metadata, album controls, and photo grid hierarchy.
- Replace demo images/counts with real API data.
- Empty states should use the exported tone and spacing, not the older generic empty-card style.
- Keep tag and album management functionality available even if visual placement changes.

## Acceptance Criteria

- [ ] `/upload` visually follows `upload.html` and still uploads one or many photos through `POST /api/photos/upload`.
- [ ] Upload progress, cancellation, failure, retry, and HEIC-as-normal-upload behavior are represented.
- [ ] `/albums` visually follows `albums.html` and displays real album counts/covers.
- [ ] `/albums/:id` visually follows `album-detail.html`, displays real album metadata, and loads real photos.
- [ ] Album create/update/delete and add/remove photo behavior remain functional.
- [ ] Photo lightbox remains accessible by keyboard and pointer.
- [ ] All UI text uses i18n keys.
- [ ] Loading, empty, error, and success states are covered in tests.

## Tests

- Frontend:
  - `cd frontend && bun run test -- AlbumsPage.spec.ts`
  - `cd frontend && bun run test -- AlbumDetailPage.spec.ts`
  - `cd frontend && bun run test -- PhotoUploader.spec.ts`
  - `cd frontend && bun run test -- PhotoGrid.spec.ts PhotoGridItem.spec.ts`
  - `cd frontend && bun run lint && bun run type-check && bun run test`

## Manual Check

- Start the backend and frontend.
- Upload a JPG and a HEIC sample.
- Create an album, add uploaded photos, open album detail, open a photo in the lightbox, and remove one photo from the album.
