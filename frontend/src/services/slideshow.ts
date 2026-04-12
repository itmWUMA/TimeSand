import type { Photo } from '../types/photo'
import api from './api'

export type SlideshowOrder = 'random' | 'chronological'

interface ListSlideshowPhotosParams {
  albumId?: number
  order?: SlideshowOrder
  limit?: number
}

interface ListSlideshowPhotosResponse {
  photos: Photo[]
}

export async function listSlideshowPhotos(params: ListSlideshowPhotosParams = {}): Promise<ListSlideshowPhotosResponse> {
  const response = await api.get<ListSlideshowPhotosResponse>('/slideshow/photos', {
    params: {
      album_id: params.albumId,
      order: params.order ?? 'random',
      limit: params.limit,
    },
  })

  return response.data
}
