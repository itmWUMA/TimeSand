import { describe, expect, it } from 'vitest'

import { mountWithI18n } from '../../test-utils'
import PhotoUploader from '../PhotoUploader.vue'

describe('photoUploader', () => {
  it('renders drop zone and file input', () => {
    const wrapper = mountWithI18n(PhotoUploader, {
      props: {
        uploading: false,
      },
    })

    expect(wrapper.find('[data-testid="photo-uploader-dropzone"]').exists()).toBe(true)

    const fileInput = wrapper.find('input[type="file"]')
    expect(fileInput.exists()).toBe(true)
    expect(fileInput.attributes('multiple')).toBeDefined()
    expect(fileInput.attributes('accept')).toContain('.heic')
  })

  it('renders upload queue rows with cancel and retry actions', async () => {
    const wrapper = mountWithI18n(PhotoUploader, {
      props: {
        uploading: true,
        queue: [
          {
            id: '1',
            filename: 'IMG_2018.HEIC',
            sizeLabel: '3.4 MB',
            status: 'uploading',
            progress: 62,
          },
          {
            id: '2',
            filename: 'broken.heic',
            sizeLabel: '2.8 MB',
            status: 'failed',
            progress: 0,
          },
        ],
      },
    })

    expect(wrapper.find('[data-testid="photo-upload-queue"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('IMG_2018.HEIC')
    expect(wrapper.text()).toContain('broken.heic')
    expect(wrapper.findAll('[data-testid="photo-upload-cancel"]')).toHaveLength(1)

    await wrapper.get('[data-testid="photo-upload-cancel"]').trigger('click')
    await wrapper.get('[data-testid="photo-upload-retry-2"]').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('retry')?.[0]).toEqual(['2'])
  })
})
