import type { DrawnCard } from '../../../stores/draw'

import { describe, expect, it, vi } from 'vitest'
import { mountWithI18n } from '../../../test-utils'
import CardScatter from '../CardScatter.vue'

const { staggerInSpy } = vi.hoisted(() => ({
  staggerInSpy: vi.fn(),
}))

vi.mock('gsap', () => ({
  gsap: {
    to: vi.fn(),
    fromTo: vi.fn(),
    timeline: vi.fn(),
  },
}))

vi.mock('../../../composables/motion/sequences', () => ({
  staggerIn: (...args: unknown[]) => staggerInSpy(...args),
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
  it('uses stagger entrance, backdrop blur, and 3D tilt hover interactions', async () => {
    const wrapper = mountWithI18n(CardScatter, {
      props: {
        open: true,
        cards,
      },
    })

    await wrapper.vm.$nextTick()

    const overlay = wrapper.get('[data-draw-scatter]')
    const cardButton = wrapper.findAll('button')[1]
    const cardFace = wrapper.get('[data-scatter-card-face]')
    const cardImage = wrapper.find('img[alt="memory.jpg"]')

    expect(overlay.classes()).toContain('backdrop-blur-ts-sm')
    expect(staggerInSpy).toHaveBeenCalledWith(expect.any(Array), {
      stagger: 0.08,
    })
    expect(cardImage.attributes('src')).toBe('/api/photos/8/thumbnail')

    await cardButton.trigger('mouseenter')
    expect(cardImage.attributes('src')).toBe('/api/photos/8/file')

    Object.defineProperty(cardFace.element, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        width: 100,
        height: 140,
        left: 100,
        top: 100,
        right: 200,
        bottom: 240,
        x: 100,
        y: 100,
        toJSON: () => ({}),
      }),
    })

    await cardButton.trigger('mousemove', {
      clientX: 180,
      clientY: 120,
    })

    expect(vi.mocked(gsapApi.gsap.to)).toHaveBeenLastCalledWith(
      cardFace.element,
      expect.objectContaining({
        rotateY: expect.any(Number),
        rotateX: expect.any(Number),
        scale: 1.08,
      }),
    )

    await cardButton.trigger('mouseleave')

    expect(vi.mocked(gsapApi.gsap.to)).toHaveBeenLastCalledWith(
      cardFace.element,
      expect.objectContaining({
        rotateY: 0,
        rotateX: 0,
        scale: 1,
      }),
    )
  })
})
