---
type: task
iteration: "1.6"
status: pending
branch: "feat/ui-refactor-music-slideshow"
pr:
completed:
tags:
  - v1.6
  - ui-refactor
  - music
  - slideshow
---

# Task 4: Music Box + Slideshow Surfaces

- **Branch**: `feat/ui-refactor-music-slideshow`
- **Scope**: Migrate `music.html` and `slideshow.html` into the production app, including the global player visual contract.
- **Dependencies**: Task 1

## Files

### Frontend

- `frontend/src/pages/MusicPage.vue` (modify)
- `frontend/src/pages/SlideshowPage.vue` (modify)
- `frontend/src/components/MusicPlayer.vue` (modify)
- `frontend/src/components/MusicPlayerMini.vue` (modify or fold into the new global player component)
- `frontend/src/components/MusicUploader.vue` (modify)
- `frontend/src/components/PlaylistEditor.vue` (modify)
- `frontend/src/components/SlideshowPlayer.vue` (modify)
- `frontend/src/composables/useMusicPlayer.ts` (modify only as needed for visual/state contract)
- `frontend/src/composables/useSlideshow.ts` (modify only as needed for controls and interval behavior)
- `frontend/src/stores/player.ts` (modify only if the player state contract changes)
- `frontend/src/services/music.ts` (modify only if data adapters are needed)
- `frontend/src/services/playlist.ts` (modify only if data adapters are needed)
- `frontend/src/services/slideshow.ts` (modify only if `/slideshow/:albumId` requires parameter support)
- `frontend/src/i18n/locales/zh-CN.ts` (modify)
- `frontend/src/i18n/locales/en.ts` (modify)
- Existing music/slideshow tests (modify)

## Design Details

- Reference address: `docs/assets/ui-refactor/`.
- Primary files for this task: `music.html`, `slideshow.html`, `styles.css`, and `shell.js`.
- The target is to reproduce these exported screens as closely as practical while replacing demo music/slideshow data with real API data.
- Global player must follow the exported bottom player: cover, current title/artist, previous/play/next/loop, progress, and desktop volume tools.
- The player must never show placeholder slot text. Empty state copy should be quiet and intentional.
- Music page should preserve the exported playlist hero, track rows, playlist list, uploader, and current queue hierarchy.
- Slideshow should be a fullscreen route with no app shell, using the exported dark immersive controls overlay.
- Slideshow visual motion should preserve Ken Burns behavior and existing interval settings.

## Acceptance Criteria

- [ ] `/music` visually follows `music.html` and uses real music/playlists.
- [ ] Music upload, playlist create/update/delete, add/remove/reorder track, and player controls still work.
- [ ] Bottom global player follows the exported responsive behavior and remains available on shell routes.
- [ ] `/slideshow` and `/slideshow/:albumId` visually follow `slideshow.html` and render without app shell.
- [ ] Slideshow handles loading, no photos, error, play/pause, next/previous, exit, and interval states.
- [ ] Music and slideshow copy uses i18n keys.
- [ ] Tests cover player state persistence, music page data states, and slideshow controls.

## Tests

- Frontend:
  - `cd frontend && bun run test -- MusicPage.spec.ts`
  - `cd frontend && bun run test -- MusicPlayer.spec.ts MusicUploader.spec.ts PlaylistEditor.spec.ts`
  - `cd frontend && bun run test -- useMusicPlayer useSlideshow`
  - `cd frontend && bun run test -- SlideshowPlayer.spec.ts`
  - `cd frontend && bun run lint && bun run type-check && bun run test`

## Manual Check

- Upload music, create a playlist, play/pause/skip tracks, bind or use album context if supported.
- Start slideshow from all photos and from an album detail page.
- Leave slideshow and confirm shell/player state returns correctly.
