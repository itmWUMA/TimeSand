<script setup lang="ts">
import type { DrawnCard } from '../../stores/draw'

defineProps<{
  cards: DrawnCard[]
}>()

const emit = defineEmits<{
  openScatter: []
}>()

function cardStyle(card: DrawnCard, index: number): Record<string, string> {
  return {
    transform: `translate(-50%, -50%) translate(${card.pileOffsetX + index * 4}px, ${index * 2}px) rotate(${
      card.pileRotation
    }deg)`,
    zIndex: String(index + 1),
  }
}
</script>

<template>
  <button
    type="button"
    data-draw-pile
    class="relative flex h-32 w-56 touch-manipulation items-end justify-center rounded-2xl border border-white/10 bg-ts-panel/80 px-3 pb-3 transition hover:border-ts-accent/50 hover:bg-ts-panelSoft"
    :disabled="cards.length === 0"
    @click="emit('openScatter')"
  >
    <template v-if="cards.length">
      <span
        v-for="(card, index) in cards"
        :key="card.photo.id"
        class="pointer-events-none absolute left-1/2 top-1/2 h-24 w-16 rounded-lg border border-white/15 bg-black/50 shadow-lg"
        :style="cardStyle(card, index)"
      >
        <img
          :src="`/api/photos/${card.photo.id}/thumbnail`"
          :alt="card.photo.filename"
          class="h-full w-full rounded-lg object-cover"
          draggable="false"
        >
      </span>
      <span class="pointer-events-none relative z-20 text-xs font-semibold uppercase tracking-wide text-ts-accent">
        Tap To Scatter
      </span>
    </template>
    <span v-else class="text-xs text-ts-muted">
      Draw cards to build the pile
    </span>
  </button>
</template>
