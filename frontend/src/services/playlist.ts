import type { Playlist } from "../types/music";
import api from "./api";

type PlaylistTrackResponse = {
  ok: true;
};

export const createPlaylist = async (name: string): Promise<Playlist> => {
  const response = await api.post<Playlist>("/playlists", { name });
  return response.data;
};

export const listPlaylists = async (): Promise<{ items: Playlist[] }> => {
  const response = await api.get<{ items: Playlist[] }>("/playlists");
  return response.data;
};

export const getPlaylist = async (playlistId: number): Promise<Playlist> => {
  const response = await api.get<Playlist>(`/playlists/${playlistId}`);
  return response.data;
};

export const updatePlaylist = async (
  playlistId: number,
  payload: { name: string; track_ids: number[] }
): Promise<Playlist> => {
  const response = await api.put<Playlist>(`/playlists/${playlistId}`, payload);
  return response.data;
};

export const deletePlaylist = async (playlistId: number): Promise<void> => {
  await api.delete(`/playlists/${playlistId}`);
};

export const addTrackToPlaylist = async (
  playlistId: number,
  musicId: number
): Promise<PlaylistTrackResponse> => {
  const response = await api.post<PlaylistTrackResponse>(`/playlists/${playlistId}/tracks`, {
    music_id: musicId
  });
  return response.data;
};

export const removeTrackFromPlaylist = async (
  playlistId: number,
  musicId: number
): Promise<PlaylistTrackResponse> => {
  const response = await api.delete<PlaylistTrackResponse>(
    `/playlists/${playlistId}/tracks/${musicId}`
  );
  return response.data;
};
