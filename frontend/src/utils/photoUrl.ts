import type { Photo } from '../types/photo'

export function buildThumbnailUrl(photo: Pick<Photo, 'id' | 'thumbnail_path'>): string {
  const version = encodeURIComponent(photo.thumbnail_path)
  return `/api/photos/${photo.id}/thumbnail?v=${version}`
}

export function buildFileUrl(photo: Pick<Photo, 'id' | 'file_path'>): string {
  const version = encodeURIComponent(photo.file_path)
  return `/api/photos/${photo.id}/file?v=${version}`
}
