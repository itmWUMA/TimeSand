import { describe, expect, it } from 'vitest'
import { parseWeightReason } from '../../utils/parseWeightReason'

describe('parseWeightReason', () => {
  it('returns null for null input', () => {
    expect(parseWeightReason(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseWeightReason('')).toBeNull()
  })

  it('returns null for malformed input', () => {
    expect(parseWeightReason('random_string')).toBeNull()
    expect(parseWeightReason('years_ago_today')).toBeNull()
    expect(parseWeightReason('0_years_ago_today')).toBeNull()
  })

  it('parses "1_years_ago_today"', () => {
    expect(parseWeightReason('1_years_ago_today')).toEqual({ years: 1, type: 'today' })
  })

  it('parses "3_years_ago_today"', () => {
    expect(parseWeightReason('3_years_ago_today')).toEqual({ years: 3, type: 'today' })
  })

  it('parses "1_years_ago_nearby"', () => {
    expect(parseWeightReason('1_years_ago_nearby')).toEqual({ years: 1, type: 'nearby' })
  })

  it('parses "5_years_ago_nearby"', () => {
    expect(parseWeightReason('5_years_ago_nearby')).toEqual({ years: 5, type: 'nearby' })
  })

  it('parses large year values', () => {
    expect(parseWeightReason('20_years_ago_today')).toEqual({ years: 20, type: 'today' })
  })
})
