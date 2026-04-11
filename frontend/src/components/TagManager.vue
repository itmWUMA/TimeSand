<template>
  <section class="space-y-2">
    <div class="flex flex-wrap gap-2">
      <span
        v-for="tag in tags"
        :key="tag.id"
        class="inline-flex items-center gap-1 rounded-full border border-ts-accent/40 bg-ts-accent/10 px-2 py-1 text-xs text-ts-accent"
      >
        {{ tag.name }}
        <button
          :data-testid="`remove-tag-${tag.id}`"
          type="button"
          class="rounded px-1 text-[10px] text-ts-accent hover:bg-ts-accent/20"
          @click="$emit('remove-tag', tag.id)"
        >
          x
        </button>
      </span>
    </div>

    <div class="flex items-center gap-2">
      <input
        data-testid="tag-input"
        v-model="inputValue"
        type="text"
        placeholder="Add tag"
        :list="datalistId"
        class="w-full rounded border border-white/15 bg-ts-panel px-3 py-2 text-sm text-ts-text outline-none focus:border-ts-accent"
        @keydown.enter.prevent="handleAdd"
      />
      <button
        data-testid="add-tag-button"
        type="button"
        class="rounded border border-ts-accent/60 px-3 py-2 text-xs font-semibold text-ts-accent transition hover:bg-ts-accent hover:text-black"
        @click="handleAdd"
      >
        Add
      </button>
    </div>

    <datalist :id="datalistId">
      <option v-for="tag in availableOptions" :key="tag.id" :value="tag.name" />
    </datalist>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import type { Tag } from "../types/album";

const props = defineProps<{
  tags: Tag[];
  availableTags: Tag[];
}>();

const emit = defineEmits<{
  "add-tag": [tagId: number];
  "remove-tag": [tagId: number];
  "create-tag": [tagName: string];
}>();

const inputValue = ref("");
const datalistId = `tag-options-${Math.random().toString(36).slice(2, 8)}`;

const selectedTagIds = computed(() => new Set(props.tags.map((tag) => tag.id)));

const availableOptions = computed(() =>
  props.availableTags.filter((tag) => !selectedTagIds.value.has(tag.id))
);

const handleAdd = (): void => {
  const rawValue = inputValue.value.trim();
  if (!rawValue) {
    return;
  }

  const matchedTag = availableOptions.value.find(
    (tag) => tag.name.toLowerCase() === rawValue.toLowerCase()
  );

  if (matchedTag) {
    emit("add-tag", matchedTag.id);
  } else {
    emit("create-tag", rawValue);
  }

  inputValue.value = "";
};
</script>
