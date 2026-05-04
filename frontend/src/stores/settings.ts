import type { DrawWeightMode } from '../types/draw'
import { defineStore } from 'pinia'
import { DEFAULT_DRAW_NEARBY_DAYS, DEFAULT_DRAW_WEIGHT_MODE, DRAW_WEIGHT_MODES } from '../types/draw'

export const SLIDESHOW_INTERVAL_OPTIONS = [3, 5, 8, 10, 15] as const
export const DEFAULT_SLIDESHOW_INTERVAL = 5
export const SETTINGS_STORAGE_KEY = 'timesand.settings.slideshow_interval_seconds'
export const DRAW_WEIGHT_MODE_STORAGE_KEY = 'ts-draw-weight-mode'
export const DRAW_NEARBY_DAYS_STORAGE_KEY = 'ts-draw-nearby-days'
export const DRAW_ANIM_SPEED_STORAGE_KEY = 'ts-draw-anim-speed'
export const DRAW_DEFAULT_ALBUM_STORAGE_KEY = 'ts-draw-default-album'

export const DRAW_NEARBY_DAYS_OPTIONS = [1, 3, 7] as const
export const DRAW_ANIMATION_SPEED_OPTIONS = [0.6, 1, 1.5] as const

type SlideshowInterval = (typeof SLIDESHOW_INTERVAL_OPTIONS)[number]
type DrawNearbyDays = (typeof DRAW_NEARBY_DAYS_OPTIONS)[number]
type DrawAnimationSpeed = (typeof DRAW_ANIMATION_SPEED_OPTIONS)[number]

function canUseBrowserApis(): boolean {
  return typeof window !== 'undefined'
}

function normalizeInterval(value: unknown): SlideshowInterval {
  const parsed = Number.parseInt(String(value), 10)
  if (SLIDESHOW_INTERVAL_OPTIONS.includes(parsed as SlideshowInterval)) {
    return parsed as SlideshowInterval
  }

  return DEFAULT_SLIDESHOW_INTERVAL
}

function normalizeWeightMode(value: unknown): DrawWeightMode {
  if (DRAW_WEIGHT_MODES.includes(value as DrawWeightMode)) {
    return value as DrawWeightMode
  }

  return DEFAULT_DRAW_WEIGHT_MODE
}

function normalizeNearbyDays(value: unknown): DrawNearbyDays {
  const parsed = Number.parseInt(String(value), 10)
  if (DRAW_NEARBY_DAYS_OPTIONS.includes(parsed as DrawNearbyDays)) {
    return parsed as DrawNearbyDays
  }

  return DEFAULT_DRAW_NEARBY_DAYS as DrawNearbyDays
}

function normalizeDrawAnimationSpeed(value: unknown): DrawAnimationSpeed {
  const parsed = Number.parseFloat(String(value))
  if (DRAW_ANIMATION_SPEED_OPTIONS.includes(parsed as DrawAnimationSpeed)) {
    return parsed as DrawAnimationSpeed
  }

  return 1
}

function normalizeDrawDefaultAlbumId(value: unknown): number | null {
  if (value == null || value === '' || value === 'null') {
    return null
  }

  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

function readFromLS(key: string): string | null {
  if (!canUseBrowserApis()) {
    return null
  }

  return window.localStorage.getItem(key)
}

function readPersistedInterval(): SlideshowInterval {
  return normalizeInterval(readFromLS(SETTINGS_STORAGE_KEY))
}

function persistInterval(interval: SlideshowInterval): void {
  if (!canUseBrowserApis()) {
    return
  }

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, String(interval))
}

function readPersistedWeightMode(): DrawWeightMode {
  return normalizeWeightMode(readFromLS(DRAW_WEIGHT_MODE_STORAGE_KEY))
}

function persistWeightMode(mode: DrawWeightMode): void {
  if (!canUseBrowserApis()) {
    return
  }

  window.localStorage.setItem(DRAW_WEIGHT_MODE_STORAGE_KEY, mode)
}

function readPersistedNearbyDays(): DrawNearbyDays {
  return normalizeNearbyDays(readFromLS(DRAW_NEARBY_DAYS_STORAGE_KEY))
}

function persistNearbyDays(days: DrawNearbyDays): void {
  if (!canUseBrowserApis()) {
    return
  }

  window.localStorage.setItem(DRAW_NEARBY_DAYS_STORAGE_KEY, String(days))
}

function readPersistedDrawAnimSpeed(): DrawAnimationSpeed {
  return normalizeDrawAnimationSpeed(readFromLS(DRAW_ANIM_SPEED_STORAGE_KEY))
}

function persistDrawAnimSpeed(speed: DrawAnimationSpeed): void {
  if (!canUseBrowserApis()) {
    return
  }

  window.localStorage.setItem(DRAW_ANIM_SPEED_STORAGE_KEY, String(speed))
}

function readPersistedDefaultAlbumId(): number | null {
  return normalizeDrawDefaultAlbumId(readFromLS(DRAW_DEFAULT_ALBUM_STORAGE_KEY))
}

function persistDefaultAlbumId(albumId: number | null): void {
  if (!canUseBrowserApis()) {
    return
  }

  window.localStorage.setItem(
    DRAW_DEFAULT_ALBUM_STORAGE_KEY,
    albumId == null ? 'null' : String(albumId),
  )
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    slideshowIntervalSeconds: readPersistedInterval() as SlideshowInterval,
    drawWeightMode: readPersistedWeightMode() as DrawWeightMode,
    drawNearbyDays: readPersistedNearbyDays() as DrawNearbyDays,
    drawAnimSpeed: readPersistedDrawAnimSpeed() as DrawAnimationSpeed,
    drawDefaultAlbumId: readPersistedDefaultAlbumId() as number | null,
  }),
  actions: {
    setInterval(seconds: number): void {
      const interval = normalizeInterval(seconds)
      this.slideshowIntervalSeconds = interval
      persistInterval(interval)
    },
    getInterval(): SlideshowInterval {
      return this.slideshowIntervalSeconds
    },
    setDrawWeightMode(mode: DrawWeightMode): void {
      const normalized = normalizeWeightMode(mode)
      this.drawWeightMode = normalized
      persistWeightMode(normalized)
    },
    setDrawNearbyDays(days: number): void {
      const normalized = normalizeNearbyDays(days)
      this.drawNearbyDays = normalized
      persistNearbyDays(normalized)
    },
    setDrawAnimSpeed(speed: number): void {
      const normalized = normalizeDrawAnimationSpeed(speed)
      this.drawAnimSpeed = normalized
      persistDrawAnimSpeed(normalized)
    },
    setDrawDefaultAlbumId(albumId: number | null): void {
      const normalized = normalizeDrawDefaultAlbumId(albumId)
      this.drawDefaultAlbumId = normalized
      persistDefaultAlbumId(normalized)
    },
  },
})
