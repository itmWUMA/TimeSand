import type { Photo } from '../../types/photo'

import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mountWithI18n } from '../../test-utils'
import SlideshowPlayer from '../SlideshowPlayer.vue'

const photos: Photo[] = [
  {
    id: 1,
    filename: 'one.jpg',
    file_path: 'one.jpg',
    thumbnail_path: 'one_thumb.jpg',
    file_size: 1024,
    width: 1200,
    height: 800,
    taken_at: null,
    latitude: null,
    longitude: null,
    uploaded_at: '2026-04-12T00:00:00Z',
    mime_type: 'image/jpeg',
  },
]

describe('slideshowPlayer', () => {
  it('renders dual image stack and control buttons', async () => {
    const wrapper = mountWithI18n(SlideshowPlayer, {
      props: {
        photos,
        currentIndex: 0,
        isPlaying: true,
        intervalSeconds: 5,
        intervalOptions: [3, 5, 8],
        controlsVisible: true,
        transitionMode: 'kenBurns',
      },
      global: {
        plugins: [createPinia()],
      },
    })

    await nextTick()

    const imageA = wrapper.find('[data-testid="slideshow-img-a"]')
    const imageB = wrapper.find('[data-testid="slideshow-img-b"]')

    expect(imageA.exists()).toBe(true)
    expect(imageB.exists()).toBe(true)

    const imageSources = [imageA.attributes('src'), imageB.attributes('src')]
    expect(imageSources.some(src => src?.includes('/api/photos/1/file'))).toBe(true)

    expect(wrapper.find('[data-testid="control-prev"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="control-next"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="control-play-pause"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="control-interval"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="control-transition"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="control-exit"]').exists()).toBe(true)
  })

  it('emits cycleTransition when transition button is clicked', async () => {
    const wrapper = mountWithI18n(SlideshowPlayer, {
      props: {
        photos,
        currentIndex: 0,
        isPlaying: true,
        intervalSeconds: 5,
        intervalOptions: [3, 5, 8],
        controlsVisible: true,
        transitionMode: 'kenBurns',
      },
      global: {
        plugins: [createPinia()],
      },
    })

    await wrapper.find('[data-testid="control-transition"]').trigger('click')

    expect(wrapper.emitted('cycleTransition')).toHaveLength(1)
  })
})
