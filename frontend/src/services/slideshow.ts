import type { Photo } from "../types/photo";
import api from "./api";

export type SlideshowOrder = "random" | "chronological";

type ListSlideshowPhotosParams = {
  albumId?: number;
  order?: SlideshowOrder;
  limit?: number;
};

type ListSlideshowPhotosResponse = {
  photos: Photo[];
};

export const listSlideshowPhotos = async (
  params: ListSlideshowPhotosParams = {}
): Promise<ListSlideshowPhotosResponse> => {
  const response = await api.get<ListSlideshowPhotosResponse>("/slideshow/photos", {
    params: {
      album_id: params.albumId,
      order: params.order ?? "random",
      limit: params.limit
    }
  });

  return response.data;
};
