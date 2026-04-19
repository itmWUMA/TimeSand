# TimeSand

Self-hosted smart photo wall & music box. Helps users rediscover photos through gamified card-drawing mechanics, paired with background music for atmosphere.

## Tech Stack

- **Frontend**: Vue 3 + GSAP + Radix Vue + TailwindCSS
- **Linting**: ESLint ([@antfu/eslint-config](https://github.com/antfu/eslint-config)) — flat config, no Prettier needed
- **Build**: Vite + Bun
- **Backend**: FastAPI (Python)
- **Python**: 3.12 + venv
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
├── docs/                    # Documentation (Obsidian vault)
│   ├── product-roadmap.md   # Product roadmap
│   ├── dashboard.base       # Global task dashboard (Obsidian Bases)
│   ├── iterations/          # Per-iteration docs
│   │   ├── overview.canvas  # Iterations visual map
│   │   └── <ver>-<slug>/    # e.g., v0.0-mvp/
│   │       ├── spec.md      # Design spec
│   │       ├── task-plan.md # Task decomposition
│   │       ├── tasks.base   # Iteration dashboard
│   │       ├── dependencies.canvas
│   │       └── NN-<task>.md # Individual task files (with frontmatter)
│   └── templates/           # Obsidian templates for new docs
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
bun run lint             # Lint (ESLint)
bun run lint:fix         # Lint + auto-fix
bun run type-check       # TypeScript check
```

### Backend

```bash
cd backend
uv venv -p 3.12          # Create venv with Python 3.12
source .venv/bin/activate # Activate venv (Linux/Mac)
# .venv\Scripts\activate  # Activate venv (Windows)
uv sync                   # Install dependencies
uv run fastapi dev        # Dev server with hot reload
uv run pytest             # Run tests
uv run ruff check .       # Lint
```

### Docker

```bash
docker-compose up        # Start application
docker-compose up -d     # Start in background
```

## Mirrors (China)

All environments should use domestic mirrors for faster downloads:

- **PyPI**: `https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple` (configure in `pyproject.toml` or `uv.toml`)
- **Docker**: Use mirror registries in `Dockerfile` base images and `daemon.json` if needed
- **npm/bun**: `https://registry.npmmirror.com` (configure in `.npmrc`)

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
- **Never `git commit` or `git push` without explicit user approval** — stage changes and present a summary, then wait for the user to confirm before committing

## Documentation Conventions

The `docs/` directory is an **Obsidian vault** with CLI tooling support.

### Structure

- **Iteration-based**: each iteration lives in `docs/iterations/<ver>-<slug>/` with its own spec, task plan, sub-tasks, dashboard, and dependency graph
- **Global dashboard**: `docs/dashboard.base` auto-aggregates all tasks across iterations
- **Templates**: `docs/templates/` contains templates for new task, spec, and task plan files

### Frontmatter

Every doc file in the vault must have YAML frontmatter with at minimum:
- `type`: `task` | `spec` | `plan`
- `iteration`: version string (e.g., `"0.0"`, `"1.1"`)
- `tags`: list of relevant tags

Task files additionally require: `status`, `branch`, `pr`, `completed`

### Internal Links

- Use **wikilinks** (`[[Note Name]]`) for all cross-references within the vault
- Use standard **markdown links** (`[text](url)`) only for external URLs
- Obsidian tracks wikilink renames automatically

### Obsidian Tooling

- **Obsidian Bases** (`.base` files): YAML-based database views that query frontmatter — replaces manual progress tracking
- **JSON Canvas** (`.canvas` files): Visual dependency graphs and iteration maps
- **Obsidian CLI** (`obsidian` command): Interact with the vault from terminal (requires Obsidian app running)

### Naming Conventions

- Iteration directories: `v<major>.<minor>-<slug>` (e.g., `v0.0-mvp`, `v1.1-design-system`)
- Task files: `NN-<task-slug>.md` (e.g., `01-project-foundation.md`)
- Spec files: `spec.md` (primary), `<topic>-spec.md` (secondary)
- Task plan: `task-plan.md`
- Dashboard: `tasks.base`
- Dependency graph: `dependencies.canvas`

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

## Branch Strategy

```
main          ← only accepts merges from dev (production-ready)
  └── dev     ← integration branch, accepts feat/* PRs
       └── feat/<task-slug>  ← feature branches
```

- **`main`**: Production-ready branch. Only accepts merges from `dev`. Protected: requires PR with 1 approving review, branch must be up-to-date, no force push, no deletion.
- **`dev`**: Integration branch. All `feat/*` branches merge here via PR. Same protection rules as `main`: requires PR with 1 approving review, branch must be up-to-date, no force push, no deletion.
- **`feat/<task-slug>`**: Feature branches created from `dev`. Merged back into `dev` via PR.

## Development Workflow

### Phase Overview

```
Requirement Alignment → Task Planning → Parallel Development → Integration → Release
  (Claude Code)        (Claude Code)       (Codex/Claude)     (merge to dev)  (dev → main)
```

### 1. Requirement Alignment (Claude Code)

- Brainstorm with user, clarify scope and design decisions
- Output: design spec in `docs/iterations/<ver>-<slug>/spec.md`

### 2. Task Planning (Claude Code)

- Decompose the design spec into independent sub-tasks (sub-features)
- Output: task planning document in `docs/iterations/<ver>-<slug>/`
- Each sub-task must be self-contained with:
  - Clear scope and acceptance criteria
  - Files to create/modify
  - API contracts (if applicable)
  - Dependencies on other sub-tasks (if any)
  - Branch name: `feat/<task-slug>`
- Use templates from `docs/templates/` as starting point

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
   - A task can only start after ALL its dependencies are merged to `dev`

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

- One iteration directory: `docs/iterations/<ver>-<slug>/` — contains all docs for that iteration
- One spec file: `docs/iterations/<ver>-<slug>/spec.md` — design specification
- One overview file: `docs/iterations/<ver>-<slug>/task-plan.md` — dependency graph, sub-task index table, execution phases, shared conventions
- One detail file per sub-task: `docs/iterations/<ver>-<slug>/NN-<task-slug>.md` — scope, files list (with create/modify), API contracts, acceptance criteria, tests
- One dashboard: `docs/iterations/<ver>-<slug>/tasks.base` — Obsidian Bases auto-summary of task status
- One dependency graph: `docs/iterations/<ver>-<slug>/dependencies.canvas` — visual dependency graph
- Detail files are self-contained: an agent can implement the task by reading only the detail file + project conventions
- All doc files must have YAML frontmatter (see Documentation Conventions below)

### 3. Parallel Development (Codex)

- Each sub-task is developed on its own `feat/<task-slug>` branch, created from `dev`
- Codex reads the task planning document and implements independently
- Each branch should be buildable and testable in isolation
- **Codex completes implementation by staging changes (`git add`) only — do NOT commit**
- After review, the user decides when to commit — Claude Code must **never commit or push without explicit user approval**

### 4. Integration

- Each feat branch creates a PR to `dev` via `gh pr create -B dev`
- Review and merge sequentially, resolving conflicts as needed
- Once a set of features is stable on `dev`, create a PR from `dev` to `main` for release

### 5. Progress Tracking

- Task progress is tracked via **Obsidian Bases** (`.base` files) that auto-query frontmatter metadata
- Global dashboard: `docs/dashboard.base` — shows all tasks across iterations
- Per-iteration dashboard: `docs/iterations/<ver>-<slug>/tasks.base`
- **After each task is confirmed complete** (PR merged or work verified), update the task file's frontmatter:
  - Set `status: done`
  - Fill in `pr` number and `completed` date
- The `.base` dashboards are the source of truth — no manual progress files needed

### Task Planning Document Format

Task documents live in `docs/iterations/<ver>-<slug>/` and follow this structure (see `docs/templates/` for ready-to-use templates):

```markdown
---
type: task
iteration: "<version>"
status: pending
branch: "feat/<task-slug>"
pr:
completed:
tags:
  - <iteration-tag>
---

# Task N: <Task Name>

- **Branch**: `feat/<task-slug>`
- **Scope**: What this task implements
- **Dependencies**: None | Task X must be merged first

## Files
  - `backend/app/models/foo.py` (create)
  - `backend/app/api/foo.py` (create)

## API Contracts (if applicable)
  - `POST /api/foo` — request/response schema

## Acceptance Criteria
  - [ ] Criterion 1
  - [ ] Criterion 2

## Tests
  - Backend: describe what to test
  - Frontend: describe what to test
```

## Spec

MVP design spec: `docs/iterations/v0.0-mvp/spec.md`
Product roadmap: `docs/product-roadmap.md`
