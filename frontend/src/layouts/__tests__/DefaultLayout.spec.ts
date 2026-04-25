import type { MessageSchema } from '../../i18n/types'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import en from '../../i18n/locales/en'
import zhCN from '../../i18n/locales/zh-CN'
import DefaultLayout from '../DefaultLayout.vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({
    path: '/',
    name: 'home',
  }),
}))

function createWrapper(locale: 'zh-CN' | 'en' = 'en') {
  const i18n = createI18n<[MessageSchema], 'zh-CN' | 'en'>({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: {
      'zh-CN': zhCN,
      en,
    },
  })

  return mount(DefaultLayout, {
    global: {
      plugins: [i18n],
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        MusicPlayer: { template: '<div />' },
      },
    },
  })
}

describe('defaultLayout language switch', () => {
  const zhLabel = '\u4E2D\u6587'

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = ''
  })

  it('renders toggle in sidebar and mobile menu', async () => {
    const wrapper = createWrapper()
    const sidebarButton = wrapper.find('aside button')
    expect(sidebarButton.exists()).toBe(true)
    expect(sidebarButton.text()).toContain(`EN / ${zhLabel}`)

    const mobileMenuButton = wrapper.find('header > div button')
    await mobileMenuButton.trigger('click')

    const mobileToggleButton = wrapper.find('header nav button')
    expect(mobileToggleButton.exists()).toBe(true)
    expect(mobileToggleButton.text()).toContain(`EN / ${zhLabel}`)
  })

  it('toggles locale and persists to localStorage', async () => {
    const wrapper = createWrapper('en')
    const sidebarButton = wrapper.find('aside button')
    expect(wrapper.text()).toContain(en.nav.cardDraw)

    await sidebarButton.trigger('click')

    expect(sidebarButton.text()).toContain(`${zhLabel} / EN`)
    expect(localStorage.getItem('ts-locale')).toBe('zh-CN')
    expect(wrapper.text()).toContain(zhCN.nav.cardDraw)
    expect(wrapper.text()).not.toContain(en.nav.cardDraw)
  })

  it('sets html lang on mount', () => {
    createWrapper('zh-CN')
    expect(document.documentElement.lang).toBe('zh-CN')
  })

  it('updates html lang on toggle', async () => {
    const wrapper = createWrapper('en')
    const sidebarButton = wrapper.find('aside button')
    expect(document.documentElement.lang).toBe('en')

    await sidebarButton.trigger('click')

    expect(document.documentElement.lang).toBe('zh-CN')
  })
})
