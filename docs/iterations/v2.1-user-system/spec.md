---
type: spec
iteration: "2.1"
created: 2026-06-03
tags:
  - v2.1
  - user-system
  - authentication
  - backend
  - frontend
---

# Design Spec: User System (Phase 2, Iteration 6.1)

## Overview

Phase 2 begins by establishing user identity and data ownership. Before this iteration, TimeSand operates as a single-user MVP with no authentication. This iteration introduces a complete user system: registration, login/logout, password security, session management, and data ownership boundaries across all existing entities (photos, albums, music, playlists, tags).

The core philosophy is **default-private + explicit sharing**. Every user's photos, albums, music, and playlists are private by default. Future iterations will add an `AlbumShare` mechanism for explicit sharing, but that is outside 6.1 scope.

This is a foundational iteration: all Phase 2+ features (timeline, map view, favorites, etc.) depend on the user identity established here.

## Goals

- Add user authentication (register, login, logout, password change).
- Protect all existing data with ownership (`owner_id` on every top-level entity).
- Ensure existing data migrates seamlessly to a default admin user on upgrade.
- Admin account auto-created from environment variables on first startup (`TIMESAND_ADMIN_USERNAME`, `TIMESAND_ADMIN_PASSWORD`).
- Establish role-based access control (`admin` vs `member`).
- Adapt the frontend for authenticated flows (login page, route guards, auth state, Axios with credentials).

## Non-Goals

- No guest / public browsing mode. Unauthenticated users see only the login page.
- No first-time setup wizard. Admin is created from environment variables.
- No album sharing or explicit sharing UI. Sharing is deferred to a later iteration.
- No OAuth / SSO / third-party login.
- No password reset via email (self-hosted, no SMTP infrastructure yet).
- No 2FA / MFA.
- No API keys for external scripts.

## Design

### Data Models

#### User

```python
class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    display_name: str
    password_hash: str          # bcrypt hashed, never plaintext
    role: str = "member"        # "admin" or "member"
    is_active: bool = True
    created_at: datetime = Field(default_factory=utc_now)
```

- `username`: ASCII alphanumeric + underscore, 3-32 chars, case-insensitive unique.
- `display_name`: Unicode, 1-64 chars, shown in UI.
- `role`: `"admin"` has full access including user management; `"member"` can only manage their own data.

#### UserSetting

```python
class UserSetting(SQLModel, table=True):
    user_id: int = Field(foreign_key="user.id", primary_key=True)
    language: str = "auto"      # auto, zh, en
    theme: str = "dark"         # dark, light
    draw_weight_mode: str = "time_weak"
    draw_date_range_days: int = 3
    draw_default_album_id: int | None = Field(default=None, foreign_key="album.id")
    slideshow_interval_seconds: int = 5
    slideshow_ken_burns: bool = True
    slideshow_shuffle: bool = False
    music_volume: float = 0.8
    music_auto_play: bool = True
```

- Replaces the current global settings table.
- Each user has exactly one `UserSetting` row (1:1).

#### Session

```python
class Session(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    token_hash: str = Field(unique=True, index=True)  # SHA-256 of the raw token
    user_id: int = Field(foreign_key="user.id", index=True)
    ip_address: str | None = None
    user_agent: str | None = None
    expires_at: datetime = Field(default_factory=lambda: utc_now() + timedelta(days=7))
    created_at: datetime = Field(default_factory=utc_now)
```

- Raw token is a 32-byte random string, base64url-encoded, sent to client as `session_id` cookie.
- Only the SHA-256 hash is stored in the database.
- Sessions expire after 7 days of inactivity (or absolute expiry).
- On logout, the session row is deleted immediately → instant revocation.

#### Ownership Fields (Existing Tables)

The following tables receive an `owner_id: int = Field(foreign_key="user.id")`:

- `Photo`
- `Album`
- `Music`
- `Playlist`
- `Tag`

**Migration strategy** (zero-downtime for single-container):

1. Alembic migration adds `owner_id` as nullable to all existing tables.
2. On first startup after migration, if `owner_id` is NULL, backend creates a default admin user and backfills all NULL `owner_id`s to that user's ID.
3. A second Alembic migration makes `owner_id` NOT NULL.
   - In practice, these can be combined into a single migration that adds the column with a server default (SQLite supports `DEFAULT` on add column for `INTEGER` since 3.2.0).
   - Simpler approach: one migration adds nullable column + Python-side backfill on app startup + then alter to NOT NULL.

### API Contracts

#### Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | None | Login with username + password. Sets `session_id` httpOnly cookie. |
| POST | `/api/auth/logout` | Session | Delete current session, clear cookie. |
| GET | `/api/auth/me` | Session | Return current user info: `{ id, username, display_name, role }`. |
| PUT | `/api/auth/password` | Session | Change own password (old + new required). |
| POST | `/api/auth/register` | Admin only | Admin creates a new member account. |

#### System Initialization

Admin account is created automatically on backend startup **only if**:
1. `TIMESAND_ADMIN_PASSWORD` environment variable is set and non-empty.
2. The `User` table is empty.

```yaml
# docker-compose.yml
environment:
  - TIMESAND_ADMIN_USERNAME=admin        # optional, defaults to "admin"
  - TIMESAND_ADMIN_PASSWORD=changeme     # required, min 8 chars
```

If `TIMESAND_ADMIN_PASSWORD` is not set or empty, and no users exist, the system remains **uninitialized**:
- `/api/health` returns 200 (container is healthy).
- `/api/auth/login` returns `503 Service Unavailable` with `{ "detail": "System not initialized" }`.
- All other endpoints return 401 or 503.

If `TIMESAND_ADMIN_PASSWORD` is set but the `User` table already has users, the environment variable is ignored (upgrade scenario).

**Login request / response**:

```json
// POST /api/auth/login
{ "username": "alice", "password": "..." }

// 200 OK + Set-Cookie: session_id=abc123...; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800
{ "user": { "id": 2, "username": "alice", "display_name": "Alice", "role": "member" } }
```

**Register (admin-only) request / response**:

```json
// POST /api/auth/register
{ "username": "bob", "display_name": "Bob", "password": "...", "role": "member" }

// 201 Created
{ "id": 3, "username": "bob", "display_name": "Bob", "role": "member" }
```

#### User Management (Admin Only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | Admin | List all users. |
| GET | `/api/users/{id}` | Admin | Get user details. |
| PUT | `/api/users/{id}` | Admin | Update user (display_name, role, is_active). |
| DELETE | `/api/users/{id}` | Admin | Delete user and all their data (cascade). |

#### Settings Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/settings` | Session | Get current user's settings. |
| PUT | `/api/settings` | Session | Update current user's settings. |

The old `/api/settings/storage` remains but now requires authentication (returns the current user's storage stats).

#### Existing Endpoints — Auth & Ownership Changes

All existing endpoints (`/api/photos`, `/api/albums`, `/api/music`, `/api/playlists`, `/api/tags`, `/api/draw`, `/api/slideshow`, `/api/backup`) now:

1. **Require session authentication** (except `/api/health`).
2. **Filter by `owner_id`** in queries.
3. **Enforce ownership on mutations**: only the owner (or admin) can update/delete.

**Admin exception**: Admin users can read all data but still can only mutate their own data unless explicitly allowed (for user management endpoints).

### UI/UX

#### Login Page (`/login`)

- Centered card on dark background, matching Warm Walnut design system.
- **Uninitialized state**: if `/api/auth/me` or `/api/auth/login` returns 503, the login form is replaced with a prominent notice: "System not initialized. Please set `TIMESAND_ADMIN_PASSWORD` in your environment and restart."
- Fields: username, password.
- "Remember me" checkbox (extends session to 30 days instead of 7).
- Error toast on failure (generic message: "Invalid username or password" to prevent user enumeration).
- Auto-redirect to original route after login if accessed via 401 redirect.

#### AppShell Adaptation

- Left rail: add user avatar + display name at bottom.
- Rail menu: add "Users" entry (admin only) or hide it for members.
- Global logout button in settings or user dropdown.

#### Settings Page (`/settings`)

- Move global settings into per-user settings.
- Add "Account" section: display name, change password.
- Add "Users" section (admin only): list, create, edit, delete users.
- Storage stats now show current user's usage (admin sees total).

### Role-Based Access Control

```python
# FastAPI dependency
async def get_current_user(session_id: str | None = Cookie(None)) -> User:
    if not session_id:
        raise HTTPException(401, "Not authenticated")
    # verify session hash, check expiry, return user

async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")
    return user
```

- `get_current_user`: every authenticated endpoint uses this.
- `require_admin`: admin-only endpoints (register, user list, user management).

### Ownership Enforcement Pattern

For every existing service function that queries or mutates data:

```python
# Before
photos = session.exec(select(Photo)).all()

# After
photos = session.exec(select(Photo).where(Photo.owner_id == current_user.id)).all()
```

Mutations check ownership before proceeding:

```python
photo = session.get(Photo, photo_id)
if not photo or (photo.owner_id != current_user.id and current_user.role != "admin"):
    raise HTTPException(403, "Not authorized")
```

## Technical Notes

### Session Management Details

- **Token generation**: `secrets.token_urlsafe(32)` → raw token sent to client.
- **Storage**: SHA-256 hash of raw token stored in DB.
- **Cookie attributes**:
  - `HttpOnly`: JavaScript cannot read the token.
  - `SameSite=Lax`: CSRF protection without breaking normal navigation.
  - `Secure`: only over HTTPS (configurable for local dev).
  - `Path=/`: cookie sent to all API routes.
- **Expiry**: `Max-Age=604800` (7 days). Slide expiry on each request (update `expires_at` if within 24h of expiry).
- **Cleanup**: a background task or startup routine deletes expired sessions (SQLite `DELETE FROM session WHERE expires_at < NOW()`).

### Password Security

- **Hashing**: `bcrypt` via `passlib[bcrypt]`.
- **Rounds**: use default (bcrypt auto-handles cost factor, currently ~12).
- **Validation on registration**: min 8 chars, max 128 chars.
- **Dummy hash on login failure**: if username not found, still run bcrypt against a dummy hash to prevent timing-based user enumeration (like Immich does).

### Migration Strategy

1. **Alembic migration** adds `owner_id` (nullable) to `photo`, `album`, `music`, `playlist`, `tag`.
2. **Startup hook** in `main.py`:
   - If `User` table is empty and `TIMESAND_ADMIN_PASSWORD` is set → auto-create admin from env vars.
   - If `User` table is empty and `TIMESAND_ADMIN_PASSWORD` is not set → system stays uninitialized.
   - If `User` table has users but any `owner_id` is NULL → backfill to the first admin's ID.
   - If no users exist but data exists (shouldn't happen in production, but for dev): log warning, system stays uninitialized until env var is set.
3. **After backfill**, a second Alembic migration (or combined logic) sets `owner_id` NOT NULL.

### Frontend Authentication State

```typescript
// stores/auth.ts (Pinia)
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(username: string, password: string) { ... }
  async function logout() { ... }
  async function fetchMe() { ... } // called on app init

  return { user, isAuthenticated, isAdmin, login, logout, fetchMe }
})
```

- Axios interceptor: if 401 → clear auth state → redirect to `/login`.
- Axios `withCredentials: true` must be set globally.
- App init: call `/api/auth/me`. If 401 and not on login/setup page → redirect to `/login`.

### Router Guards

```typescript
// router/index.ts
router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.meta.requiresAdmin && !auth.isAdmin) {
    next({ path: '/' })
  } else {
    next()
  }
})
```

Routes:
- `/login` — no auth required, redirects if authenticated
- `/` (draw) — requires auth
- `/albums`, `/albums/:id`, `/upload`, `/music`, `/slideshow`, `/settings` — requires auth
- `/settings/users` — requires admin

### i18n Keys

New i18n keys needed (prefix `auth.`):
- `auth.login.title`, `auth.login.username`, `auth.login.password`, `auth.login.rememberMe`, `auth.login.submit`
- `auth.logout`
- `auth.error.invalidCredentials`, `auth.error.sessionExpired`, `auth.error.systemNotInitialized`, `auth.error.systemNotInitializedDescription`
- `auth.users.title`, `auth.users.create`, `auth.users.role`, `auth.users.status`

## Acceptance Criteria

### Backend

- [ ] `User`, `UserSetting`, `Session` models created with proper indexes.
- [ ] `/api/auth/login` returns session cookie on success; bcrypt-compares passwords securely.
- [ ] Admin auto-created on startup from `TIMESAND_ADMIN_USERNAME`/`TIMESAND_ADMIN_PASSWORD` env vars when `User` table is empty.
- [ ] `/api/auth/login` returns `503 Service Unavailable` with `{ "detail": "System not initialized" }` when no users exist and env var is not set.
- [ ] `/api/auth/logout` deletes session and clears cookie.
- [ ] `/api/auth/me` returns current user info from valid session.
- [ ] `/api/auth/register` is admin-only and creates member accounts.
- [ ] `/api/users/*` endpoints are admin-only and support CRUD.
- [ ] All existing endpoints require session authentication.
- [ ] All existing list endpoints filter by `owner_id`.
- [ ] All existing mutation endpoints verify ownership (owner or admin).
- [ ] Alembic migration adds `owner_id` to all existing data tables.
- [ ] Startup backfill logic assigns existing data to a default admin.
- [ ] `pytest` tests pass for all new auth and user endpoints.
- [ ] `ruff check .` passes.

### Frontend

- [ ] `/login` page exists with username/password, error handling, redirect after login.
- [ ] `auth` Pinia store manages user state, login, logout, and `isAdmin`.
- [ ] Axios configured with `withCredentials: true`.
- [ ] Router guards redirect unauthenticated users to `/login`.
- [ ] Authenticated routes show user info in AppShell.
- [ ] Settings page shows per-user settings and account section.
- [ ] Admin-only "Users" section in Settings lists/creates/deletes users.
- [ ] All existing pages still work with authenticated API calls.
- [ ] `bun run lint && bun run type-check && bun run test` passes.

### Integration

- [ ] Clean Docker build succeeds.
- [ ] Fresh container with `TIMESAND_ADMIN_PASSWORD` set → admin auto-created on startup → login with env credentials → draw works.
- [ ] Existing container with data upgrades smoothly: data backfills to default admin.
- [ ] Core manual flow passes: upload photo → create album → draw cards → slideshow → settings.

## Risks

- **Data migration edge cases**: existing data without owner during upgrade. Mitigated by startup backfill logic.
- **Session table growth**: expired sessions not cleaned up. Mitigated by periodic cleanup on startup.
- **Frontend route guard race condition**: `fetchMe()` may not complete before router guard runs. Mitigated by app-level init loading state.
- **Password hash compatibility**: `passlib[bcrypt]` must be in `pyproject.toml`. Check that `bcrypt` backend works on all target platforms.
- **All API endpoints breaking change**: every existing endpoint now requires auth. This affects any external scripts or bookmarks. Documented in release notes.

## Out of Scope

- OAuth / SSO / LDAP / Kerberos.
- Guest / public browsing mode.
- Album sharing between users (AlbumShare table deferred).
- Password reset via email.
- 2FA / MFA / TOTP.
- API keys for CLI/scripts.
- Session management UI (view active sessions, revoke specific devices).
