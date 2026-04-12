import type { ListMusicResponse, Music } from "../types/music";
import api from "./api";

export const uploadMusic = async (files: File[]): Promise<Music[]> => {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await api.post<{ tracks: Music[] }>("/music/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data.tracks;
};

export const listMusic = async (
  page = 1,
  pageSize = 50
): Promise<ListMusicResponse> => {
  const response = await api.get<ListMusicResponse>("/music", {
    params: {
      page,
      page_size: pageSize
    }
  });
  return response.data;
};

export const deleteMusic = async (musicId: number): Promise<void> => {
  await api.delete(`/music/${musicId}`);
};
