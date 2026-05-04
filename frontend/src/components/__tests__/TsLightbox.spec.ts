import type { Photo } from '../../types/photo'

import { afterEach, describe, expect, it } from 'vitest'
import { mountWithI18n } from '../../test-utils'
import TsLightbox from '../TsLightbox.vue'

const photos: Photo[] = [
  {
    id: 1,
    filename: 'first.jpg',
    file_path: 'first.jpg',
    thumbnail_path: 'first_thumb.jpg',
    file_size: 2048,
    width: 1920,
    height: 1080,
    taken_at: '2025-01-02T12:30:00Z',
    latitude: 31.23,
    longitude: 121.47,
    uploaded_at: '2026-04-01T12:00:00Z',
    mime_type: 'image/jpeg',
  },
  {
    id: 2,
    filename: 'second.jpg',
    file_path: 'second.jpg',
    thumbnail_path: 'second_thumb.jpg',
    file_size: 4096,
    width: 2048,
    height: 1365,
    taken_at: '2024-03-02T03:05:00Z',
    latitude: null,
    longitude: null,
    uploaded_at: '2026-04-02T12:00:00Z',
    mime_type: 'image/jpeg',
  },
]

afterEach(() => {
  document.body.innerHTML = ''
})

describe('tsLightbox', () => {
  it('navigates photos and respects prev/next bounds', async () => {
    const wrapper = mountWithI18n(TsLightbox, {
      props: {
        open: true,
        photos,
        initialIndex: 0,
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    })

    expect(wrapper.get('[data-testid="lightbox-image"]').attributes('src')).toContain('/api/photos/1/file')

    await wrapper.get('[data-testid="lightbox-next"]').trigger('click')
    expect(wrapper.get('[data-testid="lightbox-image"]').attributes('src')).toContain('/api/photos/2/file')
    expect(wrapper.find('[data-testid="lightbox-next"]').exists()).toBe(false)

    await wrapper.get('[data-testid="lightbox-prev"]').trigger('click')
    expect(wrapper.get('[data-testid="lightbox-image"]').attributes('src')).toContain('/api/photos/1/file')
  })

  it('handles keyboard navigation and escape close', async () => {
    const wrapper = mountWithI18n(TsLightbox, {
      props: {
        open: true,
        photos,
        initialIndex: 0,
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="lightbox-image"]').attributes('src')).toContain('/api/photos/2/file')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-testid="lightbox-image"]').attributes('src')).toContain('/api/photos/1/file')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('shows Unknown for missing EXIF fields', () => {
    const wrapper = mountWithI18n(TsLightbox, {
      props: {
        open: true,
        photos: [
          {
            ...photos[0],
            file_size: -1,
            width: 0,
            height: 0,
            taken_at: null,
            latitude: null,
            longitude: null,
            mime_type: '',
          },
        ],
        initialIndex: 0,
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    })

    const text = wrapper.get('[data-testid="lightbox-exif"]').text()
    expect(text).toContain('Unknown')
  })
})
