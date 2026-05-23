<script setup lang="ts">
import type { Photo } from '../types/photo'
import PhotoGridItem from './PhotoGridItem.vue'

defineProps<{
  photos: Photo[]
}>()
const emit = defineEmits<{
  photoClick: [payload: {
    photo: Photo
    index: number
    rect: DOMRect
  }]
}>()
</script>

<template>
  <section class="photo-grid-section">
    <div class="photo-grid-head">
      <h2 class="h-eyebrow">
        {{ $t('photo.uploadedPhotos') }}
      </h2>
      <p class="chip">
        {{ $t('common.items', { count: photos.length }) }}
      </p>
    </div>

    <p v-if="photos.length === 0" class="photo-grid-empty">
      {{ $t('photo.emptyState') }}
    </p>

    <div
      v-else
      data-testid="photo-grid"
      class="photo-grid-surface"
    >
      <PhotoGridItem
        v-for="(photo, index) in photos"
        :key="photo.id"
        :photo="photo"
        :index="index"
        @photo-click="emit('photoClick', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.photo-grid-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.photo-grid-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}

.photo-grid-empty {
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-lg);
  background: var(--ts-surface);
  color: var(--ts-muted);
  padding: 22px;
  font-size: 14px;
}

.photo-grid-surface {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-auto-flow: dense;
  gap: 14px;
}

@media (max-width: 720px) {
  .photo-grid-surface {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 8px;
  }
}

@media (max-width: 380px) {
  .photo-grid-surface {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
