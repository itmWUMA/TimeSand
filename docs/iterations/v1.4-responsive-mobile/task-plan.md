---
type: plan
iteration: "1.4"
created: 2026-05-04
tags:
  - v1.4
  - responsive
  - mobile
---

# Task Plan: Responsive & Mobile

## Overview

Adapt TimeSand's UI for mobile phone users. Four focused tasks covering navigation, card draw gestures, music player mini mode, and touch target optimization across the critical user path.

Full design spec: [[spec]]

## Dependency Graph

```
Task 1: side-drawer-nav (independent)
Task 2: card-draw-gesture (independent)
Task 3: mini-music-player (independent)
Task 4: touch-target-audit (depends on 1, 2, 3)
```

Tasks 1–3 are independent vertical slices that can be developed in parallel. Task 4 is a cross-cutting pass that runs after all other tasks are merged, auditing the remaining critical-path pages that weren't covered by Tasks 1–3.

## Sub-task Index

| # | Task | Branch | Dependencies | Doc |
|---|------|--------|-------------|-----|
| 1 | Side Drawer Navigation | `feat/side-drawer-nav` | None | [[01-side-drawer-nav]] |
| 2 | Card Draw Gesture Feedback | `feat/card-draw-gesture` | None | [[02-card-draw-gesture]] |
| 3 | Mini Music Player | `feat/mini-music-player` | None | [[03-mini-music-player]] |
| 4 | Touch Target Audit | `feat/touch-target-audit` | Tasks 1, 2, 3 | [[04-touch-target-audit]] |

## Execution Order

| Phase | Tasks | Parallel? |
|-------|-------|-----------|
| 1 | Task 1 (Side Drawer), Task 2 (Card Draw Gesture), Task 3 (Mini Music Player) | Yes |
| 2 | Task 4 (Touch Target Audit) | -- |

## Shared Conventions

- Branch naming: `feat/<task-slug>`, branched from `dev`
- Merge target: `dev` (via PR with `gh pr create -B dev`)
- Commit style: `feat(<scope>): <description>`
- All code and comments in English
- Mobile-only changes guarded by `md:` breakpoint or `useMediaQuery` composable — desktop must remain unchanged
- Touch targets: minimum 44×44px for all interactive elements
- Animations: use GSAP (already in project), 200–300ms duration, ease-out for entries
- iOS safe areas: apply `env(safe-area-inset-bottom)` where fixed-bottom elements exist
- Test on Chrome DevTools mobile emulation (iPhone 14 / 390×844) via chrome-devtools MCP at `127.0.0.1:8080`
