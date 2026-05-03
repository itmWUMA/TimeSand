---
type: plan
iteration: "1.3"
created: 2026-05-03
tags:
  - full-page-upgrade
  - settings
  - lightbox
  - music-player
  - phase-1
---

# Task Plan: Full Page Upgrade

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the design system to every page, eliminate MVP rough edges, and achieve unified product-grade quality across the entire application.

**Architecture:** Incremental upgrades to existing components. Music player gains expand/collapse dual-state. Settings page extends with card draw and SFX controls. A new shared `TsLightbox` component handles photo detail viewing with origin-aware entry animations. Backend draw API accepts parameterized weight settings. Route transitions use Vue `<Transition>` with GSAP-compatible CSS.

**Tech Stack:** Vue 3, GSAP 3, howler.js, vue-i18n, Pinia, TailwindCSS, FastAPI, SQLModel, Vitest, pytest

Full design spec: [[spec]]

---

## Dependency Graph

```
Phase 1 (parallel, no deps):
  Task 1: cleanup              (no deps)
  Task 2: nav-highlight        (no deps)
  Task 3: album-card-enhance   (no deps)
  Task 4: photo-skeleton       (no deps)
  Task 5: route-transitions    (no deps)

Phase 2 (parallel, after Phase 1 merged to dev):
  Task 6: music-player-rebuild   ← Task 1
  Task 7: draw-settings-api      ← Task 1

Phase 3 (parallel, after Phase 2 merged to dev):
  Task 8: settings-page          ← Task 6, Task 7
  Task 9: photo-lightbox         ← Task 4
```

Visual graph: [[dependencies]]

## Sub-task Index

| #   | Task                          | Branch                          | Dependencies      | Doc                            |
| --- | ----------------------------- | ------------------------------- | ------------------ | ------------------------------ |
| 1   | Cleanup Pass                  | `feat/cleanup`                  | None               | [[01-cleanup]]                 |
| 2   | Navigation Highlight Fix      | `feat/nav-highlight`            | None               | [[02-nav-highlight]]           |
| 3   | Album Card Enhancement        | `feat/album-card-enhance`       | None               | [[03-album-card-enhance]]      |
| 4   | Photo Skeleton Loading        | `feat/photo-skeleton`           | None               | [[04-photo-skeleton]]          |
| 5   | Route Transitions             | `feat/route-transitions`        | None               | [[05-route-transitions]]       |
| 6   | Music Player Rebuild          | `feat/music-player-rebuild`     | Task 1             | [[06-music-player-rebuild]]    |
| 7   | Draw Settings API             | `feat/draw-settings-api`        | Task 1             | [[07-draw-settings-api]]       |
| 8   | Settings Page Completion      | `feat/settings-page`            | Task 6, Task 7     | [[08-settings-page]]           |
| 9   | Photo Detail Lightbox         | `feat/photo-lightbox`           | Task 4             | [[09-photo-lightbox]]          |

## Execution Order

| Phase | Tasks                              | Parallel? |
| ----- | ---------------------------------- | --------- |
| 1     | Task 1, 2, 3, 4, 5                | Yes       |
| 2     | Task 6, 7                         | Yes       |
| 3     | Task 8, 9                         | Yes       |

Each phase branches from `dev` after the previous phase's PRs are merged.

## Shared Conventions

- Branch from `dev`, merge back via PR: `gh pr create -B dev`
- Commit style: `feat(<scope>): <description>`
- All code and comments in English
- Frontend commands: `cd frontend && bun install && bun run test && bun run lint:fix && bun run type-check`
- Backend commands: `cd backend && uv sync && uv run pytest && uv run ruff check .`
- GSAP Timeline instances must be killed on component unmount (`onUnmounted(() => tl.kill())`)
- All new i18n keys added to both `zh-CN.ts` and `en.ts` with matching structure
- `prefers-reduced-motion` check: skip animations, use instant transitions
- Design tokens: use `--ts-*` CSS variables via Tailwind utility classes (e.g., `bg-ts-panel`, `text-ts-accent`)
- Icon buttons use inline SVG (Lucide style: 2px stroke, `currentColor`, no icon library)
- Settings persistence: localStorage, read on store init, write on change
