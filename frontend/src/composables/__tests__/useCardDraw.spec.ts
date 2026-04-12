import type { DrawResponse } from '../../services/draw'
import { createPinia, setActivePinia } from 'pinia'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDrawStore } from '../../stores/draw'
import { useCardDraw } from '../useCardDraw'

vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_target, _fromVars, toVars) => {
      toVars?.onComplete?.()
      return {}
    }),
    to: vi.fn((_target, toVars) => {
      toVars?.onComplete?.()
      return {}
    }),
  },
}))

vi.mock('../../services/draw', () => ({
  drawPhoto: vi.fn(),
  resetDrawSession: vi.fn(),
}))

const drawApi = await import('../../services/draw')
const gsapApi = await import('gsap')

const drawPayload: DrawResponse = {
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
  weight_reason: '3_years_ago_today',
}

describe('useCardDraw', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('drawNextCard calls draw api and updates draw store', async () => {
    vi.mocked(drawApi.drawPhoto).mockResolvedValue(drawPayload)

    const cardDraw = useCardDraw()
    const store = useDrawStore()

    await cardDraw.drawNextCard()

    expect(drawApi.drawPhoto).toHaveBeenCalledWith({
      album_id: null,
      exclude_ids: [],
    })
    expect(store.drawnCards).toHaveLength(1)
    expect(store.excludeIds).toEqual([8])
  })

  it('keeps current card visual state when draw api returns 404', async () => {
    vi.mocked(drawApi.drawPhoto).mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          detail: 'No more photos available to draw',
        },
      },
    })

    document.body.innerHTML = `
      <button data-draw-deck></button>
      <article data-draw-center-card></article>
      <section data-draw-pile></section>
    `

    const cardDraw = useCardDraw()
    const store = useDrawStore()

    store.addDrawnCard({
      photo: {
        ...drawPayload.photo,
        id: 99,
        filename: 'active.jpg',
      },
      weightReason: null,
    })

    await cardDraw.drawNextCard()

    expect(drawApi.drawPhoto).toHaveBeenCalledWith({
      album_id: null,
      exclude_ids: [99],
    })
    expect(vi.mocked(gsapApi.gsap.to)).not.toHaveBeenCalled()
    expect(store.activeCard?.photo.id).toBe(99)
    expect(store.drawnCards).toHaveLength(1)
    expect(cardDraw.errorMessage.value).toBe('No more photos available to draw')
  })
})
