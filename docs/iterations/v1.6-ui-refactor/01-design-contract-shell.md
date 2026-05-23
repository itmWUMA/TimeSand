---
type: task
iteration: "1.6"
status: pending
branch: "feat/ui-refactor-shell"
pr:
completed:
tags:
  - v1.6
  - ui-refactor
  - shell
  - tokens
---

# Task 1: Design Contract + App Shell

- **Branch**: `feat/ui-refactor-shell`
- **Scope**: Freeze the Warm Walnut design contract in the frontend, establish production route boundaries, and rebuild the app shell from the exported `shell.js` geometry.
- **Dependencies**: None

## Files

### Frontend

- `frontend/src/assets/tokens.css` (modify - replace current dark slate tokens with Warm Walnut tokens from `docs/assets/ui-refactor/styles.css`)
- `frontend/src/assets/main.css` (modify - align body background, global typography, selection, safe-area utilities, no-overflow defaults)
- `frontend/tailwind.config.ts` (modify - map Warm Walnut colors, display/body/mono fonts, radii, shadows, timing, and custom breakpoints 1100/860/720/420)
- `frontend/src/App.vue` (modify - route shell selection and transition behavior)
- `frontend/src/router/index.ts` (modify - add canonical `/draw`, landing route decision, `/slideshow/:albumId`, and compatibility redirects)
- `frontend/src/layouts/DefaultLayout.vue` (modify or replace - migrate to exported rail + bottom player shell)
- `frontend/src/layouts/__tests__/DefaultLayout.spec.ts` (modify)
- `frontend/src/router/__tests__/index.spec.ts` (modify)
- `frontend/src/pages/LandingPage.vue` (create if `/` becomes landing)

## Design Details

- Reference address: `docs/assets/ui-refactor/`.
- Primary files for this task: `styles.css`, `shell.js`, `DESIGN-MANIFEST.json`, `index.html`, `landing.html`, and `slideshow.html`.
- The target is to reproduce the exported shell and design tokens as closely as practical, not to create a new shell inspired by them.
- Treat `docs/assets/ui-refactor/styles.css` and `shell.js` as the source of truth for shell geometry.
- Keep `index.html` as a design launcher/reference only; do not implement it as a production route.
- Slideshow and landing must be able to render outside the app shell.
- `/draw` is the canonical draw route. If `/` remains the direct app entry for MVP, add a redirect or alias and document the decision in router tests.
- Preserve the rail groups: 回忆, 内容, 其他.
- Preserve the bottom player footprint and responsive behavior:
  - desktop: rail on the left, player at bottom of main grid
  - <=1100px: icon rail
  - <=860px: player drops secondary controls
  - <=720px: player and rail fixed to bottom with safe-area padding
  - <=420px: compact labels and tighter spacing

## Acceptance Criteria

- [ ] Warm Walnut tokens are available through CSS variables and Tailwind theme keys.
- [ ] App shell matches the exported rail/player structure and responsive breakpoints.
- [ ] Landing and slideshow can opt out of the shell.
- [ ] `/draw` route exists and existing links/tests do not break.
- [ ] Language toggle still persists `zh-CN` / `en` through the existing i18n setup.
- [ ] Toast provider remains globally available.
- [ ] Existing player state is not reset during route changes.
- [ ] Unit tests cover active rail state, route aliases, fullscreen shell opt-out, and language toggle behavior.

## Tests

- Frontend:
  - `cd frontend && bun run test -- DefaultLayout.spec.ts`
  - `cd frontend && bun run test -- index.spec.ts`
  - `cd frontend && bun run lint && bun run type-check && bun run test`
