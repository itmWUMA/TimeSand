import { beforeEach, describe, expect, it, vi } from 'vitest'

const playMock = vi.fn()
const volumeMock = vi.fn()
const muteMock = vi.fn()

const HowlMock = vi.fn().mockImplementation(() => ({
  play: playMock,
  volume: volumeMock,
  mute: muteMock,
}))

const resumeMock = vi.fn().mockResolvedValue(undefined)

vi.mock('howler', () => ({
  Howl: HowlMock,
  Howler: {
    ctx: {
      state: 'suspended',
      resume: resumeMock,
    },
  },
}))

const baseMatchMedia = vi.fn().mockReturnValue({
  matches: false,
  media: '(prefers-reduced-motion: reduce)',
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
})

describe('useSoundEffects', () => {
  beforeEach(async () => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.stubGlobal('matchMedia', baseMatchMedia)

    const module = await import('../../composables/useSoundEffects')
    module.__resetSoundEffectsForTests()
  })

  it('returns singleton with expected API', async () => {
    const { useSoundEffects } = await import('../../composables/useSoundEffects')
    const a = useSoundEffects()
    const b = useSoundEffects()

    expect(a).toBe(b)
    expect(typeof a.play).toBe('function')
    expect(typeof a.setVolume).toBe('function')
    expect(typeof a.getVolume).toBe('function')
    expect(typeof a.mute).toBe('function')
    expect(typeof a.unmute).toBe('function')
    expect(a.isMuted.value).toBe(false)
  })

  it('defaults volume to 0.6 and persists updates', async () => {
    const { useSoundEffects } = await import('../../composables/useSoundEffects')
    const sfx = useSoundEffects()

    expect(sfx.getVolume()).toBe(0.6)

    sfx.setVolume(0.3)

    expect(sfx.getVolume()).toBe(0.3)
    expect(localStorage.getItem('ts-sfx-volume')).toBe('0.3')
  })

  it('reads persisted volume from localStorage', async () => {
    localStorage.setItem('ts-sfx-volume', '0.85')
    const { useSoundEffects } = await import('../../composables/useSoundEffects')

    expect(useSoundEffects().getVolume()).toBe(0.85)
  })

  it('toggles mute and persists state', async () => {
    const { useSoundEffects } = await import('../../composables/useSoundEffects')
    const sfx = useSoundEffects()

    sfx.mute()
    expect(sfx.isMuted.value).toBe(true)
    expect(localStorage.getItem('ts-sfx-muted')).toBe('true')

    sfx.unmute()
    expect(sfx.isMuted.value).toBe(false)
    expect(localStorage.getItem('ts-sfx-muted')).toBe('false')
  })

  it('lazy-loads Howl sprites on first play', async () => {
    const { useSoundEffects } = await import('../../composables/useSoundEffects')
    const sfx = useSoundEffects()

    expect(HowlMock).not.toHaveBeenCalled()

    sfx.play('click')
    expect(HowlMock).toHaveBeenCalledTimes(1)

    sfx.play('shuffle')
    expect(HowlMock).toHaveBeenCalledTimes(2)
  })

  it('accepts all supported sound ids', async () => {
    const { useSoundEffects } = await import('../../composables/useSoundEffects')
    const sfx = useSoundEffects()
    const ids = ['shuffle', 'whoosh', 'flip', 'reveal', 'memory', 'slideSwish', 'click', 'success'] as const

    ids.forEach((id) => {
      expect(() => sfx.play(id)).not.toThrow()
    })

    expect(playMock).toHaveBeenCalledTimes(8)
  })

  it('skips playback when reduced-motion is enabled by default', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { useSoundEffects } = await import('../../composables/useSoundEffects')
    const sfx = useSoundEffects()

    sfx.play('click')

    expect(HowlMock).not.toHaveBeenCalled()
    expect(playMock).not.toHaveBeenCalled()
  })

  it('allows playback under reduced-motion after explicit unmute', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { useSoundEffects } = await import('../../composables/useSoundEffects')
    const sfx = useSoundEffects()

    sfx.unmute()
    sfx.play('success')

    expect(HowlMock).toHaveBeenCalledTimes(1)
    expect(playMock).toHaveBeenCalledWith('success')
  })

  it('resumes audio context once on first user interaction', async () => {
    const { useSoundEffects } = await import('../../composables/useSoundEffects')
    useSoundEffects()

    document.dispatchEvent(new Event('click', { bubbles: true }))
    document.dispatchEvent(new Event('touchstart', { bubbles: true }))

    expect(resumeMock).toHaveBeenCalledTimes(1)
  })
})
