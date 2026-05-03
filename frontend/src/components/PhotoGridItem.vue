<script setup lang="ts">
import type { Photo } from '../types/photo'
import { ref } from 'vue'
import { buildThumbnailUrl } from '../utils/photoUrl'

const props = defineProps<{
  photo: Photo
}>()

const emit = defineEmits<{
  click: [photo: Photo]
}>()

const loaded = ref(false)

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}
</script>

<template>
  <article
    data-testid="photo-grid-item"
    class="cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-ts-panelSoft"
    @click="emit('click', props.photo)"
  >
    <div class="relative aspect-video">
      <div
        v-if="!loaded"
        data-testid="photo-skeleton"
        class="absolute inset-0 animate-pulse bg-ts-panel"
      />
      <img
        :src="buildThumbnailUrl(props.photo)"
        :alt="props.photo.filename"
        loading="lazy"
        class="h-full w-full object-cover transition-opacity duration-300"
        :class="loaded ? 'opacity-100' : 'opacity-0'"
        @load="loaded = true"
      >
    </div>
    <div class="space-y-1 px-3 py-2">
      <p class="truncate text-sm text-ts-text">
        {{ props.photo.filename }}
      </p>
      <p class="text-xs text-ts-muted">
        {{ formatDate(props.photo.uploaded_at) }}
      </p>
    </div>
  </article>
</template>
