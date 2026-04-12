import type { AxiosProgressEvent } from 'axios'

import type { Photo } from '../types/photo'
import api from './api'

export interface ListPhotosResponse {
  items: Photo[]
  total: number
  page: number
  page_size: number
}

interface ListPhotosFilters {
  albumId?: number
  tagId?: number
}

export async function uploadPhotos(files: File[], onProgress?: (progress: number) => void): Promise<Photo[]> {
  const formData = new FormData()

  files.forEach((file) => {
    formData.append('files', file)
  })

  const response = await api.post<{ photos: Photo[] }>('/photos/upload', formData, {
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (!onProgress || !event.total) {
        return
      }

      const progress = Math.min(100, Math.round((event.loaded / event.total) * 100))
      onProgress(progress)
    },
  })

  return response.data.photos
}

export async function listPhotos(page = 1, pageSize = 20, filters: ListPhotosFilters = {}): Promise<ListPhotosResponse> {
  const response = await api.get<ListPhotosResponse>('/photos', {
    params: {
      page,
      page_size: pageSize,
      album_id: filters.albumId,
      tag_id: filters.tagId,
    },
  })

  return response.data
}
