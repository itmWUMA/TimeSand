<script setup lang="ts">
defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  draw: []
}>()

const layers = [4, 3, 2, 1]

function deckLayerStyle(layer: number): Record<string, string> {
  return {
    transform: `translate(-50%, -50%) translate(${layer * 1.5}px, ${layer * 2}px) rotate(${layer * 0.8}deg)`,
    opacity: String(Math.max(0.28, 0.8 - layer * 0.12)),
    zIndex: String(10 - layer),
  }
}
</script>

<template>
  <button
    type="button"
    data-draw-deck
    class="group relative h-64 w-44 touch-manipulation rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ts-accent"
    :disabled="disabled"
    @click="emit('draw')"
  >
    <span
      class="pointer-events-none absolute inset-0 rounded-2xl border border-ts-accent/25 bg-gradient-to-b from-ts-panelSoft to-black/80 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-glow"
      :class="disabled ? 'opacity-70' : 'opacity-100'"
    />
    <span class="pointer-events-none absolute inset-x-3 top-3 h-2 rounded-full bg-white/10" />
    <span
      class="pointer-events-none absolute inset-x-0 bottom-5 text-center text-sm font-semibold tracking-wide text-ts-accent"
    >
      {{ disabled ? $t('draw.drawing') : $t('draw.tapToDraw') }}
    </span>

    <span
      v-for="layer in layers"
      :key="layer"
      class="pointer-events-none absolute left-1/2 top-1/2 h-64 w-44 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-ts-panel/70"
      :style="deckLayerStyle(layer)"
    />
  </button>
</template>
