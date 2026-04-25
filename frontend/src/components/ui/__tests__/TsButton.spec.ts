import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsButton from '../TsButton.vue'

describe('tsButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(TsButton, { slots: { default: 'Click me' } })
    expect(wrapper.text()).toBe('Click me')
  })

  it('applies primary variant by default', () => {
    const wrapper = mount(TsButton)
    expect(wrapper.classes()).toContain('bg-ts-accent')
  })

  it('applies secondary variant', () => {
    const wrapper = mount(TsButton, { props: { variant: 'secondary' } })
    expect(wrapper.classes()).toContain('border-ts-accent')
  })

  it('applies ghost variant', () => {
    const wrapper = mount(TsButton, { props: { variant: 'ghost' } })
    expect(wrapper.classes()).toContain('hover:bg-white/10')
  })

  it('applies size classes', () => {
    const sm = mount(TsButton, { props: { size: 'sm' } })
    expect(sm.classes()).toContain('text-xs')

    const lg = mount(TsButton, { props: { size: 'lg' } })
    expect(lg.classes()).toContain('text-base')
  })

  it('is disabled when prop is true', () => {
    const wrapper = mount(TsButton, { props: { disabled: true } })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('emits click event', async () => {
    const wrapper = mount(TsButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
