# Task 1: Project Foundation

- **Branch**: `feat/project-foundation`
- **Scope**: Backend FastAPI skeleton with SQLite database, frontend Vue 3 skeleton with routing/layout/design system, basic Docker setup. All placeholder pages wired up with navigation.
- **Dependencies**: None

## Files

### Backend

- `backend/pyproject.toml` (create) — Dependencies: fastapi, uvicorn[standard], sqlmodel, pillow, python-multipart, mutagen, ruff, pytest, httpx
- `backend/app/__init__.py` (create)
- `backend/app/main.py` (create) — FastAPI app entry, CORS middleware, `/api/health` endpoint
- `backend/app/core/__init__.py` (create)
- `backend/app/core/config.py` (create) — Settings class (DATA_DIR, DB URL, CORS origins)
- `backend/app/core/database.py` (create) — SQLModel engine, `create_db_and_tables()`, `get_session()` dependency

### Frontend

- `frontend/package.json` (create) — vue, vue-router, pinia, gsap, radix-vue, tailwindcss, axios; dev: vite, @vitejs/plugin-vue, typescript, vitest, @vue/test-utils, @types/node, postcss, autoprefixer
- `frontend/vite.config.ts` (create) — API proxy to backend dev server (`/api` → `http://localhost:8000`)
- `frontend/tailwind.config.ts` (create) — Dark theme colors, amber/gold accent (#d4a843 range)
- `frontend/postcss.config.js` (create)
- `frontend/tsconfig.json` (create)
- `frontend/tsconfig.node.json` (create)
- `frontend/index.html` (create)
- `frontend/env.d.ts` (create) — Vite client type declarations
- `frontend/src/main.ts` (create) — App bootstrap (createApp, router, pinia)
- `frontend/src/App.vue` (create) — Router view with layout wrapper
- `frontend/src/router/index.ts` (create) — All route definitions (pages as placeholders)
- `frontend/src/layouts/DefaultLayout.vue` (create) — Dark sidebar nav + main content area + bottom player slot
- `frontend/src/pages/HomePage.vue` (create) — Placeholder "Card Draw"
- `frontend/src/pages/AlbumsPage.vue` (create) — Placeholder "Albums"
- `frontend/src/pages/AlbumDetailPage.vue` (create) — Placeholder "Album Detail"
- `frontend/src/pages/UploadPage.vue` (create) — Placeholder "Upload"
- `frontend/src/pages/MusicPage.vue` (create) — Placeholder "Music"
- `frontend/src/pages/SlideshowPage.vue` (create) — Placeholder "Slideshow"
- `frontend/src/pages/SettingsPage.vue` (create) — Placeholder "Settings"
- `frontend/src/assets/main.css` (create) — Tailwind directives (`@tailwind base/components/utilities`), CSS custom properties for dark theme
- `frontend/src/services/api.ts` (create) — Axios instance with `/api` base URL
- `frontend/src/types/index.ts` (create) — Shared type re-exports

### Docker

- `Dockerfile` (create) — Multi-stage: Stage 1 bun build frontend, Stage 2 Python + uvicorn
- `docker-compose.yml` (create) — Service with port 8080, volume `./data:/data`
- `.dockerignore` (create)

## API Contracts

- `GET /api/health` → `{ "status": "ok" }`

## Acceptance Criteria

- [ ] `cd backend && uv sync && uv run fastapi dev` starts without errors
- [ ] `GET /api/health` returns `{ "status": "ok" }`
- [ ] SQLite database file is created at configured DATA_DIR path on startup
- [ ] `cd frontend && bun install && bun run dev` starts without errors
- [ ] Browser shows dark-themed layout with sidebar navigation
- [ ] All 7 routes (`/`, `/albums`, `/albums/:id`, `/upload`, `/music`, `/slideshow`, `/settings`) navigable and render placeholder pages
- [ ] Navigation highlights active route
- [ ] Layout is responsive: sidebar on desktop, hamburger menu on mobile
- [ ] Vite dev server proxies `/api/*` requests to backend
- [ ] `docker-compose up --build` builds and starts successfully
- [ ] `uv run ruff check .` passes
- [ ] `bun run type-check` passes

## Tests

- **Backend**: Test health check endpoint returns 200 with `{ "status": "ok" }` using httpx AsyncClient / TestClient
- **Frontend**: Test that App mounts and renders the layout component (Vitest + @vue/test-utils)
