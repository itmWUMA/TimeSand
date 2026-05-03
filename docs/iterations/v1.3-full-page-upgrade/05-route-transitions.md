---
type: task
iteration: "1.3"
status: pending
branch: "feat/route-transitions"
pr:
completed:
tags:
  - full-page-upgrade
  - animation
  - router
---

# Task 5: Route Transitions

- **Branch**: `feat/route-transitions`
- **Scope**: Add fade-in + float-up animation when navigating between pages.
- **Dependencies**: None

## Files

### Frontend

- `frontend/src/App.vue` (modify — wrap `<RouterView>` with `<Transition>`)
- `frontend/src/assets/styles/` or inline `<style>` (add transition CSS)

## Design

### RouterView Wrapper

```vue
<RouterView v-slot="{ Component, route }">
  <Transition
    :name="route.name === 'slideshow' ? '' : 'page'"
    mode="out-in"
  >
    <component :is="Component" :key="route.path" />
  </Transition>
</RouterView>
```

### CSS

```css
.page-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.page-leave-active {
  transition: opacity 0.2s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.page-leave-to {
  opacity: 0;
}
```

### Behavior

- **Enter**: Page fades in while floating up 12px (0.3 s)
- **Leave**: Page fades out (0.2 s, slightly faster for snappiness)
- **Slideshow**: No transition (empty transition name bypasses animation)
- **Mode**: `out-in` — old page leaves first, then new page enters

### Reduced Motion

When `prefers-reduced-motion` is active, disable transitions:

```css
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
```

## Acceptance Criteria

- [ ] Page transitions animate with fade + float on all non-slideshow routes
- [ ] Slideshow page has no transition animation
- [ ] `prefers-reduced-motion` disables all transitions
- [ ] No visual glitches during rapid navigation
- [ ] `bun run type-check` passes
- [ ] Visual verification via Chrome DevTools MCP

## Tests

### Frontend

- Visual verification: navigate between pages, observe transition
- Verify slideshow page has no transition
- Test rapid clicking between pages — no stacking or glitching
