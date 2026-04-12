import type { Photo } from "../types/photo";
import api from "./api";

export type DrawRequest = {
  album_id?: number | null;
  exclude_ids?: number[];
};

export type DrawResponse = {
  photo: Photo;
  weight_reason: string | null;
};

export type DrawResetResponse = {
  ok: boolean;
  total_available: number;
};

export const drawPhoto = async (request: DrawRequest): Promise<DrawResponse> => {
  const response = await api.post<DrawResponse>("/draw", {
    album_id: request.album_id ?? null,
    exclude_ids: request.exclude_ids ?? []
  });

  return response.data;
};

export const resetDrawSession = async (): Promise<DrawResetResponse> => {
  const response = await api.post<DrawResetResponse>("/draw/reset");
  return response.data;
};
