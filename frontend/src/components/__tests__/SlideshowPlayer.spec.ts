import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import SlideshowPlayer from "../SlideshowPlayer.vue";
import type { Photo } from "../../types/photo";

const photos: Photo[] = [
  {
    id: 1,
    filename: "one.jpg",
    file_path: "one.jpg",
    thumbnail_path: "one_thumb.jpg",
    file_size: 1024,
    width: 1200,
    height: 800,
    taken_at: null,
    latitude: null,
    longitude: null,
    uploaded_at: "2026-04-12T00:00:00Z",
    mime_type: "image/jpeg"
  }
];

describe("SlideshowPlayer", () => {
  it("renders current photo and control buttons", () => {
    const wrapper = mount(SlideshowPlayer, {
      props: {
        photos,
        currentIndex: 0,
        isPlaying: true,
        intervalSeconds: 5,
        intervalOptions: [3, 5, 8],
        controlsVisible: true
      }
    });

    const image = wrapper.find('[data-testid="slideshow-photo"]');
    expect(image.exists()).toBe(true);
    expect(image.attributes("src")).toBe("/api/photos/1/file");

    expect(wrapper.find('[data-testid="control-prev"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="control-next"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="control-play-pause"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="control-interval"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="control-exit"]').exists()).toBe(true);
  });
});