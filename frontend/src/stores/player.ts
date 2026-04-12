import type { Music } from '../types/music'

import { defineStore } from 'pinia'

export type RepeatMode = 'all' | 'one' | 'none'

interface LoadPlaylistPayload {
  playlistId: number | null
  playlistName: string
  tracks: Music[]
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

function wrapIndex(index: number, length: number): number {
  if (length <= 0) {
    return -1
  }

  const wrapped = index % length
  return wrapped < 0 ? wrapped + length : wrapped
}

export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentTrack: null as Music | null,
    tracks: [] as Music[],
    trackIndex: -1,
    isPlaying: false,
    volume: 1,
    currentTime: 0,
    duration: 0,
    repeatMode: 'all' as RepeatMode,
    playlistId: null as number | null,
    playlistName: '',
  }),
  getters: {
    hasTracks: state => state.tracks.length > 0,
  },
  actions: {
    loadPlaylist(payload: LoadPlaylistPayload): void {
      this.playlistId = payload.playlistId
      this.playlistName = payload.playlistName
      this.tracks = [...payload.tracks]
      this.currentTime = 0
      this.duration = 0

      if (this.tracks.length === 0) {
        this.trackIndex = -1
        this.currentTrack = null
        this.isPlaying = false
        return
      }

      this.trackIndex = 0
      this.currentTrack = this.tracks[0] ?? null
    },
    clearPlaylist(): void {
      this.currentTrack = null
      this.tracks = []
      this.trackIndex = -1
      this.isPlaying = false
      this.currentTime = 0
      this.duration = 0
      this.playlistId = null
      this.playlistName = ''
    },
    setTrackIndex(index: number): void {
      if (this.tracks.length === 0) {
        this.trackIndex = -1
        this.currentTrack = null
        return
      }

      this.trackIndex = wrapIndex(index, this.tracks.length)
      this.currentTrack = this.tracks[this.trackIndex] ?? null
      this.currentTime = 0
      this.duration = 0
    },
    nextTrack(): void {
      if (this.tracks.length === 0) {
        return
      }

      this.setTrackIndex(this.trackIndex + 1)
    },
    prevTrack(): void {
      if (this.tracks.length === 0) {
        return
      }

      this.setTrackIndex(this.trackIndex - 1)
    },
    play(): void {
      this.isPlaying = true
    },
    pause(): void {
      this.isPlaying = false
    },
    togglePlayback(): void {
      this.isPlaying = !this.isPlaying
    },
    setVolume(value: number): void {
      this.volume = clamp(value, 0, 1)
    },
    setCurrentTime(value: number): void {
      this.currentTime = Math.max(0, value)
    },
    setDuration(value: number): void {
      this.duration = Number.isFinite(value) ? Math.max(0, value) : 0
    },
    setRepeatMode(value: RepeatMode): void {
      this.repeatMode = value
    },
  },
})
