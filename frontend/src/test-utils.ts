import type { ComponentMountingOptions } from '@vue/test-utils'
import type { Component } from 'vue'
import type { MessageSchema } from './i18n/types'
import { mount } from '@vue/test-utils'

import { createI18n } from 'vue-i18n'
import en from './i18n/locales/en'
import zhCN from './i18n/locales/zh-CN'

export function createTestI18n() {
  return createI18n<[MessageSchema], 'zh-CN' | 'en'>({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: {
      'zh-CN': zhCN,
      en,
    },
  })
}

export function mountWithI18n<T extends Component>(
  component: T,
  options?: ComponentMountingOptions<T>,
) {
  const i18n = createTestI18n()
  return mount(component, {
    ...options,
    global: {
      ...options?.global,
      plugins: [...(options?.global?.plugins ?? []), i18n],
    },
  })
}
