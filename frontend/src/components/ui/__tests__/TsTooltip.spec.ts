import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsTooltip from '../TsTooltip.vue'

describe('tsTooltip', () => {
  it('renders trigger slot content', () => {
    const wrapper = mount(TsTooltip, {
      props: { text: 'Helpful tip' },
      slots: { default: '<button>Hover me</button>' },
    })

    expect(wrapper.text()).toContain('Hover me')
  })
})
