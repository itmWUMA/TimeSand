import type { MessageSchema } from '../../i18n/types'
import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

import App from '../../App.vue'
import { useToast } from '../../composables/useToast'
import en from '../../i18n/locales/en'
import zhCN from '../../i18n/locales/zh-CN'
import DefaultLayout from '../DefaultLayout.vue'

function createTestI18n(locale: 'zh-CN' | 'en' = 'en') {
  return createI18n<[MessageSchema], 'zh-CN' | 'en'>({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: {
      'zh-CN': zhCN,
      en,
    },
  })
}

async function createWrapper(path = '/draw', locale: 'zh-CN' | 'en' = 'en') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/draw', component: { template: '<div />' } },
      { path: '/albums', component: { template: '<div />' } },
      { path: '/albums/:id', component: { template: '<div />' } },
      { path: '/upload', component: { template: '<div />' } },
      { path: '/music', component: { template: '<div />' } },
      { path: '/slideshow', component: { template: '<div />' } },
      { path: '/settings', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(DefaultLayout, {
    slots: {
      default: '<div data-testid="layout-slot">Page content</div>',
    },
    global: {
      plugins: [createPinia(), createTestI18n(locale), router],
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a :data-to="typeof to === \'string\' ? to : to.path"><slot /></a>',
        },
      },
    },
  })

  return { wrapper, router }
}

describe('defaultLayout shell', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = ''
  })

  it('renders the Warm Walnut rail groups and bottom player footprint', async () => {
    const { wrapper } = await createWrapper()

    expect(wrapper.find('[data-testid="default-layout"]').classes()).toContain('ts-app-shell')
    expect(wrapper.find('[data-testid="rail-group-memory"]').text()).toContain('Memory')
    expect(wrapper.find('[data-testid="rail-group-content"]').text()).toContain('Content')
    expect(wrapper.find('[data-testid="rail-group-other"]').text()).toContain('Other')
    expect(wrapper.find('[data-testid="shell-player"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="shell-player-title"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="shell-player-play"]').exists()).toBe(true)
  })

  it('marks the canonical draw route active', async () => {
    const { wrapper } = await createWrapper('/draw')

    expect(wrapper.find('[data-testid="rail-link-draw"]').classes()).toContain('is-active')
  })

  it('keeps nested album routes active in the albums rail item', async () => {
    const { wrapper } = await createWrapper('/albums/42')

    expect(wrapper.find('[data-testid="rail-link-albums"]').classes()).toContain('is-active')
    expect(wrapper.find('[data-testid="rail-link-draw"]').classes()).not.toContain('is-active')
  })

  it('toggles locale with segmented controls and persists the selection', async () => {
    const { wrapper } = await createWrapper('/draw', 'en')

    expect(document.documentElement.lang).toBe('en')
    expect(wrapper.find('[data-testid="locale-en"]').classes()).toContain('is-on')

    await wrapper.find('[data-testid="locale-zh-CN"]').trigger('click')

    expect(document.documentElement.lang).toBe('zh-CN')
    expect(localStorage.getItem('ts-locale')).toBe('zh-CN')
    expect(wrapper.find('[data-testid="locale-zh-CN"]').classes()).toContain('is-on')
    expect(wrapper.text()).toContain(zhCN.nav.cardDraw)
  })

  it('resets the fixed mobile rail top edge so it does not cover page content', async () => {
    await createWrapper('/albums/42')
    const source = readFileSync('src/layouts/DefaultLayout.vue', 'utf8')

    expect(source).toContain('top: auto;')
  })
})

describe('app shell selection', () => {
  it('uses DefaultLayout for normal routes', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/draw', component: { template: '<div>Draw</div>' } },
      ],
    })
    await router.push('/draw')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), createTestI18n(), router],
        stubs: {
          DefaultLayout: {
            template: '<div data-testid="default-layout"><slot /></div>',
          },
        },
      },
    })

    expect(wrapper.find('[data-testid="default-layout"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Draw')
  })

  it('lets landing and fullscreen routes opt out of DefaultLayout', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Landing</div>' }, meta: { shell: false } },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), createTestI18n(), router],
        stubs: {
          DefaultLayout: {
            template: '<div data-testid="default-layout"><slot /></div>',
          },
        },
      },
    })

    expect(wrapper.find('[data-testid="default-layout"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Landing')
  })

  it('renders global toasts on routes that opt out of DefaultLayout', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Landing</div>' }, meta: { shell: false } },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), createTestI18n(), router],
        stubs: {
          DefaultLayout: {
            template: '<div data-testid="default-layout"><slot /></div>',
          },
          TsToastProvider: {
            template: '<div data-testid="toast-provider"><slot /></div>',
          },
          TsToast: {
            props: ['title'],
            template: '<div data-testid="toast">{{ title }}</div>',
          },
        },
      },
    })

    useToast().showToast('Network unavailable', undefined, 'error')
    await nextTick()

    expect(wrapper.find('[data-testid="default-layout"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="toast"]').text()).toBe('Network unavailable')
  })
})
