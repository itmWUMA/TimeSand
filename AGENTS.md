# TimeSand

Self-hosted smart photo wall & music box. Helps users rediscover photos through gamified card-drawing mechanics, paired with background music for atmosphere.

## Tech Stack

- **Frontend**: Vue 3 + GSAP + Radix Vue + TailwindCSS
- **Build**: Vite + Bun
- **Backend**: FastAPI (Python)
- **Python**: 3.12 + venv
- **Python Toolchain**: uv
- **ORM**: SQLModel
- **Database**: SQLite
- **File Storage**: Local filesystem (Docker volume)
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
bun run test             # Run unit tests (Vitest)
```

### Backend

```bash
cd backend
uv venv -p 3.12          # Create venv with Python 3.12
source .venv/bin/activate # Activate venv (Linux/Mac)
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

## Testing

- **Frontend**: Vitest + @vue/test-utils
- **Backend**: pytest
- **Frontend page testing**: Use chrome-devtools MCP to inspect and verify UI in Chrome (take snapshots, screenshots, etc.)

## Tools

- **GitHub**: Use `gh` CLI for PR, issue, and repository operations
- **Browser**: Use chrome-devtools MCP to visually verify frontend pages after implementation

## Conventions

- Frontend uses Vue 3 Composition API with `<script setup>` syntax
- TypeScript throughout frontend
- Python type hints throughout backend
- API routes prefixed with `/api/`
- File uploads use multipart form data
- All timestamps in UTC, ISO 8601 format
- SQLModel models in `backend/app/models/`, one file per entity group
- All code and comments in English

## Development Workflow (for Codex)

### How Tasks Are Structured

Tasks are decomposed using **domain-first, full-stack vertical slicing**:

- Each task represents one complete feature domain (e.g., "photo management"), NOT a horizontal layer (e.g., "all models")
- Each task includes: backend models + API routes + service logic + frontend UI + tests
- Tasks are ordered by data model hierarchy: infrastructure → core entities → derived features → deployment
- Tasks declare explicit dependencies; a task can only start after ALL its dependencies are merged
- Each task has its own detail file in `docs/tasks/` that is self-contained — you can implement the task by reading only the detail file + this conventions file

**Task detail file structure:**
- **Scope**: what this task implements (1-2 sentences)
- **Dependencies**: which tasks must be merged first
- **Files**: exact files to create/modify, with (create) or (modify) annotation
- **API Contracts**: request/response schemas for each endpoint
- **Acceptance Criteria**: checklist of verifiable conditions
- **Tests**: what to test in backend and frontend

**Important**: Do not modify files outside of your task's listed scope unless absolutely necessary. Each task is designed to minimize file overlap with other tasks.

### How to Pick Up a Task

1. Read the task planning document in `docs/tasks/` to find your assigned sub-task
2. Create a feature branch from `main`: `git checkout -b feat/<task-slug> main`
3. Implement according to the scope, files, and acceptance criteria listed in the task document
4. Run tests and linting:
   - Frontend: `cd frontend && bun run lint && bun run type-check && bun run test`
   - Backend: `cd backend && uv run ruff check . && uv run pytest`
5. **Stage all changes (`git add`) but do NOT commit** — the reviewer (Claude Code or user) will commit and create the PR

### Branch Naming

- Feature branches: `feat/<task-slug>` (e.g., `feat/photo-upload`, `feat/album-crud`)
- The `<task-slug>` must match the task slug in the planning document

### Commit Convention

- `feat(<scope>): <description>` — new feature
- `fix(<scope>): <description>` — bug fix
- `refactor(<scope>): <description>` — code restructuring
- `test(<scope>): <description>` — adding/updating tests
- `docs(<scope>): <description>` — documentation changes

### Key Rules

- Each feat branch implements exactly ONE sub-task from the planning document
- Do not modify files outside of your sub-task's listed scope unless absolutely necessary
- If your task has dependencies on another task, ensure that task's branch is merged first (or coordinate)
- Always base your branch on latest `main`
- All code and comments in English

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
