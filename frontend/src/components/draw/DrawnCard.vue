<script setup lang="ts">
import type { DrawnCard } from '../../stores/draw'

import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  card: DrawnCard | null
  center?: boolean
}>()
const emit = defineEmits<{
  photoClick: [payload: {
    photo: DrawnCard['photo']
    rect: DOMRect
  }]
}>()

const { t } = useI18n()
const rootRef = ref<HTMLElement | null>(null)

const cardDateLabel = computed(() => {
  if (!props.card?.photo.taken_at) {
    return t('draw.noCaptureDate')
  }

  const date = new Date(props.card.photo.taken_at)
  if (Number.isNaN(date.getTime())) {
    return t('draw.unknownDate')
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
})

const cardCaption = computed(() => props.card?.photo.filename ?? '')

const cardPlace = computed(() => {
  const photo = props.card?.photo
  if (!photo || photo.latitude === null || photo.longitude === null) {
    return t('draw.photoMemory')
  }

  return `${photo.latitude.toFixed(3)}, ${photo.longitude.toFixed(3)}`
})

function buildPhotoFileSrc(card: DrawnCard): string {
  const version = encodeURIComponent(card.photo.file_path)
  return `/api/photos/${card.photo.id}/file?v=${version}`
}

function onPhotoClick(): void {
  if (!props.card) {
    return
  }

  const rect = rootRef.value?.getBoundingClientRect()
  if (!rect) {
    return
  }

  emit('photoClick', {
    photo: props.card.photo,
    rect,
  })
}
</script>

<template>
  <article
    v-if="card"
    ref="rootRef"
    :data-draw-center-card="center ? 'true' : null"
    class="drawn-card"
  >
    <div class="card-perspective">
      <div
        data-card-inner
        class="card-inner"
      >
        <div class="card-face card-back">
          <div class="card-back-border" />
          <svg
            class="hourglass"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M6 2h12v5.5L13 12l5 4.5V22H6v-5.5L11 12 6 7.5V2z" />
          </svg>
        </div>

        <div class="card-face card-front">
          <button
            type="button"
            class="photo-button cursor-zoom-in"
            :aria-label="t('lightbox.openPhoto', { filename: card.photo.filename })"
            @click="onPhotoClick"
          >
            <img
              :src="buildPhotoFileSrc(card)"
              :alt="card.photo.filename"
              class="photo-image"
              draggable="false"
            >
            <div class="card-meta">
              <p class="card-date">
                {{ cardDateLabel }}
              </p>
              <p class="card-caption">
                {{ cardCaption }}
              </p>
              <p class="card-place">
                {{ cardPlace }}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.drawn-card {
  position: relative;
  width: clamp(280px, 30vw, 360px);
  aspect-ratio: 3 / 4;
}

.card-perspective,
.card-inner,
.card-face,
.photo-button,
.photo-image {
  width: 100%;
  height: 100%;
}

.card-perspective {
  perspective: 1000px;
}

.card-inner {
  position: relative;
  border-radius: 18px;
  box-shadow:
    0 30px 60px -20px rgb(0 0 0 / 60%),
    0 12px 30px -8px rgb(0 0 0 / 50%),
    inset 0 1px 0 oklch(60% 0.05 60 / 30%);
  transform-style: preserve-3d;
}

.card-face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border: 1px solid oklch(80% 0.02 70 / 18%);
  border-radius: 18px;
  backface-visibility: hidden;
}

.card-back {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(140deg, oklch(40% 0.05 55) 0%, oklch(28% 0.04 50) 100%);
  color: var(--ts-accent);
}

.card-back::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 30% 25%, oklch(78% 0.14 72 / 18%), transparent 55%),
    repeating-linear-gradient(45deg, transparent 0 20px, oklch(50% 0.06 60 / 4%) 20px 21px);
}

.card-back-border {
  position: absolute;
  inset: 10px;
  border: 1px solid var(--ts-accent-soft);
  border-radius: 14px;
}

.hourglass {
  position: relative;
  width: 64px;
  height: 64px;
  opacity: 0.35;
}

.card-front {
  background: var(--ts-bg-deep);
  transform: rotateY(180deg);
}

.photo-button {
  position: relative;
  cursor: zoom-in;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 0;
  text-align: left;
}

.photo-image {
  display: block;
  object-fit: cover;
}

.card-meta {
  position: absolute;
  right: 22px;
  bottom: 22px;
  left: 22px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  pointer-events: none;
}

.card-date {
  color: var(--ts-accent);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.card-caption {
  overflow: hidden;
  color: oklch(96% 0.02 80);
  display: -webkit-box;
  font-family: var(--ts-font-display);
  font-size: 22px;
  font-weight: 500;
  line-height: 1.2;
  text-shadow: 0 2px 12px rgb(0 0 0 / 50%);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.card-place {
  color: oklch(80% 0.02 70);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.card-front::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(to top, rgb(0 0 0 / 82%), rgb(0 0 0 / 22%) 35%, transparent 62%);
}

@media (max-width: 720px) {
  .drawn-card {
    width: clamp(220px, 70vw, 300px);
  }

  .card-meta {
    right: 18px;
    bottom: 18px;
    left: 18px;
  }

  .card-caption {
    font-size: 18px;
  }
}

@media (max-width: 420px) {
  .drawn-card {
    width: 240px;
  }
}
</style>
