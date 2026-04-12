import type { Tag } from '../types/album'
import api from './api'

interface TagListResponse {
  items: Tag[]
}

export async function createTag(name: string): Promise<Tag> {
  const response = await api.post<Tag>('/tags', { name })
  return response.data
}

export async function listTags(): Promise<TagListResponse> {
  const response = await api.get<TagListResponse>('/tags')
  return response.data
}

export async function deleteTag(tagId: number): Promise<void> {
  await api.delete(`/tags/${tagId}`)
}

export async function listPhotoTags(photoId: number): Promise<TagListResponse> {
  const response = await api.get<TagListResponse>(`/photos/${photoId}/tags`)
  return response.data
}

export async function addTagsToPhoto(photoId: number, tagIds: number[]): Promise<void> {
  await api.post(`/photos/${photoId}/tags`, { tag_ids: tagIds })
}

export async function removeTagFromPhoto(photoId: number, tagId: number): Promise<void> {
  await api.delete(`/photos/${photoId}/tags/${tagId}`)
}
