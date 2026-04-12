import type { Photo } from '../types/photo'
import api from './api'

export interface DrawRequest {
  album_id?: number | null
  exclude_ids?: number[]
}

export interface DrawResponse {
  photo: Photo
  weight_reason: string | null
}

export interface DrawResetResponse {
  ok: boolean
  total_available: number
}

export async function drawPhoto(request: DrawRequest): Promise<DrawResponse> {
  const response = await api.post<DrawResponse>('/draw', {
    album_id: request.album_id ?? null,
    exclude_ids: request.exclude_ids ?? [],
  })

  return response.data
}

export async function resetDrawSession(): Promise<DrawResetResponse> {
  const response = await api.post<DrawResetResponse>('/draw/reset')
  return response.data
}
