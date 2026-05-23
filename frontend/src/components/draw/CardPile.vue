<script setup lang="ts">
import type { DrawnCard } from '../../stores/draw'

import { computed } from 'vue'
import { buildThumbnailUrl } from '../../utils/photoUrl'

const props = defineProps<{
  cards: DrawnCard[]
  totalPhotos?: number
}>()

const emit = defineEmits<{
  openScatter: []
}>()

const recentCards = computed(() => props.cards.slice(-6).reverse())
const totalLabel = computed(() => new Intl.NumberFormat().format(props.totalPhotos ?? props.cards.length))
const drawnLabel = computed(() => new Intl.NumberFormat().format(props.cards.length))
</script>

<template>
  <button
    type="button"
    data-draw-pile
    data-draw-ribbon
    class="draw-ribbon"
    :disabled="cards.length === 0"
    @click="emit('openScatter')"
  >
    <template v-if="cards.length">
      <span class="ribbon-label">{{ $t('draw.recentDraws') }}</span>
      <span
        v-for="card in recentCards"
        :key="card.photo.id"
        data-draw-ribbon-card
        data-draw-pile-card
        class="ribbon-card"
        :aria-label="$t('draw.openRecentCard', { filename: card.photo.filename })"
      >
        <img
          :src="buildThumbnailUrl(card.photo)"
          :alt="card.photo.filename"
          class="ribbon-image"
          draggable="false"
        >
      </span>
      <span class="ribbon-spacer" />
      <span class="ribbon-tag">{{ drawnLabel }} / {{ totalLabel }}</span>
    </template>
    <span v-else class="ribbon-empty">
      {{ $t('draw.drawHint') }}
    </span>
  </button>
</template>

<style scoped>
.draw-ribbon {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
  overflow-x: auto;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-lg);
  background: var(--ts-surface);
  color: var(--ts-fg);
  padding: 18px 22px;
  text-align: left;
  transition:
    background var(--ts-duration-fast) var(--ts-ease),
    border-color var(--ts-duration-fast) var(--ts-ease);
}

.draw-ribbon:hover:not(:disabled) {
  border-color: var(--ts-border);
  background: var(--ts-surface-2);
}

.draw-ribbon:disabled {
  cursor: default;
}

.ribbon-label {
  flex-shrink: 0;
  margin-right: 6px;
  padding-right: 14px;
  border-right: 1px solid var(--ts-border-soft);
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.ribbon-card {
  position: relative;
  flex-shrink: 0;
  width: 64px;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border: 1px solid var(--ts-border-soft);
  border-radius: 8px;
  background: linear-gradient(135deg, oklch(50% 0.07 60), oklch(30% 0.04 50));
  transition: transform var(--ts-duration-fast) var(--ts-ease);
}

.draw-ribbon:hover:not(:disabled) .ribbon-card {
  transform: translateY(-3px);
}

.ribbon-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ribbon-spacer {
  flex: 1;
}

.ribbon-tag,
.ribbon-empty {
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .draw-ribbon {
    gap: 10px;
    padding: 14px 16px;
    border-radius: var(--ts-radius);
  }

  .ribbon-label {
    padding-right: 10px;
    font-size: 10px;
    letter-spacing: 0.16em;
  }

  .ribbon-card {
    width: 54px;
  }

  .ribbon-tag {
    display: none;
  }
}
</style>
