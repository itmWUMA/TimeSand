import type { Tag } from "../types/album";
import api from "./api";

type TagListResponse = {
  items: Tag[];
};

export const createTag = async (name: string): Promise<Tag> => {
  const response = await api.post<Tag>("/tags", { name });
  return response.data;
};

export const listTags = async (): Promise<TagListResponse> => {
  const response = await api.get<TagListResponse>("/tags");
  return response.data;
};

export const deleteTag = async (tagId: number): Promise<void> => {
  await api.delete(`/tags/${tagId}`);
};

export const listPhotoTags = async (photoId: number): Promise<TagListResponse> => {
  const response = await api.get<TagListResponse>(`/photos/${photoId}/tags`);
  return response.data;
};

export const addTagsToPhoto = async (photoId: number, tagIds: number[]): Promise<void> => {
  await api.post(`/photos/${photoId}/tags`, { tag_ids: tagIds });
};

export const removeTagFromPhoto = async (photoId: number, tagId: number): Promise<void> => {
  await api.delete(`/photos/${photoId}/tags/${tagId}`);
};

