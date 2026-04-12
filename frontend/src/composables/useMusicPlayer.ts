import type { Music } from '../types/music'

import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { getAlbum } from '../services/album'
import { getPlaylist, listPlaylists } from '../services/playlist'
import { usePlayerStore } from '../stores/player'

type PlayerContext = 'default' | 'album'

let sharedAudio: HTMLAudioElement | null = null
let listenersAttached = false
let contextRequestId = 0
let boundStore: ReturnType<typeof usePlayerStore> | null = null

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

function getAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio()
    sharedAudio.preload = 'metadata'
  }
  return sharedAudio
}

function parseAlbumPlaylistId(album: unknown): number | null {
  if (typeof album !== 'object' || album == null) {
    return null
  }

  const playlistId = Reflect.get(album, 'playlist_id')
  if (typeof playlistId !== 'number' || !Number.isInteger(playlistId) || playlistId <= 0) {
    return null
  }

  return playlistId
}

function trackStreamUrl(track: Music): string {
  return `/api/music/${track.id}/file`
}

async function syncCurrentTrack(shouldPlay: boolean): Promise<void> {
  if (!boundStore) {
    return
  }

  const audio = getAudio()
  const track = boundStore.currentTrack

  if (!track) {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    boundStore.pause()
    boundStore.setCurrentTime(0)
    boundStore.setDuration(0)
    return
  }

  const nextSrc = trackStreamUrl(track)
  const srcLoaded = audio.src.endsWith(nextSrc)

  if (!srcLoaded) {
    audio.src = nextSrc
    audio.currentTime = 0
    boundStore.setCurrentTime(0)
  }

  audio.volume = boundStore.volume

  if (!shouldPlay) {
    return
  }

  try {
    await audio.play()
    boundStore.play()
  }
  catch {
    boundStore.pause()
  }
}

async function handleTrackEnded(): Promise<void> {
  if (!boundStore || boundStore.tracks.length === 0) {
    return
  }

  if (boundStore.repeatMode === 'one') {
    const audio = getAudio()
    audio.currentTime = 0
    boundStore.setCurrentTime(0)
    await syncCurrentTrack(true)
    return
  }

  const isLastTrack = boundStore.trackIndex === boundStore.tracks.length - 1
  if (boundStore.repeatMode === 'none' && isLastTrack) {
    boundStore.pause()
    return
  }

  boundStore.nextTrack()
  await syncCurrentTrack(true)
}

function ensureListeners(): void {
  if (listenersAttached) {
    return
  }

  const audio = getAudio()

  audio.addEventListener('timeupdate', () => {
    if (!boundStore) {
      return
    }
    boundStore.setCurrentTime(audio.currentTime || 0)
  })

  audio.addEventListener('loadedmetadata', () => {
    if (!boundStore) {
      return
    }
    boundStore.setDuration(audio.duration)
  })

  audio.addEventListener('durationchange', () => {
    if (!boundStore) {
      return
    }
    boundStore.setDuration(audio.duration)
  })

  audio.addEventListener('play', () => {
    boundStore?.play()
  })

  audio.addEventListener('pause', () => {
    if (audio.ended) {
      return
    }
    boundStore?.pause()
  })

  audio.addEventListener('ended', () => {
    void handleTrackEnded()
  })

  listenersAttached = true
}

async function loadPlaylistById(playlistId: number): Promise<void> {
  if (!boundStore) {
    return
  }

  if (boundStore.playlistId === playlistId && boundStore.tracks.length > 0) {
    return
  }

  const shouldResume = boundStore.isPlaying
  try {
    const playlist = await getPlaylist(playlistId)
    boundStore.loadPlaylist({
      playlistId: playlist.id,
      playlistName: playlist.name,
      tracks: playlist.tracks,
    })
    await syncCurrentTrack(shouldResume)
  }
  catch (error) {
    console.error(`Failed to load playlist ${playlistId}:`, error)
  }
}

async function loadDefaultPlaylist(): Promise<void> {
  if (!boundStore) {
    return
  }

  try {
    const payload = await listPlaylists()
    const fallback = payload.items.find(item => item.is_default) ?? payload.items[0]

    if (!fallback) {
      boundStore.clearPlaylist()
      await syncCurrentTrack(false)
      return
    }

    await loadPlaylistById(fallback.id)
  }
  catch (error) {
    console.error('Failed to load default playlist:', error)
    boundStore.clearPlaylist()
    await syncCurrentTrack(false)
  }
}

export function useMusicPlayer() {
  const store = usePlayerStore()
  boundStore = store

  const audio = getAudio()
  audio.volume = store.volume
  ensureListeners()

  const refs = storeToRefs(store)

  async function setContext(context: PlayerContext, albumId?: number): Promise<void> {
    const currentRequestId = ++contextRequestId

    if (context === 'album' && typeof albumId === 'number' && albumId > 0) {
      try {
        const album = await getAlbum(albumId)
        if (currentRequestId !== contextRequestId) {
          return
        }

        const playlistId = parseAlbumPlaylistId(album)
        if (playlistId != null) {
          await loadPlaylistById(playlistId)
          return
        }
      }
      catch {
      }
    }

    if (currentRequestId !== contextRequestId) {
      return
    }

    await loadDefaultPlaylist()
  }

  async function play(): Promise<void> {
    if (!store.currentTrack) {
      return
    }

    store.play()
    await syncCurrentTrack(true)
  }

  function pause(): void {
    audio.pause()
    store.pause()
  }

  async function togglePlayPause(): Promise<void> {
    if (store.isPlaying) {
      pause()
      return
    }

    await play()
  }

  async function next(): Promise<void> {
    if (!store.hasTracks) {
      return
    }

    const shouldResume = store.isPlaying
    store.nextTrack()
    await syncCurrentTrack(shouldResume)
  }

  async function prev(): Promise<void> {
    if (!store.hasTracks) {
      return
    }

    const shouldResume = store.isPlaying
    store.prevTrack()
    await syncCurrentTrack(shouldResume)
  }

  function seekTo(timeInSeconds: number): void {
    const max = Number.isFinite(audio.duration) ? audio.duration : store.duration
    const nextTime = clamp(timeInSeconds, 0, max > 0 ? max : 0)
    audio.currentTime = nextTime
    store.setCurrentTime(nextTime)
  }

  function setVolume(nextVolume: number): void {
    store.setVolume(nextVolume)
    audio.volume = store.volume
  }

  function formatTime(value: number): string {
    if (!Number.isFinite(value) || value < 0) {
      return '0:00'
    }

    const totalSeconds = Math.floor(value)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercent = computed(() => {
    if (refs.duration.value <= 0) {
      return 0
    }
    return clamp((refs.currentTime.value / refs.duration.value) * 100, 0, 100)
  })

  return {
    ...refs,
    progressPercent,
    setContext,
    play,
    pause,
    togglePlayPause,
    next,
    prev,
    seekTo,
    setVolume,
    formatTime,
  }
}

export function __resetMusicPlayerForTests(): void {
  contextRequestId = 0
  listenersAttached = false
  boundStore = null
  sharedAudio = null
}
