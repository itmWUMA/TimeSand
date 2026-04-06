import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import PhotoUploader from "../PhotoUploader.vue";

describe("PhotoUploader", () => {
  it("renders drop zone and file input", () => {
    const wrapper = mount(PhotoUploader, {
      props: {
        uploading: false,
        progress: 0
      }
    });

    expect(wrapper.find('[data-testid="photo-uploader-dropzone"]').exists()).toBe(true);

    const fileInput = wrapper.find('input[type="file"]');
    expect(fileInput.exists()).toBe(true);
    expect(fileInput.attributes("multiple")).toBeDefined();
  });
});
