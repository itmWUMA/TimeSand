---
type: task
iteration: "1.2"
status: pending
branch: "feat/card-draw-ceremony"
pr:
completed:
tags:
  - core-experience
  - card-draw
  - phase-2
---

# Task 4: Card Draw Ceremony

- **Branch**: `feat/card-draw-ceremony`
- **Scope**: Rewrite the card draw composable with a state machine and single GSAP Timeline orchestration. Implement 3D card flip, background atmosphere shifts, memory text display, scatter view enhancements, and undo behavior. Integrate sound effects (Task 1) and memory text (Task 2).
- **Dependencies**: Task 1 (Sound Effects), Task 2 (Memory Copywriting)

## Files

### Frontend

- `frontend/src/composables/useCardDraw.ts` (rewrite) — state machine + GSAP Timeline ceremony
- `frontend/src/pages/HomePage.vue` (major modify) — atmosphere container, memory text, empty state, particle drift
- `frontend/src/components/draw/CardDeck.vue` (modify) — card front design, glowBreath idle animation
- `frontend/src/components/draw/DrawnCard.vue` (modify) — 3D flip structure (front/back faces)
- `frontend/src/components/draw/CardPile.vue` (minor modify) — animation timing alignment
- `frontend/src/components/draw/CardScatter.vue` (modify) — staggerIn entrance, 3D tilt hover, backdrop blur

## Design Reference

Full ceremony design: [[spec#1. Card Draw Ceremony]]

### State Machine

```
IDLE → DRAWING → EMERGING → REVEALING → DISPLAYING → IDLE
```

### Timeline (~2.2 s total)

```
Time (s): 0.0     0.3       0.8       1.4        1.8       ~2.2
           |──────|─────────|─────────|──────────|─────────|
           DRAWING EMERGING  REVEALING DISPLAYING (settle)
```

### Key Technical Details

- 3D flip: `perspective: 1000px`, `transform-style: preserve-3d`, `backface-visibility: hidden`, GSAP `rotateY` 0→180°
- Card front: dark panel + TimeSand hourglass SVG icon centered + decorative border
- Atmosphere: CSS class toggling on ceremony container driven by state, with CSS `transition` for interpolation
- Particle drift: 4–6 small dot elements with `particleDrift` from motion presets
- Memory text: `useMemoryText` composable output displayed below card during DISPLAYING state
- Sound triggers: `shuffle`(0.0), `whoosh`(0.3), `flip`(0.8+0.25), `reveal`(1.4), `memory`(1.4, only if weight_reason)
- `prefers-reduced-motion`: skip all animations, show photo immediately, no sounds

## Acceptance Criteria

- [ ] State machine follows IDLE→DRAWING→EMERGING→REVEALING→DISPLAYING→IDLE flow
- [ ] Single GSAP Timeline orchestrates the entire ceremony (~2.2 s)
- [ ] 3D card flip with `rotateY` 0→180°, card front visible before flip, photo visible after
- [ ] Card front shows dark panel with TimeSand hourglass SVG icon and decorative border
- [ ] Background atmosphere shifts during ceremony (dim→warm glow→settle)
- [ ] 4–6 particle drift elements visible during IDLE state
- [ ] Previous card animates to pile in parallel with new card emerging
- [ ] Memory text appears below card during DISPLAYING when `weight_reason` is non-null
- [ ] Memory text uses `useMemoryText` composable with calendar icon prefix
- [ ] Sound effects fire at correct timeline positions via `useSoundEffects`
- [ ] Scatter view: `staggerIn` entrance (0.08 s stagger), backdrop blur (`--ts-blur-sm`)
- [ ] Scatter card hover: 3D tilt (±5° rotateX/rotateY based on mouse position) + scale(1.08) lift
- [ ] Undo: simplified reverse (no reverse flip), 0.4 s, no sound
- [ ] `prefers-reduced-motion`: instant display, no ceremony, no sounds
- [ ] GSAP Timeline killed on component unmount
- [ ] Card Draw empty state shown when 0 photos (using `TsEmptyState` from Task 3)
- [ ] `bun run type-check` passes
- [ ] `bun run lint:fix` passes

## Implementation Steps

- [ ] **Step 1: Create the card front design in `DrawnCard.vue`**

Modify `frontend/src/components/draw/DrawnCard.vue` to implement 3D flip structure:

1. Wrap the existing card in a perspective container (`perspective: 1000px`)
2. Add an inner container with `transform-style: preserve-3d`
3. Create two faces:
   - **Front face** (`backface-visibility: hidden`): dark panel with hourglass SVG icon and decorative border
   - **Back face** (`backface-visibility: hidden`, `rotateY: 180deg`): the existing photo display
4. Expose a `data-card-inner` attribute on the inner container for GSAP targeting
5. Remove existing inline animation styles — animation will be driven by the ceremony Timeline

Card front design:
```html
<div class="card-front absolute inset-0 flex items-center justify-center rounded-ts-lg border border-ts-border bg-ts-panel [backface-visibility:hidden]">
  <!-- Hourglass SVG icon centered, 64px, --ts-accent at 30% opacity -->
  <svg class="h-16 w-16 text-ts-accent/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M6 2h12v5.5L13 12l5 4.5V22H6v-5.5L11 12 6 7.5V2z" />
  </svg>
</div>
```

- [ ] **Step 2: Add `glowBreath` idle animation to `CardDeck.vue`**

Modify `frontend/src/components/draw/CardDeck.vue`:

1. Import `glowBreath` from motion presets
2. On mount, apply `glowBreath` to the deck element
3. Kill the tween on unmount
4. When `disabled` prop is true (drawing in progress), pause the breath

```ts
import { onMounted, onUnmounted, watch } from 'vue'
import { glowBreath } from '../../composables/motion/transitions'

const deckRef = ref<HTMLElement | null>(null)
let breathTween: gsap.core.Tween | null = null

onMounted(() => {
  if (deckRef.value) {
    breathTween = glowBreath(deckRef.value)
  }
})

onUnmounted(() => {
  breathTween?.kill()
})

watch(() => props.disabled, (disabled) => {
  if (disabled) breathTween?.pause()
  else breathTween?.resume()
})
```

- [ ] **Step 3: Rewrite `useCardDraw.ts` with state machine and GSAP Timeline**

Replace the entire content of `frontend/src/composables/useCardDraw.ts`. Key structure:

```ts
import type { Ref } from 'vue'
import { gsap } from 'gsap'
import { isAxiosError } from 'axios'
import { computed, nextTick, ref } from 'vue'
import { drawPhoto, resetDrawSession } from '../services/draw'
import { useDrawStore } from '../stores/draw'
import { useSoundEffects } from './useSoundEffects'
import { DURATION, EASING } from './motion/presets'

type CeremonyState = 'IDLE' | 'DRAWING' | 'EMERGING' | 'REVEALING' | 'DISPLAYING'

export function useCardDraw() {
  const drawStore = useDrawStore()
  const sfx = useSoundEffects()

  const ceremonyState = ref<CeremonyState>('IDLE')
  const isDrawing = ref(false)
  const isScatterOpen = ref(false)
  const errorMessage = ref<string | null>(null)
  const lastWeightReason = ref<string | null>(null)

  let ceremonyTimeline: gsap.core.Timeline | null = null

  // ... (state computed properties same as current)

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function killCeremony(): void {
    if (ceremonyTimeline) {
      ceremonyTimeline.kill()
      ceremonyTimeline = null
    }
  }

  async function drawNextCard(): Promise<void> {
    if (isDrawing.value) return
    isDrawing.value = true
    errorMessage.value = null
    killCeremony()

    try {
      // 1. Fetch data
      const payload = await drawPhoto({
        album_id: drawStore.albumId,
        exclude_ids: [...drawStore.excludeIds],
      })

      const hadPreviousCard = !!drawStore.activeCard

      drawStore.addDrawnCard({
        photo: payload.photo,
        weightReason: payload.weight_reason,
      })
      lastWeightReason.value = payload.weight_reason

      await nextTick()

      // 2. Reduced motion → instant display
      if (prefersReducedMotion()) {
        ceremonyState.value = 'DISPLAYING'
        isDrawing.value = false
        return
      }

      // 3. Build GSAP Timeline
      ceremonyTimeline = gsap.timeline({
        onComplete: () => {
          ceremonyState.value = 'IDLE'
          isDrawing.value = false
        },
      })

      const deck = document.querySelector('[data-draw-deck]')
      const cardInner = document.querySelector('[data-card-inner]')
      const memoryText = document.querySelector('[data-memory-text]')

      // DRAWING stage (0.0 - 0.3s)
      ceremonyState.value = 'DRAWING'
      sfx.play('shuffle')
      ceremonyTimeline.to(deck, {
        scale: 0.94, y: -4, duration: 0.1, yoyo: true, repeat: 1, ease: 'power1.out',
      })

      // EMERGING stage (0.3 - 0.8s)
      ceremonyTimeline.call(() => { ceremonyState.value = 'EMERGING' })
      sfx.play('whoosh')
      // Previous card → pile (parallel)
      if (hadPreviousCard) {
        // animate previous card to pile at this position
      }
      // New card flies up
      ceremonyTimeline.fromTo(cardInner?.parentElement ?? {}, 
        { y: 80, opacity: 0, scale: 0.7 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: EASING.enter },
        0.3
      )

      // REVEALING stage (0.8 - 1.4s) — 3D flip
      ceremonyTimeline.call(() => { ceremonyState.value = 'REVEALING' })
      ceremonyTimeline.fromTo(cardInner ?? {},
        { rotateY: 0 },
        { rotateY: 180, duration: 0.6, ease: 'power2.inOut' },
        0.8
      )
      // Sound at 90° midpoint
      ceremonyTimeline.call(() => { sfx.play('flip') }, [], 1.05)
      // Golden glow burst at flip completion
      ceremonyTimeline.fromTo(cardInner?.parentElement ?? {},
        { scale: 1 },
        { scale: 1.15, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' },
        1.4
      )

      // DISPLAYING stage (1.4 - ~2.2s)
      ceremonyTimeline.call(() => {
        ceremonyState.value = 'DISPLAYING'
        sfx.play('reveal')
        if (payload.weight_reason) sfx.play('memory')
      }, [], 1.4)
      // Memory text fadeIn
      if (memoryText) {
        ceremonyTimeline.fromTo(memoryText,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.4, ease: EASING.enter },
          1.8
        )
      }
    }
    catch (error) {
      ceremonyState.value = 'IDLE'
      if (isAxiosError<{ detail?: string }>(error)) {
        errorMessage.value = error.response?.data?.detail ?? 'Draw failed'
      } else {
        errorMessage.value = 'Draw failed'
      }
      isDrawing.value = false
    }
  }

  // ... (openScatter, collectScatter, reshuffle, undoLastCard — adapted)

  return {
    ceremonyState,
    activeCard: computed(() => drawStore.activeCard),
    pileCards: computed(() => drawStore.pileCards),
    drawnCards: computed(() => drawStore.drawnCards),
    hasDrawnCards: computed(() => drawStore.drawnCards.length > 0),
    isDrawing,
    isScatterOpen,
    errorMessage,
    lastWeightReason,
    drawNextCard,
    openScatter,
    collectScatter,
    reshuffle,
    undoLastCard,
    killCeremony,
  }
}
```

The above is a structural guide. The implementing agent should flesh out the full Timeline with all parallel tracks, previous-card-to-pile animation, and scatter view functions.

- [ ] **Step 4: Update `HomePage.vue` — atmosphere and memory text**

Modify `frontend/src/pages/HomePage.vue`:

1. Import `useMemoryText` and `TsEmptyState`
2. Add atmosphere CSS classes driven by `ceremonyState`:
   - `ceremony-idle`: normal state, particle drift visible
   - `ceremony-active`: darker background, vignette edges
   - `ceremony-display`: amber glow behind card
3. Add 4–6 particle drift dot elements inside the draw area
4. Add memory text display below the drawn card:

```vue
<div
  v-if="memoryText"
  data-memory-text
  class="mt-3 flex items-center justify-center gap-1.5 text-lg font-medium text-ts-accent/85 opacity-0"
>
  <!-- Calendar icon SVG, 16px -->
  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
  <span>{{ memoryText }}</span>
</div>
```

5. Add Card Draw empty state (when no photos):

```vue
<TsEmptyState
  v-if="noPhotos"
  :title="$t('empty.photos.title')"
  :description="$t('empty.photos.description')"
  :action-label="$t('empty.photos.action')"
  action-to="/upload"
/>
```

6. Add atmosphere CSS:

```css
.ceremony-container {
  transition: background-color 0.5s ease, box-shadow 0.5s ease;
}
.ceremony-container.ceremony-active {
  background-color: var(--ts-panel);
  box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.3);
}
.ceremony-container.ceremony-display {
  box-shadow: 0 0 40px rgba(212, 168, 67, 0.2);
}
```

- [ ] **Step 5: Enhance `CardScatter.vue`**

Modify `frontend/src/components/draw/CardScatter.vue`:

1. Replace opacity fade entrance with `staggerIn` from motion presets (0.08 s stagger per card)
2. Add backdrop blur: `backdrop-blur-ts-sm` (4 px) on the overlay background
3. Add 3D tilt hover effect on each card:

```ts
function handleMouseMove(event: MouseEvent, cardEl: HTMLElement): void {
  const rect = cardEl.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const deltaX = (event.clientX - centerX) / (rect.width / 2)
  const deltaY = (event.clientY - centerY) / (rect.height / 2)

  gsap.to(cardEl, {
    rotateY: deltaX * 5,
    rotateX: -deltaY * 5,
    scale: 1.08,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
    duration: 0.2,
    ease: 'power2.out',
  })
}

function handleMouseLeave(cardEl: HTMLElement): void {
  gsap.to(cardEl, {
    rotateY: 0,
    rotateX: 0,
    scale: 1,
    boxShadow: '',
    duration: 0.3,
    ease: 'power2.out',
  })
}
```

- [ ] **Step 6: Adjust `CardPile.vue` animation timing**

Ensure `CardPile.vue` animation timing aligns with the ceremony. The pile receives cards at t=0.3 in the Timeline. No major structural changes — mainly ensure `data-draw-pile` attribute is present and the pile visually updates when `pileCards` changes.

- [ ] **Step 7: Implement undo behavior**

In `useCardDraw.ts`, update `undoLastCard`:

- Card slides from center back to pile position (no reverse 3D flip)
- Previous pile card slides back to center and fades in
- Duration: 0.4 s total
- No sound effects (intentionally silent)
- `prefers-reduced-motion`: instant swap

- [ ] **Step 8: Verify type-check and lint**

```bash
cd frontend && bun run type-check && bun run lint:fix
```

- [ ] **Step 9: Visual verification with Chrome DevTools MCP**

Start dev server and verify in browser:

1. Click deck → full ceremony plays (deck press → card fly up → 3D flip → photo reveal → glow)
2. Timing feels right (~2.2 s)
3. Sound effects fire at correct moments
4. Anniversary photo shows memory text below card with calendar icon
5. Previous card animates to pile smoothly
6. Scatter view: cards stagger in, backdrop blur, 3D tilt on hover
7. Undo: card slides back, no sound
8. Particle drift dots float during IDLE
9. Background dims during ceremony, amber glow on display

- [ ] **Step 10: Commit**

```bash
git add frontend/src/composables/useCardDraw.ts frontend/src/pages/HomePage.vue frontend/src/components/draw/CardDeck.vue frontend/src/components/draw/DrawnCard.vue frontend/src/components/draw/CardPile.vue frontend/src/components/draw/CardScatter.vue
git commit -m "$(cat <<'EOF'
feat(ceremony): rewrite card draw with GSAP Timeline orchestration

State machine (IDLE→DRAWING→EMERGING→REVEALING→DISPLAYING),
3D card flip, background atmosphere, memory text display,
scatter 3D tilt hover, particle drift, sound integration.
EOF
)"
```

## Tests

### Frontend

- **Visual verification** (primary): use Chrome DevTools MCP to verify ceremony flow, timing, atmosphere, flip, sounds, memory text, scatter enhancements, undo
- **Existing tests**: `bun run test` should still pass (no breaking API changes to the composable's return shape, only additions like `ceremonyState` and `killCeremony`)
