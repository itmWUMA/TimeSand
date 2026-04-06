<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-ts-accent">Uploaded Photos</h2>
      <p class="text-sm text-ts-muted">{{ photos.length }} items</p>
    </div>

    <p v-if="photos.length === 0" class="rounded-lg border border-white/10 bg-ts-panel px-4 py-5 text-sm text-ts-muted">
      No photos uploaded yet.
    </p>

    <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      <article
        v-for="photo in photos"
        :key="photo.id"
        data-testid="photo-grid-item"
        class="overflow-hidden rounded-xl border border-white/10 bg-ts-panelSoft"
      >
        <img
          :src="`/api/photos/${photo.id}/thumbnail`"
          :alt="photo.filename"
          class="aspect-square h-full w-full object-cover"
          loading="lazy"
        />
        <div class="space-y-1 px-3 py-2">
          <p class="truncate text-sm text-ts-text">{{ photo.filename }}</p>
          <p class="text-xs text-ts-muted">{{ formatDate(photo.uploaded_at) }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Photo } from "../types/photo";

defineProps<{
  photos: Photo[];
}>();

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};
</script>
