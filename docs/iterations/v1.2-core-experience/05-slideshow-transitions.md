---
type: task
iteration: "1.2"
status: done
branch: "feat/slideshow-transitions"
pr:
completed: 2026-04-26
tags:
  - core-experience
  - slideshow
  - phase-2
---

# Task 5: Slideshow Transitions

- **Branch**: `feat/slideshow-transitions`
- **Scope**: Replace CSS-only slideshow transitions with a GSAP-driven system supporting 4 transition types (crossfade, kenBurns, fadeThroughBlack, zoomReveal). Implement dual `<img>` stacking, randomized Ken Burns variants, transition mode cycling UI, sound and music integration.
- **Dependencies**: Task 1 (Sound Effects)

## Files

### Frontend

- `frontend/src/components/SlideshowPlayer.vue` (rewrite) — GSAP transition engine, dual `<img>` stacking
- `frontend/src/composables/useSlideshow.ts` (modify) — add transition mode state + GSAP integration
- `frontend/src/pages/SlideshowPage.vue` (modify) — transition selector button, empty state
- `frontend/src/i18n/locales/zh-CN.ts` (modify) — add `slideshow.transition` keys
- `frontend/src/i18n/locales/en.ts` (modify) — add `slideshow.transition` keys

## Design Reference

Full transition design: [[spec#4. Slideshow Transition System]]

### Transition Types

| Type | Duration | Description |
|------|----------|-------------|
| `crossfade` | 0.8 s | Outgoing fades out while incoming fades in simultaneously (overlap) |
| `kenBurns` | Full interval | Slow zoom+pan with 4 randomized variants |
| `fadeThroughBlack` | 1.4 s (0.7+0.7) | Fade out → brief black → fade in |
| `zoomReveal` | 1.0 s | Outgoing scales 1→1.3 + fades; incoming fades in at normal scale |

### Ken Burns Variants

| Variant | Start | End |
|---------|-------|-----|
| A | `scale(1.0) translate(0, 0)` | `scale(1.12) translate(2%, -1.5%)` |
| B | `scale(1.12) translate(-2%, 1%)` | `scale(1.0) translate(0, 0)` |
| C | `scale(1.0) translate(-1%, -1%)` | `scale(1.08) translate(1%, 1%)` |
| D | `scale(1.08) translate(1.5%, 0)` | `scale(1.0) translate(-1%, 0.5%)` |

### Dual `<img>` Architecture

Two `<img>` elements stacked absolutely. On transition:
1. Current photo is the "outgoing" img
2. New photo loads in the "incoming" img
3. GSAP animates both simultaneously
4. After transition completes, outgoing img is reassigned to the new photo (becomes the "current")

## Acceptance Criteria

- [ ] Vue `<Transition>` and CSS keyframes removed from `SlideshowPlayer.vue`
- [ ] Dual `<img>` stacking: two images, GSAP-driven transitions
- [ ] All 4 transition types implemented: crossfade, kenBurns, fadeThroughBlack, zoomReveal
- [ ] Ken Burns: 4 variants randomly selected per photo via `Math.random()`
- [ ] Transition type cycles via button in control bar (kenBurns → crossfade → fadeThroughBlack → zoomReveal → kenBurns)
- [ ] Selected transition persisted in `localStorage` key `ts-slideshow-transition` (default: `kenBurns`)
- [ ] `slideSwish` sound plays at start of each transition via `useSoundEffects`
- [ ] Music volume ducks to 70% during transitions (if music is playing), restores after
- [ ] Slideshow empty state shown when 0 photos (using `TsEmptyState`)
- [ ] `prefers-reduced-motion`: instant cut (no transition animation), no sounds
- [ ] GSAP tweens killed on component unmount
- [ ] Touch swipe still works for manual prev/next
- [ ] Keyboard controls still work (Space, Arrow, Escape)
- [ ] `bun run type-check` passes
- [ ] `bun run lint:fix` passes

## Implementation Steps

- [ ] **Step 1: Add i18n keys**

Add to the `slideshow` section in `frontend/src/i18n/locales/zh-CN.ts`:

```ts
transition: {
  label: '转场',
  crossfade: '淡入淡出',
  kenBurns: 'Ken Burns',
  fadeThroughBlack: '黑场过渡',
  zoomReveal: '缩放揭示',
},
```

Add matching keys to `frontend/src/i18n/locales/en.ts`:

```ts
transition: {
  label: 'Transition',
  crossfade: 'Crossfade',
  kenBurns: 'Ken Burns',
  fadeThroughBlack: 'Fade through black',
  zoomReveal: 'Zoom reveal',
},
```

- [ ] **Step 2: Add transition mode state to `useSlideshow.ts`**

Modify `frontend/src/composables/useSlideshow.ts`:

1. Add `transitionMode` ref with localStorage persistence:

```ts
export type TransitionMode = 'kenBurns' | 'crossfade' | 'fadeThroughBlack' | 'zoomReveal'

const TRANSITION_ORDER: TransitionMode[] = ['kenBurns', 'crossfade', 'fadeThroughBlack', 'zoomReveal']
const TRANSITION_KEY = 'ts-slideshow-transition'

function readTransitionMode(): TransitionMode {
  const stored = localStorage.getItem(TRANSITION_KEY)
  if (stored && TRANSITION_ORDER.includes(stored as TransitionMode)) {
    return stored as TransitionMode
  }
  return 'kenBurns'
}

// Inside useSlideshow:
const transitionMode = ref<TransitionMode>(readTransitionMode())

function cycleTransitionMode(): void {
  const currentIdx = TRANSITION_ORDER.indexOf(transitionMode.value)
  const nextIdx = (currentIdx + 1) % TRANSITION_ORDER.length
  transitionMode.value = TRANSITION_ORDER[nextIdx]
  localStorage.setItem(TRANSITION_KEY, transitionMode.value)
}
```

2. Export `transitionMode` and `cycleTransitionMode` from the composable return.

- [ ] **Step 3: Rewrite `SlideshowPlayer.vue` with dual `<img>` and GSAP transitions**

Replace the template and script of `frontend/src/components/SlideshowPlayer.vue`:

**Template structure:**

```vue
<template>
  <section class="relative h-full w-full overflow-hidden bg-[#0a0a0a]"
    @mousemove="emitActivity"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <!-- Dual image stack -->
    <figure class="absolute inset-0">
      <img
        ref="imgARef"
        class="absolute inset-0 h-full w-full object-contain"
        draggable="false"
      >
      <img
        ref="imgBRef"
        class="absolute inset-0 h-full w-full object-contain"
        draggable="false"
      >
    </figure>

    <!-- Controls (keep existing structure, add transition button) -->
    <div class="..." :class="controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'">
      <!-- ... existing controls ... -->
      <!-- Add transition cycle button in control bar: -->
      <button type="button" class="..." @click="$emit('cycleTransition')">
        {{ transitionLabel }}
      </button>
    </div>
  </section>
</template>
```

**Script: Transition engine**

The component receives `transitionMode` as a prop and implements the 4 transition types:

```ts
import { gsap } from 'gsap'
import { useSoundEffects } from '../composables/useSoundEffects'
import { useMusicPlayer } from '../composables/useMusicPlayer'

// Track which img is "current" (A or B)
const activeImg = ref<'A' | 'B'>('A')
const imgARef = ref<HTMLImageElement | null>(null)
const imgBRef = ref<HTMLImageElement | null>(null)
let transitionTween: gsap.core.Tween | gsap.core.Timeline | null = null
let kenBurnsTween: gsap.core.Tween | null = null

function getCurrentImg(): HTMLImageElement | null {
  return activeImg.value === 'A' ? imgARef.value : imgBRef.value
}
function getNextImg(): HTMLImageElement | null {
  return activeImg.value === 'A' ? imgBRef.value : imgARef.value
}

function performTransition(newSrc: string): void {
  const current = getCurrentImg()
  const next = getNextImg()
  if (!current || !next) return

  // Kill any running transition
  transitionTween?.kill()
  kenBurnsTween?.kill()

  // Load new image
  next.src = newSrc
  const sfx = useSoundEffects()
  sfx.play('slideSwish')

  // Music duck
  duckMusic()

  // Branch by transition mode
  switch (props.transitionMode) {
    case 'crossfade':
      transitionCrossfade(current, next)
      break
    case 'kenBurns':
      transitionKenBurns(current, next)
      break
    case 'fadeThroughBlack':
      transitionFadeThroughBlack(current, next)
      break
    case 'zoomReveal':
      transitionZoomReveal(current, next)
      break
  }

  activeImg.value = activeImg.value === 'A' ? 'B' : 'A'
}

function transitionCrossfade(current: HTMLElement, next: HTMLElement): void {
  gsap.set(next, { opacity: 0, zIndex: 1 })
  gsap.set(current, { zIndex: 0 })
  transitionTween = gsap.timeline()
    .to(current, { opacity: 0, duration: 0.8, ease: 'power1.inOut' }, 0)
    .to(next, { opacity: 1, duration: 0.8, ease: 'power1.inOut' }, 0)
    .call(() => unduckMusic())
}

// ... (kenBurns, fadeThroughBlack, zoomReveal implementations following spec §4.2-4.3)
```

- [ ] **Step 4: Implement Ken Burns with randomized variants**

```ts
const KEN_BURNS_VARIANTS = [
  { from: { scale: 1.0, x: '0%', y: '0%' }, to: { scale: 1.12, x: '2%', y: '-1.5%' } },
  { from: { scale: 1.12, x: '-2%', y: '1%' }, to: { scale: 1.0, x: '0%', y: '0%' } },
  { from: { scale: 1.0, x: '-1%', y: '-1%' }, to: { scale: 1.08, x: '1%', y: '1%' } },
  { from: { scale: 1.08, x: '1.5%', y: '0%' }, to: { scale: 1.0, x: '-1%', y: '0.5%' } },
]

function transitionKenBurns(current: HTMLElement, next: HTMLElement): void {
  const variant = KEN_BURNS_VARIANTS[Math.floor(Math.random() * KEN_BURNS_VARIANTS.length)]

  gsap.set(next, { opacity: 0, zIndex: 1, ...variant.from })
  gsap.set(current, { zIndex: 0 })

  transitionTween = gsap.timeline()
    .to(current, { opacity: 0, duration: 0.8, ease: 'power1.inOut' }, 0)
    .to(next, { opacity: 1, duration: 0.8, ease: 'power1.inOut' }, 0)
    .call(() => unduckMusic())

  // Ken Burns movement runs for the full interval duration
  kenBurnsTween = gsap.fromTo(next, variant.from, {
    ...variant.to,
    duration: props.intervalSeconds,
    ease: 'none',
  })
}
```

- [ ] **Step 5: Implement fadeThroughBlack and zoomReveal**

```ts
function transitionFadeThroughBlack(current: HTMLElement, next: HTMLElement): void {
  gsap.set(next, { opacity: 0, zIndex: 1 })
  transitionTween = gsap.timeline()
    .to(current, { opacity: 0, duration: 0.7, ease: 'power1.in' })
    .set(current, { zIndex: 0 })
    .to(next, { opacity: 1, duration: 0.7, ease: 'power1.out' })
    .call(() => unduckMusic())
}

function transitionZoomReveal(current: HTMLElement, next: HTMLElement): void {
  gsap.set(next, { opacity: 0, scale: 1, zIndex: 1 })
  transitionTween = gsap.timeline()
    .to(current, { scale: 1.3, opacity: 0, duration: 1.0, ease: 'power2.in' }, 0)
    .to(next, { opacity: 1, duration: 1.0, ease: 'power2.out' }, 0)
    .call(() => unduckMusic())
}
```

- [ ] **Step 6: Implement music volume duck**

```ts
function duckMusic(): void {
  const player = useMusicPlayer()
  if (!player.isPlaying.value) return
  const currentVol = player.volume.value
  gsap.to(player, { volume: currentVol * 0.7, duration: 0.3 })
}

function unduckMusic(): void {
  const player = useMusicPlayer()
  if (!player.isPlaying.value) return
  // Restore to the user's set volume
  gsap.to(player, { volume: player.volume.value, duration: 0.3 })
}
```

Note: The music duck implementation needs careful handling since `useMusicPlayer().volume` is a ref. The implementing agent should use `player.setVolume()` with GSAP's `onUpdate` callback to smoothly tween the volume value.

- [ ] **Step 7: Add transition cycle button to `SlideshowPage.vue`**

In `frontend/src/pages/SlideshowPage.vue`:

1. Import `TransitionMode` type from `useSlideshow`
2. Pass `transitionMode` and `cycleTransitionMode` to `SlideshowPlayer`
3. Add empty state for 0 photos:

```vue
<TsEmptyState
  v-if="photos.length === 0"
  :title="$t('empty.slideshow.title')"
  :description="$t('empty.slideshow.description')"
  :action-label="$t('empty.slideshow.action')"
  action-to="/upload"
/>
```

- [ ] **Step 8: Handle `prefers-reduced-motion`**

When `prefers-reduced-motion` is active:
- All transitions become instant cuts (no GSAP animation)
- Ken Burns movement is disabled
- No sound effects
- Implementation: check at the start of `performTransition` and do a simple `src` swap with no animation

- [ ] **Step 9: Cleanup on unmount**

Kill all GSAP tweens on component unmount:

```ts
onUnmounted(() => {
  transitionTween?.kill()
  kenBurnsTween?.kill()
})
```

- [ ] **Step 10: Verify type-check and lint**

```bash
cd frontend && bun run type-check && bun run lint:fix
```

- [ ] **Step 11: Visual verification with Chrome DevTools MCP**

Start dev server and verify in browser:

1. Default transition is Ken Burns with visible zoom+pan movement
2. Click transition button → cycles through all 4 types
3. Each transition type looks correct and smooth
4. Ken Burns direction changes randomly between photos
5. `slideSwish` sound plays on each transition
6. Music volume ducks during transition, restores after
7. Touch swipe and keyboard controls still work
8. Empty state shows when no photos
9. Selected transition persists across page reloads

- [ ] **Step 12: Commit**

```bash
git add frontend/src/components/SlideshowPlayer.vue frontend/src/composables/useSlideshow.ts frontend/src/pages/SlideshowPage.vue frontend/src/i18n/locales/zh-CN.ts frontend/src/i18n/locales/en.ts
git commit -m "$(cat <<'EOF'
feat(slideshow): GSAP transition system with 4 modes

Replace CSS transitions with dual-img GSAP engine. Supports crossfade,
Ken Burns (4 randomized variants), fade-through-black, and zoom reveal.
Transition cycling UI, sound integration, music volume duck.
EOF
)"
```

## Tests

### Frontend

- **Visual verification** (primary): use Chrome DevTools MCP to verify all 4 transition types, Ken Burns randomization, transition cycling, sound/music integration
- **Existing tests**: `bun run test` should still pass — existing `useSlideshow` tests cover auto-advance, play/pause, interval logic (unchanged)
