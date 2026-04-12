# Task 8: Docker Deployment

- **Branch**: `feat/docker-deployment`
- **Scope**: Production-ready Docker setup. Multi-stage Dockerfile (Stage 1: build frontend with bun, Stage 2: Python backend serves built frontend as static files). Finalized docker-compose with volume mapping, restart policy. Backend serves SPA with fallback routing.
- **Dependencies**: All other tasks should be merged into `dev` first for full integration testing. Can start basic work after Task 1 is merged into `dev`, finalize after all tasks are merged.

## Files

- `Dockerfile` (modify) — Multi-stage production build
- `docker-compose.yml` (modify) — Production config with restart policy
- `.dockerignore` (modify) — Exclude dev files, .git, node_modules, __pycache__
- `backend/app/main.py` (modify) — Mount frontend `dist/` as static files, SPA fallback for non-`/api/` routes

## Dockerfile Design

### Stage 1: Frontend Build

```dockerfile
FROM oven/bun:latest AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock* ./
RUN bun install --frozen-lockfile
COPY frontend/ ./
RUN bun run build
```

### Stage 2: Backend + Serve

```dockerfile
FROM python:3.12-slim AS production
# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app
COPY backend/pyproject.toml backend/uv.lock* ./
RUN uv sync --no-dev

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./static

# Create non-root user
RUN useradd -m appuser
USER appuser

# Create data directories
RUN mkdir -p /data/photos/originals /data/photos/thumbnails /data/music/files

EXPOSE 8080
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

## Static File Serving

Backend must serve the frontend in production:

1. Mount `./static` directory for static file serving (JS, CSS, assets)
2. For any `GET` request that:
   - Does NOT start with `/api/`
   - Does NOT match a static file
   - → Return `static/index.html` (SPA fallback routing)
3. `/api/*` routes handled by FastAPI as normal

## docker-compose.yml

```yaml
services:
  timesand:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - ./data:/data
    restart: unless-stopped
    environment:
      - DATA_DIR=/data
```

## .dockerignore

```
.git
.claude
node_modules
__pycache__
*.pyc
.venv
.env
data/
docs/
*.md
!README.md
```

## Acceptance Criteria

- [ ] `docker-compose up --build` builds successfully (no errors in either stage)
- [ ] Stage 1: frontend builds with bun, produces `dist/` output
- [ ] Stage 2: Python image includes backend + frontend dist as static files
- [ ] `http://localhost:8080/` serves frontend `index.html`
- [ ] SPA routing works: `http://localhost:8080/albums` returns `index.html` (not 404)
- [ ] `/api/health` returns `{ "status": "ok" }`
- [ ] `/api/*` routes handled by FastAPI
- [ ] Static assets (JS, CSS) served correctly with proper MIME types
- [ ] `/data` volume mapped: photos, music, and database persist across container restarts
- [ ] Data directories auto-created on first startup if not present
- [ ] Container runs as non-root user
- [ ] Container exposes port 8080
- [ ] Container restarts automatically on failure (`restart: unless-stopped`)
- [ ] Full user journey works in Docker: upload photos → create album → draw cards → play slideshow → background music

## Tests

- Manual integration: `docker-compose up --build` and verify all features in browser
- `curl http://localhost:8080/` → returns HTML containing Vue app mount point
- `curl http://localhost:8080/api/health` → `{ "status": "ok" }`
- `curl http://localhost:8080/albums` → returns HTML (SPA fallback, not 404)
- `curl http://localhost:8080/assets/index-*.js` → returns JavaScript (static file serving)
- Stop and restart container → verify data persists (previously uploaded photos still available)
