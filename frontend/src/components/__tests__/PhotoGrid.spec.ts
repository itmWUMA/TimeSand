import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import type { Photo } from "../../types/photo";
import PhotoGrid from "../PhotoGrid.vue";

const photos: Photo[] = [
  {
    id: 1,
    filename: "one.jpg",
    file_path: "one.jpg",
    thumbnail_path: "one_thumb.jpg",
    file_size: 123,
    width: 800,
    height: 600,
    taken_at: null,
    latitude: null,
    longitude: null,
    uploaded_at: "2026-04-06T12:00:00Z",
    mime_type: "image/jpeg"
  },
  {
    id: 2,
    filename: "two.jpg",
    file_path: "two.jpg",
    thumbnail_path: "two_thumb.jpg",
    file_size: 123,
    width: 800,
    height: 600,
    taken_at: null,
    latitude: null,
    longitude: null,
    uploaded_at: "2026-04-06T12:00:00Z",
    mime_type: "image/jpeg"
  }
];

describe("PhotoGrid", () => {
  it("renders thumbnail images from props", () => {
    const wrapper = mount(PhotoGrid, {
      props: {
        photos
      }
    });

    const items = wrapper.findAll('[data-testid="photo-grid-item"]');
    expect(items).toHaveLength(2);

    const firstImage = wrapper.find('img[alt="one.jpg"]');
    expect(firstImage.exists()).toBe(true);
    expect(firstImage.attributes("src")).toBe("/api/photos/1/thumbnail");
  });
});
