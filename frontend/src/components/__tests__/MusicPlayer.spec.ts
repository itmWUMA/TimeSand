import { gsap } from 'gsap'
import { createPinia, setActivePinia } from 'pinia'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { __resetMusicPlayerForTests } from '../../composables/useMusicPlayer'
import { usePlayerStore } from '../../stores/player'
import { mountWithI18n } from '../../test-utils'
import MusicPlayer from '../MusicPlayer.vue'

class FakeAudio extends EventTarget {
  src = ''
  currentTime = 0
  duration = Number.NaN
  volume = 1
  paused = true
  preload = 'metadata'

  play = vi.fn(async () => {
    this.paused = false
  })

  pause = vi.fn(() => {
    this.paused = true
  })

  load = vi.fn()

  removeAttribute = vi.fn((name: string) => {
    if (name === 'src') {
      this.src = ''
    }
  })
}

function stubViewport(matches: boolean): void {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
    matches,
    media: '(max-width: 767px)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })))
}

describe('musicPlayer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    __resetMusicPlayerForTests()
    vi.clearAllMocks()
    vi.stubGlobal('Audio', FakeAudio)
    stubViewport(false)
    localStorage.clear()
  })

  it('renders track title and control buttons', () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const store = usePlayerStore()
    store.loadPlaylist({
      playlistId: 1,
      playlistName: 'Default Playlist',
      tracks: [
        {
          id: 1,
          title: 'Quiet Sea',
          artist: 'TimeSand',
          filename: 'quiet-sea.mp3',
          file_path: 'quiet-sea.mp3',
          file_size: 1024,
          duration: 110,
          mime_type: 'audio/mpeg',
          uploaded_at: '2026-04-10T09:00:00Z',
        },
      ],
    })

    const wrapper = mountWithI18n(MusicPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    expect(wrapper.find('[data-testid="music-player-track-title"]').text()).toContain('Quiet Sea')
    expect(wrapper.find('[data-testid="music-player-prev"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="music-player-play-pause"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="music-player-next"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="music-player-expand-toggle"]').exists()).toBe(true)
  })

  it('shows empty state when playlist has no tracks', () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const wrapper = mountWithI18n(MusicPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    expect(wrapper.text()).toContain('No music loaded')
    expect(wrapper.find('[data-testid="music-player-expand-toggle"]').exists()).toBe(false)
  })

  it('reads expand state from localStorage and writes updates', async () => {
    localStorage.setItem('ts-player-expanded', 'true')

    const pinia = createPinia()
    setActivePinia(pinia)

    const store = usePlayerStore()
    store.loadPlaylist({
      playlistId: 1,
      playlistName: 'Default Playlist',
      tracks: [
        {
          id: 1,
          title: 'Quiet Sea',
          artist: 'TimeSand',
          filename: 'quiet-sea.mp3',
          file_path: 'quiet-sea.mp3',
          file_size: 1024,
          duration: 110,
          mime_type: 'audio/mpeg',
          uploaded_at: '2026-04-10T09:00:00Z',
        },
      ],
    })

    const wrapper = mountWithI18n(MusicPlayer, {
      global: {
        plugins: [pinia],
      },
    })
    await nextTick()

    expect(wrapper.find('[data-testid="music-player"]').attributes('data-expanded')).toBe('true')

    await wrapper.find('[data-testid="music-player-expand-toggle"]').trigger('click')
    await nextTick()

    expect(localStorage.getItem('ts-player-expanded')).toBe('false')
    expect(wrapper.find('[data-testid="music-player"]').attributes('data-expanded')).toBe('false')
  })

  it('updates main padding variable from measured player height', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const store = usePlayerStore()
    store.loadPlaylist({
      playlistId: 1,
      playlistName: 'Default Playlist',
      tracks: [
        {
          id: 1,
          title: 'Quiet Sea',
          artist: 'TimeSand',
          filename: 'quiet-sea.mp3',
          file_path: 'quiet-sea.mp3',
          file_size: 1024,
          duration: 110,
          mime_type: 'audio/mpeg',
          uploaded_at: '2026-04-10T09:00:00Z',
        },
      ],
    })

    const wrapper = mountWithI18n(MusicPlayer, {
      global: {
        plugins: [pinia],
      },
    })
    await nextTick()

    const root = wrapper.get('[data-testid="music-player"]').element as HTMLElement
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 1200, 111),
    )

    await wrapper.find('[data-testid="music-player-expand-toggle"]').trigger('click')
    await nextTick()

    expect(document.documentElement.style.getPropertyValue('--ts-player-main-padding')).toBe('127px')
  })

  it('renders mobile mini bar by default on small viewports', () => {
    stubViewport(true)

    const pinia = createPinia()
    setActivePinia(pinia)

    const store = usePlayerStore()
    store.loadPlaylist({
      playlistId: 1,
      playlistName: 'Default Playlist',
      tracks: [
        {
          id: 1,
          title: 'Quiet Sea',
          artist: 'TimeSand',
          filename: 'quiet-sea.mp3',
          file_path: 'quiet-sea.mp3',
          file_size: 1024,
          duration: 110,
          mime_type: 'audio/mpeg',
          uploaded_at: '2026-04-10T09:00:00Z',
        },
      ],
    })

    const wrapper = mountWithI18n(MusicPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    expect(wrapper.find('[data-testid="music-player-mobile-mini"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="music-player-mobile-expanded"]').attributes('aria-hidden')).toBe('true')
  })

  it('expands and collapses mobile panel when toggled', async () => {
    stubViewport(true)

    const pinia = createPinia()
    setActivePinia(pinia)

    const store = usePlayerStore()
    store.loadPlaylist({
      playlistId: 1,
      playlistName: 'Default Playlist',
      tracks: [
        {
          id: 1,
          title: 'Quiet Sea',
          artist: 'TimeSand',
          filename: 'quiet-sea.mp3',
          file_path: 'quiet-sea.mp3',
          file_size: 1024,
          duration: 110,
          mime_type: 'audio/mpeg',
          uploaded_at: '2026-04-10T09:00:00Z',
        },
      ],
    })

    const wrapper = mountWithI18n(MusicPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.find('[data-testid="music-player-mobile-expand-hitarea"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="music-player-mobile-expanded"]').attributes('aria-hidden')).toBe('false')

    await wrapper.find('[data-testid="music-player-mobile-collapse"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="music-player-mobile-expanded"]').attributes('aria-hidden')).toBe('true')
  })

  it('toggles playback in both mobile mini and expanded controls', async () => {
    stubViewport(true)

    const pinia = createPinia()
    setActivePinia(pinia)

    const store = usePlayerStore()
    store.loadPlaylist({
      playlistId: 1,
      playlistName: 'Default Playlist',
      tracks: [
        {
          id: 1,
          title: 'Quiet Sea',
          artist: 'TimeSand',
          filename: 'quiet-sea.mp3',
          file_path: 'quiet-sea.mp3',
          file_size: 1024,
          duration: 110,
          mime_type: 'audio/mpeg',
          uploaded_at: '2026-04-10T09:00:00Z',
        },
      ],
    })

    const wrapper = mountWithI18n(MusicPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.find('[data-testid="music-player-mobile-play-pause"]').trigger('click')
    await nextTick()
    expect(store.isPlaying).toBe(true)

    await wrapper.find('[data-testid="music-player-mobile-expand-hitarea"]').trigger('click')
    await nextTick()
    await wrapper.find('[data-testid="music-player-mobile-expanded-play-pause"]').trigger('click')
    await nextTick()
    expect(store.isPlaying).toBe(false)
  })

  it('uses measured non-zero height for mobile expand animation', async () => {
    stubViewport(true)

    const pinia = createPinia()
    setActivePinia(pinia)

    const store = usePlayerStore()
    store.loadPlaylist({
      playlistId: 1,
      playlistName: 'Default Playlist',
      tracks: [
        {
          id: 1,
          title: 'Quiet Sea',
          artist: 'TimeSand',
          filename: 'quiet-sea.mp3',
          file_path: 'quiet-sea.mp3',
          file_size: 1024,
          duration: 110,
          mime_type: 'audio/mpeg',
          uploaded_at: '2026-04-10T09:00:00Z',
        },
      ],
    })

    const fromToSpy = vi.spyOn(gsap, 'fromTo')

    const wrapper = mountWithI18n(MusicPlayer, {
      global: {
        plugins: [pinia],
      },
    })
    await nextTick()

    const expandedPanel = wrapper.get('[data-testid="music-player-mobile-expanded"]').element as HTMLElement
    const expandedInner = expandedPanel.firstElementChild as HTMLElement

    Object.defineProperty(expandedInner, 'scrollHeight', {
      configurable: true,
      get: () => (expandedPanel.style.display === 'none' ? 0 : 120),
    })

    await wrapper.find('[data-testid="music-player-mobile-expand-hitarea"]').trigger('click')
    await nextTick()

    const panelCall = fromToSpy.mock.calls.find(call => call[0] === expandedPanel)
    expect(panelCall).toBeDefined()
    const toVars = panelCall?.[2] as { height?: number }
    expect(toVars.height).toBe(120)

    fromToSpy.mockRestore()
  })
})
