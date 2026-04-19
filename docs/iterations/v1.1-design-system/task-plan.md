---
type: plan
iteration: "1.1"
created: 2026-04-19
tags:
  - design-system
  - i18n
  - heic
  - phase-1
---

# Task Plan: Design System + i18n + HEIC

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundational design system (tokens + motion presets + component library), internationalization (zh-CN / en), and HEIC photo support that all subsequent Phase 1 iterations depend on.

**Architecture:** CSS custom properties as single source of truth → Tailwind config references `var(--ts-*)` → Vue components consume via utility classes. GSAP motion presets wrapped as Vue 3 composables. vue-i18n with TypeScript-enforced locale key parity. Server-side HEIC→JPEG conversion via pillow-heif.

**Tech Stack:** Vue 3, TailwindCSS 3, GSAP 3, Radix Vue, vue-i18n, pillow-heif, Vitest, pytest

Full design spec: [[spec]]

---

## Dependency Graph

```
Phase 1 (parallel):
  Task 1: design-tokens    (no deps)
  Task 4: i18n-setup       (no deps)
  Task 7: heic-support     (no deps)

Phase 2 (parallel, after Phase 1 merged to dev):
  Task 2: motion-presets    ← Task 1
  Task 5: i18n-extraction   ← Task 4

Phase 3 (parallel, after Phase 2 merged to dev):
  Task 3: ui-components     ← Task 1, Task 2
  Task 6: language-switch   ← Task 4, Task 5
```

Visual graph: [[dependencies]]

## Sub-task Index

| #   | Task                   | Branch                 | Dependencies   | Doc                    |
| --- | ---------------------- | ---------------------- | -------------- | ---------------------- |
| 1   | Design Token System    | `feat/design-tokens`   | None           | [[01-design-tokens]]   |
| 2   | Motion Preset Library  | `feat/motion-presets`  | Task 1         | [[02-motion-presets]]  |
| 3   | UI Component Library   | `feat/ui-components`   | Task 1, Task 2 | [[03-ui-components]]   |
| 4   | i18n Infrastructure    | `feat/i18n-setup`      | None           | [[04-i18n-setup]]      |
| 5   | i18n String Extraction | `feat/i18n-extraction` | Task 4         | [[05-i18n-extraction]] |
| 6   | Language Switch        | `feat/language-switch` | Task 4, Task 5 | [[06-language-switch]] |
| 7   | HEIC Support           | `feat/heic-support`    | None           | [[07-heic-support]]    |

## Execution Order

| Phase | Tasks | Parallel? |
|-------|-------|-----------|
| 1 | Task 1, Task 4, Task 7 | Yes |
| 2 | Task 2, Task 5 | Yes |
| 3 | Task 3, Task 6 | Yes |

Each phase branches from `dev` after the previous phase's PRs are merged.

## Shared Conventions

- Branch from `dev`, merge back via PR: `gh pr create -B dev`
- Commit style: `feat(<scope>): <description>`
- All code and comments in English
- Frontend commands: `cd frontend && bun install && bun run test && bun run lint:fix && bun run type-check`
- Backend commands: `cd backend && uv sync && uv run pytest && uv run ruff check .`
- Tailwind token classes use `ts-` prefix for non-color dimensions (e.g., `rounded-ts-md`) to avoid overriding Tailwind defaults and breaking existing pages
- Color classes keep existing `ts-*` naming (e.g., `bg-ts-accent`) — only the underlying values change from hardcoded hex to `var()`
- Existing pages are NOT modified to use new components or tokens in this iteration
