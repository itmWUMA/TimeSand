import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsTabs from '../TsTabs.vue'

const tabs = [
  { value: 'one', label: 'Tab One' },
  { value: 'two', label: 'Tab Two' },
]

describe('tsTabs', () => {
  it('renders tab triggers', () => {
    const wrapper = mount(TsTabs, { props: { tabs } })
    const triggers = wrapper.findAll('[data-testid="ts-tabs-trigger"]')

    expect(triggers).toHaveLength(2)
    expect(triggers[0].text()).toBe('Tab One')
    expect(triggers[1].text()).toBe('Tab Two')
  })

  it('emits update:modelValue on tab click', async () => {
    const wrapper = mount(TsTabs, {
      props: {
        tabs,
        modelValue: 'one',
      },
    })

    const secondTab = wrapper.findAll('[data-testid="ts-tabs-trigger"]')[1]
    await secondTab.trigger('mousedown', { button: 0 })

    const emitted = wrapper.emitted('update:modelValue')!
    expect(emitted).toHaveLength(1)
    expect(emitted[0]).toEqual(['two'])
  })
})
