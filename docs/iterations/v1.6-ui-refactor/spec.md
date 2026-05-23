---
type: spec
iteration: "1.6"
created: 2026-05-23
tags:
  - v1.6
  - ui-refactor
  - frontend
  - design-handoff
---

# Design Spec: UI Refactor

## Overview

This bridge iteration sits after Phase 1 and before Phase 2. Phase 1 has delivered the product foundation, but the new `docs/assets/ui-refactor/` export replaces the earlier incremental UI direction with a stricter visual contract. The goal is to migrate the exported HTML prototype into the real Vue 3 application before adding Phase 2 features, so future product work builds on the final UI shell, routes, responsive behavior, and design tokens.

The reference address for this iteration is the full `docs/assets/ui-refactor/` directory. Its contents are the visual contract to reproduce as closely as possible:

- `docs/assets/ui-refactor/HANDOFF.md`
- `docs/assets/ui-refactor/DESIGN-HANDOFF.md`
- `docs/assets/ui-refactor/DESIGN-MANIFEST.json`
- `docs/assets/ui-refactor/styles.css`
- `docs/assets/ui-refactor/shell.js`
- `docs/assets/ui-refactor/index.html`
- `docs/assets/ui-refactor/landing.html`
- `docs/assets/ui-refactor/draw.html`
- `docs/assets/ui-refactor/mobile-draw.html`
- `docs/assets/ui-refactor/albums.html`
- `docs/assets/ui-refactor/album-detail.html`
- `docs/assets/ui-refactor/upload.html`
- `docs/assets/ui-refactor/music.html`
- `docs/assets/ui-refactor/slideshow.html`
- `docs/assets/ui-refactor/settings.html`

The implementation goal is maximum practical design fidelity. The production UI should preserve the prototype's layout geometry, spacing, typography, color tokens, responsive breakpoints, motion timing, and visible interaction states. Deviations are allowed only when required by real backend data, accessibility semantics, i18n text expansion, or browser/responsive safety, and those deviations must be recorded in the final fidelity report.

## Goals

- Rebuild the frontend around the exported Warm Walnut design system rather than continuing piecemeal visual edits.
- Treat `docs/assets/ui-refactor/` as the required reference address and reproduce the design as closely as practical.
- Preserve the exported screen boundaries: landing, draw, albums, album detail, upload, music, slideshow, settings, and mobile draw behavior.
- Keep real TimeSand API integration and existing Phase 1 functionality intact.
- Establish a screenshot-driven fidelity gate before Phase 2 begins.
- Resolve the handoff's project-specific blanks: network library, browser target, auth, API paths, upload/HEIC handling, and deployment target.

## Non-Goals

- No Phase 2 feature expansion such as timeline, map view, favorites, video support, search, or light theme.
- No authentication work; MVP remains local single-user with no auth.
- No backend draw algorithm redesign beyond preserving existing API behavior and displaying returned weight reasons.
- No new native/Tauri/Electron surface. The target remains self-hosted web.

## Design Analysis

### Visual System

The export defines a Warm Walnut system: a deep walnut canvas, a single warm amber accent, restrained borders, serif display headings, sans body text, mono metadata, and subtle floating sand particles. This is a stronger and warmer direction than the current dark slate token set in `frontend/src/assets/tokens.css`.

Key implementation rules:

- Map `styles.css` tokens into `frontend/src/assets/tokens.css` and `frontend/tailwind.config.ts`.
- Use the accent sparingly: main CTA plus active state only.
- Keep display serif for hero/page titles, sans for body copy, and mono for metadata, counters, and keyboard hints.
- Preserve the exported shell geometry before refactoring internals.
- Keep the ambient mote layer available for draw, slideshow, and landing hero surfaces.

### Surface Map

| Prototype file | Production route/surface | Notes |
|---|---|---|
| `index.html` | Design reference only | Launcher/overview, not a production route |
| `landing.html` | `/` or `LandingPage.vue` | Full-screen marketing/onboarding surface; not wrapped in app shell |
| `draw.html` | `/draw` | Core card draw stage |
| `mobile-draw.html` | `/draw` responsive state | Not a separate route; small-screen behavior for draw |
| `albums.html` | `/albums` | App shell surface |
| `album-detail.html` | `/albums/:id` | App shell surface |
| `upload.html` | `/upload` | App shell surface |
| `music.html` | `/music` | App shell surface |
| `slideshow.html` | `/slideshow` and `/slideshow/:albumId` | Full-screen route, no app shell |
| `settings.html` | `/settings` | App shell surface |

### Current App Alignment

The current app already has Vue 3, Tailwind, Pinia, vue-i18n, axios, GSAP, howler, tests, settings, backup, music, slideshow, and card draw primitives. The refactor should reuse those contracts rather than rebuilding functionality from scratch.

Required alignment decisions:

- Network library: keep the existing axios client in `frontend/src/services/api.ts`.
- Deployment target: self-hosted web served by FastAPI/Docker.
- Browser target: Chrome 110+ and iOS Safari 16+ as the minimum practical target.
- Auth: none for this iteration.
- HEIC handling: backend conversion remains the source of truth; frontend treats HEIC upload as normal multipart upload.
- Upload transport: keep current multipart upload endpoints; support cancellation and progress, but do not introduce chunked upload unless a later backend task defines it.

### API Contract

Use existing backend endpoints, not the placeholder paths from the export:

| Domain | Endpoint |
|---|---|
| Albums | `GET/POST /api/albums`, `GET/PUT/DELETE /api/albums/{id}` |
| Album photos | `POST /api/albums/{id}/photos`, `DELETE /api/albums/{id}/photos/{photo_id}` |
| Photos | `POST /api/photos/upload`, `GET /api/photos`, `GET /api/photos/{id}`, `GET /api/photos/{id}/file`, `GET /api/photos/{id}/thumbnail` |
| Draw | `POST /api/draw`, `POST /api/draw/reset` |
| Music | `POST /api/music/upload`, `GET /api/music`, `GET /api/music/{id}`, `GET /api/music/{id}/file` |
| Playlists | `GET/POST /api/playlists`, `GET/PUT/DELETE /api/playlists/{id}`, playlist track endpoints |
| Slideshow | `GET /api/slideshow/photos` |
| Settings/storage | `GET /api/settings/storage` |
| Backup | `POST /api/backup/export`, `POST /api/backup/import` |

## Architecture

### Layout

- Replace `DefaultLayout.vue` with an `AppShell` aligned to `shell.js`: left rail, bottom global music player, language toggle, and app canvas.
- Slideshow and landing bypass the shell.
- `/draw` becomes the canonical draw route. `/` either renders the landing page or redirects to `/draw` depending on product decision; for MVP with no auth, landing may remain accessible as a public intro and `/draw` should be directly routable.

### Components

Prefer domain components over generic card grids:

- `AppShell`, `RailNav`, `GlobalPlayer`, `MoteLayer`
- Draw stage: deck, drawn card, history pile, scatter, mobile gesture surface
- Albums: cover collage card, album detail hero, photo grid, metadata panel
- Upload: drop zone, queue rows, progress/cancel/retry states
- Music: playlist hero, track rows, queue controls, playlist editor
- Slideshow: full-screen Ken Burns player, controls overlay
- Settings: storage, backup/restore, draw defaults, slideshow defaults, language/appearance

### Testing

- Keep Vitest for component and composable coverage.
- Add Playwright only for this iteration's responsive/fidelity gate if not already available.
- Validate the exported viewport matrix: 360x800, 390x844, 430x932, 600x960, 820x1180, 1024x768, 1366x768, 1440x900, 1920x1080.
- Run Lighthouse after the refactor: Performance >= 85, Accessibility >= 95.

## Acceptance Criteria

- [ ] `docs/assets/ui-refactor/HANDOFF.md` blanks are resolved in implementation notes or code decisions.
- [ ] `/draw`, `/albums`, `/albums/:id`, `/upload`, `/music`, `/slideshow`, `/slideshow/:albumId`, and `/settings` all run with real backend data.
- [ ] `mobile-draw.html` behavior exists as responsive `/draw` behavior, not as a separate production route.
- [ ] Landing and slideshow can render without the app shell.
- [ ] Warm Walnut tokens replace the previous dark slate visual language across production pages.
- [ ] No exported Open Design chrome, demo-only annotations, placeholder stats, or debug copy remain in production UI.
- [ ] Existing frontend unit tests pass, and new/updated tests cover the refactored surfaces.
- [ ] Screenshot verification passes on the required viewport matrix with no horizontal overflow.
- [ ] Core manual flow passes: upload photos -> create/open album -> draw cards -> play slideshow -> manage music -> open settings.

## Risks

- Visual fidelity can regress if the refactor starts from isolated UI atoms instead of preserving exported page geometry.
- Existing page tests may become brittle because the DOM structure changes significantly.
- The current `/` route is the card draw page; adding a landing page requires a deliberate router decision.
- Screenshot parity cannot be fully guaranteed without checking the rendered prototype and app side by side.
