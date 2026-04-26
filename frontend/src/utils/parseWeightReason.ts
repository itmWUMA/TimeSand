export interface WeightReasonParsed {
  years: number
  type: 'today' | 'nearby'
}

const PATTERN = /^(\d+)_years_ago_(today|nearby)$/

export function parseWeightReason(reason: string | null): WeightReasonParsed | null {
  if (!reason)
    return null

  const match = PATTERN.exec(reason)
  if (!match)
    return null

  const years = Number.parseInt(match[1], 10)
  if (years < 1)
    return null

  return {
    years,
    type: match[2] as WeightReasonParsed['type'],
  }
}
