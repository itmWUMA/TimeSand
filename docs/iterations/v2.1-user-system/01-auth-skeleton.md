---
type: task
iteration: "2.1"
task: "auth-skeleton"
dependencies: []
created: 2026-06-03
tags:
  - v2.1
  - auth
  - backend
  - frontend
---

# Task: Auth Skeleton

**Scope**: Create the user identity foundation: backend models (User, UserSetting, Session), authentication endpoints (login, logout, me, password change, register), backend startup auto-initialization from environment variables, frontend auth state (Pinia store), login page with uninitialized state handling, and router guards.

**Branch**: `feat/auth-skeleton`

---

## Files to Create

### Backend

| File | Action | Description |
|------|--------|-------------|
| `backend/app/models/user.py` | Create | `User`, `UserSetting`, `Session` SQLModel definitions |
| `backend/app/core/security.py` | Create | Password hashing (`bcrypt` via `passlib`), token generation, token hash utilities |
| `backend/app/core/auth.py` | Create | FastAPI dependencies: `get_current_user`, `require_admin`, `get_current_active_user` |
| `backend/app/api/auth.py` | Create | Auth route handlers: login, logout, me, password change, register |
| `backend/app/api/users.py` | Create | Basic user CRUD (will be extended in Task 3) |
| `backend/app/schemas/auth.py` | Create | Pydantic request/response schemas for auth endpoints |

### Frontend

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/types/auth.ts` | Create | TypeScript interfaces: `User`, `UserSetting`, `LoginRequest`, etc. |
| `frontend/src/stores/auth.ts` | Create | Pinia auth store: state, login/logout/fetchMe actions |
| `frontend/src/pages/LoginPage.vue` | Create | Login page component (with uninitialized state) |
| `frontend/src/services/auth.ts` | Create | Auth API client functions (login, logout, me) |

### Modified

| File | Action | Description |
|------|--------|-------------|
| `backend/app/models/__init__.py` | Modify | Export `User`, `UserSetting`, `Session` |
| `backend/app/api/__init__.py` or router assembly | Modify | Register `/api/auth` and `/api/users` routers |
| `backend/app/main.py` | Modify | Register auth routers; startup auto-initialization from env vars |
| `backend/pyproject.toml` | Modify | Add `passlib[bcrypt]` dependency |
| `frontend/src/router/index.ts` | Modify | Add `/login` route; add route guards |
| `frontend/src/App.vue` | Modify | App init: call `auth.fetchMe()`, handle 401 globally |
| `frontend/src/services/api.ts` | Modify | Configure `withCredentials: true` on axios instance |
| `frontend/src/i18n/locales/zh.json` | Modify | Add auth-related i18n keys |
| `frontend/src/i18n/locales/en.json` | Modify | Add auth-related i18n keys |

---

## Acceptance Criteria

### Backend

- [ ] `User` model: `id`, `username` (unique, indexed), `display_name`, `password_hash`, `role` (admin/member), `is_active`, `created_at`.
- [ ] `UserSetting` model: `user_id` (PK, FK to user), all fields from spec.
- [ ] `Session` model: `id`, `token_hash` (unique, indexed), `user_id` (indexed), `ip_address`, `user_agent`, `expires_at`, `created_at`.
- [ ] `security.py`: `hash_password()`, `verify_password()`, `generate_session_token()`, `hash_token()` (SHA-256).
- [ ] `get_current_user` dependency: reads `session_id` cookie → looks up by `token_hash` → verifies `expires_at` → returns `User`.
- [ ] Backend startup: if `User` table is empty and `TIMESAND_ADMIN_PASSWORD` is set, auto-create admin user with bcrypt-hashed password.
- [ ] Backend startup: if `User` table is empty and `TIMESAND_ADMIN_PASSWORD` is not set, system stays uninitialized.
- [ ] `POST /api/auth/login`: validates username + password → creates `Session` row → sets `session_id` httpOnly cookie. Returns 503 if system uninitialized.
- [ ] `POST /api/auth/logout`: deletes current session → clears cookie.
- [ ] `GET /api/auth/me`: returns current user from session.
- [ ] `PUT /api/auth/password`: requires old password + new password; updates `password_hash`.
- [ ] Bcrypt dummy hash on failed login to prevent timing attacks.
- [ ] `pytest` tests for all auth endpoints (login success/failure, logout, me, password change, register).
- [ ] `ruff check .` passes.

### Frontend

- [ ] `auth` Pinia store: `user`, `isAuthenticated`, `isAdmin`, `login()`, `logout()`, `fetchMe()`.
- [ ] Axios instance has `withCredentials: true`.
- [ ] Axios 401 interceptor: clears auth store, redirects to `/login`.
- [ ] `/login` page: username, password, "remember me", error toast.
- [ ] `/login` page shows "System not initialized" notice when backend returns 503 (replaces login form).
- [ ] `/login` redirects to `/` if already authenticated.
- [ ] App init (`App.vue` or router): calls `fetchMe()` before rendering protected routes.
- [ ] i18n keys added for all auth UI text.
- [ ] `bun run lint && bun run type-check && bun run test` passes.

### Integration

- [ ] Clean Docker build succeeds.
- [ ] Fresh container with `TIMESAND_ADMIN_PASSWORD`: admin auto-created → login with env credentials → `/draw` works.
- [ ] Logout → redirect to `/login`.
- [ ] Login with remember me → session cookie has extended expiry.

---

## Notes

- **Do NOT** add `owner_id` to existing tables in this task — that's Task 2.
- **Do NOT** enforce auth on existing endpoints in this task — that's Task 2.
- The `UserSetting` model is created here but will only be fully wired into Settings UI in Task 2.
- `User.username` case-insensitive unique: in SQLite, use `func.lower()` in queries and enforce at application level.
- Session cleanup (deleting expired rows) can be a TODO comment for now; implement a periodic cleanup in a later infrastructure task.
- **Environment variables**: document `TIMESAND_ADMIN_USERNAME` (default: "admin") and `TIMESAND_ADMIN_PASSWORD` (required, min 8 chars) in `README.md` as part of this task.
