---
type: plan
iteration: "1.6"
created: 2026-05-23
tags:
  - v1.6
  - ui-refactor
---

# Task Plan: UI Refactor

## Overview

Port the `docs/assets/ui-refactor/` HTML design export into the production Vue frontend. This is a bridge iteration between Phase 1 and Phase 2: it freezes the new UI contract before feature expansion resumes.

**Reference address:** `docs/assets/ui-refactor/`

**Design fidelity goal:** reproduce the design draft as closely as practical. The directory is not inspiration material; it is the source visual contract for layout, spacing, typography, color, motion, responsive behavior, and visible interaction states.

Full design spec: [[spec]]

## Dependency Graph

```
Task 1: design-contract-shell (independent foundation)
  ├──→ Task 2: content-album-surfaces
  ├──→ Task 3: draw-surface
  ├──→ Task 4: music-slideshow-surfaces
  └──→ Task 5: settings-i18n-data-surfaces
Tasks 2-5 → Task 6: fidelity-verification
```

Key relationships:

- Task 1 establishes tokens, shell, route boundaries, and shared primitives.
- Tasks 2-5 migrate independent route groups and can run in parallel after Task 1.
- Task 6 is the final gate because it depends on all production surfaces existing.

## Sub-task Index

| # | Task | Branch | Dependencies | Doc |
|---|------|--------|-------------|-----|
| 1 | Design Contract + App Shell | `feat/ui-refactor-shell` | None | [[01-design-contract-shell]] |
| 2 | Upload + Album Surfaces | `feat/ui-refactor-library` | Task 1 | [[02-content-album-surfaces]] |
| 3 | Draw Stage + Mobile Gesture Surface | `feat/ui-refactor-draw` | Task 1 | [[03-draw-surface]] |
| 4 | Music Box + Slideshow Surfaces | `feat/ui-refactor-music-slideshow` | Task 1 | [[04-music-slideshow-surfaces]] |
| 5 | Settings + i18n + Data Surfaces | `feat/ui-refactor-settings` | Task 1 | [[05-settings-i18n-data-surfaces]] |
| 6 | Fidelity, Accessibility, Responsive Verification | `feat/ui-refactor-verification` | Tasks 2-5 | [[06-fidelity-verification]] |

## Execution Order

| Phase | Tasks | Parallel? |
|---|---|---|
| 1 | Task 1 | No |
| 2 | Tasks 2, 3, 4, 5 | Yes |
| 3 | Task 6 | No |

## Shared Conventions

- Branch naming: `feat/<task-slug>`, branched from `dev`.
- Merge target: `dev`.
- Preserve user data and existing backend contracts.
- Do not introduce Phase 2 features during this iteration.
- Use `docs/assets/ui-refactor/` as the required reference address and visual source of truth.
- Start every implementation task by inspecting the relevant prototype files in `docs/assets/ui-refactor/`; do not rebuild from memory or from the old Phase 1 UI.
- Favor design fidelity over internal refactor preferences. If a production constraint requires deviation from the prototype, document the reason in the task PR and final fidelity report.
- Use `lucide-vue-next` only if added deliberately; otherwise keep existing icon strategy until Task 1 resolves the dependency decision.
- UI copy must go through `vue-i18n`; user-generated content is not translated.
- Run frontend verification for every task that changes Vue code:
  - `cd frontend && bun run lint`
  - `cd frontend && bun run type-check`
  - `cd frontend && bun run test`
- If a task changes `frontend/package.json`, also run clean install verification:
  - `cd frontend && rm -rf node_modules && bun install && bun run type-check && bun run test`
- Browser visual verification should use the Codex browser or Playwright against the running Vite app once implementation begins.
