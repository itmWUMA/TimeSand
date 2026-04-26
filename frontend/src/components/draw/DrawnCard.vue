<script setup lang="ts">
import type { DrawnCard } from '../../stores/draw'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  card: DrawnCard | null
  center?: boolean
}>()
const { t } = useI18n()

const takenAtLabel = computed(() => {
  if (!props.card?.photo.taken_at) {
    return t('draw.noCaptureDate')
  }

  const date = new Date(props.card.photo.taken_at)
  if (Number.isNaN(date.getTime())) {
    return t('draw.unknownDate')
  }

  return date.toLocaleDateString()
})
</script>

<template>
  <article
    v-if="card"
    :data-draw-center-card="center ? 'true' : null"
    class="relative h-[25rem] w-[17rem] md:h-[28rem] md:w-[19rem]"
  >
    <div class="relative h-full w-full [perspective:1000px]">
      <div
        data-card-inner
        class="relative h-full w-full rounded-2xl shadow-2xl [transform-style:preserve-3d]"
      >
        <div
          class="absolute inset-0 flex items-center justify-center rounded-ts-lg border border-ts-border bg-ts-panel [backface-visibility:hidden]"
        >
          <div class="absolute inset-[10px] rounded-[calc(var(--ts-radius-lg)-4px)] border border-ts-accent/20" />
          <svg
            class="h-16 w-16 text-ts-accent/30"
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
          <span class="pointer-events-none absolute inset-0 rounded-ts-lg ring-1 ring-inset ring-white/10" />
        </div>

        <div
          class="absolute inset-0 overflow-hidden rounded-2xl border border-white/15 bg-ts-panel [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <img
            :src="`/api/photos/${card.photo.id}/file`"
            :alt="card.photo.filename"
            class="h-full w-full object-cover"
            draggable="false"
          >
          <div
            class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent px-4 pb-4 pt-12"
          >
            <p class="truncate text-sm font-semibold text-ts-text">
              {{ card.photo.filename }}
            </p>
            <p class="text-xs text-ts-muted">
              {{ takenAtLabel }}
            </p>
          </div>
          <span class="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
        </div>
      </div>
    </div>
  </article>
</template>
