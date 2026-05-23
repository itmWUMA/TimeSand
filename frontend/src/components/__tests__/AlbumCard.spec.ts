import type { Album } from '../../types/album'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountWithI18n } from '../../test-utils'
import AlbumCard from '../AlbumCard.vue'

function createAlbum(overrides: Partial<Album> = {}): Album {
  return {
    id: 1,
    name: 'Vacation 2023',
    description: 'Summer trip',
    cover_photo_id: 8,
    cover_photo: '/api/photos/8/thumbnail?v=thumb.jpg',
    photo_count: 42,
    created_at: '2026-04-06T12:00:00Z',
    updated_at: '2026-04-06T12:00:00Z',
    ...overrides,
  }
}

describe('albumCard', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders album name, description, photo count, relative update time, and cover image', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))

    const wrapper = mountWithI18n(AlbumCard, {
      props: {
        album: createAlbum(),
      },
    })

    expect(wrapper.text()).toContain('Vacation 2023')
    expect(wrapper.text()).toContain('Summer trip')
    expect(wrapper.text()).toContain('42 photos')
    expect(wrapper.text()).toContain('3 days ago')

    const image = wrapper.find('img[alt="Vacation 2023"]')
    expect(image.exists()).toBe(true)
    expect(image.attributes('src')).toBe('/api/photos/8/thumbnail?v=thumb.jpg')
    expect(wrapper.find('[data-testid="album-cover-collage"]').exists()).toBe(true)
  })

  it('hides description when album description is null', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))

    const wrapper = mountWithI18n(AlbumCard, {
      props: {
        album: createAlbum({
          description: null,
        }),
      },
    })

    expect(wrapper.text()).not.toContain('Summer trip')
    expect(wrapper.text()).toContain('42 photos')
    expect(wrapper.text()).toContain('3 days ago')
  })
})
