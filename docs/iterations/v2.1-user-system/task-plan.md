---
type: plan
iteration: "2.1"
created: 2026-06-03
tags:
  - v2.1
  - user-system
  - task-plan
---

# Task Plan: User System (v2.1)

## Overview

This iteration introduces the user identity foundation for Phase 2. It is decomposed into three sub-tasks:

1. **Auth Skeleton** — backend models, session management, auth endpoints, login page with uninitialized state, and frontend auth state.
2. **Data Ownership** — Alembic migration adding `owner_id`, startup backfill logic, ownership enforcement on all existing APIs, and frontend Axios/route adaptation.
3. **User Admin** — admin-only user management endpoints and Settings page UI for listing, creating, editing, and deleting users.

Full design spec: [[spec]]

## Dependency Graph

```
Task 1: auth-skeleton
  ├── User, UserSetting, Session models
  ├── Auth API endpoints (login, logout, me, password, register)
  ├── Backend startup: auto-create admin from env vars
  ├── Frontend auth store + login page (with uninitialized state)
  └──→ Task 2: data-ownership
         ├── Alembic migration: owner_id on existing tables
         ├── Startup backfill: existing data → default admin
         ├── Auth + ownership guards on all existing endpoints
         ├── Frontend Axios withCredentials + route guards
         └──→ Task 3: user-admin
                ├── Admin user management API endpoints
                └── Settings page "Users" section (admin only)
```

## Sub-task Index

| # | Task | Branch | Dependencies | Doc |
|---|------|--------|-------------|-----|
| 1 | Auth Skeleton | `feat/auth-skeleton` | None | [[01-auth-skeleton]] |
| 2 | Data Ownership | `feat/data-ownership` | Task 1 | [[02-data-ownership]] |
| 3 | User Admin | `feat/user-admin` | Task 2 | [[03-user-admin]] |

## Execution Order

| Phase | Tasks | Parallel? |
|-------|-------|-----------|
| 1 | Task 1: Auth Skeleton | -- |
| 2 | Task 2: Data Ownership | -- |
| 3 | Task 3: User Admin | -- |

**Note**: These tasks are intentionally sequential. Task 2 depends on Task 1's `User` model and auth dependencies. Task 3 depends on Task 2's ownership enforcement because user deletion must cascade to owned data.

## Shared Conventions

- Branch naming: `feat/<task-slug>`, branched from `dev`
- Merge target: `dev` (via PR with `gh pr create -B dev`)
- Commit style: `feat(<scope>): <description>`
- All code and comments in English
- When adding new packages, check and document peer dependencies that need explicit installation
- Tasks that change dependencies must include clean-install verification in acceptance criteria
- **Backend package additions**: `passlib[bcrypt]` for password hashing
- **Frontend**: no new major dependencies expected; reuse existing axios, pinia, vue-router, vue-i18n
