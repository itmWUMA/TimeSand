import type { Album } from '../types/album'
import api from './api'

interface ListAlbumsResponse {
  items: Album[]
  total: number
}

interface SaveAlbumRequest {
  name: string
  description: string | null
  cover_photo_id: number | null
}

export async function createAlbum(payload: {
  name: string
  description: string | null
}): Promise<Album> {
  const response = await api.post<Album>('/albums', payload)
  return response.data
}

export async function listAlbums(): Promise<ListAlbumsResponse> {
  const response = await api.get<ListAlbumsResponse>('/albums')
  return response.data
}

export async function getAlbum(albumId: number): Promise<Album> {
  const response = await api.get<Album>(`/albums/${albumId}`)
  return response.data
}

export async function updateAlbum(albumId: number, payload: SaveAlbumRequest): Promise<Album> {
  const response = await api.put<Album>(`/albums/${albumId}`, payload)
  return response.data
}

export async function deleteAlbum(albumId: number): Promise<void> {
  await api.delete(`/albums/${albumId}`)
}

export async function addPhotosToAlbum(albumId: number, photoIds: number[]): Promise<void> {
  await api.post(`/albums/${albumId}/photos`, { photo_ids: photoIds })
}

export async function removePhotoFromAlbum(albumId: number, photoId: number): Promise<void> {
  await api.delete(`/albums/${albumId}/photos/${photoId}`)
}
