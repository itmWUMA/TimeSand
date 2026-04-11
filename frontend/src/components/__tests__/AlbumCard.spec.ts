import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import type { Album } from "../../types/album";
import AlbumCard from "../AlbumCard.vue";

const album: Album = {
  id: 1,
  name: "Vacation 2023",
  description: "Summer trip",
  cover_photo_id: 8,
  cover_photo: "/api/photos/8/thumbnail",
  photo_count: 42,
  created_at: "2026-04-06T12:00:00Z",
  updated_at: "2026-04-06T12:00:00Z"
};

describe("AlbumCard", () => {
  it("renders album name, photo count, and cover image", () => {
    const wrapper = mount(AlbumCard, {
      props: {
        album
      }
    });

    expect(wrapper.text()).toContain("Vacation 2023");
    expect(wrapper.text()).toContain("42 photos");

    const image = wrapper.find('img[alt="Vacation 2023"]');
    expect(image.exists()).toBe(true);
    expect(image.attributes("src")).toBe("/api/photos/8/thumbnail");
  });
});
