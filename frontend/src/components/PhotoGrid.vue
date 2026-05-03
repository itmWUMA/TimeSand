<script setup lang="ts">
import type { Photo } from '../types/photo'
import PhotoGridItem from './PhotoGridItem.vue'

defineProps<{
  photos: Photo[]
}>()
const emit = defineEmits<{
  click: [photo: Photo]
}>()
</script>

<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-ts-accent">
        {{ $t('photo.uploadedPhotos') }}
      </h2>
      <p class="text-sm text-ts-muted">
        {{ $t('common.items', { count: photos.length }) }}
      </p>
    </div>

    <p v-if="photos.length === 0" class="rounded-lg border border-white/10 bg-ts-panel px-4 py-5 text-sm text-ts-muted">
      {{ $t('photo.emptyState') }}
    </p>

    <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      <PhotoGridItem
        v-for="photo in photos"
        :key="photo.id"
        :photo="photo"
        @click="emit('click', $event)"
      />
    </div>
  </section>
</template>
