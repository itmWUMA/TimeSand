import type { Tag } from '../../types/album'

import { describe, expect, it } from 'vitest'
import { mountWithI18n } from '../../test-utils'
import TagManager from '../TagManager.vue'

const allTags: Tag[] = [
  { id: 1, name: 'sunset' },
  { id: 2, name: 'travel' },
]

describe('tagManager', () => {
  it('renders existing tags and emits add/remove actions', async () => {
    const wrapper = mountWithI18n(TagManager, {
      props: {
        tags: [allTags[0]],
        availableTags: allTags,
      },
    })

    expect(wrapper.text()).toContain('sunset')

    await wrapper.get('[data-testid="tag-input"]').setValue('travel')
    await wrapper.get('[data-testid="add-tag-button"]').trigger('click')

    expect(wrapper.emitted('addTag')).toBeTruthy()
    expect(wrapper.emitted('addTag')?.[0]).toEqual([2])

    await wrapper.get('[data-testid="remove-tag-1"]').trigger('click')
    expect(wrapper.emitted('removeTag')?.[0]).toEqual([1])
  })

  it('emits createTag when user enters an unknown tag', async () => {
    const wrapper = mountWithI18n(TagManager, {
      props: {
        tags: [],
        availableTags: allTags,
      },
    })

    await wrapper.get('[data-testid="tag-input"]').setValue('golden-hour')
    await wrapper.get('[data-testid="add-tag-button"]').trigger('click')

    expect(wrapper.emitted('createTag')?.[0]).toEqual(['golden-hour'])
  })
})
