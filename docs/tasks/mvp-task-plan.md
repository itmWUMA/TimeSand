# Task Plan: TimeSand MVP

## Overview

Decompose the TimeSand MVP into independent sub-tasks for parallel development. The MVP delivers: photo upload & management, album & tag organization, music & playlist management, card draw experience, slideshow, background music player, and Docker deployment.

Full design spec: `docs/superpowers/specs/2026-04-06-timesand-mvp-design.md`

## Dependency Graph

```
Task 1: project-foundation
  │
  ├──→ Task 2: photo-management
  │      │
  │      └──→ Task 3: album-tag-management
  │             │
  │             ├──→ Task 4: music-playlist (needs Album model)
  │             │      │
  │             │      └──→ Task 7: music-player (needs Playlist API)
  │             │
  │             ├──→ Task 5: card-draw (needs Photo + Album)
  │             │
  │             ├──→ Task 6: slideshow (needs Photo + Album)
  │             │
  │             └──→ Task 9: settings-page (needs Photo + Album counts)
  │
  └──→ Task 8: docker-deployment (can start after Task 1, finalize after all)
```

**Parallelism opportunities:**
- Tasks 4, 5, 6, 9 can run in parallel (all depend on Task 3)
- Task 8 can start early alongside Task 2, finalize last

## Sub-task Index

| # | Task | Branch | Dependencies | Doc |
|---|------|--------|-------------|-----|
| 1 | Project Foundation | `feat/project-foundation` | None | [mvp-01-project-foundation.md](mvp-01-project-foundation.md) |
| 2 | Photo Management | `feat/photo-management` | Task 1 | [mvp-02-photo-management.md](mvp-02-photo-management.md) |
| 3 | Album & Tag Management | `feat/album-tag-management` | Task 1, 2 | [mvp-03-album-tag-management.md](mvp-03-album-tag-management.md) |
| 4 | Music & Playlist | `feat/music-playlist` | Task 1, 3 | [mvp-04-music-playlist.md](mvp-04-music-playlist.md) |
| 5 | Card Draw | `feat/card-draw` | Task 1, 2, 3 | [mvp-05-card-draw.md](mvp-05-card-draw.md) |
| 6 | Slideshow | `feat/slideshow` | Task 1, 2, 3 | [mvp-06-slideshow.md](mvp-06-slideshow.md) |
| 7 | Music Player | `feat/music-player` | Task 1, 2, 4 | [mvp-07-music-player.md](mvp-07-music-player.md) |
| 8 | Docker Deployment | `feat/docker-deployment` | All | [mvp-08-docker-deployment.md](mvp-08-docker-deployment.md) |
| 9 | Settings Page | `feat/settings-page` | Task 1, 2 | [mvp-09-settings-page.md](mvp-09-settings-page.md) |

## Execution Order

| Phase | Tasks | Parallel? |
|-------|-------|-----------|
| 1 | Task 1: project-foundation | — |
| 2 | Task 2: photo-management | — |
| 3 | Task 3: album-tag-management | — |
| 4 | Task 4: music-playlist, Task 5: card-draw, Task 6: slideshow, Task 9: settings-page | Yes |
| 5 | Task 7: music-player | — |
| 6 | Task 8: docker-deployment | — |

## Shared Conventions

- Branch naming: `feat/<task-slug>`, branched from `dev`
- Merge target: `dev` (via PR with `gh pr create -B dev`)
- Commit style: `feat(<scope>): <description>`
- All code and comments in English
- Backend: Python type hints, `uv run ruff check .` + `uv run pytest` before commit
- Frontend: TypeScript, `<script setup>`, `bun run type-check` + `bun run lint` before commit
- API routes prefixed with `/api/`
- All timestamps in UTC, ISO 8601 format
- File uploads: multipart form data, UUID-based filenames
