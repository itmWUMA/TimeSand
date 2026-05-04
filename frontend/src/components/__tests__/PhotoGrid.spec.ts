import type { Photo } from '../../types/photo'

import { describe, expect, it } from 'vitest'
import { mountWithI18n } from '../../test-utils'
import PhotoGrid from '../PhotoGrid.vue'

const photos: Photo[] = [
  {
    id: 1,
    filename: 'one.jpg',
    file_path: 'one.jpg',
    thumbnail_path: 'one_thumb.jpg',
    file_size: 123,
    width: 800,
    height: 600,
    taken_at: null,
    latitude: null,
    longitude: null,
    uploaded_at: '2026-04-06T12:00:00Z',
    mime_type: 'image/jpeg',
  },
  {
    id: 2,
    filename: 'two.jpg',
    file_path: 'two.jpg',
    thumbnail_path: 'two_thumb.jpg',
    file_size: 123,
    width: 800,
    height: 600,
    taken_at: null,
    latitude: null,
    longitude: null,
    uploaded_at: '2026-04-06T12:00:00Z',
    mime_type: 'image/jpeg',
  },
]

describe('photoGrid', () => {
  it('renders thumbnail images from props', () => {
    const wrapper = mountWithI18n(PhotoGrid, {
      props: {
        photos,
      },
    })

    const items = wrapper.findAll('[data-testid="photo-grid-item"]')
    expect(items).toHaveLength(2)

    const firstImage = wrapper.find('img[alt="one.jpg"]')
    expect(firstImage.exists()).toBe(true)
    expect(firstImage.attributes('src')).toBe('/api/photos/1/thumbnail?v=one_thumb.jpg')
  })

  it('forwards photo item click events with index payload', async () => {
    const wrapper = mountWithI18n(PhotoGrid, {
      props: {
        photos,
      },
    })

    await wrapper.findAll('[data-testid="photo-grid-item"]')[0].trigger('click')

    const payload = wrapper.emitted('photoClick')?.[0]?.[0] as {
      photo: Photo
      index: number
      rect: DOMRect
    }

    expect(payload.photo).toEqual(photos[0])
    expect(payload.index).toBe(0)
    expect(payload.rect).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    })
  })
})
