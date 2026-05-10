import { flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listAlbums } from '../../services/album'
import { exportBackup, importBackup } from '../../services/backup'
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

vi.mock('../../services/backup', () => ({
  exportBackup: vi.fn(),
  importBackup: vi.fn(),
}))

vi.mock('../../composables/useSoundEffects', () => ({
  useSoundEffects: () => soundEffectsMock,
}))

describe('settingsPage', () => {
  function getRenderedText(wrapperText: string): string {
    return `${wrapperText} ${document.body.textContent ?? ''}`.trim()
  }

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
    vi.mocked(exportBackup).mockResolvedValue({
      blob: new Blob(['backup-data'], { type: 'application/zip' }),
      filename: 'timesand-backup-2026-05-10.zip',
    })
    vi.mocked(importBackup).mockResolvedValue({
      message: 'Backup restored successfully. Please restart the application.',
      photo_count: 42,
      music_count: 10,
      thumbnails_regenerated: true,
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders storage and data management sections', async () => {
    const wrapper = mountWithI18n(SettingsPage, {
      global: {
        plugins: [createPinia()],
      },
      attachTo: document.body,
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="settings-storage-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="settings-backup-section"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Storage Info')
    expect(wrapper.text()).toContain('Data Management')
    expect(wrapper.text()).toContain('142')
    expect(wrapper.text()).toContain('23')
    expect(wrapper.text()).toContain('Language')
    expect(wrapper.text()).toContain('Card Draw')
    expect(wrapper.text()).toContain('Sound Effects')
    expect(listAlbums).toHaveBeenCalledTimes(1)
  })

  it('shows restore confirmation dialog before uploading backup', async () => {
    const wrapper = mountWithI18n(SettingsPage, {
      global: {
        plugins: [createPinia()],
      },
      attachTo: document.body,
    })

    await flushPromises()

    const input = wrapper.get('input[type="file"]')
    const backupFile = new File(['zip-content'], 'restore-target.zip', { type: 'application/zip' })

    Object.defineProperty(input.element, 'files', {
      value: [backupFile],
      configurable: true,
    })
    await input.trigger('change')
    await flushPromises()

    const renderedText = getRenderedText(wrapper.text())
    expect(renderedText).toContain('Confirm Restore')
    expect(renderedText).toContain('restore-target.zip')
    expect(renderedText).toContain('This will replace all existing data')
    expect(importBackup).not.toHaveBeenCalled()
  })
})
