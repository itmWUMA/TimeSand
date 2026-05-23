---
type: task
iteration: "1.6"
status: pending
branch: "feat/ui-refactor-draw"
pr:
completed:
tags:
  - v1.6
  - ui-refactor
  - draw
  - mobile
---

# Task 3: Draw Stage + Mobile Gesture Surface

- **Branch**: `feat/ui-refactor-draw`
- **Scope**: Migrate `draw.html` and `mobile-draw.html` into the production `/draw` route, preserving existing server-side draw behavior and card-draw state.
- **Dependencies**: Task 1

## Files

### Frontend

- `frontend/src/pages/HomePage.vue` (modify or move to `DrawPage.vue`)
- `frontend/src/router/index.ts` (modify only if Task 1 leaves draw component wiring to this task)
- `frontend/src/components/draw/CardDeck.vue` (modify)
- `frontend/src/components/draw/DrawnCard.vue` (modify)
- `frontend/src/components/draw/CardPile.vue` (modify)
- `frontend/src/components/draw/CardScatter.vue` (modify)
- `frontend/src/composables/useCardDraw.ts` (modify only for keyboard/history/gesture state)
- `frontend/src/stores/draw.ts` (modify only if route state shape changes)
- `frontend/src/utils/parseWeightReason.ts` (modify only if display copy needs adapter support)
- `frontend/src/i18n/locales/zh-CN.ts` (modify)
- `frontend/src/i18n/locales/en.ts` (modify)
- Existing draw-related tests (modify)

## Design Details

- Reference address: `docs/assets/ui-refactor/`.
- Primary files for this task: `draw.html`, `mobile-draw.html`, `styles.css`, and `shell.js`.
- The target is to reproduce the exported draw stage as closely as practical while preserving server-driven draw behavior.
- `draw.html` is the desktop/tablet draw stage.
- `mobile-draw.html` is the small-screen shape of `/draw`, not a production route.
- Preserve the exported visual idea: ritual stage, card depth, time/memory metadata, sand motes, deck/pile/scatter states, and keyboard hints where screen size allows them.
- Existing draw API stays server-driven: frontend sends album/exclude state and displays the returned card and weight reason.
- Keep current touch gestures but align thresholds and visible affordances with the prototype.
- Keyboard behavior:
  - `Space`: draw next card
  - `ArrowLeft` / `ArrowRight`: navigate draw history where supported
  - `Esc`: close scatter/open overlays

## Acceptance Criteria

- [ ] `/draw` displays the exported draw stage layout with real albums and real draw results.
- [ ] `/` compatibility is handled according to the Task 1 route decision.
- [ ] Small screens use the mobile draw interaction model from `mobile-draw.html`.
- [ ] Draw, undo/history, reshuffle/reset, scatter open/collect, memory copy, and lightbox all still work.
- [ ] Empty pool and no-photo states use production copy and do not expose debug text.
- [ ] Keyboard shortcuts work on desktop and are not shown as visible hints on mobile.
- [ ] Reduced-motion preference disables nonessential motion.
- [ ] Tests cover draw success, empty pool, no photos, mobile gesture, keyboard actions, and weight-reason copy.

## Tests

- Frontend:
  - `cd frontend && bun run test -- useCardDraw`
  - `cd frontend && bun run test -- draw`
  - `cd frontend && bun run test -- parseWeightReason`
  - `cd frontend && bun run lint && bun run type-check && bun run test`

## Manual Check

- Draw from all photos.
- Draw from a specific album.
- Use mobile-sized viewport and swipe left/right.
- Open scatter, collect cards, and open the drawn photo in lightbox.
