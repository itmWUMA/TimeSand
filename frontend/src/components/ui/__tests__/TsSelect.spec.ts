import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsSelect from '../TsSelect.vue'

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
]

describe('tsSelect', () => {
  it('renders trigger button', () => {
    const wrapper = mount(TsSelect, { props: { options } })
    expect(wrapper.find('[data-testid="ts-select-trigger"]').exists()).toBe(true)
  })

  it('renders label linked to trigger via aria-labelledby', () => {
    const wrapper = mount(TsSelect, { props: { options, label: 'Choice' } })
    const label = wrapper.find('label')
    const trigger = wrapper.find('[data-testid="ts-select-trigger"]')
    expect(label.text()).toBe('Choice')
    expect(trigger.attributes('aria-labelledby')).toBe(label.attributes('id'))
  })

  it('sets placeholder on trigger', () => {
    const wrapper = mount(TsSelect, {
      props: { options, placeholder: 'Pick one' },
    })
    expect(wrapper.text()).toContain('Pick one')
  })

  it('applies disabled state', () => {
    const wrapper = mount(TsSelect, { props: { options, disabled: true } })
    expect(wrapper.find('[data-testid="ts-select-trigger"]').attributes('disabled')).toBeDefined()
  })
})
