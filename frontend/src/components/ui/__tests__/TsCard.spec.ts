import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsCard from '../TsCard.vue'

describe('tsCard', () => {
  it('renders default slot content', () => {
    const wrapper = mount(TsCard, { slots: { default: 'Card body' } })
    expect(wrapper.text()).toContain('Card body')
  })

  it('renders header slot when provided', () => {
    const wrapper = mount(TsCard, {
      slots: {
        header: 'Header',
        default: 'Body',
      },
    })

    expect(wrapper.find('[data-testid="ts-card-header"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Header')
  })

  it('renders footer slot when provided', () => {
    const wrapper = mount(TsCard, {
      slots: {
        default: 'Body',
        footer: 'Footer',
      },
    })

    expect(wrapper.find('[data-testid="ts-card-footer"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Footer')
  })

  it('hides header/footer when slots are not provided', () => {
    const wrapper = mount(TsCard, { slots: { default: 'Body' } })
    expect(wrapper.find('[data-testid="ts-card-header"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="ts-card-footer"]').exists()).toBe(false)
  })

  it('has design token classes', () => {
    const wrapper = mount(TsCard, { slots: { default: 'Body' } })
    expect(wrapper.classes()).toContain('bg-ts-panel')
    expect(wrapper.classes()).toContain('rounded-ts-lg')
  })
})
