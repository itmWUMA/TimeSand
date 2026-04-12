import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import MusicUploader from "../MusicUploader.vue";

describe("MusicUploader", () => {
  it("renders upload zone and file input", () => {
    const wrapper = mount(MusicUploader, {
      props: {
        uploading: false
      }
    });

    expect(wrapper.find('[data-testid="music-uploader-dropzone"]').exists()).toBe(true);

    const fileInput = wrapper.find('input[type="file"]');
    expect(fileInput.exists()).toBe(true);
    expect(fileInput.attributes("multiple")).toBeDefined();
  });
});
