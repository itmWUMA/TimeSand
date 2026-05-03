import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mountWithI18n } from '../../test-utils'
import MusicPage from '../MusicPage.vue'

const { setPlaylistMock } = vi.hoisted(() => ({
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
    playlistId: ref<number | null>(null),
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

  it('syncs selected playlist to global player', async () => {
    const wrapper = mountWithI18n(MusicPage)
    await flushPromises()

    expect(setPlaylistMock).toHaveBeenCalledWith(1)

    const playlistSelect = wrapper.get('select')
    await playlistSelect.setValue('2')
    await flushPromises()

    expect(setPlaylistMock).toHaveBeenLastCalledWith(2)
  })
})
