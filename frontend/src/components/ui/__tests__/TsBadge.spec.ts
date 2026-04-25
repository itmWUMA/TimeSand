import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsBadge from '../TsBadge.vue'

describe('tsBadge', () => {
  it('renders slot content', () => {
    const wrapper = mount(TsBadge, { slots: { default: 'New' } })
    expect(wrapper.text()).toBe('New')
  })

  it('applies default variant', () => {
    const wrapper = mount(TsBadge)
    expect(wrapper.classes()).toContain('bg-white/10')
  })

  it('applies accent variant', () => {
    const wrapper = mount(TsBadge, { props: { variant: 'accent' } })
    expect(wrapper.classes()).toContain('text-ts-accent')
  })

  it('applies error variant', () => {
    const wrapper = mount(TsBadge, { props: { variant: 'error' } })
    expect(wrapper.classes()).toContain('text-red-300')
  })
})
