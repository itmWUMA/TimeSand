import { createPinia, setActivePinia } from 'pinia'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlayerStore } from '../../stores/player'
import { __resetMusicPlayerForTests, useMusicPlayer } from '../useMusicPlayer'

vi.mock('../../services/playlist', () => ({
  getPlaylist: vi.fn(),
  listPlaylists: vi.fn(),
}))

vi.mock('../../services/album', () => ({
  getAlbum: vi.fn(),
}))

const playlistApi = await import('../../services/playlist')
const albumApi = await import('../../services/album')

const fakeTrack = {
  id: 10,
  title: 'Golden Hour',
  artist: 'Ambient Unit',
  filename: 'golden-hour.mp3',
  file_path: 'golden-hour.mp3',
  file_size: 3200,
  duration: 120,
  mime_type: 'audio/mpeg',
  uploaded_at: '2026-04-10T09:00:00Z',
}

function createPlaylistPayload(id: number, name: string, tracks = [fakeTrack]) {
  return {
    id,
    name,
    is_default: id === 1,
    track_count: tracks.length,
    created_at: '2026-04-10T00:00:00Z',
    tracks,
  }
}

function createDeferred<T>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((resolver) => {
    resolve = resolver
  })
  return { promise, resolve }
}

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

describe('useMusicPlayer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    __resetMusicPlayerForTests()
    vi.clearAllMocks()
    vi.stubGlobal('Audio', FakeAudio)
  })

  it('setContext("album") loads album playlist', async () => {
    vi.mocked(albumApi.getAlbum).mockResolvedValue({
      id: 99,
      name: 'Trip',
      description: null,
      cover_photo_id: null,
      cover_photo: null,
      photo_count: 0,
      created_at: '2026-04-10T00:00:00Z',
      updated_at: '2026-04-10T00:00:00Z',
      playlist_id: 12,
    } as never)
    vi.mocked(playlistApi.getPlaylist).mockResolvedValue({
      id: 12,
      name: 'Trip Playlist',
      is_default: false,
      track_count: 1,
      created_at: '2026-04-10T00:00:00Z',
      tracks: [fakeTrack],
    })

    const player = useMusicPlayer()
    await player.setContext('album', 99)

    const store = usePlayerStore()
    expect(albumApi.getAlbum).toHaveBeenCalledWith(99)
    expect(playlistApi.getPlaylist).toHaveBeenCalledWith(12)
    expect(store.playlistId).toBe(12)
    expect(store.currentTrack?.id).toBe(10)
  })

  it('setContext("default") loads default playlist', async () => {
    vi.mocked(playlistApi.listPlaylists).mockResolvedValue({
      items: [
        {
          id: 7,
          name: 'Default Playlist',
          is_default: true,
          track_count: 1,
          created_at: '2026-04-10T00:00:00Z',
          tracks: [],
        },
      ],
    })
    vi.mocked(playlistApi.getPlaylist).mockResolvedValue({
      id: 7,
      name: 'Default Playlist',
      is_default: true,
      track_count: 1,
      created_at: '2026-04-10T00:00:00Z',
      tracks: [fakeTrack],
    })

    const player = useMusicPlayer()
    await player.setContext('default')

    const store = usePlayerStore()
    expect(playlistApi.listPlaylists).toHaveBeenCalled()
    expect(playlistApi.getPlaylist).toHaveBeenCalledWith(7)
    expect(store.playlistId).toBe(7)
    expect(store.currentTrack?.id).toBe(10)
  })

  it('setPlaylist() loads selected playlist', async () => {
    vi.mocked(playlistApi.getPlaylist).mockResolvedValue(
      createPlaylistPayload(22, 'TimeSand Demo'),
    )

    const player = useMusicPlayer()
    await player.setPlaylist(22)

    const store = usePlayerStore()
    expect(playlistApi.getPlaylist).toHaveBeenCalledWith(22)
    expect(store.playlistId).toBe(22)
    expect(store.currentTrack?.id).toBe(10)
  })

  it('setPlaylist(null) falls back to default playlist', async () => {
    vi.mocked(playlistApi.listPlaylists).mockResolvedValue({
      items: [
        {
          id: 1,
          name: 'Default Playlist',
          is_default: true,
          track_count: 1,
          created_at: '2026-04-10T00:00:00Z',
          tracks: [],
        },
        {
          id: 22,
          name: 'TimeSand Demo',
          is_default: false,
          track_count: 1,
          created_at: '2026-04-10T00:00:00Z',
          tracks: [],
        },
      ],
    })
    vi.mocked(playlistApi.getPlaylist).mockResolvedValue(
      createPlaylistPayload(1, 'Default Playlist'),
    )

    const player = useMusicPlayer()
    await player.setPlaylist(null)

    const store = usePlayerStore()
    expect(playlistApi.listPlaylists).toHaveBeenCalled()
    expect(playlistApi.getPlaylist).toHaveBeenCalledWith(1)
    expect(store.playlistId).toBe(1)
  })

  it('setPlaylist keeps the latest selection when requests race', async () => {
    const first = createDeferred<ReturnType<typeof createPlaylistPayload>>()
    const second = createDeferred<ReturnType<typeof createPlaylistPayload>>()

    vi.mocked(playlistApi.getPlaylist).mockImplementation(async (playlistId: number) => {
      if (playlistId === 1) {
        return first.promise
      }
      if (playlistId === 2) {
        return second.promise
      }

      throw new Error(`Unexpected playlist id: ${playlistId}`)
    })

    const player = useMusicPlayer()
    const firstRequest = player.setPlaylist(1)
    const secondRequest = player.setPlaylist(2)

    second.resolve(createPlaylistPayload(2, 'Latest Playlist'))
    await secondRequest

    const store = usePlayerStore()
    expect(store.playlistId).toBe(2)

    first.resolve(createPlaylistPayload(1, 'Stale Playlist'))
    await firstRequest
    expect(store.playlistId).toBe(2)
  })
})
