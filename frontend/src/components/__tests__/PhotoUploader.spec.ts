import { describe, expect, it } from 'vitest'

import { mountWithI18n } from '../../test-utils'
import PhotoUploader from '../PhotoUploader.vue'

describe('photoUploader', () => {
  it('renders drop zone and file input', () => {
    const wrapper = mountWithI18n(PhotoUploader, {
      props: {
        uploading: false,
        progress: 0,
      },
    })

    expect(wrapper.find('[data-testid="photo-uploader-dropzone"]').exists()).toBe(true)

    const fileInput = wrapper.find('input[type="file"]')
    expect(fileInput.exists()).toBe(true)
    expect(fileInput.attributes('multiple')).toBeDefined()
  })
})
