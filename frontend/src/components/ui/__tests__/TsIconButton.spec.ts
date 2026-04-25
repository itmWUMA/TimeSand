import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsIconButton from '../TsIconButton.vue'

describe('tsIconButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(TsIconButton, {
      props: { label: 'Close' },
      slots: { default: 'X' },
    })

    expect(wrapper.text()).toBe('X')
  })

  it('sets aria-label and title from label prop', () => {
    const wrapper = mount(TsIconButton, { props: { label: 'Close' } })
    expect(wrapper.attributes('aria-label')).toBe('Close')
    expect(wrapper.attributes('title')).toBe('Close')
  })

  it('applies ghost variant by default', () => {
    const wrapper = mount(TsIconButton, { props: { label: 'Test' } })
    expect(wrapper.classes()).toContain('text-ts-muted')
  })

  it('is square shaped', () => {
    const wrapper = mount(TsIconButton, {
      props: { label: 'Test', size: 'md' },
    })

    expect(wrapper.classes()).toContain('h-9')
    expect(wrapper.classes()).toContain('w-9')
  })

  it('emits click event', async () => {
    const wrapper = mount(TsIconButton, { props: { label: 'Test' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
