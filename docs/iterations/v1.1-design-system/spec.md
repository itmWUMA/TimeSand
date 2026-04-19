---
type: spec
iteration: "1.1"
created: 2026-04-19
tags:
  - design-system
  - i18n
  - heic
  - phase-1
---

# Design Spec: Design System + i18n + HEIC

## Overview

Iteration 1.1 establishes the foundational infrastructure for all subsequent UI work in Phase 1. It delivers three pillars: a unified design language (tokens + motion presets + component library), internationalization (zh-CN / en), and HEIC photo format support.

This iteration does **not** touch existing page layouts or rework the card-draw / slideshow experience — those belong to [[v1.2 Core Experience]] and [[v1.3 Full Page Upgrade]]. The goal is to build the toolkit so later iterations can apply it confidently.

**Relation to roadmap**: see [[product-roadmap#4.2 迭代 1.1 — 设计系统 + i18n + HEIC]]

## Requirements

### Functional Requirements

- **FR-1**: All visual properties (color, typography, spacing, border-radius, shadow, z-index, transition duration, blur) are defined as design tokens and consumed via Tailwind utility classes.
- **FR-2**: A composable motion preset library provides semantic animation functions (e.g., `fadeIn`, `glowBreath`, `staggerIn`) that encapsulate GSAP calls with consistent parameters.
- **FR-3**: A base UI component library (10 components + 1 provider) built on Radix Vue + design tokens is available for use in subsequent iterations.
- **FR-4**: All hardcoded UI strings (~50+) are extracted into vue-i18n locale files for zh-CN and en.
- **FR-5**: Users can switch language via a toggle in the sidebar; preference is persisted in localStorage and defaults to browser language detection.
- **FR-6**: HEIC/HEIF photos can be uploaded and are automatically converted to JPEG server-side; the frontend is unaware of the conversion.

### Non-Functional Requirements

- **NFR-1**: Token architecture supports runtime theme switching (CSS variables) to enable future light mode (Phase 2) without refactoring.
- **NFR-2**: Motion presets are centralized — changing a timing or easing in `presets.ts` propagates globally.
- **NFR-3**: i18n type safety — missing translation keys produce TypeScript compile errors.
- **NFR-4**: HEIC conversion adds no new system-level dependencies to the Docker image (`pillow-heif` ships pre-compiled).
- **NFR-5**: HEIC EXIF data (date, GPS) is fully preserved through conversion.

## Design

### 1. Design Token System

**Approach**: CSS variables as single source of truth → Tailwind config references variables.

**Files**:

```
frontend/src/assets/
├── tokens.css          ← token definitions (CSS custom properties)
└── main.css            ← global styles (imports tokens.css)
frontend/tailwind.config.ts  ← references var(--ts-*)
```

**Token dimensions**:

| Dimension | Naming | Examples |
|-----------|--------|----------|
| Color | `--ts-{semantic}` | `--ts-bg` (#0b0c10), `--ts-accent` (#d4a843), `--ts-text` (#f4f5f7), `--ts-muted` (#a3a9b8), `--ts-panel` (#171923), `--ts-panel-soft` (#1f2330), `--ts-border` (#ffffff1a, i.e. white/10) |
| Font family | `--ts-font-{type}` | `--ts-font-sans` ("Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif), `--ts-font-mono` |
| Font size | `--ts-text-{size}` | `xs` (12px), `sm` (14px), `base` (16px), `lg` (18px), `xl` (20px), `2xl` (24px) |
| Font weight | `--ts-font-{level}` | `normal` (400), `medium` (500), `semibold` (600) |
| Line height | `--ts-leading-{level}` | `tight` (1.25), `normal` (1.5), `relaxed` (1.75) |
| Spacing | `--ts-space-{step}` | 4px base: `1` (4px), `2` (8px), `3` (12px), `4` (16px), `6` (24px), `8` (32px), `12` (48px), `16` (64px) |
| Border radius | `--ts-radius-{size}` | `sm` (6px), `md` (12px), `lg` (16px), `xl` (24px), `full` (9999px) |
| Shadow | `--ts-shadow-{type}` | `sm` (0 1px 3px rgba(0,0,0,0.4)), `md` (0 4px 12px rgba(0,0,0,0.5)), `--ts-glow-accent` (0 0 30px rgba(212,168,67,0.35)), `--ts-glow-soft` (0 0 20px rgba(212,168,67,0.15)) |
| Z-index | `--ts-z-{semantic}` | `dropdown` (100), `sticky` (150), `modal` (200), `toast` (300), `tooltip` (400) |
| Transition | `--ts-duration-{speed}` | `fast` (200ms), `normal` (400ms), `slow` (700ms), `drift` (1200ms) |
| Blur | `--ts-blur-{level}` | `sm` (4px), `md` (12px), `lg` (24px) — for glassmorphism effects |

**Tailwind integration**: All existing hardcoded values in `tailwind.config.ts` (e.g., `'#0b0c10'`) are replaced with `var(--ts-*)` references. This preserves all existing Tailwind class names (e.g., `bg-ts-bg`) while making the underlying values swappable at runtime.

**Theme switching readiness** (not implemented in 1.1, architecture only):

```css
:root { --ts-bg: #0b0c10; /* dark default */ }
:root[data-theme="light"] { --ts-bg: #f8f7f4; /* future override */ }
```

### 2. Motion Preset Library

**Style direction**: Persona 3 Reload (P3R) ethereal flow — ribbon-like motion trails, particle drift, glow breathing, translucent layers. Adapted from P3R's blue moonlight palette to TimeSand's warm amber/gold.

**Files**:

```
frontend/src/composables/
├── useMotion.ts         ← main composable entry point
└── motion/
    ├── presets.ts       ← constants (easing, duration, distance, stagger)
    ├── transitions.ts   ← base animation functions
    └── sequences.ts     ← multi-element orchestration
```

#### 2.1 Presets

| Category | Name | Value | Usage |
|----------|------|-------|-------|
| **Easing** | `enter` | `power2.out` | Entrance: gentle unfold |
| | `exit` | `power2.in` | Exit: graceful fade |
| | `breath` | `sine.inOut` | Glow breathing loop |
| | `flow` | `power1.inOut` | Ribbon flow |
| | `gentle` | `back.out(1.2)` | Subtle bounce (UI buttons) |
| **Duration** | `fast` | 0.2s | Hover, press micro-feedback |
| | `normal` | 0.4s | Panel toggle, element entrance |
| | `slow` | 0.7s | Immersive effect (reveal, transition) |
| | `drift` | 1.2s | Background drift, glow breathing |
| **Distance** | `sm` | 8px | Micro movement |
| | `md` | 20px | Standard entrance offset |
| | `lg` | 40px | Dramatic entrance |
| **Stagger** | `tight` | 0.05s | List item cascade |
| | `normal` | 0.1s | Standard |
| | `relaxed` | 0.15s | Photo grid |

#### 2.2 Animation Functions

| Function | Effect | P3R Reference |
|----------|--------|---------------|
| `fadeIn(el, opts?)` | Fade in + float up | Basic entrance |
| `fadeOut(el, opts?)` | Fade out + sink down | Basic exit |
| `slideUp(el, opts?)` | Slide in from below | Panel expand |
| `scaleIn(el, opts?)` | Scale from small to full | Modal popup |
| `glowBreath(el)` | Pulsating amber glow (infinite loop) | P3R moonlight pulse |
| `ribbonFlow(el)` | Horizontal light streak | P3R ribbon/light band |
| `staggerIn(els, opts?)` | Sequential element entrance | List/grid loading |
| `particleDrift(els)` | Slow floating particles (infinite loop) | P3R background particles |

Each function returns a GSAP Tween/Timeline instance for external control (pause, kill, reverse).

All `opts` parameters are optional overrides — callers can customize `delay`, `duration`, `distance` on a per-call basis while the defaults come from presets.

#### 2.3 Migration Note

Existing GSAP animations in `useCardDraw.ts` are **not migrated** in 1.1. They will be rebuilt from scratch in iteration 1.2 (Core Experience Rework) using the preset library. In 1.1, the preset library is consumed only by the new base components and verified through component-level tests.

### 3. Base Component Library

**Approach**: Radix Vue (headless) + design token styling + motion presets.

**Directory**: `frontend/src/components/ui/`

**Naming**: `Ts` prefix (TimeSand) to avoid conflicts with HTML elements or third-party components.

| Component | Radix Vue Base | Purpose |
|-----------|---------------|---------|
| `TsButton` | — (native) | Button with variants: `primary` / `secondary` / `ghost`; sizes: `sm` / `md` / `lg` |
| `TsIconButton` | — (native) | Icon-only button (square, centered icon) |
| `TsCard` | — (native) | Card container with optional header/footer slots |
| `TsDialog` | `DialogRoot` / `DialogContent` / `DialogOverlay` | Modal dialog with `scaleIn` entrance, backdrop blur |
| `TsToast` | `ToastRoot` / `ToastViewport` | Notification toast with `slideUp` entrance, auto-dismiss |
| `TsToastProvider` | `ToastProvider` | Global toast container (mounted in App.vue) |
| `TsInput` | — (native) | Text input with label, error state, focus ring |
| `TsSelect` | `SelectRoot` / `SelectContent` / `SelectItem` | Dropdown select with `fadeIn` animation |
| `TsTooltip` | `TooltipRoot` / `TooltipContent` | Hover tooltip with `fadeIn` entrance |
| `TsBadge` | — (native) | Small label / tag badge with color variants |
| `TsTabs` | `TabsRoot` / `TabsList` / `TabsContent` | Tabbed navigation with active indicator animation |

**Design principles**:

- All styling references design tokens via Tailwind classes (e.g., `bg-ts-accent`, `rounded-md`)
- Entrance/exit animations use the motion preset library
- Components expose `variant` and `size` props for visual control
- Slot-based composition for flexibility

**TsButton variants**:

| Variant | Appearance | Use case |
|---------|-----------|----------|
| `primary` | Solid amber/gold background + dark text | Primary action (Upload, Save) |
| `secondary` | Transparent + amber border | Secondary action (Cancel, Back) |
| `ghost` | Transparent + text color, highlight on hover | Toolbar, list actions |

**Scope boundary**: Components are built and tested in isolation. Existing pages are **not** refactored to use them in 1.1 — that happens in 1.3 (Full Page Upgrade).

### 4. Internationalization (vue-i18n)

**Dependency**: `vue-i18n` (official Vue 3 i18n library)

**Files**:

```
frontend/src/i18n/
├── index.ts            ← i18n instance creation + configuration
├── locales/
│   ├── zh-CN.ts        ← Chinese locale
│   └── en.ts           ← English locale
└── types.ts            ← type definitions (ensures key parity)
```

#### 4.1 Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| `legacy` | `false` | Composition API mode |
| `locale` | Dynamic | Priority: localStorage → navigator.language → `'en'` fallback |
| `fallbackLocale` | `'en'` | English as universal fallback |
| `missingWarn` | `true` (dev only) | Console warning for untranslated keys during development |

#### 4.2 Locale Structure

Top-level keys organized by feature domain:

```
common:    save, cancel, delete, upload, loading, confirm, ...
nav:       cardDraw, albums, upload, music, slideshow, settings
photo:     uploadTitle, dropHint, formats, uploadSuccess, uploadFailed, ...
album:     createTitle, nameLabel, descLabel, deleteConfirm, ...
draw:      title, drawNext, reshuffle, noPile, cardsDrawn, ...
music:     title, uploadMusic, noTrack, unknownArtist, ...
slideshow: title, play, pause, interval, ...
settings:  title, language, ...
```

Keys use camelCase. Parameterized text uses `{param}` syntax: `'Successfully uploaded {count} photos'`.

#### 4.3 Type Safety

```ts
// types.ts
import type zhCN from './locales/zh-CN'
export type MessageSchema = typeof zhCN
```

The English locale must conform to `MessageSchema`, ensuring compile-time detection of missing keys.

#### 4.4 Extraction Scope

All ~50+ hardcoded strings across these locations:

- 7 page components (`pages/*.vue`)
- 9 feature components (`components/*.vue`)
- 1 layout component (`layouts/DefaultLayout.vue`)

Date/time formatting already uses `toLocaleString()` and does not need extraction.

### 5. Language Switch

**Location**: Sidebar bottom, below navigation items, above the bottom edge.

**Interaction**:

```
┌──────────────────┐
│  Card Draw        │
│  Albums           │
│  Upload           │
│  Music            │
│  Slideshow        │
│  Settings         │
│                   │
│  ────────────────│
│  🌐 中文 / EN    │  ← click to toggle
└──────────────────┘
```

**Behavior**:

- Click toggles between zh-CN and en (two-state cycle, no dropdown needed)
- Switching is instant — vue-i18n reactivity updates all rendered text without page reload
- Persisted to `localStorage` key `ts-locale`
- On switch, also updates `<html lang="...">` attribute for accessibility and SEO

**First-visit detection**:

```
localStorage has 'ts-locale'?
├── yes → use saved locale
└── no  → read navigator.language
          ├── starts with 'zh' → zh-CN
          └── otherwise        → en
```

### 6. HEIC/HEIF Support

**Strategy**: Server-side conversion to JPEG on upload. Original HEIC is not retained. Frontend is unaware of conversion.

#### 6.1 Backend Changes

**New dependency**: `pillow-heif` — pure Python binding with pre-compiled libheif decoder. No system-level library installation needed in Docker.

**Modified files**:

| File | Change |
|------|--------|
| `backend/app/services/photo_service.py` | Add `image/heic` and `image/heif` to `ALLOWED_MIME_TYPES`; add conversion logic in `create_photo_from_upload()` |
| `backend/pyproject.toml` | Add `pillow-heif` dependency |

**Conversion flow**:

```
Upload HEIC file
  → validate MIME type (image/heic or image/heif now accepted)
  → open with Pillow (pillow-heif registers as HEIC decoder)
  → extract EXIF metadata BEFORE conversion (date, GPS preserved)
  → convert color mode to RGB if needed
  → re-assign suffix to .jpg and mime_type to image/jpeg
  → save original as JPEG (normal path)
  → generate JPEG thumbnail (normal path)
  → store in database with mime_type=image/jpeg
```

**Key detail**: The `filename` field retains the user's original name (e.g., `IMG_0001.heic`) for display purposes, while `file_path` stores the converted `.jpg` UUID filename.

#### 6.2 Frontend Changes

| File | Change |
|------|--------|
| `components/PhotoUploader.vue` | Add `image/heic, image/heif, .heic, .heif` to `accept` attribute |
| i18n locale files | Update format hint text to include HEIC |

No other frontend changes needed — the API returns JPEG data regardless of original format.

#### 6.3 Docker

`pillow-heif` wheel includes pre-compiled native code. No `Dockerfile` changes required beyond the normal `uv sync` which picks up the new dependency. Verify during Docker build testing.

## Technical Notes

### Existing Code Migration

- **Tailwind config**: Current hardcoded color values (e.g., `'#0b0c10'`) become `var(--ts-*)` references. Class names stay identical — no component template changes needed for the color migration.
- **CSS variables**: The 7 existing variables in `main.css` move to `tokens.css` and are expanded to cover all token dimensions.
- **GSAP animations**: Existing card-draw animations in `useCardDraw.ts` are left untouched. Migration to the preset library happens in 1.2.
- **Radix Vue**: Already installed (`radix-vue@^1.9.11`) but unused. Components in `components/ui/` will be the first consumers.

### Dependencies Added

| Package | Purpose | Target |
|---------|---------|--------|
| `vue-i18n` | Internationalization framework | Frontend |
| `pillow-heif` | HEIC/HEIF decoding for Pillow | Backend |

### Testing Strategy

- **Design tokens**: Visual verification — apply tokens to a test page, confirm Tailwind classes produce correct values.
- **Motion presets**: Unit tests for function signatures and return types; visual verification of animation behavior.
- **Components**: Unit tests with `@vue/test-utils` for each component (rendering, prop variants, slot content, events).
- **i18n**: Unit tests verifying key completeness between zh-CN and en; rendering tests for `$t()` output.
- **HEIC**: Backend pytest — upload HEIC → verify JPEG output, EXIF preservation, thumbnail generation.
- **Language switch**: Integration test — click toggle, verify locale changes, verify localStorage persistence.

## Out of Scope

- Replacing existing page HTML with new UI components (→ 1.3 Full Page Upgrade)
- Reworking card-draw or slideshow animations (→ 1.2 Core Experience Rework)
- Light theme implementation (→ Phase 2); only the CSS variable architecture is prepared
- Mobile responsive layout (→ 1.4 Responsive & Mobile)
- Settings page full implementation (→ 1.3); only the language switch in sidebar is added
- Right-to-left (RTL) language support
- Automated locale extraction tooling
