import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'

import { slideUp } from '../../../composables/motion'
import TsToast from '../TsToast.vue'
import TsToastProvider from '../TsToastProvider.vue'

vi.mock('../../../composables/motion', () => ({
  slideUp: vi.fn(),
}))

const ToastHost = defineComponent({
  props: {
    open: {
      type: Boolean,
      required: true,
    },
  },
  components: {
    TsToast,
    TsToastProvider,
  },
  template: `
    <TsToastProvider>
      <TsToast
        :open="open"
        title="Test"
        description="Desc"
      />
    </TsToastProvider>
  `,
})

describe('tsToast', () => {
  function getRenderedText(wrapperText: string): string {
    return `${wrapperText} ${document.body.textContent ?? ''}`.trim()
  }

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('renders title and description when open', async () => {
    const wrapper = mount(ToastHost, {
      props: { open: true },
      attachTo: document.body,
    })

    await nextTick()
    const renderedText = getRenderedText(wrapper.text())
    expect(renderedText).toContain('Test')
    expect(renderedText).toContain('Desc')
    wrapper.unmount()
  })

  it('runs slideUp motion when toast opens', async () => {
    const wrapper = mount(ToastHost, {
      props: { open: false },
      attachTo: document.body,
    })

    await wrapper.setProps({ open: true })
    await nextTick()

    expect(slideUp).toHaveBeenCalled()
    wrapper.unmount()
  })
})
