import { describe, expect, it } from 'vitest'

import en from '../locales/en'
import zhCN from '../locales/zh-CN'

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const value = obj[key]
    if (typeof value === 'object' && value !== null) {
      keys.push(...collectKeys(value as Record<string, unknown>, fullKey))
    }
    else {
      keys.push(fullKey)
    }
  }
  return keys.sort()
}

function collectValues(obj: Record<string, unknown>, prefix = ''): [string, unknown][] {
  const entries: [string, unknown][] = []
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const value = obj[key]
    if (typeof value === 'object' && value !== null) {
      entries.push(...collectValues(value as Record<string, unknown>, fullKey))
    }
    else {
      entries.push([fullKey, value])
    }
  }
  return entries
}

describe('i18n locales', () => {
  it('zh-CN and en have identical key sets', () => {
    const zhKeys = collectKeys(zhCN as unknown as Record<string, unknown>)
    const enKeys = collectKeys(en as unknown as Record<string, unknown>)
    expect(zhKeys).toEqual(enKeys)
  })

  it('no empty string values in zh-CN', () => {
    const values = collectValues(zhCN as unknown as Record<string, unknown>)
    for (const [key, value] of values) {
      expect(value, `zh-CN key "${key}" is empty`).not.toBe('')
    }
  })

  it('no empty string values in en', () => {
    const values = collectValues(en as unknown as Record<string, unknown>)
    for (const [key, value] of values) {
      expect(value, `en key "${key}" is empty`).not.toBe('')
    }
  })
})
