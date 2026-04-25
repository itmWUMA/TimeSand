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

  it('renders label when provided', () => {
    const wrapper = mount(TsSelect, { props: { options, label: 'Choice' } })
    expect(wrapper.find('label').text()).toBe('Choice')
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
