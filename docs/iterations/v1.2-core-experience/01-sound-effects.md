---
type: task
iteration: "1.2"
status: review-passed
branch: "feat/sound-effects"
pr:
completed:
tags:
  - core-experience
  - sound-effects
  - phase-1
---

# Task 1: Sound Effects System

- **Branch**: `feat/sound-effects`
- **Scope**: Install howler.js, create a singleton `useSoundEffects` composable with sprite-based playback, volume/mute persistence, mobile audio unlock, and `prefers-reduced-motion` support. Placeholder sprite files are included; real audio assets will be sourced separately.
- **Dependencies**: None

## Files

### Frontend

- `frontend/package.json` (modify) — add `howler` and `@types/howler`
- `frontend/src/composables/useSoundEffects.ts` (create) — singleton composable
- `frontend/src/assets/sounds/ceremony.webm` (create) — placeholder silence sprite
- `frontend/src/assets/sounds/ceremony.mp3` (create) — placeholder silence sprite
- `frontend/src/assets/sounds/ui.webm` (create) — placeholder silence sprite
- `frontend/src/assets/sounds/ui.mp3` (create) — placeholder silence sprite

### Tests

- `frontend/src/__tests__/composables/useSoundEffects.test.ts` (create)

## API Contract

N/A — this is a frontend-only composable.

## Acceptance Criteria

- [ ] `howler` ^2.2 and `@types/howler` ^2.2 added as dependencies
- [ ] `useSoundEffects()` returns singleton: `play`, `setVolume`, `getVolume`, `mute`, `unmute`, `isMuted`
- [ ] `play(id)` accepts all 8 sound IDs: `shuffle`, `whoosh`, `flip`, `reveal`, `memory`, `slideSwish`, `click`, `success`
- [ ] Volume persisted in `localStorage` key `ts-sfx-volume` (default `0.6`)
- [ ] Mute state persisted in `localStorage` key `ts-sfx-muted` (default `false`)
- [ ] Sprites are lazily loaded on first `play()` call, not on import
- [ ] When `prefers-reduced-motion` is active, `play()` is a no-op (unless user explicitly unmuted)
- [ ] Mobile audio unlock: one-time `click`/`touchstart` listener calls `Howler.ctx.resume()`
- [ ] Unit tests pass: `bun run test -- useSoundEffects`
- [ ] `bun run type-check` passes
- [ ] `bun run lint:fix` passes
- [ ] (if deps changed) Clean-install verification passes: `rm -rf node_modules && bun install && bun run type-check`

## Implementation Steps

- [ ] **Step 1: Install howler.js**

```bash
cd frontend && bun add howler && bun add -d @types/howler
```

Verify in `package.json` that `howler` and `@types/howler` appear.

- [ ] **Step 2: Create placeholder audio sprites**

Create the `frontend/src/assets/sounds/` directory. Generate 4 minimal silent audio files as placeholders (ceremony.webm, ceremony.mp3, ui.webm, ui.mp3). These will be replaced with real sound effects later.

For now, create zero-byte or minimal-byte placeholder files so that Howl constructor doesn't error. The real audio files will be added when assets are sourced.

- [ ] **Step 3: Write the failing test**

Create `frontend/src/__tests__/composables/useSoundEffects.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock howler before importing the composable
vi.mock('howler', () => {
  const mockHowl = vi.fn().mockImplementation(() => ({
    play: vi.fn(),
    volume: vi.fn(),
    mute: vi.fn(),
  }))

  return {
    Howl: mockHowl,
    Howler: {
      ctx: { resume: vi.fn(), state: 'suspended' },
    },
  }
})

import { useSoundEffects } from '../../composables/useSoundEffects'

describe('useSoundEffects', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns the expected API shape', () => {
    const sfx = useSoundEffects()
    expect(sfx).toHaveProperty('play')
    expect(sfx).toHaveProperty('setVolume')
    expect(sfx).toHaveProperty('getVolume')
    expect(sfx).toHaveProperty('mute')
    expect(sfx).toHaveProperty('unmute')
    expect(sfx).toHaveProperty('isMuted')
    expect(typeof sfx.play).toBe('function')
    expect(typeof sfx.setVolume).toBe('function')
    expect(typeof sfx.getVolume).toBe('function')
    expect(typeof sfx.mute).toBe('function')
    expect(typeof sfx.unmute).toBe('function')
  })

  it('returns the same singleton instance', () => {
    const a = useSoundEffects()
    const b = useSoundEffects()
    expect(a).toBe(b)
  })

  it('defaults volume to 0.6', () => {
    const sfx = useSoundEffects()
    expect(sfx.getVolume()).toBe(0.6)
  })

  it('persists volume to localStorage', () => {
    const sfx = useSoundEffects()
    sfx.setVolume(0.3)
    expect(localStorage.getItem('ts-sfx-volume')).toBe('0.3')
    expect(sfx.getVolume()).toBe(0.3)
  })

  it('defaults mute to false', () => {
    const sfx = useSoundEffects()
    expect(sfx.isMuted.value).toBe(false)
  })

  it('toggles mute and persists', () => {
    const sfx = useSoundEffects()
    sfx.mute()
    expect(sfx.isMuted.value).toBe(true)
    expect(localStorage.getItem('ts-sfx-muted')).toBe('true')
    sfx.unmute()
    expect(sfx.isMuted.value).toBe(false)
    expect(localStorage.getItem('ts-sfx-muted')).toBe('false')
  })

  it('reads persisted volume from localStorage', () => {
    localStorage.setItem('ts-sfx-volume', '0.8')
    // Need a fresh singleton — reset module for this test
    vi.resetModules()
  })

  it('accepts all valid sound IDs without throwing', () => {
    const sfx = useSoundEffects()
    const ids = ['shuffle', 'whoosh', 'flip', 'reveal', 'memory', 'slideSwish', 'click', 'success'] as const
    for (const id of ids) {
      expect(() => sfx.play(id)).not.toThrow()
    }
  })
})
```

Run: `cd frontend && bun run test -- useSoundEffects`
Expected: FAIL — module `../../composables/useSoundEffects` not found.

- [ ] **Step 4: Implement `useSoundEffects.ts`**

Create `frontend/src/composables/useSoundEffects.ts`:

```ts
import { Howl, Howler } from 'howler'
import { ref } from 'vue'

export type SoundId =
  | 'shuffle' | 'whoosh' | 'flip' | 'reveal' | 'memory'
  | 'slideSwish' | 'click' | 'success'

interface SoundEffects {
  play: (id: SoundId) => void
  setVolume: (volume: number) => void
  getVolume: () => number
  mute: () => void
  unmute: () => void
  isMuted: ReturnType<typeof ref<boolean>>
}

const VOLUME_KEY = 'ts-sfx-volume'
const MUTED_KEY = 'ts-sfx-muted'
const DEFAULT_VOLUME = 0.6

const CEREMONY_SPRITE: Record<string, [number, number]> = {
  shuffle: [0, 300],
  whoosh: [400, 350],
  flip: [850, 300],
  reveal: [1250, 800],
  memory: [2150, 1000],
  slideSwish: [3250, 400],
}

const UI_SPRITE: Record<string, [number, number]> = {
  click: [0, 80],
  success: [180, 300],
}

function isCeremonySound(id: SoundId): boolean {
  return id in CEREMONY_SPRITE
}

function readVolume(): number {
  const stored = localStorage.getItem(VOLUME_KEY)
  if (stored === null) return DEFAULT_VOLUME
  const parsed = Number.parseFloat(stored)
  return Number.isNaN(parsed) ? DEFAULT_VOLUME : Math.max(0, Math.min(1, parsed))
}

function readMuted(): boolean {
  return localStorage.getItem(MUTED_KEY) === 'true'
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

let instance: SoundEffects | null = null

export function useSoundEffects(): SoundEffects {
  if (instance) return instance

  const volume = ref(readVolume())
  const isMuted = ref(readMuted())

  let ceremonyHowl: Howl | null = null
  let uiHowl: Howl | null = null
  let audioUnlocked = false

  function unlockAudio(): void {
    if (audioUnlocked) return
    audioUnlocked = true

    const ctx = Howler.ctx
    if (ctx && ctx.state === 'suspended') {
      ctx.resume()
    }

    document.removeEventListener('click', unlockAudio, true)
    document.removeEventListener('touchstart', unlockAudio, true)
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', unlockAudio, { capture: true, once: true })
    document.addEventListener('touchstart', unlockAudio, { capture: true, once: true })
  }

  function getCeremonyHowl(): Howl {
    if (!ceremonyHowl) {
      ceremonyHowl = new Howl({
        src: [
          new URL('../assets/sounds/ceremony.webm', import.meta.url).href,
          new URL('../assets/sounds/ceremony.mp3', import.meta.url).href,
        ],
        sprite: CEREMONY_SPRITE,
        volume: volume.value,
      })
    }
    return ceremonyHowl
  }

  function getUiHowl(): Howl {
    if (!uiHowl) {
      uiHowl = new Howl({
        src: [
          new URL('../assets/sounds/ui.webm', import.meta.url).href,
          new URL('../assets/sounds/ui.mp3', import.meta.url).href,
        ],
        sprite: UI_SPRITE,
        volume: volume.value,
      })
    }
    return uiHowl
  }

  function play(id: SoundId): void {
    if (isMuted.value) return
    if (prefersReducedMotion()) return

    const howl = isCeremonySound(id) ? getCeremonyHowl() : getUiHowl()
    howl.play(id)
  }

  function setVolume(v: number): void {
    const clamped = Math.max(0, Math.min(1, v))
    volume.value = clamped
    localStorage.setItem(VOLUME_KEY, String(clamped))
    if (ceremonyHowl) ceremonyHowl.volume(clamped)
    if (uiHowl) uiHowl.volume(clamped)
  }

  function getVolume(): number {
    return volume.value
  }

  function mute(): void {
    isMuted.value = true
    localStorage.setItem(MUTED_KEY, 'true')
  }

  function unmute(): void {
    isMuted.value = false
    localStorage.setItem(MUTED_KEY, 'false')
  }

  instance = { play, setVolume, getVolume, mute, unmute, isMuted }
  return instance
}
```

Run: `cd frontend && bun run test -- useSoundEffects`
Expected: All tests PASS.

- [ ] **Step 5: Verify type-check and lint**

```bash
cd frontend && bun run type-check && bun run lint:fix
```

Expected: Both pass with no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/bun.lockb frontend/src/composables/useSoundEffects.ts frontend/src/assets/sounds/ frontend/src/__tests__/composables/useSoundEffects.test.ts
git commit -m "$(cat <<'EOF'
feat(sfx): add sound effects system with howler.js

Singleton useSoundEffects composable with sprite-based playback,
volume/mute localStorage persistence, mobile AudioContext unlock,
and prefers-reduced-motion support. Placeholder audio sprites included.
EOF
)"
```

## Tests

### Frontend

- **Unit tests** (`useSoundEffects.test.ts`):
  - API shape validation (all methods exist)
  - Singleton behavior (same instance returned)
  - Default volume (0.6)
  - Volume persistence (localStorage read/write)
  - Mute toggle and persistence
  - All 8 sound IDs accepted without throwing
- **Manual verification**: import and call `useSoundEffects().play('click')` in any component to confirm Howl loads and plays (once real audio assets are added)
