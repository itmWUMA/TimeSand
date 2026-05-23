---
type: task
iteration: "1.6"
status: pending
branch: "feat/ui-refactor-settings"
pr:
completed:
tags:
  - v1.6
  - ui-refactor
  - settings
  - i18n
---

# Task 5: Settings + i18n + Data Surfaces

- **Branch**: `feat/ui-refactor-settings`
- **Scope**: Migrate `settings.html`, finalize UI copy extraction, and make the handoff's project-specific decisions explicit in production docs/code.
- **Dependencies**: Task 1

## Files

### Frontend

- `frontend/src/pages/SettingsPage.vue` (modify)
- `frontend/src/stores/settings.ts` (modify only if settings UI needs adapter fields)
- `frontend/src/services/settings.ts` (modify only if storage adapters are needed)
- `frontend/src/services/backup.ts` (modify only if export/import UI needs adapter support)
- `frontend/src/components/ui/TsButton.vue` (modify only if settings controls require token alignment)
- `frontend/src/components/ui/TsInput.vue` (modify only if settings controls require token alignment)
- `frontend/src/components/ui/TsSelect.vue` (modify only if settings controls require token alignment)
- `frontend/src/components/ui/TsTabs.vue` (modify only if settings controls require token alignment)
- `frontend/src/i18n/locales/zh-CN.ts` (modify)
- `frontend/src/i18n/locales/en.ts` (modify)
- `frontend/src/i18n/__tests__/i18n.spec.ts` (modify)
- `frontend/src/pages/__tests__/SettingsPage.spec.ts` (modify)

### Docs

- `docs/assets/ui-refactor/HANDOFF.md` (modify only if the team wants the source handoff blanks filled directly; otherwise record decisions in this iteration's implementation notes)

## Design Details

- Reference address: `docs/assets/ui-refactor/`.
- Primary files for this task: `settings.html`, `styles.css`, and `shell.js`.
- The target is to reproduce the exported settings screen as closely as practical while wiring each section to real app state and API data.
- Settings page should preserve the exported section structure:
  - storage
  - backup and data
  - draw/time weight
  - slideshow and playback
  - appearance and language
  - about
- Existing backup/export/import behavior remains under the new layout.
- Existing draw defaults and slideshow defaults remain configurable.
- UI strings must be fully extracted to i18n.
- Handoff decisions for this project:
  - network: axios
  - deployment: self-hosted web via FastAPI/Docker
  - auth: none
  - browser target: Chrome 110+, iOS Safari 16+
  - HEIC: backend conversion
  - upload: multipart with progress/cancel; no chunking in this iteration

## Acceptance Criteria

- [ ] `/settings` visually follows `settings.html`.
- [ ] Storage stats load from `GET /api/settings/storage`.
- [ ] Backup export/import works through existing endpoints.
- [ ] Draw and slideshow defaults remain configurable.
- [ ] Language switch is visible, persistent, and matches shell behavior.
- [ ] About section no longer contains stale Phase 1 wording.
- [ ] All UI copy is extracted to `zh-CN` and `en`.
- [ ] Handoff blanks are resolved either in `HANDOFF.md` or in implementation notes linked from the task PR.

## Tests

- Frontend:
  - `cd frontend && bun run test -- SettingsPage.spec.ts`
  - `cd frontend && bun run test -- settings.spec.ts`
  - `cd frontend && bun run test -- i18n.spec.ts`
  - `cd frontend && bun run lint && bun run type-check && bun run test`

## Manual Check

- Toggle language from shell and settings.
- Export backup, import a backup in a local disposable data directory, and confirm success/failure states.
- Change draw/slideshow defaults and confirm persisted state after reload.
