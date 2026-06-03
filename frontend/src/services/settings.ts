import api from './api'

export interface StorageInfo {
  photo_count: number
  music_count: number
  photo_storage_bytes: number
  music_storage_bytes: number
  total_storage_bytes: number
  thumbnail_count: number
}

export interface UserSettings {
  language: string
  theme: string
  draw_weight_mode: string
  draw_date_range_days: number
  draw_default_album_id: number | null
  slideshow_interval_seconds: number
  slideshow_ken_burns: boolean
  slideshow_shuffle: boolean
  music_volume: number
  music_auto_play: boolean
}

export type UserSettingsUpdate = Partial<UserSettings>

export async function getStorageInfo(): Promise<StorageInfo> {
  const response = await api.get<StorageInfo>('/settings/storage')
  return response.data
}

export async function getUserSettings(): Promise<UserSettings> {
  const response = await api.get<UserSettings>('/settings')
  return response.data
}

export async function updateUserSettings(payload: UserSettingsUpdate): Promise<UserSettings> {
  const response = await api.put<UserSettings>('/settings', payload)
  return response.data
}
