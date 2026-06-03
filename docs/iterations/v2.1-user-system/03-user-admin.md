---
type: task
iteration: "2.1"
task: "user-admin"
dependencies: ["data-ownership"]
created: 2026-06-03
tags:
  - v2.1
  - admin
  - frontend
  - backend
---

# Task: User Admin

**Scope**: Add admin-only user management capabilities: backend endpoints for listing, updating, and deleting users (with cascade), and a frontend "Users" section in Settings for admins to manage family members.

**Branch**: `feat/user-admin`

---

## Files to Modify

### Backend

| File | Action | Description |
|------|--------|-------------|
| `backend/app/api/users.py` | Modify | Extend with list, update, delete endpoints; delete must cascade owned data |
| `backend/app/schemas/user.py` | Create | Pydantic schemas for user list, create, update, response |

### Frontend

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/services/users.ts` | Create | API client for user management endpoints |
| `frontend/src/components/settings/UsersSection.vue` | Create | User list table + create user form + edit/delete actions |
| `frontend/src/pages/SettingsPage.vue` | Modify | Add "Users" tab/section, visible only to `isAdmin` |

---

## Acceptance Criteria

### Backend

- [ ] `GET /api/users` — admin only, returns list of all users with summary stats (photo count, album count, etc. optional).
- [ ] `GET /api/users/{id}` — admin only, returns user details.
- [ ] `PUT /api/users/{id}` — admin only, can update `display_name`, `role`, `is_active`.
- [ ] `DELETE /api/users/{id}` — admin only, deletes user and **all their data** (cascade delete photos, albums, music, playlists, tags, sessions, settings).
- [ ] Admin cannot delete themselves (returns 400).
- [ ] At least one admin must remain in the system (returns 400 if trying to demote the last admin).
- [ ] `pytest` tests for user management endpoints.
- [ ] `ruff check .` passes.

### Frontend

- [ ] Settings page shows "Users" section only when `auth.isAdmin == true`.
- [ ] "Users" section shows a table: username, display name, role, status, created date, actions.
- [ ] "Create User" button opens a form: username, display name, password, role (member/admin).
- [ ] Inline edit: change display name, role, active status.
- [ ] Delete user with confirmation dialog (warns that all data will be deleted).
- [ ] Admin cannot delete themselves (button disabled or error shown).
- [ ] i18n keys for all user management text.
- [ ] `bun run lint && bun run type-check && bun run test` passes.

### Integration

- [ ] Admin logs in → Settings → Users → creates a member "Bob" → Bob can log in independently.
- [ ] Bob uploads photos → Bob sees only his photos → Admin does not see Bob's photos in normal views (admin sees user list but not mixed content).
- [ ] Admin deletes Bob → Bob's photos and albums are removed from database and filesystem.
- [ ] Docker build succeeds.

---

## Notes

- **Cascade delete**: Use SQLModel/SQLAlchemy `cascade="all, delete-orphan"` on relationships where appropriate. For file deletion, service layer should also delete physical files in `data/photos/` and `data/music/` before deleting DB rows.
- **Photo count optimization**: If including stats in user list, use efficient count queries; avoid N+1.
- **UI design**: Follow Warm Walnut design system. Use existing table/card components from the v1.6 refactor.
- **Role change UX**: When changing a user's role or disabling them, current active sessions for that user should be invalidated (delete their sessions).
