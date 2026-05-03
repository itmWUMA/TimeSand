---
type: task
iteration: "1.3"
status: pending
branch: "feat/photo-skeleton"
pr:
completed:
tags:
  - full-page-upgrade
  - photo-grid
  - skeleton
---

# Task 4: Photo Skeleton Loading

- **Branch**: `feat/photo-skeleton`
- **Scope**: Add skeleton placeholders and progressive fade-in reveal to PhotoGrid items.
- **Dependencies**: None

## Files

### Frontend

- `frontend/src/components/PhotoGridItem.vue` (create)
- `frontend/src/components/PhotoGrid.vue` (modify — refactor to use PhotoGridItem)

## Design

### New Component: PhotoGridItem.vue

Extract each photo grid item into its own component for local `loaded` state management:

```vue
<script setup lang="ts">
import type { Photo } from '../types/photo'
import { ref } from 'vue'

defineProps<{ photo: Photo }>()
defineEmits<{ click: [photo: Photo] }>()

const loaded = ref(false)
</script>

<template>
  <article
    class="cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-ts-panelSoft"
    @click="$emit('click', photo)"
  >
    <div class="relative aspect-video">
      <div
        v-if="!loaded"
        class="absolute inset-0 animate-pulse bg-ts-panel"
      />
      <img
        :src="`/api/photos/${photo.id}/thumbnail`"
        :alt="photo.filename"
        loading="lazy"
        class="h-full w-full object-cover transition-opacity duration-300"
        :class="loaded ? 'opacity-100' : 'opacity-0'"
        @load="loaded = true"
      >
    </div>
    <!-- Photo info below image -->
  </article>
</template>
```

### PhotoGrid.vue Changes

- Replace inline `<article v-for>` with `<PhotoGridItem v-for>`
- Forward `@click` events for Lightbox integration (Task 9 will consume this)
- Keep the header (title + count) in PhotoGrid

### Skeleton Visual

- `animate-pulse` from TailwindCSS: alternates between `bg-ts-panel` opacity 50% → 100%
- Same `aspect-video` ratio as the actual image
- No JavaScript dimension pre-calculation needed

### Progressive Reveal

- Image starts at `opacity: 0`
- On `@load` event: `loaded = true` → class switches to `opacity-100`
- CSS `transition-opacity duration-300` handles the fade (0.3 s)

## Acceptance Criteria

- [ ] Skeleton placeholder visible while images are loading
- [ ] Images fade in smoothly when loaded (0.3 s opacity transition)
- [ ] Lazy loading still works (`loading="lazy"` attribute)
- [ ] PhotoGrid layout and spacing unchanged
- [ ] `bun run type-check && bun run lint:fix` passes
- [ ] Visual verification via Chrome DevTools MCP

## Tests

### Frontend

- Unit test: PhotoGridItem emits `click` event
- Visual verification: skeleton visible on slow network, then fades to image
