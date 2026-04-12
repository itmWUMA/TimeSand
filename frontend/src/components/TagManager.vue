<script setup lang="ts">
import type { Tag } from '../types/album'

import { computed, ref } from 'vue'

const props = defineProps<{
  tags: Tag[]
  availableTags: Tag[]
}>()

const emit = defineEmits<{
  addTag: [tagId: number]
  removeTag: [tagId: number]
  createTag: [tagName: string]
}>()

const inputValue = ref('')
const datalistId = `tag-options-${Math.random().toString(36).slice(2, 8)}`

const selectedTagIds = computed(() => new Set(props.tags.map(tag => tag.id)))

const availableOptions = computed(() =>
  props.availableTags.filter(tag => !selectedTagIds.value.has(tag.id)),
)

function handleAdd(): void {
  const rawValue = inputValue.value.trim()
  if (!rawValue) {
    return
  }

  const matchedTag = availableOptions.value.find(
    tag => tag.name.toLowerCase() === rawValue.toLowerCase(),
  )

  if (matchedTag) {
    emit('addTag', matchedTag.id)
  }
  else {
    emit('createTag', rawValue)
  }

  inputValue.value = ''
}
</script>

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
          :aria-label="`Remove tag ${tag.name}`"
          :title="`Remove tag ${tag.name}`"
          type="button"
          class="rounded px-1 text-[10px] text-ts-accent hover:bg-ts-accent/20"
          @click="$emit('removeTag', tag.id)"
        >
          x
        </button>
      </span>
    </div>

    <div class="flex items-center gap-2">
      <input
        v-model="inputValue"
        data-testid="tag-input"
        type="text"
        placeholder="Add tag"
        :list="datalistId"
        class="w-full rounded border border-white/15 bg-ts-panel px-3 py-2 text-sm text-ts-text outline-none focus:border-ts-accent"
        @keydown.enter.prevent="handleAdd"
      >
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
