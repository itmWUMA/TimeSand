import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import type { Tag } from "../../types/album";
import TagManager from "../TagManager.vue";

const allTags: Tag[] = [
  { id: 1, name: "sunset" },
  { id: 2, name: "travel" }
];

describe("TagManager", () => {
  it("renders existing tags and emits add/remove actions", async () => {
    const wrapper = mount(TagManager, {
      props: {
        tags: [allTags[0]],
        availableTags: allTags
      }
    });

    expect(wrapper.text()).toContain("sunset");

    await wrapper.get('[data-testid="tag-input"]').setValue("travel");
    await wrapper.get('[data-testid="add-tag-button"]').trigger("click");

    expect(wrapper.emitted("add-tag")).toBeTruthy();
    expect(wrapper.emitted("add-tag")?.[0]).toEqual([2]);

    await wrapper.get('[data-testid="remove-tag-1"]').trigger("click");
    expect(wrapper.emitted("remove-tag")?.[0]).toEqual([1]);
  });

  it("emits create-tag when user enters an unknown tag", async () => {
    const wrapper = mount(TagManager, {
      props: {
        tags: [],
        availableTags: allTags
      }
    });

    await wrapper.get('[data-testid="tag-input"]').setValue("golden-hour");
    await wrapper.get('[data-testid="add-tag-button"]').trigger("click");

    expect(wrapper.emitted("create-tag")?.[0]).toEqual(["golden-hour"]);
  });
});
