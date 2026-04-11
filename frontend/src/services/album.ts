import type { Album } from "../types/album";
import api from "./api";

type ListAlbumsResponse = {
  items: Album[];
  total: number;
};

type SaveAlbumRequest = {
  name: string;
  description: string | null;
  cover_photo_id: number | null;
};

export const createAlbum = async (payload: {
  name: string;
  description: string | null;
}): Promise<Album> => {
  const response = await api.post<Album>("/albums", payload);
  return response.data;
};

export const listAlbums = async (): Promise<ListAlbumsResponse> => {
  const response = await api.get<ListAlbumsResponse>("/albums");
  return response.data;
};

export const getAlbum = async (albumId: number): Promise<Album> => {
  const response = await api.get<Album>(`/albums/${albumId}`);
  return response.data;
};

export const updateAlbum = async (albumId: number, payload: SaveAlbumRequest): Promise<Album> => {
  const response = await api.put<Album>(`/albums/${albumId}`, payload);
  return response.data;
};

export const deleteAlbum = async (albumId: number): Promise<void> => {
  await api.delete(`/albums/${albumId}`);
};

export const addPhotosToAlbum = async (albumId: number, photoIds: number[]): Promise<void> => {
  await api.post(`/albums/${albumId}/photos`, { photo_ids: photoIds });
};

export const removePhotoFromAlbum = async (albumId: number, photoId: number): Promise<void> => {
  await api.delete(`/albums/${albumId}/photos/${photoId}`);
};

