---
type: task
iteration: "1.3"
status: pending
branch: feat/nav-highlight
pr:
completed: 2026-05-03
tags:
  - full-page-upgrade
  - navigation
---

# Task 2: Navigation Highlight Fix

- **Branch**: `feat/nav-highlight`
- **Scope**: Verify and fix active navigation highlighting on all routes in the sidebar.
- **Dependencies**: None

## Files

### Frontend

- `frontend/src/layouts/DefaultLayout.vue` (modify — `linkClass` function)

## Current Logic

```ts
function linkClass(path: string): string {
  const isActive = route.path === path
    || (path === '/albums' && route.path.startsWith('/albums/'))
  // ...
}
```

## Verification Checklist

Test each route and confirm the correct nav item is highlighted:

| Route | Expected Active Item |
|-------|---------------------|
| `/` | Card Draw |
| `/albums` | Albums |
| `/albums/5` | Albums |
| `/upload` | Upload |
| `/music` | Music |
| `/slideshow` | Slideshow |
| `/settings` | Settings |

## Acceptance Criteria

- [ ] Every route highlights the correct navigation item
- [ ] No route highlights multiple items simultaneously
- [ ] Mobile navigation (hamburger menu) also highlights correctly
- [ ] Verified via Chrome DevTools MCP on all routes

## Tests

### Frontend

- Visual verification via Chrome DevTools MCP for each route
- If issues found: unit test `linkClass` logic with route mock
