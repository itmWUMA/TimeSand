import { createPinia, setActivePinia } from 'pinia'

import { beforeEach, describe, expect, it } from 'vitest'
import { SETTINGS_STORAGE_KEY, useSettingsStore } from '../settings'

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
})
