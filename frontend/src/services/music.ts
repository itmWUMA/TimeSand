import type { ListMusicResponse, Music } from '../types/music'
import api from './api'

export async function uploadMusic(files: File[]): Promise<Music[]> {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }

  const response = await api.post<{ tracks: Music[] }>('/music/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data.tracks
}

export async function listMusic(page = 1, pageSize = 50): Promise<ListMusicResponse> {
  const response = await api.get<ListMusicResponse>('/music', {
    params: {
      page,
      page_size: pageSize,
    },
  })
  return response.data
}

export async function deleteMusic(musicId: number): Promise<void> {
  await api.delete(`/music/${musicId}`)
}
