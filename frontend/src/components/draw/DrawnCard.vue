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

const weightReasonLabel = computed(() => {
  if (!props.card?.weightReason) {
    return ''
  }

  return props.card.weightReason.replaceAll('_', ' ')
})
</script>

<template>
  <article
    v-if="card"
    :data-draw-center-card="center ? 'true' : null"
    class="group relative h-[25rem] w-[17rem] overflow-hidden rounded-2xl border border-white/15 bg-ts-panel shadow-2xl md:h-[28rem] md:w-[19rem]"
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
      <p v-if="card.weightReason" class="mt-1 text-xs font-medium text-ts-accent">
        {{ weightReasonLabel }}
      </p>
    </div>
    <span class="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
  </article>
</template>
