# Task 6: Slideshow

- **Branch**: `feat/slideshow`
- **Scope**: Slideshow photo list API (ordered, filterable by album), full-screen slideshow frontend with auto-advance, fade and Ken Burns transitions, keyboard/touch controls, controls auto-hide.
- **Dependencies**: Task 1 (project-foundation), Task 2 (photo-management), and Task 3 (album-tag-management) must be merged into `dev` first

## Files

### Backend

- `backend/app/api/slideshow.py` (create) — Slideshow router
- `backend/app/main.py` (modify) — Register slideshow router
- `backend/tests/test_slideshow.py` (create)

### Frontend

- `frontend/src/services/slideshow.ts` (create) — Slideshow API client
- `frontend/src/composables/useSlideshow.ts` (create) — Auto-advance timer, navigation, controls visibility state
- `frontend/src/pages/SlideshowPage.vue` (modify) — Full-screen slideshow player
- `frontend/src/components/SlideshowPlayer.vue` (create) — Photo display with transitions, controls overlay

## API Contracts

### `GET /api/slideshow/photos`

- Query params:
  - `album_id` (optional): filter by album; omit for all photos
  - `order`: `random` (default) | `chronological` (by `taken_at` ASC, then `uploaded_at` ASC)
  - `limit` (optional): max photos to return, default 50
- Response 200:
  ```json
  { "photos": [Photo] }
  ```
- If no photos match, returns `{ "photos": [] }`

## Frontend Behavior

### Display

- Full-screen, dark background (#0a0a0a)
- Photo centered with `object-fit: contain` — no stretching, no cropping
- Overlays navigation with its own immersive UI

### Transitions

Both effects run together on every photo (not user-selectable for MVP):

- **Fade**: Cross-fade between photos when advancing
- **Ken Burns**: Slow zoom (scale 1.0 → 1.1) + slight pan applied continuously during each photo's display interval

### Auto-advance

- Default interval: 5 seconds
- Configurable via controls (3s, 5s, 8s, 10s, 15s options)
- Timer resets on manual navigation

### Controls (overlay)

- Play/Pause button
- Previous / Next buttons
- Interval selector dropdown
- Exit button (returns to previous page)
- Auto-hide after 3 seconds of inactivity
- Show on mouse move or touch

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| Left Arrow | Previous photo |
| Right Arrow | Next photo |
| Escape | Exit slideshow |

### Entry Points

- From album detail page: `/slideshow?album_id=X`
- From global context: `/slideshow` (all photos)

## Acceptance Criteria

- [ ] API returns photos in requested order (random or chronological)
- [ ] API supports album filtering via `album_id`
- [ ] API respects `limit` parameter
- [ ] Frontend: full-screen immersive display with dark background
- [ ] Frontend: photo centered with `object-fit: contain`
- [ ] Frontend: fade transition between photos
- [ ] Frontend: Ken Burns effect (slow zoom + pan) during display
- [ ] Frontend: auto-advance with configurable interval (default 5s)
- [ ] Frontend: play/pause, previous, next, interval adjustment, exit controls
- [ ] Frontend: keyboard shortcuts (Space, Left, Right, Escape)
- [ ] Frontend: controls auto-hide after 3s inactivity, show on mouse move
- [ ] Frontend: exit returns to previous page (router.back())
- [ ] Frontend: slideshow can be launched from album detail page with `album_id` query param
- [ ] All tests pass, lint passes, type-check passes

## Tests

### Backend

- GET /api/slideshow/photos → returns array of photos
- GET /api/slideshow/photos?album_id=1 → only photos from album 1
- GET /api/slideshow/photos?order=chronological → photos sorted by taken_at ASC
- GET /api/slideshow/photos?limit=5 → max 5 photos
- No photos → returns empty array

### Frontend

- Test useSlideshow composable: advance increments index, wraps at end; pause stops timer; next/prev navigate; setInterval updates interval
- Test SlideshowPlayer component renders current photo and control buttons
