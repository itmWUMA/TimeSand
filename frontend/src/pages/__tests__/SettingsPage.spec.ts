import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getStorageInfo } from '../../services/settings'
import SettingsPage from '../SettingsPage.vue'

vi.mock('../../services/settings', () => ({
  getStorageInfo: vi.fn(),
}))

describe('settingsPage', () => {
  beforeEach(() => {
    vi.mocked(getStorageInfo).mockResolvedValue({
      photo_count: 142,
      music_count: 23,
      photo_storage_bytes: 524288000,
      music_storage_bytes: 104857600,
      total_storage_bytes: 629145600,
      thumbnail_count: 142,
    })
  })

  it('renders storage info section', async () => {
    const wrapper = mount(SettingsPage, {
      global: {
        plugins: [createPinia()],
      },
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="settings-storage-section"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Storage Info')
    expect(wrapper.text()).toContain('142')
    expect(wrapper.text()).toContain('23')
  })
})
