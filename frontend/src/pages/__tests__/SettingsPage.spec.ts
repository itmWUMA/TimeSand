import { flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listAlbums } from '../../services/album'
import { getStorageInfo } from '../../services/settings'
import { mountWithI18n } from '../../test-utils'
import SettingsPage from '../SettingsPage.vue'

const soundEffectsMock = vi.hoisted(() => {
  const isMuted = { value: false }
  return {
    isMuted,
    setVolume: vi.fn(),
    getVolume: vi.fn(() => 0.6),
    mute: vi.fn(() => {
      isMuted.value = true
    }),
    unmute: vi.fn(() => {
      isMuted.value = false
    }),
  }
})

vi.mock('../../services/album', () => ({
  listAlbums: vi.fn(),
}))

vi.mock('../../services/settings', () => ({
  getStorageInfo: vi.fn(),
}))

vi.mock('../../composables/useSoundEffects', () => ({
  useSoundEffects: () => soundEffectsMock,
}))

describe('settingsPage', () => {
  beforeEach(() => {
    soundEffectsMock.isMuted.value = false
    vi.clearAllMocks()

    vi.mocked(getStorageInfo).mockResolvedValue({
      photo_count: 142,
      music_count: 23,
      photo_storage_bytes: 524288000,
      music_storage_bytes: 104857600,
      total_storage_bytes: 629145600,
      thumbnail_count: 142,
    })
    vi.mocked(listAlbums).mockResolvedValue({
      items: [],
      total: 0,
    })
  })

  it('renders storage info section', async () => {
    const wrapper = mountWithI18n(SettingsPage, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="settings-storage-section"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Storage Info')
    expect(wrapper.text()).toContain('142')
    expect(wrapper.text()).toContain('23')
    expect(wrapper.text()).toContain('Language')
    expect(wrapper.text()).toContain('Card Draw')
    expect(wrapper.text()).toContain('Sound Effects')
    expect(listAlbums).toHaveBeenCalledTimes(1)
  })
})
