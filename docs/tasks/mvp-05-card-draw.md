# Task 5: Card Draw

- **Branch**: `feat/card-draw`
- **Scope**: Time-weighted random draw algorithm (backend service), draw API, full frontend card draw experience on the home page with GSAP animations: deck → flip reveal → center stage → bottom pile → scatter → collect.
- **Dependencies**: Task 1 (project-foundation), Task 2 (photo-management), and Task 3 (album-tag-management) must be merged into `dev` first

## Files

### Backend

- `backend/app/api/draw.py` (create) — Draw router with draw and reset endpoints
- `backend/app/services/draw_service.py` (create) — Time-weighted random selection algorithm
- `backend/app/main.py` (modify) — Register draw router
- `backend/tests/test_draw.py` (create)

### Frontend

- `frontend/src/services/draw.ts` (create) — Draw API client
- `frontend/src/stores/draw.ts` (create) — Pinia store: drawn cards list, exclude_ids, album filter
- `frontend/src/composables/useCardDraw.ts` (create) — Draw orchestration, GSAP animation sequencing
- `frontend/src/pages/HomePage.vue` (modify) — Replace placeholder with full card draw experience
- `frontend/src/components/draw/CardDeck.vue` (create) — Animated card pile (deck) in center of screen
- `frontend/src/components/draw/DrawnCard.vue` (create) — Single card with 3D flip animation, photo display
- `frontend/src/components/draw/CardPile.vue` (create) — Bottom pile showing top 3-5 drawn cards with slight rotation offsets
- `frontend/src/components/draw/CardScatter.vue` (create) — Full-screen scatter view of all drawn cards

## API Contracts

### `POST /api/draw`

- Request:
  ```json
  {
    "album_id": null,
    "exclude_ids": [1, 2, 3]
  }
  ```
  - `album_id` (optional): restrict draw pool to a specific album
  - `exclude_ids` (optional): photo IDs already drawn in this session
- Response 200:
  ```json
  {
    "photo": {
      "id": 42,
      "filename": "sunset.jpg",
      "file_path": "...",
      "thumbnail_path": "...",
      "file_size": 2048576,
      "width": 1920,
      "height": 1080,
      "taken_at": "2023-04-06T15:30:00Z",
      "uploaded_at": "2026-04-01T12:00:00Z",
      "mime_type": "image/jpeg"
    },
    "weight_reason": "3_years_ago_today"
  }
  ```
- Response 404: `{ "detail": "No more photos available to draw" }`

### `POST /api/draw/reset`

- Response 200:
  ```json
  { "ok": true, "total_available": 42 }
  ```

### Draw Algorithm

1. Query all photos (optionally filtered by `album_id`)
2. Exclude IDs in `exclude_ids`
3. For each candidate with `taken_at`:
   - Calculate day-of-year proximity to today in every previous year
   - Exact month-day match → weight **3.0x**, reason: `"{N}_years_ago_today"`
   - ±1 day → weight **2.0x**, reason: `"{N}_years_ago_nearby"`
   - ±2-3 days → weight **1.5x**, reason: `"{N}_years_ago_nearby"`
   - Use the highest weight across all matching years
4. Photos without `taken_at` → weight **1.0x**, reason: `null`
5. Weighted random selection using calculated weights
6. Return selected photo + weight reason

### `weight_reason` values

| Value | Meaning |
|-------|---------|
| `"3_years_ago_today"` | Exact date match, 3 years ago |
| `"1_years_ago_nearby"` | Within ±1-3 days, 1 year ago |
| `null` | Base weight (no time match or no taken_at) |

## Frontend Interaction Flow

1. **Initial state**: Card deck (pile visual) in center of screen
2. **Draw**: User clicks/taps deck → card flies out with 3D flip animation, reveals photo
3. **Center stage**: Drawn card displays large in center
4. **Next draw**: Current card shrinks → flies to bottom pile with random slight rotation and offset
5. **Bottom pile**: Shows top 3-5 drawn cards with edges visible, slightly fanned
6. **Scatter**: Tapping bottom pile → all drawn cards scatter across full screen with random positions and rotations
7. **Inspect**: Hover/tap scattered card → card floats up and enlarges for viewing
8. **Collect**: Tap blank area or "collect" button → cards animate back to bottom pile
9. **Reshuffle**: "Reshuffle" button → clears all drawn cards, resets session (clears Pinia store)

All animations use GSAP. Draw session state (`exclude_ids`, drawn cards) lives entirely in the frontend Pinia store.

**Mobile**: Support swipe left/right on center card for next draw / undo. Touch-friendly tap targets throughout.

## Acceptance Criteria

- [ ] POST /api/draw returns a random photo from the pool
- [ ] Photos with `taken_at` near today's date get higher draw probability
- [ ] `exclude_ids` correctly prevents re-drawing already drawn photos
- [ ] Returns 404 when all photos are excluded or no photos exist
- [ ] `album_id` filters the draw pool to that album's photos
- [ ] `weight_reason` correctly reflects why the photo was chosen
- [ ] Frontend: center deck visual with "draw" affordance
- [ ] Frontend: card flies out from deck with 3D flip animation revealing photo
- [ ] Frontend: drawn card displays in center stage
- [ ] Frontend: on next draw, previous card shrinks and moves to bottom pile with random slight rotation
- [ ] Frontend: bottom pile shows top 3-5 drawn cards with edges visible
- [ ] Frontend: tapping bottom pile → all cards scatter across full screen
- [ ] Frontend: hover/tap scattered card → card floats up and enlarges
- [ ] Frontend: tap blank area or "collect" button → cards gather back to bottom pile
- [ ] Frontend: "reshuffle" button clears all drawn cards and resets session
- [ ] Draw session state (exclude_ids) managed entirely in frontend Pinia store
- [ ] Mobile: swipe gestures supported for card draw interaction
- [ ] All tests pass, lint passes, type-check passes

## Tests

### Backend

- Draw from pool of 10 photos → verify returns a valid photo with all fields
- Draw with `exclude_ids` covering all photos → verify 404
- Draw with `album_id` → only returns photos belonging to that album
- Unit test weight calculation function directly:
  - Photo taken exactly today 3 years ago → weight 3.0, reason `"3_years_ago_today"`
  - Photo taken 1 day away from today 2 years ago → weight 2.0, reason `"2_years_ago_nearby"`
  - Photo taken 3 days away → weight 1.5
  - Photo without `taken_at` → weight 1.0, reason `null`
- `weight_reason` format is correct (`"{N}_years_ago_today"` or `"{N}_years_ago_nearby"` or `null`)

### Frontend

- Test draw store: drawCard adds to drawnCards and exclude_ids, reset clears both
- Test useCardDraw composable: draw triggers API call and updates store
