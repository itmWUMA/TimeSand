import api from './api'

export interface StorageInfo {
  photo_count: number
  music_count: number
  photo_storage_bytes: number
  music_storage_bytes: number
  total_storage_bytes: number
  thumbnail_count: number
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const response = await api.get<StorageInfo>('/settings/storage')
  return response.data
}
