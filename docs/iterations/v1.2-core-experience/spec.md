---
type: spec
iteration: "1.2"
created: 2026-04-25
tags:
  - core-experience
  - card-draw
  - slideshow
  - sound-effects
  - onboarding
  - phase-1
---

# Design Spec: Core Experience Rework

## Overview

Iteration 1.2 rebuilds the two signature experiences — **card draw** and **slideshow** — to achieve the "impressive ceremony feel" that defines TimeSand's product identity. It also introduces a sound effects system, memory copywriting for anniversary photos, first-time onboarding, and empty state guidance.

This iteration consumes the infrastructure built in v1.1 (design tokens, motion presets, UI component library, i18n). The card draw composable is rewritten to use GSAP Timeline orchestration with the motion preset library; the slideshow gains multiple transition modes driven by GSAP instead of CSS keyframes.

**What this iteration does NOT touch:**

- Existing page layouts beyond Card Draw and Slideshow (→ 1.3 Full Page Upgrade)
- Settings page implementation (→ 1.3)
- Sidebar / navigation structure (unchanged)
- Mobile responsive layout (→ 1.4)
- Music player UI or logic (unchanged)
- Photo management pages (Upload, Albums)

**Relation to roadmap**: see [[product-roadmap#4.3 迭代 1.2 — 核心体验重塑]]

## Requirements

### Functional Requirements

- **FR-1**: Card draw follows a multi-stage ceremony: atmosphere shift → card emergence → 3D flip reveal → memory text display, orchestrated as a single GSAP Timeline.
- **FR-2**: A sound effects system (howler.js) provides audio feedback for card draw, slideshow transitions, and UI micro-interactions.
- **FR-3**: Anniversary photos (`weight_reason` from backend) display warm, localized text (e.g., "3 年前的今天") below the revealed card.
- **FR-4**: Slideshow supports multiple transition types selectable by the user: crossfade, Ken Burns (enhanced with randomized directions), fade-through-black, and zoom.
- **FR-5**: First-time users (no `ts-onboarding-complete` flag in localStorage) see a 4-step guided overlay on the Card Draw page introducing TimeSand's concept and core actions.
- **FR-6**: Bundled demo photos and music enable immediate card draw and slideshow experience without uploading.
- **FR-7**: All pages with potentially empty content show a styled empty state with guidance and a call-to-action.

### Non-Functional Requirements

- **NFR-1**: Card draw ceremony completes within 2.5 seconds from click to photo visible (excluding network latency).
- **NFR-2**: All animations target 60 fps on mid-range devices (e.g., 4-year-old smartphone or entry-level laptop).
- **NFR-3**: Sound effects respect `prefers-reduced-motion` media query (disabled when active) and can be muted via a global volume setting stored in localStorage.
- **NFR-4**: Demo data adds ≤ 5 MB to the Docker image.
- **NFR-5**: All new UI strings are available in zh-CN and en, following the existing vue-i18n setup from v1.1.
- **NFR-6**: GSAP Timeline instances are cleaned up on component unmount to prevent memory leaks.

## Design

### 1. Card Draw Ceremony

This is the centerpiece of v1.2. The current implementation uses 4 disconnected GSAP tweens totaling ~1.2 seconds. The rework replaces these with a single orchestrated GSAP Timeline that creates a cohesive visual journey.

#### 1.1 State Machine

```
IDLE → DRAWING → EMERGING → REVEALING → DISPLAYING → IDLE
                                                ↑
                                    (auto-transition after delay)
```

| State | Description |
|-------|-------------|
| `IDLE` | Deck shows gentle `glowBreath` animation. Background is normal. Ready to draw. |
| `DRAWING` | User clicked deck. Deck press feedback plays. Background begins to dim. API request fires. |
| `EMERGING` | Card flies up from deck position with slight rotation. Previous card (if any) slides to pile in parallel. |
| `REVEALING` | Card performs 3D Y-axis flip. Photo appears on the back face. Golden glow burst on completion. |
| `DISPLAYING` | Photo is fully visible. If anniversary: memory text fades in below card. After ~1.5 s of no interaction, glow settles to subtle steady state. |

#### 1.2 Animation Timeline

```
Time (s): 0.0     0.3       0.8       1.4        1.8       ~2.2
           |──────|─────────|─────────|──────────|─────────|
           DRAWING EMERGING  REVEALING DISPLAYING (settle)
           │       │         │         │
           │       │         │         └─ Memory text fadeIn (0.4s)
           │       │         └─ 3D flip rotateY 0→180° (0.6s)
           │       └─ Card flies up from deck (0.5s)
           └─ Deck press + background dim (0.3s)

Parallel: Previous card → pile (0.35s, starts at 0.3)
Sound:    shuffle(0.0)  whoosh(0.3)  flip(0.8+0.25)  chime(1.4)
```

Total ceremony: ~2.2 s (within the 2.5 s NFR budget).

#### 1.3 Background Atmosphere

The draw area (the `rounded-2xl` container in `HomePage.vue`) shifts atmosphere during the ceremony:

| Phase | Effect |
|-------|--------|
| IDLE | Normal `bg-ts-panel/70`, subtle `particleDrift` on 4–6 small decorative dot elements inside the draw area |
| DRAWING → REVEALING | Container background transitions to a slightly warmer, darker tone (`bg-ts-panel`). Subtle radial vignette appears at edges. |
| DISPLAYING | Soft amber glow radiates from behind the revealed card (CSS `box-shadow` with `--ts-glow-accent`). Vignette fades. |
| Return to IDLE | Glow dims over 1 s, background returns to normal. |

Implementation: CSS class toggling driven by the ceremony state, with `transition` for smooth interpolation. The ambient effects (particle drift, vignette) are lightweight CSS/GSAP overlays — no canvas rendering.

#### 1.4 3D Card Flip

The flip is the ceremony's dramatic peak.

**Structure:**

```html
<div class="card-perspective"> <!-- perspective: 1000px -->
  <div class="card-inner">    <!-- transform-style: preserve-3d; rotateY transition -->
    <div class="card-front">  <!-- Card back design: dark panel + TimeSand icon + pattern -->
      <!-- backface-visibility: hidden -->
    </div>
    <div class="card-back">   <!-- Photo image -->
      <!-- backface-visibility: hidden; rotateY: 180deg (pre-rotated) -->
    </div>
  </div>
</div>
```

**Animation sequence:**

1. Card starts showing `card-front` (face down) at `rotateY(0)`
2. GSAP animates `rotateY` from `0 → 180` over 0.6 s, easing `power2.inOut`
3. At the 90° midpoint (edge-on), the `cardFlip` sound fires
4. As the card passes 90°, `card-back` becomes visible (CSS `backface-visibility`)
5. At 180°, a brief golden glow burst pulses outward (scale 1 → 1.15 → 1, 0.3 s)

**Card front design:**

A stylized card back with:

- Dark background matching `--ts-panel`
- TimeSand hourglass icon (SVG) centered, rendered in `--ts-accent` with low opacity
- Subtle decorative border pattern using `--ts-border`
- Rounded corners matching `--ts-radius-lg`

#### 1.5 Previous Card to Pile

When a new card is drawn and the active card already exists:

- Active card shrinks (`scale: 0.55`), translates toward the pile position, and rotates slightly (`rotate: 8deg`)
- Opacity fades to 0.7
- Duration: 0.35 s, easing: `power2.inOut`
- Runs in parallel with the EMERGING stage of the new card (starts at t = 0.3)
- This replaces the current `animatePreviousCardToPile` with the same core idea but tighter timing

#### 1.6 Scatter View Enhancements

The existing scatter overlay (full-screen view of all drawn cards) gains:

- **Entrance**: `staggerIn` from motion presets (cards fade in one by one, 0.08 s stagger)
- **Card hover**: 3D tilt effect — `rotateX` and `rotateY` shift slightly based on mouse position relative to card center (±5°). Powered by GSAP, throttled to ≤60 fps.
- **Card hover lift**: `scale(1.08)` + `translateZ(20px)` + enhanced shadow
- **Background blur**: Increase backdrop `blur` from current none to `--ts-blur-sm` (4 px)

#### 1.7 Undo Behavior

- Simplified reverse: card slides from center back to pile position (no reverse 3D flip)
- Previous pile card slides back to center and fades in
- Duration: 0.4 s total
- No sound effects on undo (intentionally silent to feel like "rewinding")

### 2. Sound Effects System

#### 2.1 Architecture

```
frontend/
├── src/
│   ├── composables/
│   │   └── useSoundEffects.ts     ← singleton composable
│   └── assets/
│       └── sounds/
│           ├── ceremony.webm      ← card draw sounds (sprite)
│           ├── ceremony.mp3       ← fallback
│           ├── ui.webm            ← UI interaction sounds (sprite)
│           └── ui.mp3             ← fallback
```

**Library**: [howler.js](https://howlerjs.com/) — mature, lightweight (7 KB gzipped), built-in sprite support, WebAudio + HTML5 Audio fallback, mobile-friendly.

#### 2.2 Sound Inventory

**Ceremony sprite** (`ceremony.webm`):

| ID | Description | Approx. Duration | Trigger |
|----|-------------|-------------------|---------|
| `shuffle` | Soft card shuffle / tap | 0.3 s | DRAWING stage start |
| `whoosh` | Card flying out of deck | 0.35 s | EMERGING stage start |
| `flip` | Card flip / turning | 0.3 s | REVEALING stage at 90° midpoint |
| `reveal` | Shimmer chime on photo reveal | 0.8 s | REVEALING stage completion |
| `memory` | Gentle warm tone for anniversary | 1.0 s | DISPLAYING stage, only when `weight_reason` is non-null |
| `slideSwish` | Soft transition swoosh | 0.4 s | Slideshow photo change |

**UI sprite** (`ui.webm`):

| ID | Description | Approx. Duration | Trigger |
|----|-------------|-------------------|---------|
| `click` | Subtle button press | 0.08 s | Primary action buttons |
| `success` | Positive completion tone | 0.3 s | Upload complete, action success |

#### 2.3 Composable API

```ts
interface SoundEffects {
  play: (id: SoundId) => void
  setVolume: (volume: number) => void  // 0–1
  getVolume: () => number
  mute: () => void
  unmute: () => void
  isMuted: Ref<boolean>
}

type SoundId =
  | 'shuffle' | 'whoosh' | 'flip' | 'reveal' | 'memory'
  | 'slideSwish' | 'click' | 'success'
```

- `useSoundEffects()` returns a singleton (same Howl instances across all callers)
- Sprites are lazily loaded on first `play()` call, not on import
- Volume persisted in `localStorage` key `ts-sfx-volume` (default: `0.6`)
- Mute state persisted in `localStorage` key `ts-sfx-muted` (default: `false`)

#### 2.4 Mobile Audio Unlock

Browsers require a user gesture before playing audio. The composable:

1. Registers a one-time `click` / `touchstart` listener on `document`
2. On first interaction, calls `Howler.ctx.resume()` to unlock the AudioContext
3. Removes the listener after successful unlock
4. Subsequent `play()` calls work normally

#### 2.5 Accessibility

- When `prefers-reduced-motion` is active: all sound effects are disabled by default (user can override by explicitly unmuting)
- Sound effects volume is independent of the music player volume
- Future (v1.3 Settings): UI controls for SFX volume and mute toggle

#### 2.6 Audio Format

- Primary: WebM (Opus codec) — best compression and quality for web audio
- Fallback: MP3 for browsers without WebM Opus support (older Safari)
- Each sprite file combines all sounds in that category, played via time offsets
- Howler auto-selects format based on browser capability

#### 2.7 Audio Asset Sourcing

Sound effects will be sourced from royalty-free / CC0 libraries (e.g., freesound.org, pixabay.com/sound-effects) or synthesized with tools like jsfxr / ChipTone. All sounds must be:

- Royalty-free or CC0 licensed
- Soft and ambient in character (matching the warm, contemplative mood)
- Short (all under 1 s except `memory` at 1 s and `reveal` at 0.8 s)

### 3. Memory Copywriting

#### 3.1 Current Backend Behavior

The draw service (`draw_service.py`) already calculates time-based weights and returns a `weight_reason` string:

- `"{n}_years_ago_today"` — photo taken on the exact same date, n years ago
- `"{n}_years_ago_nearby"` — photo taken within 1–3 days of today's date, n years ago
- `null` — no temporal significance

No backend changes are needed. The frontend transforms these into warm human-readable text.

#### 3.2 Copywriting Table

| `weight_reason` | zh-CN | en |
|-----------------|-------|-----|
| `1_years_ago_today` | 去年的今天 | One year ago today |
| `{n}_years_ago_today` (n ≥ 2) | {n} 年前的今天 | {n} years ago today |
| `1_years_ago_nearby` | 大约去年的这几天 | Around this time last year |
| `{n}_years_ago_nearby` (n ≥ 2) | 大约 {n} 年前的这几天 | Around this time {n} years ago |
| `null` | *(no display)* | *(no display)* |

Special case: `n = 1` uses dedicated phrasing ("去年" / "last year") instead of "1 年前" / "1 years ago" for natural language quality.

#### 3.3 UI Treatment

- Memory text appears below the revealed card during the DISPLAYING stage
- Animation: `fadeIn` from motion presets (y: +12 px, duration: 0.4 s)
- Color: `--ts-accent` at 85% opacity
- Font: `--ts-text-lg` (18 px), `--ts-font-medium` (500)
- Decorative element: a small calendar icon (inline SVG, 16 px) before the text, rendered in `--ts-accent` matching the text color
- When no `weight_reason`: the text area is simply not rendered (no empty space)

#### 3.4 Implementation

- New utility: `parseWeightReason(reason: string | null) → { years: number, type: 'today' | 'nearby' } | null`
- i18n keys under `draw.memory` namespace:
  - `draw.memory.yearsAgoToday`: `"{n} 年前的今天"` / `"{n} years ago today"`
  - `draw.memory.yearsAgoNearby`: `"大约 {n} 年前的这几天"` / `"Around this time {n} years ago"`
  - `draw.memory.lastYearToday`: `"去年的今天"` / `"One year ago today"`
  - `draw.memory.lastYearNearby`: `"大约去年的这几天"` / `"Around this time last year"`
- Composable: `useMemoryText(weightReason: Ref<string | null>) → Ref<string | null>` — reactive, locale-aware

### 4. Slideshow Transition System

#### 4.1 Current State

The slideshow uses CSS-only transitions:

- Fade: Vue `<Transition>` with 0.8 s opacity ease
- Ken Burns: CSS `@keyframes` that scales 1 → 1.1 and translates 1.5% in a fixed direction

Both are functional but limited — single direction Ken Burns feels repetitive, and there's no variety in transition style.

#### 4.2 Enhanced Transitions

| Transition | Description | Duration | Implementation |
|-----------|-------------|----------|----------------|
| `crossfade` | Simple crossfade between photos | 0.8 s | GSAP `fromTo` on opacity; outgoing fades out while incoming fades in simultaneously (overlap, not sequential) |
| `kenBurns` | Slow zoom + pan with **randomized** start/end | Full interval | GSAP animation with randomly chosen variant per photo (see below) |
| `fadeThroughBlack` | Current photo fades to black, then next fades in | 1.4 s (0.7 + 0.7) | GSAP sequence: fade out → brief black hold → fade in |
| `zoomReveal` | Current photo zooms in while fading, next fades in at normal scale | 1.0 s | GSAP: outgoing scales 1 → 1.3 + opacity → 0; incoming opacity 0 → 1 |

#### 4.3 Ken Burns Variants

Each photo randomly selects one of these movement patterns:

| Variant | Start | End |
|---------|-------|-----|
| A | `scale(1.0) translate(0, 0)` | `scale(1.12) translate(2%, -1.5%)` |
| B | `scale(1.12) translate(-2%, 1%)` | `scale(1.0) translate(0, 0)` |
| C | `scale(1.0) translate(-1%, -1%)` | `scale(1.08) translate(1%, 1%)` |
| D | `scale(1.08) translate(1.5%, 0)` | `scale(1.0) translate(-1%, 0.5%)` |

The variant is chosen randomly per photo using a simple `Math.random()` selection — not seeded, so the same photo gets different movement on different views.

#### 4.4 Transition Selection

- Default transition: `kenBurns`
- Users can cycle through transitions via a new button in the slideshow control bar (cycles: kenBurns → crossfade → fadeThroughBlack → zoomReveal → kenBurns)
- Selected transition is persisted in `localStorage` key `ts-slideshow-transition`
- UI: icon button in the control bar showing the current transition type name, click to cycle

#### 4.5 GSAP Migration

The slideshow currently uses Vue `<Transition>` and CSS keyframes. The rework:

- Replaces the Vue `<Transition>` wrapper with a manual GSAP-driven swap
- Uses two `<img>` elements (current + next) stacked absolutely, GSAP animates their transitions
- This enables overlapping transitions (crossfade) that Vue's `<Transition mode="out-in">` cannot do
- Ken Burns animation runs on the visible `<img>` using GSAP instead of CSS keyframes (enables pause/resume and variant randomization)

#### 4.6 Sound Integration

- `slideSwish` sound plays at the start of each transition
- During transitions, music volume ducks to 70% and restores after (using `useMusicPlayer().setVolume()` with smooth GSAP tween on volume value)
- Music duck is optional: only if music is currently playing

### 5. First-Time Experience

#### 5.1 Trigger Condition

The onboarding overlay appears when ALL of these are true:

- `localStorage` key `ts-onboarding-complete` is NOT `'true'`
- The user navigates to the Card Draw page (home page)

It does NOT check whether photos exist — the demo data ensures there's always something to show during onboarding.

#### 5.2 Guided Steps

| Step | Title (zh-CN) | Title (en) | Content | Visual |
|------|---------------|------------|---------|--------|
| 1 | 欢迎来到 TimeSand | Welcome to TimeSand | 这里是你的私人时光沙漏。通过抽取回忆卡牌，重新发现那些被遗忘的美好瞬间。 | TimeSand logo with gentle `scaleIn` animation. Background dim overlay. |
| 2 | 抽一张回忆 | Draw a Memory | 点击牌堆，随机抽取一张照片。如果恰好是多年前的今天拍的，会有特别的惊喜。 | Spotlight / highlight ring on the card deck area. Arrow pointing to deck. |
| 3 | 沉浸式播放 | Immersive Playback | 打开幻灯片，配合音乐，沉浸式浏览你的照片集。 | Spotlight on the slideshow navigation item in sidebar. |
| 4 | 开始你的旅程 | Begin Your Journey | 上传你的照片和音乐，让 TimeSand 帮你重新发现回忆。 | Fade out overlay. Confetti-like particle effect as "completion celebration". |

#### 5.3 UI Design

- **Overlay**: Full-screen semi-transparent backdrop (`bg-black/60`), z-index above everything (`--ts-z-modal`)
- **Content card**: Centered panel (max-width 480 px) with `bg-ts-panel`, `rounded-ts-lg`, `shadow-ts-md`
- **Progress**: Dot indicators at the bottom (current dot is `--ts-accent`, others are `--ts-muted`)
- **Navigation**: "Next" button (TsButton primary), "Skip" text link
- **Step transition**: Each step `fadeOut` → next step `fadeIn`, 0.3 s each
- **Spotlight**: For steps 2–3, a CSS mask or overlay cutout highlights the target area

#### 5.4 Dismiss and Persistence

- "Skip" link and "Done" button (on last step) both set `ts-onboarding-complete = 'true'` in localStorage
- Once dismissed, never shows again (unless user manually clears localStorage)
- No "replay onboarding" option in v1.2 (can be added in v1.3 Settings)

### 6. Demo Data

#### 6.1 Purpose

Allow first-time users to immediately experience card draw and slideshow without uploading their own content. Demo data makes onboarding tangible — step 2 ("Draw a Memory") actually draws a card.

#### 6.2 Content

| Type | Count | Specification |
|------|-------|---------------|
| Photos | 8 landscape / nature photos | JPEG, max 1920 px longest side, ≤ 400 KB each. Total ≤ 3 MB. |
| Music | 1 ambient / lo-fi track (~90 s) | WebM Opus or MP3. ≤ 1.5 MB. Calm, warm atmosphere. |

**Photo metadata requirements:**

- Fake `captured_at` dates spanning 1–5 years ago
- At least 2 photos set to "today's date, N years ago" to guarantee the anniversary feature triggers during onboarding
- Dates are relative to the seed date — the backend seed script calculates absolute dates based on the current date at first launch
- No GPS data (privacy-neutral demo content)

**Sourcing:**

- Photos: Public domain / CC0 from Unsplash or Pexels (attribution not required but recorded in a `CREDITS.md` file inside the demo data directory)
- Music: CC0 from Free Music Archive or similar. Alternatively, a simple ambient loop can be generated with tools like Tone.js or sourced from freesound.org.

#### 6.3 Seeding Mechanism

**Backend:**

- New module: `backend/app/services/demo_service.py`
- Demo assets bundled in: `backend/app/demo_data/` (photos + music files + metadata JSON)
- Seed function: `seed_demo_data(session: Session)` — checks if demo data already exists, if not, copies files to data volume and creates database records
- Called on application startup (`main.py` lifespan) only when the database has zero photos
- Demo records marked with a flag: add `is_demo: bool = False` field to Photo and Music models
- Demo album named "TimeSand Demo" / "TimeSand 示例" (locale-aware from i18n? No — backend is locale-agnostic, use English name)
- Demo playlist named "TimeSand Demo"

**Cleanup:**

- API endpoint: `DELETE /api/demo` — removes all demo photos, music, album, and playlist (records + files)
- Frontend: a "Clear demo data" button shown in the empty state or Settings area (v1.3) when demo data exists
- The `is_demo` flag allows targeted cleanup without affecting user content

#### 6.4 Docker Impact

- Demo assets (~4.5 MB) are included in the Docker image at build time
- On first launch, files are copied from the image to the data volume
- After seeding, the bundled files in the image are not accessed again
- Image size increase: ≤ 5 MB (within NFR-4 budget)

### 7. Empty State Design

#### 7.1 Component

A reusable `TsEmptyState` component for consistent empty state presentation:

**Props:**

```ts
interface TsEmptyStateProps {
  icon: string           // Icon name or SVG path
  title: string          // Main message (i18n key or string)
  description?: string   // Secondary message
  actionLabel?: string   // CTA button text
  actionTo?: string      // Vue Router path for CTA
}
```

**Visual design:**

- Centered vertically and horizontally in the container
- Icon: 48 px, `--ts-muted` color, with subtle `fadeIn` entrance
- Title: `--ts-text-xl` (20 px), `--ts-text` color
- Description: `--ts-text-sm` (14 px), `--ts-muted` color
- CTA button: `TsButton` primary variant (from v1.1 component library)
- Entrance animation: `fadeIn` from motion presets on mount
- Overall feel: gentle, inviting, not a dead end

#### 7.2 Page Empty States

| Page | Condition | Icon | Title (zh-CN) | Title (en) | CTA |
|------|-----------|------|---------------|------------|-----|
| Card Draw | 0 photos (and no demo data) | 🎴 (cards icon) | 还没有照片 | No photos yet | 上传照片 → `/upload` |
| Albums | 0 albums | 📁 (folder icon) | 还没有相册 | No albums yet | 创建相册 → `/albums` (trigger create) |
| Music | 0 tracks | 🎵 (music icon) | 还没有音乐 | No music yet | 上传音乐 → `/music` |
| Slideshow | 0 photos when entering | 🖼️ (image icon) | 还没有照片 | No photos yet | 上传照片 → `/upload` |

Icons will be simple inline SVGs, not emoji — the emoji above are for spec readability. SVG style: 2 px stroke, no fill, `currentColor` for theming.

#### 7.3 Integration Notes

- Card Draw and Slideshow empty states are integrated as part of their respective ceremony/transition rework tasks (Tasks 4 and 5)
- Album and Music page empty states are applied in a standalone task (Task 3) since those pages are otherwise untouched in v1.2
- When demo data is seeded, Card Draw and Slideshow will never show empty state (demo ensures content exists). But the empty state still exists for the case where users delete demo data before uploading their own.

## Technical Notes

### Dependencies Added

| Package | Version | Purpose | Target |
|---------|---------|---------|--------|
| `howler` | ^2.2 | Sound effects playback with sprite support | Frontend |
| `@types/howler` | ^2.2 | TypeScript type definitions | Frontend (dev) |

No backend dependencies added.

### Existing Code Changes

| File | Change Type | Scope |
|------|-------------|-------|
| `useCardDraw.ts` | **Rewrite** | Complete replacement — new GSAP Timeline ceremony, state machine, sound triggers |
| `HomePage.vue` | **Major modification** | Ceremony container, atmosphere effects, memory text display, empty state |
| `CardDeck.vue` | **Modification** | Card front design, glowBreath idle animation |
| `DrawnCard.vue` | **Modification** | 3D flip structure (front/back faces), memory text slot |
| `CardPile.vue` | **Minor modification** | Animation timing alignment |
| `CardScatter.vue` | **Modification** | staggerIn entrance, 3D tilt hover, backdrop blur |
| `SlideshowPlayer.vue` | **Rewrite** | GSAP transition system replaces CSS transitions |
| `useSlideshow.ts` | **Modification** | Transition mode state, GSAP integration |
| `SlideshowPage.vue` | **Modification** | Transition selector UI, empty state |
| `Photo` model | **Minor addition** | `is_demo` boolean field |
| `Music` model | **Minor addition** | `is_demo` boolean field |

### Database Schema Changes

Two new columns:

```sql
ALTER TABLE photo ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE music ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE;
```

These are additive, non-breaking changes. No data migration needed for existing rows (default `FALSE`).

### Performance Considerations

- **3D transforms**: Use `will-change: transform` on the card flip container and `transform-style: preserve-3d` for GPU compositing. Remove `will-change` after animation completes to free GPU memory.
- **Particle drift**: Limit to ≤ 8 decorative particles. Use CSS transforms only (no layout-triggering properties).
- **Sound sprite preloading**: Sprites are loaded lazily on first `play()`, not at page load. The ceremony sprite (~50 KB WebM) loads in parallel with the first draw API call.
- **Slideshow dual `<img>`**: Only two `<img>` elements exist at any time. The "outgoing" image is removed from DOM after the transition completes.
- **`prefers-reduced-motion`**: When active, skip all animations — card draw shows the photo immediately (no ceremony), slideshow uses instant cut (no transition), sounds are disabled.

### Testing Strategy

| Feature | Unit Tests | Visual Verification |
|---------|-----------|-------------------|
| Sound effects composable | API contract (play, volume, mute), sprite loading, mobile unlock mock | Manual: sound plays at correct moments during ceremony |
| Card draw ceremony | State machine transitions, Timeline setup, error handling (API fail mid-ceremony) | Chrome DevTools MCP: ceremony looks right, timing feels good |
| Memory text | `parseWeightReason` for all patterns, i18n output in both locales | Manual: text appears below card with correct phrasing |
| Slideshow transitions | Transition mode switching, localStorage persistence, all 4 types render | Chrome DevTools MCP: transitions look smooth |
| Onboarding | Step navigation, localStorage persistence, skip/done behavior | Chrome DevTools MCP: overlay renders correctly, steps flow |
| Demo data | Seed script creates correct records, cleanup removes all demo data, `is_demo` flag | Manual: fresh Docker launch shows demo content |
| Empty states | Component renders with all prop combinations, CTA routing | Chrome DevTools MCP: empty states show on relevant pages |

## Out of Scope

- Refactoring existing pages to use new UI components beyond Card Draw and Slideshow (→ 1.3 Full Page Upgrade)
- Settings page with sound / transition / language controls (→ 1.3)
- Mobile responsive layout and touch gesture optimization (→ 1.4)
- Music-scene automatic association (→ Phase 2)
- Card rarity / gamification mechanics (→ Phase 3)
- Video support in card draw or slideshow (→ Phase 2)
- Slideshow annotation or caption overlay (→ Phase 2)
- Replay onboarding option (→ 1.3 Settings)
