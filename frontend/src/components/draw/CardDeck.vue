<script setup lang="ts">
import type { gsap } from 'gsap'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { glowBreath } from '../../composables/motion/transitions'

const props = defineProps<{
  disabled?: boolean
  gestureX?: number
  gestureRotation?: number
}>()

const emit = defineEmits<{
  draw: []
}>()

const deckRef = ref<HTMLElement | null>(null)
let breathTween: gsap.core.Tween | null = null

const layers = [
  { className: 'stack-2' },
  { className: 'stack-3' },
  { className: 'stack-1' },
]
const gestureStyle = computed<Record<string, string> | undefined>(() => {
  const x = props.gestureX ?? 0
  const rotation = props.gestureRotation ?? 0
  if (Math.abs(x) < 0.01 && Math.abs(rotation) < 0.01) {
    return undefined
  }

  return {
    transform: `translateX(${x}px) rotate(${rotation}deg)`,
  }
})

onMounted(() => {
  if (!deckRef.value) {
    return
  }

  breathTween = glowBreath(deckRef.value)
  if (props.disabled) {
    breathTween.pause()
  }
})

onUnmounted(() => {
  breathTween?.kill()
  breathTween = null
})

watch(
  () => props.disabled,
  (disabled) => {
    if (!breathTween) {
      return
    }

    if (disabled) {
      breathTween.pause()
      return
    }

    breathTween.resume()
  },
)
</script>

<template>
  <button
    ref="deckRef"
    type="button"
    data-draw-deck
    class="deck"
    :disabled="disabled"
    :style="gestureStyle"
    @click="emit('draw')"
  >
    <span
      v-for="layer in layers"
      :key="layer.className"
      class="card-mem"
      :class="layer.className"
    />
    <span class="card-mem hero" aria-hidden="true" />
    <span class="sr-label">
      {{ disabled ? $t('draw.drawing') : $t('draw.tapToDraw') }}
    </span>
  </button>
</template>

<style scoped>
.deck {
  position: relative;
  width: clamp(280px, 30vw, 360px);
  aspect-ratio: 3 / 4;
  border: 0;
  background: transparent;
  cursor: pointer;
  touch-action: manipulation;
  transform-style: preserve-3d;
  transition:
    transform 0.8s var(--ts-ease-out-soft),
    opacity var(--ts-duration-fast) var(--ts-ease);
}

.deck:hover:not(:disabled) {
  transform: translateY(-4px);
}

.deck:disabled {
  cursor: wait;
  opacity: 0.7;
}

.deck:focus-visible {
  outline: 2px solid var(--ts-accent);
  outline-offset: 6px;
}

.card-mem {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 18px;
  background: linear-gradient(140deg, oklch(40% 0.05 55) 0%, oklch(28% 0.04 50) 100%);
  box-shadow:
    0 30px 60px -20px rgb(0 0 0 / 60%),
    0 12px 30px -8px rgb(0 0 0 / 50%),
    inset 0 1px 0 oklch(60% 0.05 60 / 30%);
  pointer-events: none;
  transition:
    transform 0.9s var(--ts-ease-out-soft),
    opacity 0.6s var(--ts-ease);
}

.card-mem::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 30% 25%, oklch(78% 0.14 72 / 18%), transparent 55%),
    repeating-linear-gradient(45deg, transparent 0 20px, oklch(50% 0.06 60 / 4%) 20px 21px);
}

.card-mem.hero {
  background:
    var(--ts-bg-deep)
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 600'><defs><linearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23a87b4d'/><stop offset='50%25' stop-color='%23704a2b'/><stop offset='100%25' stop-color='%232a1a10'/></linearGradient></defs><rect width='400' height='600' fill='url(%23g)'/><circle cx='200' cy='180' r='80' fill='%23f4d49a' opacity='0.6'/><path d='M0 420 Q100 360 200 400 T400 380 L400 600 L0 600 Z' fill='%23241510' opacity='0.6'/></svg>")
    center / cover no-repeat;
}

.card-mem.hero::before {
  display: none;
}

.stack-1 {
  opacity: 0.55;
  transform: translate(8px, 10px) rotate(2deg);
}

.stack-2 {
  opacity: 0.3;
  transform: translate(16px, 20px) rotate(4deg);
}

.stack-3 {
  opacity: 0.4;
  transform: translate(-8px, 14px) rotate(-2.5deg);
}

.sr-label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (max-width: 720px) {
  .deck {
    width: clamp(220px, 70vw, 300px);
  }
}

@media (max-width: 420px) {
  .deck {
    width: 240px;
  }
}
</style>
