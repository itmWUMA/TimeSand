import type { DrawResponse } from '../../services/draw'
import { createPinia, setActivePinia } from 'pinia'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDrawStore } from '../../stores/draw'
import { useCardDraw } from '../useCardDraw'

interface TimelineCallRecord {
  position: number | string | undefined
}

interface TimelineRecord {
  calls: TimelineCallRecord[]
  killed: boolean
  onComplete?: () => void
}

const { playSpy, timelineRecords } = vi.hoisted(() => ({
  playSpy: vi.fn(),
  timelineRecords: [] as TimelineRecord[],
}))

vi.mock('gsap', () => ({
  gsap: {
    timeline: vi.fn((options?: { onComplete?: () => void }) => {
      const record: TimelineRecord = {
        calls: [],
        killed: false,
        onComplete: options?.onComplete,
      }

      const timeline = {
        to: vi.fn((_target, vars, _position) => {
          vars?.onComplete?.()
          return timeline
        }),
        fromTo: vi.fn((_target, _fromVars, toVars, _position) => {
          toVars?.onComplete?.()
          return timeline
        }),
        call: vi.fn((callback: (() => void) | undefined, params?: unknown[], position?: number | string) => {
          record.calls.push({ position })
          if (callback) {
            if (params && params.length > 0) {
              callback(...(params as []))
            }
            else {
              callback()
            }
          }
          return timeline
        }),
        kill: vi.fn(() => {
          record.killed = true
        }),
      }

      timelineRecords.push(record)
      return timeline
    }),
    fromTo: vi.fn((_target, _fromVars, toVars) => {
      toVars?.onComplete?.()
      return {}
    }),
    to: vi.fn((_target, toVars) => {
      toVars?.onComplete?.()
      return {}
    }),
    set: vi.fn(),
  },
}))

vi.mock('../../services/draw', () => ({
  drawPhoto: vi.fn(),
  resetDrawSession: vi.fn(),
}))

vi.mock('../useSoundEffects', () => ({
  useSoundEffects: () => ({
    play: playSpy,
  }),
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

function mockReducedMotion(matches: boolean): void {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('useCardDraw', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    timelineRecords.splice(0, timelineRecords.length)
    mockReducedMotion(false)
    document.body.innerHTML = ''
  })

  it('skips ceremony timeline and sounds when reduced motion is enabled', async () => {
    vi.mocked(drawApi.drawPhoto).mockResolvedValue(drawPayload)
    mockReducedMotion(true)

    const cardDraw = useCardDraw()

    await cardDraw.drawNextCard()

    expect(drawApi.drawPhoto).toHaveBeenCalledWith({
      album_id: null,
      exclude_ids: [],
    })
    expect(cardDraw.ceremonyState.value).toBe('DISPLAYING')
    expect(cardDraw.isDrawing.value).toBe(false)
    expect(playSpy).not.toHaveBeenCalled()
    expect(vi.mocked(gsapApi.gsap.timeline)).not.toHaveBeenCalled()
  })

  it('orchestrates draw ceremony with a single timeline and scheduled sounds', async () => {
    vi.mocked(drawApi.drawPhoto).mockResolvedValue(drawPayload)

    document.body.innerHTML = `
      <button data-draw-deck></button>
      <div data-draw-pile></div>
      <article data-draw-center-card><div data-card-inner></div></article>
      <div data-memory-text></div>
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
    expect(store.drawnCards).toHaveLength(2)
    expect(cardDraw.lastWeightReason.value).toBe('3_years_ago_today')
    expect(vi.mocked(gsapApi.gsap.timeline)).toHaveBeenCalledTimes(1)

    expect(playSpy).toHaveBeenCalledWith('shuffle')
    expect(playSpy).toHaveBeenCalledWith('whoosh')
    expect(playSpy).toHaveBeenCalledWith('flip')
    expect(playSpy).toHaveBeenCalledWith('reveal')
    expect(playSpy).toHaveBeenCalledWith('memory')

    const [ceremonyTimeline] = timelineRecords
    expect(ceremonyTimeline.calls.map(call => call.position)).toEqual(expect.arrayContaining([0.3, 1.05, 1.4]))
    expect(cardDraw.ceremonyState.value).toBe('DISPLAYING')
    expect(cardDraw.isDrawing.value).toBe(true)

    cardDraw.killCeremony()
    expect(ceremonyTimeline.killed).toBe(true)

    ceremonyTimeline.onComplete?.()
    expect(cardDraw.ceremonyState.value).toBe('IDLE')
    expect(cardDraw.isDrawing.value).toBe(false)
  })

  it('keeps current card state when draw api returns 404', async () => {
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
      <article data-draw-center-card><div data-card-inner></div></article>
      <section data-draw-pile></section>
      <div data-memory-text></div>
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
    expect(vi.mocked(gsapApi.gsap.timeline)).not.toHaveBeenCalled()
    expect(store.activeCard?.photo.id).toBe(99)
    expect(store.drawnCards).toHaveLength(1)
    expect(cardDraw.ceremonyState.value).toBe('IDLE')
    expect(cardDraw.isDrawing.value).toBe(false)
    expect(cardDraw.errorMessage.value).toBe('No more photos available to draw')
  })
})
