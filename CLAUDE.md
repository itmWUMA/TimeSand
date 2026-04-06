# TimeSand

Self-hosted smart photo wall & music box. Helps users rediscover photos through gamified card-drawing mechanics, paired with background music for atmosphere.

## Tech Stack

- **Frontend**: Vue 3 + GSAP + Radix Vue + TailwindCSS
- **Build**: Vite + Bun
- **Backend**: FastAPI (Python)
- **Python Toolchain**: uv
- **ORM**: SQLModel
- **Database**: SQLite
- **File Storage**: Local filesystem (Docker volume)
- **Deployment**: Docker
- **API**: REST (JSON)
- **Auth**: None (MVP)

## Project Structure

```
timesand/
├── frontend/                # Vue 3 SPA
│   ├── src/
│   │   ├── assets/          # Static assets, global styles
│   │   ├── components/      # Reusable UI components
│   │   ├── composables/     # Vue composables
│   │   ├── layouts/         # Page layouts
│   │   ├── pages/           # Route-level page components
│   │   ├── router/          # Vue Router config
│   │   ├── stores/          # Pinia stores
│   │   ├── services/        # API client layer
│   │   └── types/           # TypeScript type definitions
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── backend/                 # FastAPI
│   ├── app/
│   │   ├── api/             # Route handlers
│   │   ├── models/          # SQLModel models
│   │   ├── schemas/         # Pydantic schemas (if needed)
│   │   ├── services/        # Business logic
│   │   ├── core/            # Config, database, dependencies
│   │   └── main.py          # App entry
│   └── pyproject.toml
├── data/                    # Runtime data (Docker volume)
│   ├── photos/
│   │   ├── originals/
│   │   └── thumbnails/
│   ├── music/files/
│   └── timesand.db
├── docker-compose.yml
└── Dockerfile
```

## Commands

### Frontend

```bash
cd frontend
bun install              # Install dependencies
bun run dev              # Dev server (Vite)
bun run build            # Production build
bun run lint             # Lint
bun run type-check       # TypeScript check
```

### Backend

```bash
cd backend
uv sync                  # Install dependencies
uv run fastapi dev       # Dev server with hot reload
uv run pytest            # Run tests
uv run ruff check .      # Lint
```

### Docker

```bash
docker-compose up        # Start application
docker-compose up -d     # Start in background
```

## Design Decisions

- **Dark immersive theme**: deep dark backgrounds, photos glow as focal point, warm amber/gold accent color
- **Card draw session state is client-side**: frontend sends `exclude_ids` to backend, no server session needed
- **Thumbnails generated on upload**: Pillow, max 400px on longest side
- **UUID-based filenames**: avoid conflicts on upload
- **Single Docker container**: multi-stage build, backend serves built frontend as static files
- **Draw algorithm**: uniform random + time weak-weighting ("N years ago today" ±3 days boost)

## Testing

- **Frontend**: Vitest + @vue/test-utils
- **Backend**: pytest
- **Frontend page testing**: Use chrome-devtools MCP to inspect and verify UI in Chrome

## Conventions

- Frontend uses Vue 3 Composition API with `<script setup>` syntax
- TypeScript throughout frontend
- Python type hints throughout backend
- API routes prefixed with `/api/`
- File uploads use multipart form data
- All timestamps in UTC, ISO 8601 format
- SQLModel models in `backend/app/models/`, one file per entity group
- Code and comments in English; conversation in Chinese
- Version control on GitHub; use `gh` CLI for PR/issue operations

## MVP Scope

### In Scope

- Photo upload (batch), thumbnail generation, EXIF extraction
- Album and tag management (CRUD, many-to-many)
- Card draw with time-weighted randomness
- Slideshow (full-screen, auto-advance, transitions)
- Music upload, playlist management, album-playlist association
- Responsive web (desktop + mobile browser)
- Docker one-click deployment

### Out of Scope

- User auth / multi-user
- Cross-platform clients
- Gamification (rarity, card packs)
- AI features
- External gallery integration
- Built-in royalty-free music

## Development Workflow

### Phase Overview

```
Requirement Alignment → Task Planning → Parallel Development → Integration
  (Claude Code)        (Claude Code)       (Codex/Claude)       (merge to main)
```

### 1. Requirement Alignment (Claude Code)

- Brainstorm with user, clarify scope and design decisions
- Output: design spec in `docs/superpowers/specs/`

### 2. Task Planning (Claude Code)

- Decompose the design spec into independent sub-tasks (sub-features)
- Output: task planning document in `docs/tasks/`
- Each sub-task must be self-contained with:
  - Clear scope and acceptance criteria
  - Files to create/modify
  - API contracts (if applicable)
  - Dependencies on other sub-tasks (if any)
  - Branch name: `feat/<task-slug>`
- Task document format: see `docs/tasks/README.md`

#### Task Decomposition Methodology

**Splitting axis: domain-first, full-stack vertical slice**

Each task represents one complete feature domain, NOT a horizontal layer. A task includes backend models + API routes + service logic + frontend UI + tests for that domain. This ensures each task is independently buildable and testable.

Bad split (horizontal): "Task A: all SQLModel models", "Task B: all API routes"
Good split (vertical): "Task A: photo management (model + API + service + UI + tests)"

**Splitting logic (ordered by priority):**

1. **Data model hierarchy** — start from foundational models, work outward:
   - Phase 1: Infrastructure/scaffolding (project setup, DB config, shared utilities)
   - Phase 2: Core entities (primary data models that other features depend on)
   - Phase 3: Derived features (features that consume core entities, maximally parallel)
   - Phase 4: Cross-cutting concerns (deployment, integration, settings)

2. **Minimize file overlap** — no two tasks should create/modify the same file if possible:
   - If overlap is unavoidable, the earlier task creates the file, later tasks modify it
   - Shared code (e.g., `main.py` router registration) should be owned by the task that creates the base, with later tasks making minimal additions

3. **Explicit dependency graph** — every task declares upstream dependencies:
   - Dependencies determine execution phases (tasks with same deps → parallel)
   - Draw the graph in the overview file to visualize parallelism opportunities
   - A task can only start after ALL its dependencies are merged to `main`

4. **Maximize parallelism** — group independent tasks into execution phases:
   - Sequential phases for tasks with dependency chains
   - Within each phase, all tasks can run concurrently
   - Identify the critical path and minimize its length

**Granularity guidelines:**

- One task = one feature a developer can complete in a focused session
- Too large: "implement the entire backend" → split by domain
- Too small: "create the Photo model file" → merge with related API/UI work
- Sweet spot: "photo management" = model + API + service + UI + tests for photos

**Output structure:**

- One overview file: `docs/tasks/<plan-name>.md` — dependency graph, sub-task index table, execution phases, shared conventions
- One detail file per sub-task: `docs/tasks/<plan-name>-NN-<task-slug>.md` — scope, files list (with create/modify), API contracts, acceptance criteria, tests
- Detail files are self-contained: an agent can implement the task by reading only the detail file + project conventions

### 3. Parallel Development (Codex)

- Each sub-task is developed on its own `feat/<task-slug>` branch
- Codex reads the task planning document and implements independently
- Each branch should be buildable and testable in isolation
- Commit messages reference the task name

### 4. Integration

- Each feat branch creates a PR to `main` via `gh pr create`
- Review and merge sequentially, resolving conflicts as needed

### Task Planning Document Format

Task documents live in `docs/tasks/` and follow this structure:

```markdown
# Task Plan: <Feature Name>

## Overview
Brief description of the feature being decomposed.

## Sub-tasks

### Task 1: <task-slug>
- **Branch**: `feat/<task-slug>`
- **Scope**: What this task implements
- **Files**:
  - `backend/app/models/foo.py` (create)
  - `backend/app/api/foo.py` (create)
  - ...
- **API Contracts** (if applicable):
  - `POST /api/foo` — request/response schema
- **Acceptance Criteria**:
  - [ ] Criterion 1
  - [ ] Criterion 2
- **Dependencies**: None | Task X must be merged first
- **Tests**:
  - Backend: describe what to test
  - Frontend: describe what to test

### Task 2: <task-slug>
...
```

## Spec

Full design spec: `docs/superpowers/specs/2026-04-06-timesand-mvp-design.md`
