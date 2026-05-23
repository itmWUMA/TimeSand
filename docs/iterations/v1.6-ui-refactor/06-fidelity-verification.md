---
type: task
iteration: "1.6"
status: pending
branch: "feat/ui-refactor-verification"
pr:
completed:
tags:
  - v1.6
  - ui-refactor
  - verification
  - accessibility
---

# Task 6: Fidelity, Accessibility, Responsive Verification

- **Branch**: `feat/ui-refactor-verification`
- **Scope**: Add the final verification gate for the UI refactor: viewport screenshots, overflow checks, accessibility checks, Lighthouse targets, and release-readiness documentation.
- **Dependencies**: Tasks 2, 3, 4, 5

## Files

### Frontend

- `frontend/package.json` (modify only if adding Playwright/Lighthouse scripts)
- `frontend/playwright.config.ts` (create if Playwright is added)
- `frontend/e2e/ui-refactor.spec.ts` (create if Playwright is added)
- `frontend/src/test-utils.ts` (modify only if shared visual-test helpers are needed)

### Docs

- `docs/review-screenshots/` (add generated screenshots only if the team wants committed evidence)
- `docs/iterations/v1.6-ui-refactor/fidelity-report.md` (create)

## Design Details

Verification must compare the production app against the exported design in `docs/assets/ui-refactor/`, not against old Phase 1 pages. The point is to make Phase 2 safe to start.

Reference address: `docs/assets/ui-refactor/`.

The fidelity goal is maximum practical restoration of the design draft. The final report must call out any route, component, breakpoint, or interaction that intentionally differs from the prototype.

Required viewport matrix:

| Name | Size |
|---|---|
| mobile compact | 360x800 |
| mobile standard | 390x844 |
| mobile large | 430x932 |
| foldable / small tablet | 600x960 |
| tablet portrait | 820x1180 |
| tablet landscape | 1024x768 |
| laptop | 1366x768 |
| desktop | 1440x900 |
| wide desktop | 1920x1080 |

Routes to verify:

- `/`
- `/draw`
- `/albums`
- `/albums/:id`
- `/upload`
- `/music`
- `/slideshow`
- `/slideshow/:albumId`
- `/settings`

## Acceptance Criteria

- [ ] All frontend unit tests pass.
- [ ] Playwright or equivalent browser verification checks all required routes at mobile, tablet, and desktop representative widths.
- [ ] No required viewport has horizontal overflow.
- [ ] App shell, bottom player, rail, and fullscreen routes are correctly framed at mobile and desktop sizes.
- [ ] Lighthouse Performance >= 85 and Accessibility >= 95 on representative production build routes.
- [ ] The final UI is compared against the corresponding files in `docs/assets/ui-refactor/`, with deviations documented.
- [ ] Keyboard focus states are visible for navigation, player controls, form fields, dialogs, and card draw actions.
- [ ] Reduced-motion mode has no essential interaction blocked.
- [ ] `fidelity-report.md` records tested routes, viewport results, known deviations, and sign-off status.
- [ ] Core manual flow passes: upload photos -> create/open album -> draw cards -> slideshow -> music -> settings backup/export view.

## Tests

- Frontend:
  - `cd frontend && bun run lint`
  - `cd frontend && bun run type-check`
  - `cd frontend && bun run test`
  - `cd frontend && bun run build`
  - If Playwright is added: `cd frontend && bun run e2e`
  - If Lighthouse script is added: `cd frontend && bun run lighthouse`

## Manual Check

- Run the production build locally.
- Capture representative screenshots for `/draw`, `/albums`, `/music`, `/slideshow`, and `/settings`.
- Compare against the HTML export in `docs/assets/ui-refactor/` and record any intentional deviations in `fidelity-report.md`.
