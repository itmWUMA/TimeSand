import { createPinia, setActivePinia } from 'pinia'

import { beforeEach, describe, expect, it } from 'vitest'
import {
  DRAW_ANIM_SPEED_STORAGE_KEY,
  DRAW_DEFAULT_ALBUM_STORAGE_KEY,
  DRAW_NEARBY_DAYS_STORAGE_KEY,
  DRAW_WEIGHT_MODE_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  useSettingsStore,
} from '../settings'

describe('useSettingsStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('setInterval persists value and getInterval reads persisted value', () => {
    const store = useSettingsStore()

    store.setInterval(10)

    expect(store.getInterval()).toBe(10)
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toBe('10')

    setActivePinia(createPinia())
    const nextStore = useSettingsStore()
    expect(nextStore.getInterval()).toBe(10)
  })

  it('persists draw weighting settings', () => {
    const store = useSettingsStore()

    store.setDrawWeightMode('strong')
    store.setDrawNearbyDays(7)

    expect(store.drawWeightMode).toBe('strong')
    expect(store.drawNearbyDays).toBe(7)
    expect(window.localStorage.getItem(DRAW_WEIGHT_MODE_STORAGE_KEY)).toBe('strong')
    expect(window.localStorage.getItem(DRAW_NEARBY_DAYS_STORAGE_KEY)).toBe('7')

    setActivePinia(createPinia())
    const nextStore = useSettingsStore()
    expect(nextStore.drawWeightMode).toBe('strong')
    expect(nextStore.drawNearbyDays).toBe(7)
  })

  it('persists draw animation speed setting', () => {
    const store = useSettingsStore()

    store.setDrawAnimSpeed(1.5)

    expect(store.drawAnimSpeed).toBe(1.5)
    expect(window.localStorage.getItem(DRAW_ANIM_SPEED_STORAGE_KEY)).toBe('1.5')

    setActivePinia(createPinia())
    const nextStore = useSettingsStore()
    expect(nextStore.drawAnimSpeed).toBe(1.5)
  })

  it('persists default album setting', () => {
    const store = useSettingsStore()

    store.setDrawDefaultAlbumId(12)
    expect(store.drawDefaultAlbumId).toBe(12)
    expect(window.localStorage.getItem(DRAW_DEFAULT_ALBUM_STORAGE_KEY)).toBe('12')

    store.setDrawDefaultAlbumId(null)
    expect(store.drawDefaultAlbumId).toBeNull()
    expect(window.localStorage.getItem(DRAW_DEFAULT_ALBUM_STORAGE_KEY)).toBe('null')
  })
})
