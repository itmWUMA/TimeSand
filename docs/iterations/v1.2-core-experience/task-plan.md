---
type: plan
iteration: "1.2"
created: 2026-04-25
tags:
  - core-experience
  - card-draw
  - slideshow
  - sound-effects
  - onboarding
  - phase-1
---

# Task Plan: Core Experience Rework

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild card draw ceremony and slideshow with GSAP Timeline orchestration, add sound effects, memory copywriting, first-time onboarding, demo data, and empty state guidance.

**Architecture:** Card draw ceremony is a state machine (IDLE→DRAWING→EMERGING→REVEALING→DISPLAYING) driven by a single GSAP Timeline. Slideshow uses dual `<img>` stacking with GSAP transitions replacing Vue `<Transition>`. Sound effects via howler.js audio sprites (singleton composable, lazy-loaded). Demo data seeded on first backend launch with `is_demo` flag for cleanup.

**Tech Stack:** Vue 3, GSAP 3, howler.js, vue-i18n, SQLModel, Vitest, pytest

Full design spec: [[spec]]

---

## Dependency Graph

```
Phase 1 (parallel):
  Task 1: sound-effects       (no deps)
  Task 2: memory-text         (no deps)
  Task 3: empty-states        (no deps)

Phase 2 (parallel, after Phase 1 merged to dev):
  Task 4: card-draw-ceremony    ← Task 1, Task 2
  Task 5: slideshow-transitions ← Task 1

Phase 3 (after Phase 2 merged to dev):
  Task 6: onboarding            ← Task 4
```

Visual graph: [[dependencies]]

## Sub-task Index

| #   | Task                     | Branch                       | Dependencies   | Doc                          |
| --- | ------------------------ | ---------------------------- | -------------- | ---------------------------- |
| 1   | Sound Effects System     | `feat/sound-effects`         | None           | [[01-sound-effects]]         |
| 2   | Memory Copywriting       | `feat/memory-text`           | None           | [[02-memory-text]]           |
| 3   | Empty States             | `feat/empty-states`          | None           | [[03-empty-states]]          |
| 4   | Card Draw Ceremony       | `feat/card-draw-ceremony`    | Task 1, Task 2 | [[04-card-draw-ceremony]]    |
| 5   | Slideshow Transitions    | `feat/slideshow-transitions` | Task 1         | [[05-slideshow-transitions]] |
| 6   | Onboarding & Demo Data   | `feat/onboarding`            | Task 4         | [[06-onboarding]]            |

## Execution Order

| Phase | Tasks                  | Parallel? |
| ----- | ---------------------- | --------- |
| 1     | Task 1, Task 2, Task 3 | Yes       |
| 2     | Task 4, Task 5         | Yes       |
| 3     | Task 6                 | No        |

Each phase branches from `dev` after the previous phase's PRs are merged.

## Shared Conventions

- Branch from `dev`, merge back via PR: `gh pr create -B dev`
- Commit style: `feat(<scope>): <description>`
- All code and comments in English
- Frontend commands: `cd frontend && bun install && bun run test && bun run lint:fix && bun run type-check`
- Backend commands: `cd backend && uv sync && uv run pytest && uv run ruff check .`
- GSAP Timeline instances must be killed on component unmount (`onUnmounted(() => tl.kill())`)
- Sound effects use `useSoundEffects()` singleton — never create Howl instances directly
- All new i18n keys added to both `zh-CN.ts` and `en.ts` with matching structure
- `prefers-reduced-motion` check: skip animations, disable sounds, use instant transitions
- Design tokens: use `--ts-*` CSS variables via Tailwind utility classes (e.g., `bg-ts-panel`, `text-ts-accent`)
