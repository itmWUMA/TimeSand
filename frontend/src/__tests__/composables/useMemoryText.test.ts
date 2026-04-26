import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { useMemoryText } from '../../composables/useMemoryText'

const locale = ref<'en' | 'zh-CN'>('en')

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<'en' | 'zh-CN', Record<string, string>> = {
        'en': {
          'draw.memory.lastYearToday': 'One year ago today',
          'draw.memory.lastYearNearby': 'Around this time last year',
          'draw.memory.yearsAgoToday': `${params?.n ?? ''} years ago today`,
          'draw.memory.yearsAgoNearby': `Around this time ${params?.n ?? ''} years ago`,
        },
        'zh-CN': {
          'draw.memory.lastYearToday': '去年的今天',
          'draw.memory.lastYearNearby': '大约去年的这几天',
          'draw.memory.yearsAgoToday': `${params?.n ?? ''} 年前的今天`,
          'draw.memory.yearsAgoNearby': `大约 ${params?.n ?? ''} 年前的这几天`,
        },
      }

      return translations[locale.value][key] ?? key
    },
  }),
}))

describe('useMemoryText', () => {
  beforeEach(() => {
    locale.value = 'en'
  })

  it('returns null for null reason', () => {
    const reason = ref<string | null>(null)
    const text = useMemoryText(reason)
    expect(text.value).toBeNull()
  })

  it('returns correct English text for 1_years_ago_today', () => {
    const reason = ref<string | null>('1_years_ago_today')
    const text = useMemoryText(reason)
    expect(text.value).toBe('One year ago today')
  })

  it('returns correct English text for 3_years_ago_today', () => {
    const reason = ref<string | null>('3_years_ago_today')
    const text = useMemoryText(reason)
    expect(text.value).toBe('3 years ago today')
  })

  it('returns correct English text for 1_years_ago_nearby', () => {
    const reason = ref<string | null>('1_years_ago_nearby')
    const text = useMemoryText(reason)
    expect(text.value).toBe('Around this time last year')
  })

  it('returns correct English text for 5_years_ago_nearby', () => {
    const reason = ref<string | null>('5_years_ago_nearby')
    const text = useMemoryText(reason)
    expect(text.value).toBe('Around this time 5 years ago')
  })

  it('returns correct Chinese text when locale is zh-CN', () => {
    locale.value = 'zh-CN'
    const reason = ref<string | null>('2_years_ago_today')
    const text = useMemoryText(reason)
    expect(text.value).toBe('2 年前的今天')
  })

  it('reacts to reason changes', async () => {
    const reason = ref<string | null>(null)
    const text = useMemoryText(reason)

    expect(text.value).toBeNull()

    reason.value = '2_years_ago_today'
    await nextTick()

    expect(text.value).toBe('2 years ago today')
  })

  it('reacts to locale changes', async () => {
    const reason = ref<string | null>('1_years_ago_nearby')
    const text = useMemoryText(reason)

    expect(text.value).toBe('Around this time last year')

    locale.value = 'zh-CN'
    await nextTick()

    expect(text.value).toBe('大约去年的这几天')
  })
})
