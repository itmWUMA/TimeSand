---
type: task
iteration: "1.2"
status: pending
branch: "feat/empty-states"
pr:
completed:
tags:
  - core-experience
  - empty-states
  - phase-1
---

# Task 3: Empty States

- **Branch**: `feat/empty-states`
- **Scope**: Create a reusable `TsEmptyState` component and integrate it into the Albums and Music pages. Card Draw and Slideshow empty states are handled in their respective ceremony/transition tasks (Task 4, Task 5).
- **Dependencies**: None

## Files

### Frontend

- `frontend/src/components/TsEmptyState.vue` (create) — reusable empty state component
- `frontend/src/pages/AlbumsPage.vue` (modify) — add empty state when 0 albums
- `frontend/src/pages/MusicPage.vue` (modify) — add empty state when 0 tracks
- `frontend/src/i18n/locales/zh-CN.ts` (modify) — add `empty` namespace keys
- `frontend/src/i18n/locales/en.ts` (modify) — add `empty` namespace keys

### Tests

- `frontend/src/__tests__/components/TsEmptyState.test.ts` (create)

## Acceptance Criteria

- [ ] `TsEmptyState` component renders icon, title, optional description, and optional CTA button
- [ ] CTA button navigates to specified route via Vue Router
- [ ] Component uses `fadeIn` entrance animation from motion presets on mount
- [ ] Albums page shows empty state when 0 albums exist
- [ ] Music page shows empty state when 0 tracks exist
- [ ] All empty state strings available in zh-CN and en
- [ ] Icons are inline SVGs (stroke style, `currentColor`), not emoji
- [ ] Unit tests pass: `bun run test -- TsEmptyState`
- [ ] `bun run type-check` passes
- [ ] `bun run lint:fix` passes

## Implementation Steps

- [ ] **Step 1: Add i18n keys**

Add to `frontend/src/i18n/locales/zh-CN.ts`:

```ts
// Add top-level "empty" section:
empty: {
  albums: {
    title: '还没有相册',
    description: '创建相册来整理你的照片',
    action: '创建相册',
  },
  music: {
    title: '还没有音乐',
    description: '上传音乐，为浏览照片增添氛围',
    action: '上传音乐',
  },
  photos: {
    title: '还没有照片',
    description: '上传照片，开始你的时光之旅',
    action: '上传照片',
  },
  slideshow: {
    title: '还没有照片',
    description: '上传照片后即可开始幻灯片播放',
    action: '上传照片',
  },
},
```

Add matching keys to `frontend/src/i18n/locales/en.ts`:

```ts
empty: {
  albums: {
    title: 'No albums yet',
    description: 'Create an album to organize your photos',
    action: 'Create album',
  },
  music: {
    title: 'No music yet',
    description: 'Upload music to set the mood for browsing photos',
    action: 'Upload music',
  },
  photos: {
    title: 'No photos yet',
    description: 'Upload photos to begin your journey through time',
    action: 'Upload photos',
  },
  slideshow: {
    title: 'No photos yet',
    description: 'Upload photos to start the slideshow',
    action: 'Upload photos',
  },
},
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/__tests__/components/TsEmptyState.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import TsEmptyState from '../../components/TsEmptyState.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en: {} },
})

const routerPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))

describe('TsEmptyState', () => {
  it('renders title', () => {
    const wrapper = mount(TsEmptyState, {
      props: { title: 'No items' },
      global: { plugins: [i18n] },
    })
    expect(wrapper.text()).toContain('No items')
  })

  it('renders description when provided', () => {
    const wrapper = mount(TsEmptyState, {
      props: { title: 'No items', description: 'Add some items' },
      global: { plugins: [i18n] },
    })
    expect(wrapper.text()).toContain('Add some items')
  })

  it('does not render description when not provided', () => {
    const wrapper = mount(TsEmptyState, {
      props: { title: 'No items' },
      global: { plugins: [i18n] },
    })
    expect(wrapper.findAll('p').length).toBeLessThanOrEqual(1)
  })

  it('renders action button when actionLabel and actionTo provided', () => {
    const wrapper = mount(TsEmptyState, {
      props: { title: 'No items', actionLabel: 'Add', actionTo: '/add' },
      global: { plugins: [i18n] },
    })
    expect(wrapper.find('button').text()).toContain('Add')
  })

  it('navigates on action button click', async () => {
    const wrapper = mount(TsEmptyState, {
      props: { title: 'No items', actionLabel: 'Add', actionTo: '/add' },
      global: { plugins: [i18n] },
    })
    await wrapper.find('button').trigger('click')
    expect(routerPush).toHaveBeenCalledWith('/add')
  })

  it('does not render action button when no actionLabel', () => {
    const wrapper = mount(TsEmptyState, {
      props: { title: 'No items' },
      global: { plugins: [i18n] },
    })
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
```

Run: `cd frontend && bun run test -- TsEmptyState`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement `TsEmptyState.vue`**

Create `frontend/src/components/TsEmptyState.vue`:

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fadeIn } from '../composables/motion/transitions'

const props = defineProps<{
  title: string
  description?: string
  actionLabel?: string
  actionTo?: string
}>()

const router = useRouter()
const containerRef = ref<HTMLElement | null>(null)

function handleAction(): void {
  if (props.actionTo) {
    router.push(props.actionTo)
  }
}

onMounted(() => {
  if (containerRef.value) {
    fadeIn(containerRef.value, { distance: 12, duration: 0.4 })
  }
})
</script>

<template>
  <div ref="containerRef" class="flex flex-col items-center justify-center py-16 opacity-0">
    <svg
      class="mb-4 h-12 w-12 text-ts-muted"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>

    <h3 class="text-xl text-ts-text">
      {{ title }}
    </h3>

    <p v-if="description" class="mt-2 text-sm text-ts-muted">
      {{ description }}
    </p>

    <button
      v-if="actionLabel && actionTo"
      type="button"
      class="mt-4 rounded-ts-md border border-ts-accent/70 px-5 py-2 text-sm font-semibold text-ts-accent transition hover:bg-ts-accent hover:text-black"
      @click="handleAction"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
```

Note: The component uses a generic "plus in box" SVG icon as default. Pages can provide more specific icons via future enhancement. The `opacity-0` initial state is set so `fadeIn` animation works correctly from transparent.

Run: `cd frontend && bun run test -- TsEmptyState`
Expected: All tests PASS.

- [ ] **Step 4: Integrate into AlbumsPage.vue**

In `frontend/src/pages/AlbumsPage.vue`, add the empty state:

1. Import `TsEmptyState`
2. Check the albums list length
3. When empty, show `<TsEmptyState>` with the i18n keys:

```vue
<TsEmptyState
  v-if="albums.length === 0"
  :title="$t('empty.albums.title')"
  :description="$t('empty.albums.description')"
  :action-label="$t('empty.albums.action')"
  action-to="/albums"
/>
```

Place this inside the main content area, shown conditionally when `albums.length === 0`.

- [ ] **Step 5: Integrate into MusicPage.vue**

In `frontend/src/pages/MusicPage.vue`, add the empty state similarly:

```vue
<TsEmptyState
  v-if="tracks.length === 0"
  :title="$t('empty.music.title')"
  :description="$t('empty.music.description')"
  :action-label="$t('empty.music.action')"
  action-to="/music"
/>
```

Place this inside the main content area, shown conditionally when the tracks/playlists list is empty.

- [ ] **Step 6: Verify type-check and lint**

```bash
cd frontend && bun run type-check && bun run lint:fix
```

Expected: Both pass with no errors.

- [ ] **Step 7: Visual verification**

Start dev server (`bun run dev`) and verify:
- Albums page with 0 albums shows empty state with icon, title, description, and CTA button
- Music page with 0 tracks shows empty state
- CTA buttons navigate to correct routes
- `fadeIn` animation plays on mount
- Both zh-CN and en locales display correct text

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/TsEmptyState.vue frontend/src/pages/AlbumsPage.vue frontend/src/pages/MusicPage.vue frontend/src/i18n/locales/zh-CN.ts frontend/src/i18n/locales/en.ts frontend/src/__tests__/components/TsEmptyState.test.ts
git commit -m "$(cat <<'EOF'
feat(empty): add reusable empty state component and page integration

TsEmptyState with fadeIn entrance, icon, title, description, and CTA.
Integrated into Albums and Music pages for zero-content guidance.
EOF
)"
```

## Tests

### Frontend

- **`TsEmptyState.test.ts`**: renders title, optional description, optional CTA button, button navigation, no button when no action
- **Visual verification**: empty state renders correctly on Albums and Music pages, animation plays, i18n works in both locales
