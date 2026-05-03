import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatRelativeTime } from '../../utils/formatRelativeTime'

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for dates less than one minute ago in English', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:30Z'))

    expect(formatRelativeTime('2026-04-10T12:00:00Z', 'en')).toBe('just now')
  })

  it('returns Chinese relative time for dates less than one minute ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:00:30Z'))

    expect(formatRelativeTime('2026-04-10T12:00:00Z', 'zh-CN')).toBe('\u521A\u521A')
  })

  it('returns minute-based relative time in English', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T12:05:00Z'))

    expect(formatRelativeTime('2026-04-10T12:00:00Z', 'en')).toBe('5 minutes ago')
  })

  it('returns hour-based relative time in Chinese', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-10T15:00:00Z'))

    expect(formatRelativeTime('2026-04-10T12:00:00Z', 'zh-CN')).toBe('3\u5C0F\u65F6\u524D')
  })

  it('returns week-based relative time in English', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-29T12:00:00Z'))

    expect(formatRelativeTime('2026-04-10T12:00:00Z', 'en')).toBe('2 weeks ago')
  })

  it('returns month-based relative time in Chinese', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-10T12:00:00Z'))

    expect(formatRelativeTime('2026-04-10T12:00:00Z', 'zh-CN')).toBe('2\u4E2A\u6708\u524D')
  })

  it('returns year-based relative time in English', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-04-10T12:00:00Z'))

    expect(formatRelativeTime('2026-04-10T12:00:00Z', 'en')).toBe('1 year ago')
  })

  it('returns "just now" when input date is invalid', () => {
    expect(formatRelativeTime('not-a-date', 'en')).toBe('just now')
  })
})
