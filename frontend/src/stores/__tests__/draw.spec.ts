import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { useDrawStore } from "../draw";
import type { Photo } from "../../types/photo";

const buildPhoto = (id: number): Photo => ({
  id,
  filename: `photo-${id}.jpg`,
  file_path: `photo-${id}.jpg`,
  thumbnail_path: `photo-${id}_thumb.jpg`,
  file_size: 2048,
  width: 1920,
  height: 1080,
  taken_at: null,
  latitude: null,
  longitude: null,
  uploaded_at: "2026-04-01T00:00:00Z",
  mime_type: "image/jpeg"
});

describe("useDrawStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("adds a drawn card and excludes its photo id from future draws", () => {
    const store = useDrawStore();
    const photo = buildPhoto(11);

    store.addDrawnCard({
      photo,
      weightReason: "3_years_ago_today"
    });

    expect(store.drawnCards).toHaveLength(1);
    expect(store.drawnCards[0].photo.id).toBe(11);
    expect(store.excludeIds).toEqual([11]);
    expect(store.drawnCards[0].weightReason).toBe("3_years_ago_today");
  });

  it("resetSession clears drawn cards and exclude ids", () => {
    const store = useDrawStore();

    store.addDrawnCard({ photo: buildPhoto(1), weightReason: null });
    store.addDrawnCard({ photo: buildPhoto(2), weightReason: null });
    store.setAlbumFilter(3);

    store.resetSession();

    expect(store.drawnCards).toEqual([]);
    expect(store.excludeIds).toEqual([]);
    expect(store.albumId).toBeNull();
  });
});
