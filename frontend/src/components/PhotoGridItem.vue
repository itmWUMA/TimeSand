<script setup lang="ts">
import type { Photo } from '../types/photo'
import { ref } from 'vue'
import { buildThumbnailUrl } from '../utils/photoUrl'

const props = defineProps<{
  photo: Photo
  index: number
}>()

const emit = defineEmits<{
  photoClick: [payload: {
    photo: Photo
    index: number
    rect: DOMRect
  }]
}>()

const loaded = ref(false)
const rootRef = ref<HTMLElement | null>(null)

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function onClick(): void {
  const rect = rootRef.value?.getBoundingClientRect()
  if (!rect) {
    return
  }

  emit('photoClick', {
    photo: props.photo,
    index: props.index,
    rect,
  })
}

function tileClass(index: number): string {
  if (index % 7 === 0) {
    return 'tall'
  }
  if (index % 5 === 3) {
    return 'wide'
  }

  return ''
}
</script>

<template>
  <article
    ref="rootRef"
    data-testid="photo-grid-item"
    class="photo-grid-tile"
    :class="tileClass(index)"
    @click="onClick"
  >
    <div class="photo-image">
      <div
        v-if="!loaded"
        data-testid="photo-skeleton"
        class="photo-skeleton"
      />
      <img
        :src="buildThumbnailUrl(props.photo)"
        :alt="props.photo.filename"
        loading="lazy"
        class="photo-img"
        :class="loaded ? 'opacity-100' : 'opacity-0'"
        @load="loaded = true"
      >
    </div>
    <div
      data-testid="photo-grid-item-meta"
      class="photo-meta"
    >
      <p class="truncate">
        {{ props.photo.filename }}
      </p>
      <p class="num">
        {{ formatDate(props.photo.uploaded_at) }}
      </p>
    </div>
  </article>
</template>

<style scoped>
.photo-grid-tile {
  position: relative;
  overflow: hidden;
  aspect-ratio: 3 / 4;
  border-radius: var(--ts-radius);
  background: var(--ts-surface-2);
  cursor: zoom-in;
  transition: transform var(--ts-duration-normal) var(--ts-ease);
}

.photo-grid-tile:hover {
  transform: scale(1.02);
}

.photo-grid-tile.tall {
  grid-row: span 2;
  aspect-ratio: 3 / 6;
}

.photo-grid-tile.wide {
  grid-column: span 2;
  aspect-ratio: 6 / 4;
}

.photo-image,
.photo-img,
.photo-skeleton {
  position: absolute;
  inset: 0;
}

.photo-skeleton {
  background:
    radial-gradient(circle at 30% 20%, oklch(60% 0.10 70 / 18%), transparent 52%),
    linear-gradient(135deg, oklch(35% 0.04 60), oklch(25% 0.03 50));
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.72;
  }

  50% {
    opacity: 1;
  }
}

.photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity var(--ts-duration-normal) var(--ts-ease);
}

.photo-meta {
  position: absolute;
  right: 12px;
  bottom: 12px;
  left: 12px;
  color: oklch(90% 0.02 70);
  font-family: var(--ts-font-mono);
  font-size: 10px;
  letter-spacing: 0;
  text-shadow: 0 1px 4px rgb(0 0 0 / 60%);
  opacity: 0;
  transition: opacity var(--ts-duration-normal) var(--ts-ease);
}

.photo-grid-tile:hover .photo-meta,
.photo-grid-tile:focus-within .photo-meta {
  opacity: 1;
}

@media (max-width: 720px) {
  .photo-grid-tile.wide {
    grid-column: span 2;
  }

  .photo-grid-tile.tall {
    grid-row: span 2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .photo-grid-tile,
  .photo-img,
  .photo-meta,
  .photo-skeleton {
    animation: none;
    transition: none;
  }
}
</style>
