---
type: task
iteration: ""
status: pending
branch: ""
pr:
completed:
tags: []
---

# Task N: <Task Name>

- **Branch**: `feat/<task-slug>`
- **Scope**: <What this task implements>
- **Dependencies**: None | Task X must be merged first

## Files

### Backend

- `backend/app/models/foo.py` (create)
- `backend/app/api/foo.py` (create)

### Frontend

- `frontend/src/types/foo.ts` (create)
- `frontend/src/services/foo.ts` (create)
- `frontend/src/pages/FooPage.vue` (modify)

## API Contracts

### `POST /api/foo`

- Request: ...
- Response 200: ...
- Response 400: ...

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] (if deps changed) Clean-install verification passes: `rm -rf node_modules && bun install && bun run type-check && bun run test`

## Tests

### Backend

- Description of backend test cases

### Frontend

- Description of frontend test cases
