import type { DrawnCard } from '../../../stores/draw'

import { describe, expect, it } from 'vitest'
import { mountWithI18n } from '../../../test-utils'
import CardPile from '../CardPile.vue'

const cards: DrawnCard[] = [
  {
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
  },
]

describe('cardPile', () => {
  it('appends thumbnail path version query for cache busting', () => {
    const wrapper = mountWithI18n(CardPile, {
      props: { cards },
    })

    const image = wrapper.get('img')
    expect(image.attributes('src')).toBe('/api/photos/8/thumbnail?v=memory_thumb.jpg')
  })

  it('renders recent draws as a prototype ribbon and opens scatter from the ribbon', async () => {
    const wrapper = mountWithI18n(CardPile, {
      props: { cards },
    })

    const ribbon = wrapper.get('[data-draw-ribbon]')
    expect(ribbon.text()).toContain('Recent draws')
    expect(ribbon.text()).toContain('1 /')
    expect(wrapper.get('[data-draw-ribbon-card]').attributes('aria-label')).toContain('memory.jpg')

    await ribbon.trigger('click')
    expect(wrapper.emitted('openScatter')).toHaveLength(1)
  })
})
