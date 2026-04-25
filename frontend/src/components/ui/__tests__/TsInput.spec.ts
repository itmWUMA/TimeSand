import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsInput from '../TsInput.vue'

describe('tsInput', () => {
  it('renders input element', () => {
    const wrapper = mount(TsInput)
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('renders label when provided', () => {
    const wrapper = mount(TsInput, { props: { label: 'Name' } })
    expect(wrapper.find('label').text()).toBe('Name')
  })

  it('hides label when not provided', () => {
    const wrapper = mount(TsInput)
    expect(wrapper.find('label').exists()).toBe(false)
  })

  it('shows error message and error class', () => {
    const wrapper = mount(TsInput, { props: { error: 'Required' } })
    expect(wrapper.text()).toContain('Required')
    expect(wrapper.find('input').classes()).toContain('border-red-400/60')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(TsInput)
    await wrapper.find('input').setValue('hello')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['hello'])
  })

  it('sets placeholder', () => {
    const wrapper = mount(TsInput, { props: { placeholder: 'Enter...' } })
    expect(wrapper.find('input').attributes('placeholder')).toBe('Enter...')
  })
})
