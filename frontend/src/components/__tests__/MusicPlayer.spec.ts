import { createPinia, setActivePinia } from 'pinia'

import { beforeEach, describe, expect, it, vi } from 'vitest'
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

describe('musicPlayer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    __resetMusicPlayerForTests()
    vi.clearAllMocks()
    vi.stubGlobal('Audio', FakeAudio)
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
  })

  it('shows empty state when playlist has no tracks', () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const wrapper = mountWithI18n(MusicPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    expect(wrapper.text()).toContain('No music - upload tracks to get started')
  })
})
