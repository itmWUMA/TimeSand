---
type: spec
iteration: "1.3"
created: 2026-05-03
tags:
  - full-page-upgrade
  - settings
  - lightbox
  - music-player
  - phase-1
---

# Design Spec: Full Page Upgrade

## Overview

Iteration 1.3 applies the design system built in v1.1 and the core experience work from v1.2 to **every page**, eliminating MVP-era rough edges and achieving unified product-grade quality. This is the final polish pass before moving on to responsive/mobile layout (v1.4).

**What this iteration does:**

- Cleans up all placeholder/debug text remnants
- Rebuilds the bottom music player with real controls (progress bar, seek, cycle mode, expand/collapse)
- Completes the Settings page (language switch, card draw settings, SFX controls)
- Adds photo detail Lightbox (from PhotoGrid and card draw, with distinct entry animations)
- Fixes navigation highlight edge cases
- Enriches album cards with more metadata
- Adds skeleton loading and progressive reveal to photo grids
- Adds route transition animations (fade + float)

**What this iteration does NOT touch:**

- Card draw ceremony logic (unchanged from v1.2)
- Slideshow transition logic (unchanged from v1.2)
- Mobile responsive layout (→ 1.4)
- Backend CI/CD, database migration, backup (→ 1.5)
- New features beyond polish (no new data models, no new core flows)

**Relation to roadmap**: see [[product-roadmap#4.4 迭代 1.3 — 全页面升级]]

## Requirements

### Functional Requirements

- **FR-1**: All placeholder, debug, and TODO text is removed from every page and component.
- **FR-2**: The bottom music player supports: progress bar with drag-to-seek, current/total time display, play/pause/prev/next with icon buttons, repeat mode cycling (all → one → none), expand/collapse toggle. Collapsed state shows a single compact row; expanded state shows the full control layout.
- **FR-3**: Settings page includes: language switch (zh-CN / en), card draw settings (time-weight strength, nearby date range, animation speed, default draw source), SFX volume slider and mute toggle, in addition to the existing slideshow interval and storage info sections.
- **FR-4**: Clicking a photo in PhotoGrid opens a Lightbox overlay showing the full-resolution image with EXIF metadata panel and prev/next navigation. The entry animation is an origin-expand from the clicked thumbnail's position.
- **FR-5**: Clicking the revealed card in card draw opens the same Lightbox, but with a card-expand animation (scale up from card position with border-radius morphing).
- **FR-6**: The Lightbox supports keyboard navigation (Left/Right arrows, Esc to close).
- **FR-7**: Album cards display description (one-line truncated) and relative update time ("3 days ago") in addition to existing photo count and cover.
- **FR-8**: Photo grid items show a skeleton placeholder (pulse animation) while images load, then fade in progressively (0.3 s opacity transition) when loaded.
- **FR-9**: Route transitions use a fade-in + slight upward float animation (~0.3 s) for entering pages, and a simple fade-out for leaving pages.
- **FR-10**: Card draw API accepts optional `weight_mode` and `nearby_days` parameters to customize the time-weighting algorithm.
- **FR-11**: The active navigation item is correctly highlighted on all routes, including nested routes like `/albums/:id`.

### Non-Functional Requirements

- **NFR-1**: Music player expand/collapse state persists across page navigations and sessions (localStorage).
- **NFR-2**: Lightbox origin animation targets 60 fps — uses CSS `transform` and `opacity` only, no layout-triggering properties.
- **NFR-3**: Skeleton loading uses pure CSS `animate-pulse` — no JavaScript image dimension pre-calculation needed.
- **NFR-4**: All new UI strings are available in both zh-CN and en, following the existing vue-i18n setup.
- **NFR-5**: Card draw settings changes take effect on the next draw without page reload.
- **NFR-6**: Route transition does not apply to the slideshow page (fullscreen mode).

## Design

### 1. Cleanup Pass

A systematic scan of all pages and components to remove:

- Residual `console.log` / `console.debug` calls
- Commented-out code blocks (unless explaining a non-obvious "why")
- Hardcoded English/Chinese text not going through i18n
- TODO/FIXME/HACK comments that are no longer relevant
- Any debug UI elements or test-only display text

This is a low-risk, broad-surface task. Implementation should use `grep` to find candidates, then review and remove contextually.

### 2. Bottom Music Player Rebuild

#### 2.1 Current State

`MusicPlayer.vue` is already fixed to the bottom of the viewport (`DefaultLayout.vue:123-127`). It has progress seek, volume slider, prev/play/next buttons, track info, and time display. However:

- Buttons are text-only (`"Play"`, `"Pause"`, `"Next"`) — no icons
- No repeat mode toggle (backend store supports `RepeatMode: 'all' | 'one' | 'none'`)
- No expand/collapse — always shows the full layout
- Takes significant vertical space

#### 2.2 Redesigned Layout

**Collapsed (mini) state** — single row, ~48px height:

```
┌──────────────────────────────────────────────────────┐
│ Track Title          ━━━━━●━━━━━━  ◀◀  ▶  ▶▶  🔁  ▲ │
└──────────────────────────────────────────────────────┘
```

- Track title (truncated): left-aligned, `text-sm`
- Thin progress bar (4px height, `--ts-accent` fill, clickable for seek)
- Icon buttons: prev, play/pause, next, repeat mode
- Expand chevron (▲) at far right
- Time display hidden in collapsed mode

**Expanded (full) state** — ~120px height:

```
┌──────────────────────────────────────────────────────────┐
│ Track Title                                            ▼ │
│ Artist · Playlist Name                                   │
│ ━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━  1:23 / 3:45          │
│          ◀◀    ▶    ▶▶    🔁    🔊 ━━━━●━━━━             │
└──────────────────────────────────────────────────────────┘
```

- Full track info (title + artist + playlist)
- Wide progress bar with drag-to-seek (input range, styled)
- Time display: `currentTime / duration`
- Control row: prev, play/pause, next, repeat mode toggle, volume slider
- Collapse chevron (▼) at top right

#### 2.3 Repeat Mode Cycling

Click the repeat icon to cycle: `all` → `one` → `none` → `all`.

| Mode | Icon Style | Tooltip |
|------|-----------|---------|
| `all` | Repeat icon, `--ts-accent` color | Repeat all |
| `one` | Repeat icon + "1" badge, `--ts-accent` color | Repeat one |
| `none` | Repeat icon, `--ts-muted` color | Repeat off |

#### 2.4 Icon Buttons

All player buttons use inline SVG icons (no icon library dependency). Icons should be simple, 2px stroke, `currentColor` fill/stroke for easy theming. Source from Lucide icon set (MIT license) or hand-drawn.

| Action | Icon |
|--------|------|
| Play | Triangle pointing right |
| Pause | Two vertical bars |
| Previous | Two triangles pointing left |
| Next | Two triangles pointing right |
| Repeat All | Loop arrows |
| Repeat One | Loop arrows + "1" |
| Repeat None | Loop arrows (muted) |
| Expand | Chevron up |
| Collapse | Chevron down |
| Volume | Speaker icon |

#### 2.5 Expand/Collapse State

- Default: collapsed
- Persisted in `localStorage` key `ts-player-expanded` (`'true'` | `'false'`)
- Transition between states: `0.3s` height + opacity, using CSS `transition` or GSAP

#### 2.6 MusicPlayerMini Removal

`MusicPlayerMini.vue` is only used inside `SlideshowPage.vue`. Since the slideshow page hides the bottom bar (`isFullscreenRoute` check), `MusicPlayerMini` should be reviewed:

- If slideshow needs inline player controls, keep but upgrade visually
- If the bottom bar should appear in slideshow too, remove MusicPlayerMini

Decision: keep `MusicPlayerMini` as-is for slideshow (it's a different context — slideshow has its own compact control needs). Do not modify it in v1.3.

### 3. Settings Page Completion

#### 3.1 Current State

`SettingsPage.vue` has three sections:
1. Storage info (photo/music counts, storage sizes)
2. Slideshow defaults (interval select)
3. About (version, GitHub link)

#### 3.2 New Sections

Add three new sections, positioned between "Slideshow defaults" and "About":

**3.2.1 Language Section**

```
┌─────────────────────────────────────────┐
│ Language / 语言                          │
│ Display language for the interface       │
│ [  中文        ▼  ]                      │
└─────────────────────────────────────────┘
```

- `TsSelect` with options: `中文` (`zh-CN`), `English` (`en`)
- On change: update `locale`, `localStorage('ts-locale')`, `document.documentElement.lang`
- The sidebar language toggle button remains as a convenience shortcut

**3.2.2 Card Draw Settings Section**

```
┌──────────────────────────────────────────────────┐
│ Card Draw / 抽卡设置                               │
│                                                    │
│ Time Weighting     [  Standard     ▼  ]            │
│ Nearby Date Range  [  ±3 days      ▼  ]            │
│ Animation Speed    [  Standard     ▼  ]            │
│ Default Source     [  All Photos   ▼  ]            │
└──────────────────────────────────────────────────┘
```

| Setting | Options | Default | localStorage Key | Backend Impact |
|---------|---------|---------|-----------------|----------------|
| Time Weighting | Off / Light / Standard / Strong | Standard | `ts-draw-weight-mode` | Sent as `weight_mode` param |
| Nearby Date Range | ±1 day / ±3 days / ±7 days | ±3 days | `ts-draw-nearby-days` | Sent as `nearby_days` param |
| Animation Speed | Fast (0.6x) / Standard (1x) / Relaxed (1.5x) | Standard | `ts-draw-anim-speed` | Frontend-only, global multiplier |
| Default Source | All Photos / [album names...] | All Photos | `ts-draw-default-album` | Pre-selects album on HomePage |

**Time weighting modes mapped to backend weight multipliers:**

| Mode | `weight_mode` value | Exact Match | Near 1 Day | Near 2-3 Days | Base |
|------|---------------------|-------------|------------|---------------|------|
| Off | `off` | 1.0 | 1.0 | 1.0 | 1.0 |
| Light | `light` | 1.8 | 1.4 | 1.2 | 1.0 |
| Standard | `standard` | 3.0 | 2.0 | 1.5 | 1.0 |
| Strong | `strong` | 5.0 | 3.0 | 2.0 | 1.0 |

**3.2.3 Sound Effects Section**

```
┌─────────────────────────────────────────┐
│ Sound Effects / 音效                     │
│                                          │
│ Volume   ━━━━━━━●━━━━━━  60%             │
│ Mute     [ OFF ]                          │
└─────────────────────────────────────────┘
```

- Volume slider: `input[type=range]` 0–100, reads/writes `useSoundEffects().setVolume()`
- Mute toggle: button or switch, reads/writes `useSoundEffects().mute() / unmute()`
- Values already persist via the existing composable (localStorage keys `ts-sfx-volume`, `ts-sfx-muted`)

#### 3.3 Settings Store Extension

Extend `useSettingsStore` to manage the new card draw settings. All values read from and persist to localStorage. The store exposes reactive getters so `HomePage.vue` can read the default album and animation speed without prop drilling.

### 4. Photo Detail Lightbox

#### 4.1 Shared Component: `TsLightbox.vue`

**Props:**

```ts
interface TsLightboxProps {
  photos: Photo[]
  initialIndex: number
}
```

**Emits:** `close`

**Model:** `v-model:open` (boolean)

**Features:**

- Full-screen overlay: `bg-black/85`, `z-index: --ts-z-modal` (same as onboarding)
- Center image: `<img>` with `object-contain`, max 85vh / 85vw
- EXIF panel: right side on ≥md screens, bottom sheet on small screens
- Navigation: left/right arrow buttons at image edges + keyboard Left/Right
- Close: Esc key, click overlay background, or X button top-right
- Swipe: optional (basic touch swipe left/right for prev/next)

**EXIF Panel Content:**

| Field | Source | Display |
|-------|--------|---------|
| Filename | `photo.filename` | As-is |
| Dimensions | `photo.width × photo.height` | e.g., "4032 × 3024" |
| File Size | `photo.file_size` | Formatted (KB/MB) |
| Taken At | `photo.taken_at` | Localized date/time or "Unknown" |
| Location | `photo.latitude, photo.longitude` | Decimal coordinates or "Unknown" |
| Format | `photo.mime_type` | e.g., "image/jpeg" |

#### 4.2 PhotoGrid Entry Animation

When a user clicks a photo thumbnail in `PhotoGrid.vue`:

1. Capture the thumbnail's bounding rect via `getBoundingClientRect()`
2. Open the Lightbox with origin coordinates
3. GSAP animates a clone/placeholder from the thumbnail rect to the final centered position:
   - `x, y, width, height` transition from thumbnail to center
   - `borderRadius` morphs from thumbnail radius to Lightbox radius
   - `opacity` of overlay fades in simultaneously
   - Duration: 0.35 s, easing: `power2.out`
4. On close: reverse animation back to thumbnail position, then remove overlay

Implementation: the Lightbox component accepts an optional `originRect: DOMRect` prop. When provided, it performs the origin animation. When absent, it falls back to a simple `fadeIn`.

#### 4.3 Card Draw Entry Animation

When a user clicks the revealed card in `DrawnCard.vue`:

1. Capture the card element's bounding rect
2. Open Lightbox with `originRect` set to the card's rect
3. Animation is similar to PhotoGrid but with card-specific embellishments:
   - `borderRadius` transitions from card's `--ts-radius-lg` to near-zero
   - Slight `rotate` unwinding (if the card had any pile rotation)
   - The card "unfolds" into the photo — subtle scale overshoot (`1.0 → 1.02 → 1.0`)
4. Duration: 0.4 s, easing: `power2.out`

#### 4.4 Integration Points

- `PhotoGrid.vue`: each photo item gets `@click` handler that opens Lightbox with the full photos array and clicked index
- `UploadPage.vue`: passes its photos to PhotoGrid (already does)
- `AlbumDetailPage.vue`: passes album photos to PhotoGrid (already does)
- `HomePage.vue` / `DrawnCard.vue`: the revealed card gets a click handler to open Lightbox with `[activeCard.photo]` as the single-photo array
- Lightbox is mounted once in `DefaultLayout.vue` or `App.vue` via a provide/inject pattern or a Pinia store, avoiding multiple instances

### 5. Navigation Highlight Fix

Current logic in `DefaultLayout.vue:21-28`:

```ts
function linkClass(path: string): string {
  const isActive = route.path === path
    || (path === '/albums' && route.path.startsWith('/albums/'))
  // ...
}
```

This correctly handles:
- Exact path matches (`/`, `/upload`, `/music`, `/settings`)
- Album sub-routes (`/albums/123`)

Verification checklist:
- [ ] `/` highlights "Card Draw" only (not on any other page)
- [ ] `/albums` highlights "Albums"
- [ ] `/albums/5` highlights "Albums"
- [ ] `/slideshow` highlights "Slideshow"
- [ ] `/settings` highlights "Settings"

If all pass, mark this task as already done. If edge cases found, fix them.

### 6. Album Card Enhancement

`AlbumCard.vue` currently shows: cover photo, name, photo count.

Add:
- **Description**: below the name, one line, `text-sm text-ts-muted truncate`. Only show if `album.description` is non-null.
- **Update time**: below photo count, relative time format ("3 days ago" / "3 天前"). Use a small utility `formatRelativeTime(dateString)` that produces locale-aware relative times. The `updated_at` field already exists in the Album model (both backend and frontend types).

Updated card layout:

```
┌──────────────────────────┐
│        Cover Photo        │
├──────────────────────────┤
│ Album Name                │
│ Album description text... │
│ 12 photos · 3 days ago    │
└──────────────────────────┘
```

### 7. Photo Loading Optimization

#### 7.1 Skeleton Placeholder

Each photo grid item shows a skeleton before the image loads:

```html
<article class="overflow-hidden rounded-xl border border-white/10 bg-ts-panelSoft">
  <!-- Skeleton: visible until image loads -->
  <div v-if="!loaded" class="aspect-video animate-pulse bg-ts-panel" />
  <!-- Image: hidden until loaded, then fade in -->
  <img
    v-show="loaded"
    :src="photo.thumbnail_path"
    loading="lazy"
    class="aspect-video object-cover transition-opacity duration-300"
    :class="loaded ? 'opacity-100' : 'opacity-0'"
    @load="loaded = true"
  >
</article>
```

#### 7.2 Implementation

Wrap each photo item in a small composable or inline ref tracking:

- `loaded` ref per item, initialized `false`
- Set to `true` on `<img @load>`
- Skeleton uses `animate-pulse` (TailwindCSS built-in)
- Image transitions `opacity: 0 → 1` over 0.3 s

Since PhotoGrid renders a `v-for` list, each item needs its own `loaded` state. Use a `Map<number, boolean>` keyed by `photo.id`, or refactor each item into a sub-component `PhotoGridItem.vue` with its own local `loaded` ref (cleaner).

### 8. Route Transition Animation

#### 8.1 Implementation

In `DefaultLayout.vue`, wrap the `<slot>` with Vue's `<Transition>`:

Since `DefaultLayout.vue` uses `<slot>`, the transition wrapping needs to happen in `App.vue` where `<RouterView>` lives. Check current App.vue structure to determine the exact integration point.

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

#### 8.2 CSS

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

- Enter: fade in + float up from 12px below (0.3 s)
- Leave: simple fade out (0.2 s, slightly faster to feel snappy)
- Slideshow page: no transition (name is empty string)

### 9. Backend Changes: Draw API Parameterization

#### 9.1 New Request Parameters

Extend `DrawRequest` in `backend/app/api/draw.py`:

```python
class DrawRequest(BaseModel):
    album_id: int | None = Field(default=None, ge=1)
    exclude_ids: list[int] = Field(default_factory=list)
    weight_mode: str = Field(default="standard")  # "off" | "light" | "standard" | "strong"
    nearby_days: int = Field(default=3, ge=1, le=7)
```

#### 9.2 Weight Mode Presets

In `draw_service.py`, define presets:

```python
WEIGHT_PRESETS = {
    "off":      {"exact": 1.0, "near_one": 1.0, "near_far": 1.0},
    "light":    {"exact": 1.8, "near_one": 1.4, "near_far": 1.2},
    "standard": {"exact": 3.0, "near_one": 2.0, "near_far": 1.5},
    "strong":   {"exact": 5.0, "near_one": 3.0, "near_far": 2.0},
}
```

`calculate_draw_weight` receives the preset and `nearby_days` as parameters instead of using module-level constants.

#### 9.3 Backward Compatibility

The new parameters have defaults matching the current behavior (`weight_mode="standard"`, `nearby_days=3`), so existing API calls work identically.

## Technical Notes

### Dependencies

No new npm or PyPI packages added. All functionality uses existing dependencies (GSAP, vue-i18n, howler.js, Pinia, TailwindCSS).

### Existing Code Changes

| File | Change Type | Scope |
|------|-------------|-------|
| `MusicPlayer.vue` | **Rewrite** | Dual-state (collapsed/expanded), icon buttons, repeat mode |
| `SettingsPage.vue` | **Major modification** | Three new settings sections |
| `PhotoGrid.vue` | **Modification** | Refactor items into sub-component, add skeleton + Lightbox trigger |
| `AlbumCard.vue` | **Modification** | Add description and relative time display |
| `DefaultLayout.vue` | **Minor modification** | Verify nav highlight, potentially adjust layout for route transition |
| `App.vue` | **Modification** | Add `<Transition>` wrapper around `<RouterView>` |
| `HomePage.vue` | **Minor modification** | Lightbox trigger on revealed card |
| `DrawnCard.vue` | **Minor modification** | Click handler to open Lightbox |
| `draw.py` (backend) | **Modification** | New request parameters |
| `draw_service.py` (backend) | **Modification** | Parameterized weight presets and nearby days |
| `stores/settings.ts` | **Extension** | Card draw settings state |
| `services/draw.ts` (frontend) | **Modification** | Pass new parameters to API |

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/components/TsLightbox.vue` | Shared Lightbox overlay component |
| `frontend/src/components/PhotoGridItem.vue` | Individual photo grid item with skeleton loading |
| `frontend/src/utils/formatRelativeTime.ts` | Locale-aware relative time formatter |

### Testing Strategy

| Feature | Unit Tests | Visual Verification |
|---------|-----------|-------------------|
| Music player | Expand/collapse state, repeat mode cycling, seek interaction | Chrome DevTools MCP: collapsed/expanded layout, button icons |
| Settings | Each setting reads/writes correctly, locale switch, SFX volume/mute | Chrome DevTools MCP: all sections render, settings persist |
| Lightbox | Open/close, keyboard nav, photo switching, EXIF display | Chrome DevTools MCP: origin animation from PhotoGrid and card draw |
| Album card | Relative time formatting, description truncation | Chrome DevTools MCP: card shows enriched info |
| Photo skeleton | Load state tracking, skeleton→image transition | Chrome DevTools MCP: skeleton visible then fades to image |
| Route transition | Transition classes applied, slideshow excluded | Chrome DevTools MCP: page changes animate |
| Draw API params | Weight mode presets produce correct weights, nearby_days respected | pytest: parameterized test for each mode |
| Cleanup | No console.log, no TODO, no hardcoded strings | grep scan |

## Out of Scope

- Mobile responsive layout and touch gesture optimization (→ 1.4)
- Backend CI/CD, Alembic migration, backup/restore (→ 1.5)
- Music player cover art / album art (no cover data in current model)
- Photo editing (crop, rotate) (→ Phase 2)
- Video support (→ Phase 2)
- Replay onboarding button (could be added to Settings but deferred — low priority)
- Advanced Lightbox features (zoom, pinch-to-zoom, slideshow mode from Lightbox)
