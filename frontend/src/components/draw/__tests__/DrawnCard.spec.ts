import type { DrawnCard } from '../../../stores/draw'

import { describe, expect, it, vi } from 'vitest'
import { mountWithI18n } from '../../../test-utils'
import DrawnCardComponent from '../DrawnCard.vue'

const card: DrawnCard = {
  photo: {
    id: 8,
    filename: 'memory.jpg',
    file_path: 'memory.jpg',
    thumbnail_path: 'memory_thumb.jpg',
    file_size: 2048,
    width: 1920,
    height: 1080,
    taken_at: '2023-04-06T15:30:00Z',
    latitude: null,
    longitude: null,
    uploaded_at: '2026-04-01T12:00:00Z',
    mime_type: 'image/jpeg',
  },
  weightReason: '3_years_ago_today',
  pileOffsetX: 8,
  pileRotation: -3,
  scatterX: 15,
  scatterY: -7,
  scatterRotation: 13,
}

describe('drawnCard', () => {
  it('appends file path version query for cache busting', () => {
    const wrapper = mountWithI18n(DrawnCardComponent, {
      props: {
        card,
        center: true,
      },
    })

    const image = wrapper.get('img')
    expect(image.attributes('src')).toBe('/api/photos/8/file?v=memory.jpg')
  })

  it('emits photo click payload with origin rect', async () => {
    const wrapper = mountWithI18n(DrawnCardComponent, {
      props: {
        card,
        center: true,
      },
    })

    const root = wrapper.get('article')
    vi.spyOn(root.element, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(10, 16, 180, 260),
    )

    await wrapper.get('.cursor-zoom-in').trigger('click')

    const payload = wrapper.emitted('photoClick')?.[0]?.[0] as {
      photo: DrawnCard['photo']
      rect: DOMRect
    }
    expect(payload.photo.id).toBe(card.photo.id)
    expect(payload.rect.width).toBe(180)
  })
})
