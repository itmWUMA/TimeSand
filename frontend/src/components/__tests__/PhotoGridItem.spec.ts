import type { Photo } from '../../types/photo'
import { describe, expect, it, vi } from 'vitest'
import { mountWithI18n } from '../../test-utils'
import PhotoGridItem from '../PhotoGridItem.vue'

const photo: Photo = {
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
}

describe('photoGridItem', () => {
  it('emits photo click payload with index and origin rect', async () => {
    const wrapper = mountWithI18n(PhotoGridItem, {
      props: {
        photo,
        index: 0,
      },
    })

    const item = wrapper.get('[data-testid="photo-grid-item"]')
    vi.spyOn(item.element, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(12, 24, 140, 90),
    )

    await item.trigger('click')

    const payload = wrapper.emitted('photoClick')?.[0]?.[0] as {
      photo: Photo
      index: number
      rect: DOMRect
    }

    expect(payload.photo).toEqual(photo)
    expect(payload.index).toBe(0)
    expect(payload.rect.x).toBe(12)
    expect(payload.rect.y).toBe(24)
  })

  it('shows skeleton before image load and fades image in after load', async () => {
    const wrapper = mountWithI18n(PhotoGridItem, {
      props: {
        photo,
        index: 0,
      },
    })

    const image = wrapper.find('img[alt="one.jpg"]')
    expect(image.attributes('loading')).toBe('lazy')
    expect(wrapper.find('[data-testid="photo-skeleton"]').exists()).toBe(true)
    expect(image.classes()).toContain('opacity-0')

    await image.trigger('load')

    expect(wrapper.find('[data-testid="photo-skeleton"]').exists()).toBe(false)
    expect(image.classes()).toContain('opacity-100')
  })

  it('uses exported photo tile metadata overlay', () => {
    const wrapper = mountWithI18n(PhotoGridItem, {
      props: {
        photo,
        index: 0,
      },
    })

    expect(wrapper.get('[data-testid="photo-grid-item"]').classes()).toContain('photo-grid-tile')
    expect(wrapper.find('[data-testid="photo-grid-item-meta"]').exists()).toBe(true)
  })
})
