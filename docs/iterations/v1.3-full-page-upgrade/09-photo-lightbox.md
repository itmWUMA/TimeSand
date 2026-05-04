---
type: task
iteration: "1.3"
status: done
branch: "feat/photo-lightbox"
pr:
completed: 2026-05-04
tags:
  - full-page-upgrade
  - lightbox
  - photo-detail
---

# Task 9: Photo Detail Lightbox

- **Branch**: `feat/photo-lightbox`
- **Scope**: Implement a shared Lightbox component for viewing full-resolution photos with EXIF info, supporting two distinct entry animations (PhotoGrid origin-expand and card draw card-expand).
- **Dependencies**: Task 4 (photo skeleton) must be merged first (PhotoGridItem emits click events)

## Files

### Frontend

- `frontend/src/components/TsLightbox.vue` (create)
- `frontend/src/components/PhotoGrid.vue` (modify — add click-to-lightbox)
- `frontend/src/components/PhotoGridItem.vue` (modify — emit click with origin rect)
- `frontend/src/components/draw/DrawnCard.vue` (modify — add click handler)
- `frontend/src/pages/HomePage.vue` (modify — mount Lightbox, wire card click)
- `frontend/src/pages/UploadPage.vue` (modify — mount Lightbox for PhotoGrid)
- `frontend/src/pages/AlbumDetailPage.vue` (modify — mount Lightbox for PhotoGrid)
- `frontend/src/i18n/locales/zh-CN.ts` (modify — add lightbox keys)
- `frontend/src/i18n/locales/en.ts` (modify — add lightbox keys)

## Design

### TsLightbox.vue Component

**Props:**

```ts
interface TsLightboxProps {
  photos: Photo[]
  initialIndex: number
  originRect?: DOMRect   // optional — enables origin animation when provided
}
```

**Model:** `v-model:open` (boolean)

**Emits:** `update:open`

**Structure:**

```html
<Teleport to="body">
  <div v-if="open" class="lightbox-overlay">
    <!-- Backdrop -->
    <div class="lightbox-backdrop" @click="close" />

    <!-- Close button -->
    <button class="lightbox-close">✕</button>

    <!-- Main image -->
    <div class="lightbox-image-container">
      <img :src="currentPhoto.file_path" />
    </div>

    <!-- Navigation arrows -->
    <button v-if="canPrev" class="lightbox-prev">◀</button>
    <button v-if="canNext" class="lightbox-next">▶</button>

    <!-- EXIF panel -->
    <aside class="lightbox-exif">
      <!-- metadata fields -->
    </aside>
  </div>
</Teleport>
```

### Layout

- Overlay: `fixed inset-0`, `z-index: 60` (above bottom player z-40, same level as onboarding)
- Backdrop: `bg-black/85`
- Image: `object-contain`, `max-h-[85vh] max-w-[85vw]` on large screens
- EXIF panel: `w-72` fixed right side on `≥lg` screens; bottom sheet `h-auto max-h-[40vh]` on smaller screens
- Close button: top-right corner, `text-white/70 hover:text-white`
- Nav arrows: vertically centered at left/right edges, `text-white/50 hover:text-white`

### EXIF Panel

| Field | Source | Display Format |
|-------|--------|----------------|
| Filename | `photo.filename` | As-is |
| Dimensions | `photo.width`, `photo.height` | `{w} × {h}` |
| File Size | `photo.file_size` | `formatBytes()` (reuse from SettingsPage) |
| Taken At | `photo.taken_at` | Localized datetime or `t('lightbox.unknown')` |
| Location | `photo.latitude`, `photo.longitude` | `{lat}, {lng}` or `t('lightbox.unknown')` |
| Format | `photo.mime_type` | e.g., `image/jpeg` |

### Keyboard Navigation

- `ArrowLeft` → previous photo
- `ArrowRight` → next photo
- `Escape` → close Lightbox
- Register listeners on mount, remove on unmount
- Prevent scroll on body when Lightbox is open (`overflow: hidden`)

### PhotoGrid Entry Animation (origin-expand)

1. `PhotoGridItem` emits `click` with `{ photo, index, rect: el.getBoundingClientRect() }`
2. `PhotoGrid` forwards to parent via `@photo-click` event
3. Parent opens TsLightbox with `originRect` set
4. Animation sequence (GSAP):
   - Create a clone `<div>` at the `originRect` position with the thumbnail as background
   - Animate from `originRect` → centered final position over 0.35 s (`power2.out`)
   - Simultaneously: backdrop opacity 0 → 1, borderRadius from `--ts-radius-lg` → `4px`
   - On complete: show actual Lightbox content, remove clone
5. Close animation: reverse — image shrinks back to thumbnail position

### Card Draw Entry Animation (card-expand)

1. `DrawnCard.vue` adds `@click` handler on the revealed photo
2. Click captures card element's `getBoundingClientRect()` → opens Lightbox with `originRect`
3. Animation: same as PhotoGrid but with card-specific touches:
   - Slight scale overshoot: `1.0 → 1.02 → 1.0` at the end
   - `borderRadius` from card's larger radius to Lightbox's small radius
   - Duration: 0.4 s
4. Lightbox opens with single-photo array `[activeCard.photo]`

### Integration Pattern

Each page that uses Lightbox manages its own instance:

```vue
<!-- In UploadPage.vue / AlbumDetailPage.vue -->
<PhotoGrid :photos="photos" @photo-click="onPhotoClick" />
<TsLightbox
  v-model:open="lightboxOpen"
  :photos="photos"
  :initial-index="lightboxIndex"
  :origin-rect="lightboxOrigin"
/>
```

```ts
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)
const lightboxOrigin = ref<DOMRect>()

function onPhotoClick({ index, rect }: { index: number, rect: DOMRect }) {
  lightboxIndex.value = index
  lightboxOrigin.value = rect
  lightboxOpen.value = true
}
```

## Acceptance Criteria

- [x] Clicking a photo in PhotoGrid opens Lightbox with origin-expand animation
- [x] Clicking the revealed card in card draw opens Lightbox with card-expand animation
- [x] Lightbox displays full-resolution image centered
- [x] EXIF panel shows all available metadata fields
- [x] Left/Right arrow buttons navigate between photos
- [x] Keyboard Left/Right/Escape works
- [x] Close button and backdrop click close the Lightbox
- [x] Close animation reverses back to the origin position
- [x] Single-photo mode (card draw) hides navigation arrows
- [x] EXIF panel is responsive (right side on lg+, bottom on smaller)
- [x] Body scroll is locked when Lightbox is open
- [x] `prefers-reduced-motion`: skip entry/exit animation, show instantly
- [x] `bun run type-check && bun run lint:fix` passes
- [x] Visual verification via Chrome DevTools MCP

## Tests

### Frontend

- Unit test: TsLightbox navigation (prev/next index bounds)
- Unit test: keyboard event handling
- Unit test: EXIF panel renders with null fields (shows "Unknown")
- Visual verification: open from PhotoGrid on UploadPage
- Visual verification: open from card draw on HomePage
- Visual verification: responsive EXIF panel at different viewport widths
