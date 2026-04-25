import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { scaleIn } from '../../../composables/motion'
import TsDialog from '../TsDialog.vue'

vi.mock('../../../composables/motion', () => ({
  scaleIn: vi.fn(),
}))

describe('tsDialog', () => {
  function getRenderedText(wrapperText: string): string {
    return `${wrapperText} ${document.body.textContent ?? ''}`.trim()
  }

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('does not render content when closed', () => {
    const wrapper = mount(TsDialog, {
      props: { open: false },
      slots: { default: 'Dialog content' },
      attachTo: document.body,
    })

    expect(getRenderedText(wrapper.text())).not.toContain('Dialog content')
    wrapper.unmount()
  })

  it('renders content when open', async () => {
    const wrapper = mount(TsDialog, {
      props: { open: true },
      slots: { default: 'Dialog content' },
      attachTo: document.body,
    })

    await nextTick()
    expect(getRenderedText(wrapper.text())).toContain('Dialog content')
    wrapper.unmount()
  })

  it('renders title when provided', async () => {
    const wrapper = mount(TsDialog, {
      props: { open: true, title: 'Confirm' },
      slots: { default: 'Body' },
      attachTo: document.body,
    })

    await nextTick()
    expect(getRenderedText(wrapper.text())).toContain('Confirm')
    wrapper.unmount()
  })

  it('runs scaleIn motion when dialog opens', async () => {
    const wrapper = mount(TsDialog, {
      props: { open: false },
      slots: { default: 'Dialog content' },
      attachTo: document.body,
    })

    await wrapper.setProps({ open: true })
    await nextTick()

    expect(scaleIn).toHaveBeenCalled()
    wrapper.unmount()
  })
})
