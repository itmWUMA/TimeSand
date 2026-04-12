import type { EffectScope } from 'vue'
import type { Photo } from '../../types/photo'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { useSlideshow } from '../useSlideshow'

function buildPhoto(id: number): Photo {
  return {
    id,
    filename: `${id}.jpg`,
    file_path: `${id}.jpg`,
    thumbnail_path: `${id}_thumb.jpg`,
    file_size: 1024,
    width: 1920,
    height: 1080,
    taken_at: null,
    latitude: null,
    longitude: null,
    uploaded_at: '2026-04-12T00:00:00Z',
    mime_type: 'image/jpeg',
  }
}

describe('useSlideshow', () => {
  let scope: EffectScope | undefined

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    scope?.stop()
    scope = undefined
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  const mountComposable = (photos: Photo[]) => {
    const photoRef = ref(photos)
    scope = effectScope()

    const slideshow = scope.run(() => useSlideshow(photoRef))
    if (!slideshow) {
      throw new Error('Failed to mount useSlideshow')
    }

    return slideshow
  }

  it('advances index and wraps at the end', () => {
    const slideshow = mountComposable([buildPhoto(1), buildPhoto(2)])

    expect(slideshow.currentIndex.value).toBe(0)

    slideshow.next()
    expect(slideshow.currentIndex.value).toBe(1)

    slideshow.next()
    expect(slideshow.currentIndex.value).toBe(0)

    slideshow.prev()
    expect(slideshow.currentIndex.value).toBe(1)
  })

  it('pause stops the auto-advance timer', () => {
    const slideshow = mountComposable([buildPhoto(1), buildPhoto(2)])

    vi.advanceTimersByTime(5000)
    expect(slideshow.currentIndex.value).toBe(1)

    slideshow.togglePlayPause()
    expect(slideshow.isPlaying.value).toBe(false)

    vi.advanceTimersByTime(15000)
    expect(slideshow.currentIndex.value).toBe(1)
  })

  it('next and prev reset timer when navigating manually', () => {
    const slideshow = mountComposable([buildPhoto(1), buildPhoto(2)])

    vi.advanceTimersByTime(3000)
    slideshow.next()
    expect(slideshow.currentIndex.value).toBe(1)

    vi.advanceTimersByTime(2500)
    expect(slideshow.currentIndex.value).toBe(1)

    vi.advanceTimersByTime(2500)
    expect(slideshow.currentIndex.value).toBe(0)

    slideshow.prev()
    expect(slideshow.currentIndex.value).toBe(1)
  })

  it('setIntervalSeconds updates interval duration', () => {
    const slideshow = mountComposable([buildPhoto(1), buildPhoto(2)])

    slideshow.setIntervalSeconds(3)
    expect(slideshow.intervalSeconds.value).toBe(3)

    vi.advanceTimersByTime(2999)
    expect(slideshow.currentIndex.value).toBe(0)

    vi.advanceTimersByTime(1)
    expect(slideshow.currentIndex.value).toBe(1)
  })
})
