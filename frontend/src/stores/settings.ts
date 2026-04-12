import { defineStore } from 'pinia'

export const SLIDESHOW_INTERVAL_OPTIONS = [3, 5, 8, 10, 15] as const
export const DEFAULT_SLIDESHOW_INTERVAL = 5
export const SETTINGS_STORAGE_KEY = 'timesand.settings.slideshow_interval_seconds'

type SlideshowInterval = (typeof SLIDESHOW_INTERVAL_OPTIONS)[number]

function normalizeInterval(value: unknown): SlideshowInterval {
  const parsed = Number.parseInt(String(value), 10)
  if (SLIDESHOW_INTERVAL_OPTIONS.includes(parsed as SlideshowInterval)) {
    return parsed as SlideshowInterval
  }

  return DEFAULT_SLIDESHOW_INTERVAL
}

function readPersistedInterval(): SlideshowInterval {
  if (typeof window === 'undefined') {
    return DEFAULT_SLIDESHOW_INTERVAL
  }

  return normalizeInterval(window.localStorage.getItem(SETTINGS_STORAGE_KEY))
}

function persistInterval(interval: SlideshowInterval): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, String(interval))
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    slideshowIntervalSeconds: readPersistedInterval() as SlideshowInterval,
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
  },
})
