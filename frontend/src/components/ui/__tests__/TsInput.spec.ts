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

  it('shows error message with aria attributes', () => {
    const wrapper = mount(TsInput, { props: { error: 'Required' } })
    const input = wrapper.find('input')
    expect(wrapper.text()).toContain('Required')
    expect(input.classes()).toContain('border-red-400/60')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe(wrapper.find('p').attributes('id'))
  })

  it('links label to input via for/id', () => {
    const wrapper = mount(TsInput, { props: { label: 'Email' } })
    const input = wrapper.find('input')
    const label = wrapper.find('label')
    expect(label.attributes('for')).toBe(input.attributes('id'))
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
