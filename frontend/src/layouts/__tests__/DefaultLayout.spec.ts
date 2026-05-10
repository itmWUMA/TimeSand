import type { MessageSchema } from '../../i18n/types'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
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

type MatchMediaListener = (event: MediaQueryListEvent) => void

let isDesktopViewport = false
const matchMediaListeners = new Set<MatchMediaListener>()

function emitViewportChange(nextDesktop: boolean): void {
  isDesktopViewport = nextDesktop
  const event = { matches: isDesktopViewport } as MediaQueryListEvent
  for (const listener of matchMediaListeners)
    listener(event)
}

vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
  media: query,
  matches: query === '(min-width: 768px)' ? isDesktopViewport : false,
  onchange: null,
  addEventListener: (_type: 'change', listener: MatchMediaListener) => matchMediaListeners.add(listener),
  removeEventListener: (_type: 'change', listener: MatchMediaListener) => matchMediaListeners.delete(listener),
  addListener: (listener: MatchMediaListener) => matchMediaListeners.add(listener),
  removeListener: (listener: MatchMediaListener) => matchMediaListeners.delete(listener),
  dispatchEvent: () => true,
})))

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
      plugins: [createPinia(), i18n],
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a :data-to="to"><slot /></a>',
        },
        MusicPlayer: { template: '<div />' },
      },
    },
  })
}

describe('defaultLayout language switch', () => {
  const zhLabel = '\u4E2D\u6587'

  beforeEach(() => {
    isDesktopViewport = false
    matchMediaListeners.clear()
    vi.mocked(matchMedia).mockClear()
    localStorage.clear()
    document.documentElement.lang = ''
  })

  it('renders toggle in sidebar and mobile drawer', async () => {
    const wrapper = createWrapper()
    const sidebarButton = wrapper.find('aside button')
    expect(sidebarButton.exists()).toBe(true)
    expect(sidebarButton.text()).toContain(`EN / ${zhLabel}`)

    const mobileMenuButton = wrapper.find('header > div button')
    await mobileMenuButton.trigger('click')

    const mobileToggleButton = wrapper.find('[data-testid="mobile-drawer-locale-toggle"]')
    expect(mobileToggleButton.exists()).toBe(true)
    expect(mobileToggleButton.text()).toContain(`EN / ${zhLabel}`)
  })

  it('closes drawer when backdrop is clicked', async () => {
    const wrapper = createWrapper()
    await wrapper.find('header > div button').trigger('click')

    expect(wrapper.find('[data-testid="mobile-drawer-overlay"]').exists()).toBe(true)

    await wrapper.find('[data-testid="mobile-drawer-backdrop"]').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="mobile-drawer-overlay"]').exists()).toBe(false)
    })
  })

  it('closes drawer when navigation item is clicked', async () => {
    const wrapper = createWrapper()
    await wrapper.find('header > div button').trigger('click')

    const navLinks = wrapper.findAll('[data-testid="mobile-drawer-nav"] a')
    expect(navLinks.length).toBeGreaterThan(0)
    expect(navLinks[0]?.attributes('data-to')).toBe('/')

    await navLinks[0]?.trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="mobile-drawer-overlay"]').exists()).toBe(false)
    })
  })

  it('does not render mobile drawer when viewport is desktop', () => {
    emitViewportChange(true)
    const wrapper = createWrapper()

    expect(wrapper.find('[data-testid="mobile-drawer-root"]').exists()).toBe(false)
  })

  it('auto closes drawer when viewport changes to desktop', async () => {
    const wrapper = createWrapper()
    await wrapper.find('header > div button').trigger('click')
    expect(wrapper.find('[data-testid="mobile-drawer-overlay"]').exists()).toBe(true)

    emitViewportChange(true)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="mobile-drawer-overlay"]').exists()).toBe(false)
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
