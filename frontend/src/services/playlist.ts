import type { Playlist } from '../types/music'
import api from './api'

interface PlaylistTrackResponse {
  ok: true
}

export async function createPlaylist(name: string): Promise<Playlist> {
  const response = await api.post<Playlist>('/playlists', { name })
  return response.data
}

export async function listPlaylists(): Promise<{ items: Playlist[] }> {
  const response = await api.get<{ items: Playlist[] }>('/playlists')
  return response.data
}

export async function getPlaylist(playlistId: number): Promise<Playlist> {
  const response = await api.get<Playlist>(`/playlists/${playlistId}`)
  return response.data
}

export async function updatePlaylist(playlistId: number, payload: { name: string, track_ids: number[] }): Promise<Playlist> {
  const response = await api.put<Playlist>(`/playlists/${playlistId}`, payload)
  return response.data
}

export async function deletePlaylist(playlistId: number): Promise<void> {
  await api.delete(`/playlists/${playlistId}`)
}

export async function addTrackToPlaylist(playlistId: number, musicId: number): Promise<PlaylistTrackResponse> {
  const response = await api.post<PlaylistTrackResponse>(`/playlists/${playlistId}/tracks`, {
    music_id: musicId,
  })
  return response.data
}

export async function removeTrackFromPlaylist(playlistId: number, musicId: number): Promise<PlaylistTrackResponse> {
  const response = await api.delete<PlaylistTrackResponse>(
    `/playlists/${playlistId}/tracks/${musicId}`,
  )
  return response.data
}
