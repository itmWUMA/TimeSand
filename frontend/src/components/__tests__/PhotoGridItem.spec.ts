import type { Photo } from '../../types/photo'
import { describe, expect, it } from 'vitest'
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
  it('emits click with photo payload', async () => {
    const wrapper = mountWithI18n(PhotoGridItem, {
      props: {
        photo,
      },
    })

    await wrapper.find('[data-testid="photo-grid-item"]').trigger('click')

    expect(wrapper.emitted('click')).toEqual([[photo]])
  })

  it('shows skeleton before image load and fades image in after load', async () => {
    const wrapper = mountWithI18n(PhotoGridItem, {
      props: {
        photo,
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
})
