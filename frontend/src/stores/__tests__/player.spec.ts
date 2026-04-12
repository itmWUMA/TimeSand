import type { Music } from '../../types/music'
import { createPinia, setActivePinia } from 'pinia'

import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayerStore } from '../player'

const tracks: Music[] = [
  {
    id: 1,
    title: 'Warm Light',
    artist: 'TimeSand',
    filename: 'warm-light.mp3',
    file_path: 'warm-light.mp3',
    file_size: 1024,
    duration: 142,
    mime_type: 'audio/mpeg',
    uploaded_at: '2026-04-10T00:00:00Z',
  },
  {
    id: 2,
    title: 'Night Road',
    artist: 'TimeSand',
    filename: 'night-road.mp3',
    file_path: 'night-road.mp3',
    file_size: 2048,
    duration: 188,
    mime_type: 'audio/mpeg',
    uploaded_at: '2026-04-10T00:01:00Z',
  },
]

describe('playerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loadPlaylist sets tracks and resets index', () => {
    const store = usePlayerStore()

    store.loadPlaylist({
      playlistId: 1,
      playlistName: 'Default Playlist',
      tracks,
    })
    store.nextTrack()

    store.loadPlaylist({
      playlistId: 2,
      playlistName: 'Album Playlist',
      tracks: [tracks[1]],
    })

    expect(store.playlistId).toBe(2)
    expect(store.playlistName).toBe('Album Playlist')
    expect(store.tracks).toEqual([tracks[1]])
    expect(store.trackIndex).toBe(0)
    expect(store.currentTrack?.id).toBe(2)
  })

  it('play and pause update playback state', () => {
    const store = usePlayerStore()

    store.play()
    expect(store.isPlaying).toBe(true)

    store.pause()
    expect(store.isPlaying).toBe(false)

    store.togglePlayback()
    expect(store.isPlaying).toBe(true)
  })

  it('next and prev navigate tracks with wrap around', () => {
    const store = usePlayerStore()

    store.loadPlaylist({
      playlistId: 1,
      playlistName: 'Default Playlist',
      tracks,
    })

    expect(store.trackIndex).toBe(0)
    expect(store.currentTrack?.id).toBe(1)

    store.nextTrack()
    expect(store.trackIndex).toBe(1)
    expect(store.currentTrack?.id).toBe(2)

    store.nextTrack()
    expect(store.trackIndex).toBe(0)
    expect(store.currentTrack?.id).toBe(1)

    store.prevTrack()
    expect(store.trackIndex).toBe(1)
    expect(store.currentTrack?.id).toBe(2)
  })
})
