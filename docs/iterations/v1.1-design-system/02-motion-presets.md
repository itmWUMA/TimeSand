---
type: task
iteration: "1.1"
status: pending
branch: "feat/motion-presets"
pr:
completed:
tags:
  - design-system
  - phase-1
---

# Task 2: Motion Preset Library

- **Branch**: `feat/motion-presets`
- **Scope**: Create a GSAP-based motion preset library as Vue 3 composables. Provides semantic animation functions for use by UI components.
- **Dependencies**: Task 1 (Design Tokens) must be merged first

## Files

### Frontend

- `frontend/src/composables/motion/presets.ts` (create) — constants: easing, duration, distance, stagger
- `frontend/src/composables/motion/transitions.ts` (create) — base animation functions
- `frontend/src/composables/motion/sequences.ts` (create) — multi-element orchestration
- `frontend/src/composables/motion/index.ts` (create) — barrel export
- `frontend/src/composables/useMotion.ts` (create) — main composable entry point
- `frontend/src/composables/__tests__/useMotion.spec.ts` (create) — unit tests

## Acceptance Criteria

- [ ] Preset constants defined: 5 easings, 4 durations, 3 distances, 3 staggers
- [ ] 8 animation functions implemented: `fadeIn`, `fadeOut`, `slideUp`, `scaleIn`, `glowBreath`, `ribbonFlow`, `staggerIn`, `particleDrift`
- [ ] Each function returns a GSAP Tween or Timeline instance
- [ ] All `opts` parameters are optional overrides with preset defaults
- [ ] `useMotion()` composable exposes all animation functions
- [ ] Unit tests pass for function signatures and return types
- [ ] `bun run type-check` passes

## Implementation Steps

- [ ] **Step 1: Create preset constants**

Create `frontend/src/composables/motion/presets.ts`:

```ts
export const EASING = {
  enter: 'power2.out',
  exit: 'power2.in',
  breath: 'sine.inOut',
  flow: 'power1.inOut',
  gentle: 'back.out(1.2)',
} as const

export const DURATION = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.7,
  drift: 1.2,
} as const

export const DISTANCE = {
  sm: 8,
  md: 20,
  lg: 40,
} as const

export const STAGGER = {
  tight: 0.05,
  normal: 0.1,
  relaxed: 0.15,
} as const

export interface MotionOpts {
  delay?: number
  duration?: number
  distance?: number
}
```

- [ ] **Step 2: Create base transition functions**

Create `frontend/src/composables/motion/transitions.ts`:

```ts
import gsap from 'gsap'

import type { MotionOpts } from './presets'
import { DISTANCE, DURATION, EASING } from './presets'

export function fadeIn(el: gsap.TweenTarget, opts?: MotionOpts): gsap.core.Tween {
  const distance = opts?.distance ?? DISTANCE.md
  return gsap.fromTo(el,
    { opacity: 0, y: distance },
    {
      opacity: 1,
      y: 0,
      duration: opts?.duration ?? DURATION.normal,
      delay: opts?.delay ?? 0,
      ease: EASING.enter,
    },
  )
}

export function fadeOut(el: gsap.TweenTarget, opts?: MotionOpts): gsap.core.Tween {
  const distance = opts?.distance ?? DISTANCE.sm
  return gsap.to(el, {
    opacity: 0,
    y: distance,
    duration: opts?.duration ?? DURATION.normal,
    delay: opts?.delay ?? 0,
    ease: EASING.exit,
  })
}

export function slideUp(el: gsap.TweenTarget, opts?: MotionOpts): gsap.core.Tween {
  const distance = opts?.distance ?? DISTANCE.lg
  return gsap.fromTo(el,
    { opacity: 0, y: distance },
    {
      opacity: 1,
      y: 0,
      duration: opts?.duration ?? DURATION.normal,
      delay: opts?.delay ?? 0,
      ease: EASING.enter,
    },
  )
}

export function scaleIn(el: gsap.TweenTarget, opts?: MotionOpts): gsap.core.Tween {
  return gsap.fromTo(el,
    { opacity: 0, scale: 0.85 },
    {
      opacity: 1,
      scale: 1,
      duration: opts?.duration ?? DURATION.normal,
      delay: opts?.delay ?? 0,
      ease: EASING.gentle,
    },
  )
}

export function glowBreath(el: gsap.TweenTarget): gsap.core.Tween {
  return gsap.to(el, {
    boxShadow: '0 0 40px rgba(212, 168, 67, 0.5)',
    duration: DURATION.drift,
    ease: EASING.breath,
    repeat: -1,
    yoyo: true,
  })
}

export function ribbonFlow(el: gsap.TweenTarget): gsap.core.Tween {
  return gsap.fromTo(el,
    { backgroundPosition: '-200% 0' },
    {
      backgroundPosition: '200% 0',
      duration: DURATION.drift * 2,
      ease: EASING.flow,
      repeat: -1,
    },
  )
}
```

- [ ] **Step 3: Create sequence orchestration functions**

Create `frontend/src/composables/motion/sequences.ts`:

```ts
import gsap from 'gsap'

import type { MotionOpts } from './presets'
import { DISTANCE, DURATION, EASING, STAGGER } from './presets'

export function staggerIn(
  els: gsap.TweenTarget,
  opts?: MotionOpts & { stagger?: number },
): gsap.core.Tween {
  const distance = opts?.distance ?? DISTANCE.md
  return gsap.fromTo(els,
    { opacity: 0, y: distance },
    {
      opacity: 1,
      y: 0,
      duration: opts?.duration ?? DURATION.normal,
      delay: opts?.delay ?? 0,
      ease: EASING.enter,
      stagger: opts?.stagger ?? STAGGER.normal,
    },
  )
}

export function particleDrift(els: gsap.TweenTarget): gsap.core.Timeline {
  const tl = gsap.timeline({ repeat: -1 })
  tl.to(els, {
    y: '-=12',
    x: '+=6',
    opacity: 0.6,
    duration: DURATION.drift * 2,
    ease: EASING.flow,
    stagger: STAGGER.relaxed,
  })
  tl.to(els, {
    y: '+=12',
    x: '-=6',
    opacity: 0.3,
    duration: DURATION.drift * 2,
    ease: EASING.flow,
    stagger: STAGGER.relaxed,
  })
  return tl
}
```

- [ ] **Step 4: Create barrel export**

Create `frontend/src/composables/motion/index.ts`:

```ts
export { DISTANCE, DURATION, EASING, STAGGER } from './presets'
export type { MotionOpts } from './presets'
export { fadeIn, fadeOut, glowBreath, ribbonFlow, scaleIn, slideUp } from './transitions'
export { particleDrift, staggerIn } from './sequences'
```

- [ ] **Step 5: Create the `useMotion` composable**

Create `frontend/src/composables/useMotion.ts`:

```ts
import { fadeIn, fadeOut, glowBreath, particleDrift, ribbonFlow, scaleIn, slideUp, staggerIn } from './motion'

export function useMotion() {
  return {
    fadeIn,
    fadeOut,
    slideUp,
    scaleIn,
    glowBreath,
    ribbonFlow,
    staggerIn,
    particleDrift,
  }
}
```

- [ ] **Step 6: Write unit tests**

Create `frontend/src/composables/__tests__/useMotion.spec.ts`:

```ts
import gsap from 'gsap'
import { describe, expect, it } from 'vitest'

import { DISTANCE, DURATION, EASING, STAGGER } from '../motion'
import { useMotion } from '../useMotion'

describe('motion presets', () => {
  it('exports all easing presets', () => {
    expect(EASING.enter).toBe('power2.out')
    expect(EASING.exit).toBe('power2.in')
    expect(EASING.breath).toBe('sine.inOut')
    expect(EASING.flow).toBe('power1.inOut')
    expect(EASING.gentle).toBe('back.out(1.2)')
  })

  it('exports all duration presets', () => {
    expect(DURATION.fast).toBe(0.2)
    expect(DURATION.normal).toBe(0.4)
    expect(DURATION.slow).toBe(0.7)
    expect(DURATION.drift).toBe(1.2)
  })

  it('exports all distance presets', () => {
    expect(DISTANCE.sm).toBe(8)
    expect(DISTANCE.md).toBe(20)
    expect(DISTANCE.lg).toBe(40)
  })

  it('exports all stagger presets', () => {
    expect(STAGGER.tight).toBe(0.05)
    expect(STAGGER.normal).toBe(0.1)
    expect(STAGGER.relaxed).toBe(0.15)
  })
})

describe('useMotion', () => {
  const { fadeIn, fadeOut, slideUp, scaleIn, glowBreath, ribbonFlow, staggerIn, particleDrift } = useMotion()
  const el = document.createElement('div')

  it('fadeIn returns a GSAP tween', () => {
    const tween = fadeIn(el)
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })

  it('fadeOut returns a GSAP tween', () => {
    const tween = fadeOut(el)
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })

  it('slideUp returns a GSAP tween', () => {
    const tween = slideUp(el)
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })

  it('scaleIn returns a GSAP tween', () => {
    const tween = scaleIn(el)
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })

  it('glowBreath returns a GSAP tween', () => {
    const tween = glowBreath(el)
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })

  it('ribbonFlow returns a GSAP tween', () => {
    const tween = ribbonFlow(el)
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })

  it('staggerIn returns a GSAP tween', () => {
    const els = [document.createElement('div'), document.createElement('div')]
    const tween = staggerIn(els)
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })

  it('particleDrift returns a GSAP timeline', () => {
    const els = [document.createElement('div'), document.createElement('div')]
    const tl = particleDrift(els)
    expect(tl).toBeInstanceOf(gsap.core.Timeline)
    tl.kill()
  })

  it('fadeIn accepts custom opts', () => {
    const tween = fadeIn(el, { delay: 0.5, duration: 1.0, distance: 50 })
    expect(tween).toBeInstanceOf(gsap.core.Tween)
    tween.kill()
  })
})
```

- [ ] **Step 7: Run tests and verify**

```bash
cd frontend && bun run test
```
Expected: All tests pass.

```bash
cd frontend && bun run type-check
```
Expected: No type errors.

```bash
cd frontend && bun run lint:fix
```
Expected: No lint errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/composables/motion/ frontend/src/composables/useMotion.ts frontend/src/composables/__tests__/useMotion.spec.ts
git commit -m "$(cat <<'EOF'
feat(motion): add P3R-inspired motion preset library

GSAP-based animation presets wrapped as Vue composables. Provides 8
semantic animation functions (fadeIn, fadeOut, slideUp, scaleIn,
glowBreath, ribbonFlow, staggerIn, particleDrift) with configurable
options and preset defaults.
EOF
)"
```

## Tests

### Frontend

- **Preset constants**: Verify all easing, duration, distance, and stagger values match spec
- **Function return types**: Each animation function returns a GSAP Tween or Timeline instance
- **Custom opts**: Verify functions accept optional override parameters
- **Cleanup**: Each test kills its tween/timeline to avoid leaks
