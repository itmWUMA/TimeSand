import type { MessageSchema } from './types'
import { createI18n } from 'vue-i18n'

import en from './locales/en'
import zhCN from './locales/zh-CN'

type Locale = 'zh-CN' | 'en'

function detectLocale(): Locale {
  const saved = localStorage.getItem('ts-locale')
  if (saved === 'zh-CN' || saved === 'en')
    return saved

  if (navigator.language.startsWith('zh'))
    return 'zh-CN'

  return 'en'
}

const i18n = createI18n<[MessageSchema], Locale>({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: {
    'zh-CN': zhCN,
    en,
  },
})

export default i18n
