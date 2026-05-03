import en from '../i18n/locales/en'
import zhCN from '../i18n/locales/zh-CN'

type SupportedLocale = 'en' | 'zh-CN'
type RelativeUnit = Intl.RelativeTimeFormatUnit

const FALLBACK_MESSAGES = {
  'en': en.common.relativeTime,
  'zh-CN': zhCN.common.relativeTime,
} as const

function normalizeLocale(locale: string): SupportedLocale {
  return locale.startsWith('zh') ? 'zh-CN' : 'en'
}

function formatFallback(
  locale: SupportedLocale,
  unitKey: 'minutesAgo' | 'hoursAgo' | 'daysAgo' | 'weeksAgo' | 'monthsAgo' | 'yearsAgo',
  count: number,
): string {
  return FALLBACK_MESSAGES[locale][unitKey].replace('{count}', String(count))
}

function formatWithIntl(locale: string, value: number, unit: RelativeUnit): string | null {
  if (typeof Intl === 'undefined' || typeof Intl.RelativeTimeFormat === 'undefined')
    return null

  try {
    const formatted = new Intl.RelativeTimeFormat(locale, { numeric: 'always' }).format(-value, unit)
    if (locale.startsWith('zh'))
      return formatted.replace(/\s+/g, '')
    return formatted
  }
  catch {
    return null
  }
}

export function formatRelativeTime(dateString: string, locale: string): string {
  const normalizedLocale = normalizeLocale(locale)
  const date = new Date(dateString)

  if (Number.isNaN(date.getTime()))
    return FALLBACK_MESSAGES[normalizedLocale].justNow

  const diffMs = Date.now() - date.getTime()
  if (diffMs < 60_000)
    return FALLBACK_MESSAGES[normalizedLocale].justNow

  const minuteMs = 60_000
  const hourMs = 60 * minuteMs
  const dayMs = 24 * hourMs
  const weekMs = 7 * dayMs
  const monthMs = 30 * dayMs
  const yearMs = 365 * dayMs

  if (diffMs < hourMs) {
    const value = Math.floor(diffMs / minuteMs)
    return formatWithIntl(locale, value, 'minute') ?? formatFallback(normalizedLocale, 'minutesAgo', value)
  }
  if (diffMs < dayMs) {
    const value = Math.floor(diffMs / hourMs)
    return formatWithIntl(locale, value, 'hour') ?? formatFallback(normalizedLocale, 'hoursAgo', value)
  }
  if (diffMs < weekMs) {
    const value = Math.floor(diffMs / dayMs)
    return formatWithIntl(locale, value, 'day') ?? formatFallback(normalizedLocale, 'daysAgo', value)
  }
  if (diffMs < monthMs) {
    const value = Math.floor(diffMs / weekMs)
    return formatWithIntl(locale, value, 'week') ?? formatFallback(normalizedLocale, 'weeksAgo', value)
  }
  if (diffMs < yearMs) {
    const value = Math.floor(diffMs / monthMs)
    return formatWithIntl(locale, value, 'month') ?? formatFallback(normalizedLocale, 'monthsAgo', value)
  }

  const value = Math.floor(diffMs / yearMs)
  return formatWithIntl(locale, value, 'year') ?? formatFallback(normalizedLocale, 'yearsAgo', value)
}
