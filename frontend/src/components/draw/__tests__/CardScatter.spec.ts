import type { DrawnCard } from '../../../stores/draw'
import { mount } from '@vue/test-utils'

import { describe, expect, it, vi } from 'vitest'
import CardScatter from '../CardScatter.vue'

vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn(),
    to: vi.fn(),
  },
}))

const gsapApi = await import('gsap')

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

describe('cardScatter', () => {
  it('loads original image on hover and restores scatter rotation on settle', async () => {
    const wrapper = mount(CardScatter, {
      props: {
        open: true,
        cards,
      },
    })

    const cardButton = wrapper.findAll('button')[1]
    const cardImage = wrapper.find('img[alt="memory.jpg"]')

    expect(cardImage.attributes('src')).toBe('/api/photos/8/thumbnail')

    await cardButton.trigger('mouseenter')

    expect(cardImage.attributes('src')).toBe('/api/photos/8/file')
    expect(vi.mocked(gsapApi.gsap.to)).toHaveBeenLastCalledWith(
      cardButton.element,
      expect.objectContaining({
        y: -26,
        scale: 1.24,
        rotate: 0,
      }),
    )

    await cardButton.trigger('mouseleave')

    expect(vi.mocked(gsapApi.gsap.to)).toHaveBeenLastCalledWith(
      cardButton.element,
      expect.objectContaining({
        y: 0,
        scale: 1,
        rotate: 13,
      }),
    )
  })
})
