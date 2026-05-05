---
type: plan
iteration: "1.5"
created: 2026-05-05
tags:
  - v1.5
  - infrastructure
---

# Task Plan: Infrastructure

## Overview

Build the engineering foundation for sustainable iteration and data safety. Seven areas decomposed into six implementation tasks — structured logging is embedded into each task rather than a standalone task, since log calls naturally belong alongside the code they instrument.

Full design spec: [[spec]]

## Dependency Graph

```
Task 1: structured-logging (independent — foundation)
Task 2: alembic-migration (depends on Task 1)
  └──→ Task 3: db-indexes (depends on Task 2)
Task 4: error-handling (depends on Task 1)
Task 5: backup-restore (depends on Task 2, Task 4)
Task 6: ci-cd (independent)
```

Key relationships:
- Task 1 (Structured Logging) is the logging foundation — Tasks 2, 4 use it to log their operations.
- Task 2 (Alembic) must be in place before Task 3 (DB Indexes, which is an Alembic migration) and Task 5 (Backup, which runs migrations on restore).
- Task 4 (Error Handling) provides the unified error format that Task 5 (Backup) uses for its API errors.
- Task 6 (CI/CD) is fully independent — touches only workflow files.

## Sub-task Index

| # | Task | Branch | Dependencies | Doc |
|---|------|--------|-------------|-----|
| 1 | Structured Logging | `feat/structured-logging` | None | [[01-structured-logging]] |
| 2 | Database Migration (Alembic) | `feat/alembic-migration` | Task 1 | [[02-alembic-migration]] |
| 3 | Database Indexes + Cache Headers | `feat/db-indexes` | Task 2 | [[03-db-indexes]] |
| 4 | Unified Error Handling | `feat/error-handling` | Task 1 | [[04-error-handling]] |
| 5 | Backup & Restore | `feat/backup-restore` | Tasks 2, 4 | [[05-backup-restore]] |
| 6 | CI/CD Enhancement | `feat/ci-cd` | None | [[06-ci-cd]] |

## Execution Order

| Phase | Tasks | Parallel? |
|-------|-------|-----------|
| 1 | Task 1 (Structured Logging), Task 6 (CI/CD) | Yes |
| 2 | Task 2 (Alembic Migration), Task 4 (Error Handling) | Yes |
| 3 | Task 3 (DB Indexes + Cache), Task 5 (Backup & Restore) | Yes |

## Shared Conventions

- Branch naming: `feat/<task-slug>`, branched from `dev`
- Merge target: `dev` (via PR with `gh pr create -B dev`)
- Commit style: `feat(<scope>): <description>`
- All code and comments in English
- When adding new packages, check and document peer dependencies that need explicit installation
- Tasks that change dependencies must include clean-install verification in acceptance criteria
- Backend test commands: `uv run pytest`
- Frontend test commands: `bun run test`, `bun run lint`, `bun run type-check`
- New backend dependencies: add to `backend/pyproject.toml` via `uv add <package>`
- New env vars must have sensible defaults (zero-config for existing users upgrading)
