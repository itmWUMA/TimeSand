# Copilot Code Review Instructions

## Language

All review comments MUST be written in **Chinese (中文)**. Code, variable names, and technical terms (e.g. API, CRUD, UUID) may remain in English.

## Project Context

TimeSand is a self-hosted smart photo wall & music box built with:

- **Frontend**: Vue 3 + TypeScript + GSAP + Radix Vue + TailwindCSS (Vite + Bun)
- **Backend**: FastAPI + SQLModel + SQLite (Python 3.12, uv toolchain)
- **Deployment**: Single Docker container, backend serves frontend static files

## Review Focus Areas

### Security

- No command injection, XSS, SQL injection, or path traversal vulnerabilities
- File uploads must validate MIME type and enforce size limits
- User-supplied filenames must never be used directly on the filesystem (project uses UUID-based filenames)
- No secrets or credentials in committed code

### Frontend (Vue 3 + TypeScript)

- Use Composition API with `<script setup>` syntax exclusively — no Options API
- TypeScript strict mode — no `any` types without justification
- Composables in `src/composables/`, stores in `src/stores/` (Pinia), API calls in `src/services/`
- TailwindCSS for styling — avoid inline styles and scoped CSS unless necessary
- GSAP for animations — avoid CSS transitions for complex animations
- Radix Vue for accessible UI primitives

### Backend (FastAPI + Python)

- Python type hints on all function signatures
- SQLModel models in `backend/app/models/`, one file per entity group
- Business logic in `backend/app/services/`, not in route handlers
- API routes prefixed with `/api/`
- All timestamps in UTC, ISO 8601 format
- Ruff linting rules apply (line-length = 100, target Python 3.12)
- File uploads use multipart form data

### Code Quality

- No dead code, unused imports, or commented-out code blocks
- No overly broad exception handling (`except Exception` without reason)
- Prefer early returns over deep nesting
- Functions and methods should do one thing
- No premature abstraction — three similar lines are better than a speculative helper

### Testing

- Backend tests use pytest + httpx (`backend/tests/`)
- Frontend tests use Vitest + @vue/test-utils (`frontend/tests/`)
- New features and bug fixes should include relevant tests
- Tests should assert behavior, not implementation details

### API Design

- RESTful conventions: proper HTTP methods and status codes
- Consistent request/response schema using Pydantic/SQLModel models
- Pagination for list endpoints
- Meaningful error responses with appropriate status codes

### Performance

- Thumbnails generated on upload (Pillow, max 400px longest side) — never on-the-fly
- Avoid N+1 queries in SQLModel/SQLAlchemy relationships
- Frontend: lazy-load heavy components and images where appropriate

### Git & PR Conventions

- Commit messages should be concise and describe the "why"
- One PR per feature or fix — avoid mixing unrelated changes
- Branch naming: `feat/<task-slug>`, `fix/<bug-slug>`

## What NOT to Flag

- Minor style preferences already handled by linters (Ruff, ESLint)
- Missing comments on self-explanatory code
- Missing type annotations on code not touched by the PR
- Absence of features explicitly listed as out of MVP scope (auth, AI, gamification, etc.)
