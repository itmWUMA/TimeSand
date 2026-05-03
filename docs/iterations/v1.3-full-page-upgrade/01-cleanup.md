---
type: task
iteration: "1.3"
status: done
branch: "feat/cleanup"
pr:
completed: 2026-05-03
tags:
  - full-page-upgrade
  - cleanup
---

# Task 1: Cleanup Pass

- **Branch**: `feat/cleanup`
- **Scope**: Remove all placeholder/debug text, stale TODO comments, console.log calls, and hardcoded untranslated strings across the entire codebase.
- **Dependencies**: None

## Files

### Frontend

- All files in `frontend/src/` (scan and fix)

### Backend

- All files in `backend/app/` (scan and fix)

## Approach

1. `grep -r "console\.log\|console\.debug\|console\.warn" frontend/src/` — remove non-essential logging
2. `grep -r "TODO\|FIXME\|HACK\|XXX" frontend/src/ backend/app/` — review and remove stale comments
3. `grep -r "placeholder\|PLACEHOLDER\|debug\|DEBUG" frontend/src/` — check for debug UI elements
4. Manually review each page for hardcoded Chinese/English text not using `$t()` or `t()`
5. Remove `MusicPlayerMini.vue` usage review — confirm it's only in SlideshowPage and leave as-is per spec

## Acceptance Criteria

- [x] No `console.log` or `console.debug` calls in production code (test files excluded)
- [x] No stale TODO/FIXME/HACK comments that reference completed work
- [x] No hardcoded user-visible text outside of i18n system
- [x] No debug-only UI elements visible in any page
- [x] `bun run lint:fix && bun run type-check` passes
- [x] `uv run ruff check .` passes

## Tests

### Frontend

- Lint pass confirms no issues
- Visual scan of all pages via Chrome DevTools MCP

### Backend

- Ruff check passes
