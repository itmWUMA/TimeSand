export const DRAW_WEIGHT_MODES = ['off', 'light', 'standard', 'strong'] as const
export type DrawWeightMode = (typeof DRAW_WEIGHT_MODES)[number]

export const DEFAULT_DRAW_WEIGHT_MODE: DrawWeightMode = 'standard'
export const DEFAULT_DRAW_NEARBY_DAYS = 3
export const MIN_DRAW_NEARBY_DAYS = 1
export const MAX_DRAW_NEARBY_DAYS = 7
