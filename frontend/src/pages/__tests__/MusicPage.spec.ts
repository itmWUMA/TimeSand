import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mountWithI18n } from '../../test-utils'
import MusicPage from '../MusicPage.vue'

const { playMock, setPlaylistMock } = vi.hoisted(() => ({
  playMock: vi.fn(),
  setPlaylistMock: vi.fn(),
}))

vi.mock('../../services/music', () => ({
  deleteMusic: vi.fn(),
  listMusic: vi.fn(),
  uploadMusic: vi.fn(),
}))

vi.mock('../../services/playlist', () => ({
  addTrackToPlaylist: vi.fn(),
  createPlaylist: vi.fn(),
  deletePlaylist: vi.fn(),
  getPlaylist: vi.fn(),
  listPlaylists: vi.fn(),
  removeTrackFromPlaylist: vi.fn(),
  updatePlaylist: vi.fn(),
}))

vi.mock('../../composables/useMusicPlayer', () => ({
  useMusicPlayer: () => ({
    currentTrack: ref(null),
    playlistId: ref<number | null>(null),
    play: playMock,
    setPlaylist: setPlaylistMock,
  }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

const musicApi = await import('../../services/music')
const playlistApi = await import('../../services/playlist')

function getBodyButton(testId: string): HTMLButtonElement {
  const button = document.body.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)
  if (!button) {
    throw new Error(`Missing button ${testId}`)
  }

  return button
}

describe('musicPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(musicApi.listMusic).mockResolvedValue({
      items: [
        {
          artist: 'TimeSand Demo',
          duration: 123,
          file_path: 'demo.mp3',
          file_size: 1024,
          filename: 'demo.mp3',
          id: 1,
          mime_type: 'audio/mpeg',
          title: 'Gentle Drift',
          uploaded_at: '2026-05-03T00:00:00Z',
        },
      ],
      page: 1,
      page_size: 100,
      total: 1,
    })

    vi.mocked(playlistApi.listPlaylists).mockResolvedValue({
      items: [
        {
          created_at: '2026-05-03T00:00:00Z',
          id: 1,
          is_default: true,
          name: 'Default Playlist',
          track_count: 0,
          tracks: [],
        },
        {
          created_at: '2026-05-03T00:00:00Z',
          id: 2,
          is_default: false,
          name: 'TimeSand Demo',
          track_count: 1,
          tracks: [],
        },
      ],
    })

    vi.mocked(playlistApi.getPlaylist).mockImplementation(async (playlistId: number) => {
      if (playlistId === 2) {
        return {
          created_at: '2026-05-03T00:00:00Z',
          id: 2,
          is_default: false,
          name: 'TimeSand Demo',
          track_count: 1,
          tracks: [
            {
              artist: 'TimeSand Demo',
              duration: 123,
              file_path: 'demo.mp3',
              file_size: 1024,
              filename: 'demo.mp3',
              id: 1,
              mime_type: 'audio/mpeg',
              title: 'Gentle Drift',
              uploaded_at: '2026-05-03T00:00:00Z',
            },
          ],
        }
      }

      return {
        created_at: '2026-05-03T00:00:00Z',
        id: 1,
        is_default: true,
        name: 'Default Playlist',
        track_count: 0,
        tracks: [],
      }
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('syncs selected playlist to global player', async () => {
    const wrapper = mountWithI18n(MusicPage)
    await flushPromises()

    expect(setPlaylistMock).toHaveBeenCalledWith(1)

    await wrapper.get('[data-testid="playlist-item-2"]').trigger('click')
    await flushPromises()

    expect(setPlaylistMock).toHaveBeenLastCalledWith(2)
  })

  it('renders exported music surface hierarchy with real playlist and track data', async () => {
    const wrapper = mountWithI18n(MusicPage)
    await flushPromises()

    expect(wrapper.find('[data-testid="music-layout"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="playlist-sidebar"]').text()).toContain('Default Playlist')
    expect(wrapper.find('[data-testid="playlist-sidebar"]').text()).toContain('TimeSand Demo')
    expect(wrapper.find('[data-testid="playlist-hero"]').text()).toContain('Default Playlist')
    expect(wrapper.find('[data-testid="music-track-table"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="music-library-panel"]').text()).toContain('Gentle Drift')
  })

  it('requires confirmation before permanently deleting a library track', async () => {
    const wrapper = mountWithI18n(MusicPage, { attachTo: document.body })
    await flushPromises()

    const deleteButton = wrapper.get('[data-testid="delete-music-1"]')

    expect(deleteButton.classes()).toContain('library-delete')

    await deleteButton.trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('Delete "Gentle Drift" permanently? This cannot be undone.')

    getBodyButton('music-confirm-cancel').click()
    await flushPromises()

    expect(musicApi.deleteMusic).not.toHaveBeenCalled()
  })

  it('confirms playlist removal with muted remove styling', async () => {
    const wrapper = mountWithI18n(MusicPage, { attachTo: document.body })
    await flushPromises()

    await wrapper.get('[data-testid="playlist-item-2"]').trigger('click')
    await flushPromises()

    const removeButton = wrapper.get('[data-testid="remove-track-1"]')

    expect(removeButton.classes()).toContain('track-remove')
    expect(removeButton.classes()).not.toContain('library-delete')

    await removeButton.trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('Remove "Gentle Drift" from this playlist?')

    getBodyButton('music-confirm-cancel').click()
    await flushPromises()

    expect(playlistApi.removeTrackFromPlaylist).not.toHaveBeenCalled()
  })
})
