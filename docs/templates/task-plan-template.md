---
type: plan
iteration: ""
created:
tags: []
---

# Task Plan: <Iteration Name>

## Overview

Brief description of the iteration being decomposed.

Full design spec: [[spec]]

## Dependency Graph

```
Task 1: <slug>
  └──→ Task 2: <slug>
       └──→ Task 3: <slug>
```

## Sub-task Index

| # | Task | Branch | Dependencies | Doc |
|---|------|--------|-------------|-----|
| 1 | Task Name | `feat/<slug>` | None | [[01-slug]] |
| 2 | Task Name | `feat/<slug>` | Task 1 | [[02-slug]] |

## Execution Order

| Phase | Tasks | Parallel? |
|-------|-------|-----------|
| 1 | Task 1 | -- |
| 2 | Task 2, Task 3 | Yes |

## Shared Conventions

- Branch naming: `feat/<task-slug>`, branched from `dev`
- Merge target: `dev` (via PR with `gh pr create -B dev`)
- Commit style: `feat(<scope>): <description>`
- All code and comments in English
