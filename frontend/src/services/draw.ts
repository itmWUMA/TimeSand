import type { DrawWeightMode } from '../types/draw'
import type { Photo } from '../types/photo'
import { getActivePinia } from 'pinia'
import { useSettingsStore } from '../stores/settings'
import {
  DEFAULT_DRAW_NEARBY_DAYS,
  DEFAULT_DRAW_WEIGHT_MODE,
  DRAW_WEIGHT_MODES,
  MAX_DRAW_NEARBY_DAYS,
  MIN_DRAW_NEARBY_DAYS,
} from '../types/draw'
import api from './api'

export interface DrawRequest {
  albumId?: number | null
  excludeIds?: number[]
  weightMode?: DrawWeightMode
  nearbyDays?: number
  album_id?: number | null
  exclude_ids?: number[]
  weight_mode?: DrawWeightMode
  nearby_days?: number
}

export interface DrawSuccessResponse {
  photo: Photo
  weight_reason: string | null
  pool_empty?: false
}

export interface DrawPoolEmptyResponse {
  pool_empty: true
}

export type DrawResponse = DrawSuccessResponse | DrawPoolEmptyResponse

export interface DrawResetResponse {
  ok: boolean
  total_available: number
}

function isDrawWeightMode(value: unknown): value is DrawWeightMode {
  return DRAW_WEIGHT_MODES.includes(value as DrawWeightMode)
}

function normalizeNearbyDays(value: unknown): number {
  const parsed = Number.parseInt(String(value), 10)
  if (Number.isNaN(parsed)) {
    return DEFAULT_DRAW_NEARBY_DAYS
  }

  return Math.min(Math.max(parsed, MIN_DRAW_NEARBY_DAYS), MAX_DRAW_NEARBY_DAYS)
}

function getDrawDefaultsFromSettings(): { weightMode: DrawWeightMode, nearbyDays: number } {
  if (!getActivePinia()) {
    return {
      weightMode: DEFAULT_DRAW_WEIGHT_MODE,
      nearbyDays: DEFAULT_DRAW_NEARBY_DAYS,
    }
  }

  const settings = useSettingsStore() as unknown as {
    drawWeightMode?: unknown
    drawNearbyDays?: unknown
  }

  return {
    weightMode: isDrawWeightMode(settings.drawWeightMode)
      ? settings.drawWeightMode
      : DEFAULT_DRAW_WEIGHT_MODE,
    nearbyDays: normalizeNearbyDays(settings.drawNearbyDays),
  }
}

export async function drawPhoto(request: DrawRequest): Promise<DrawResponse> {
  const defaults = getDrawDefaultsFromSettings()

  const weightModeInput = request.weight_mode ?? request.weightMode ?? defaults.weightMode
  const nearbyDaysInput = request.nearby_days ?? request.nearbyDays ?? defaults.nearbyDays

  const response = await api.post<DrawResponse>('/draw', {
    album_id: request.album_id ?? request.albumId ?? null,
    exclude_ids: request.exclude_ids ?? request.excludeIds ?? [],
    weight_mode: isDrawWeightMode(weightModeInput) ? weightModeInput : DEFAULT_DRAW_WEIGHT_MODE,
    nearby_days: normalizeNearbyDays(nearbyDaysInput),
  })

  return response.data
}

export async function resetDrawSession(): Promise<DrawResetResponse> {
  const response = await api.post<DrawResetResponse>('/draw/reset')
  return response.data
}
