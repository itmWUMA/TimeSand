<script setup lang="ts">
import type { DrawnCard } from '../../stores/draw'

import { gsap } from 'gsap'
import { nextTick, ref, watch } from 'vue'
import { staggerIn } from '../../composables/motion/sequences'

const props = defineProps<{
  open: boolean
  cards: DrawnCard[]
}>()

const emit = defineEmits<{
  collect: []
}>()

const overlayRef = ref<HTMLElement | null>(null)
const loadedOriginalCardIds = ref<Set<number>>(new Set())
let entranceTween: gsap.core.Tween | null = null

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      entranceTween?.kill()
      entranceTween = null
      return
    }

    await nextTick()
    if (!overlayRef.value) {
      return
    }

    const cards = Array.from(overlayRef.value.querySelectorAll<HTMLElement>('[data-scatter-card]'))
    gsap.fromTo(
      overlayRef.value,
      { opacity: 0 },
      { opacity: 1, duration: 0.2, ease: 'power2.out' },
    )

    if (cards.length === 0) {
      return
    }

    entranceTween?.kill()
    entranceTween = staggerIn(cards, { stagger: 0.08 })
  },
  { immediate: true },
)

function scatterCardStyle(card: DrawnCard, index: number): Record<string, string> {
  return {
    left: `${50 + card.scatterX}%`,
    top: `${45 + card.scatterY}%`,
    transform: `translate(-50%, -50%) rotate(${card.scatterRotation}deg)`,
    zIndex: String(index + 10),
  }
}

function markOriginalLoaded(photoId: number): void {
  if (loadedOriginalCardIds.value.has(photoId)) {
    return
  }

  loadedOriginalCardIds.value = new Set(loadedOriginalCardIds.value).add(photoId)
}

function getCardImageSrc(card: DrawnCard): string {
  return loadedOriginalCardIds.value.has(card.photo.id)
    ? `/api/photos/${card.photo.id}/file`
    : `/api/photos/${card.photo.id}/thumbnail`
}

function handleMouseMove(event: MouseEvent, cardEl: HTMLElement): void {
  const rect = cardEl.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  const deltaX = (event.clientX - centerX) / (rect.width / 2)
  const deltaY = (event.clientY - centerY) / (rect.height / 2)

  const clampedX = Math.max(-1, Math.min(1, deltaX))
  const clampedY = Math.max(-1, Math.min(1, deltaY))

  gsap.to(cardEl, {
    rotateY: clampedX * 5,
    rotateX: -clampedY * 5,
    scale: 1.08,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
    duration: 0.2,
    ease: 'power2.out',
  })
}

function handleMouseLeave(cardEl: HTMLElement): void {
  gsap.to(cardEl, {
    rotateY: 0,
    rotateX: 0,
    scale: 1,
    boxShadow: '',
    duration: 0.3,
    ease: 'power2.out',
  })
}

function getCardFaceElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) {
    return null
  }

  return target.querySelector<HTMLElement>('[data-scatter-card-face]')
}

function handleCardEnter(card: DrawnCard): void {
  markOriginalLoaded(card.photo.id)
}

function handleCardMove(event: MouseEvent): void {
  const cardFace = getCardFaceElement(event.currentTarget)
  if (!cardFace) {
    return
  }

  handleMouseMove(event, cardFace)
}

function handleCardTap(card: DrawnCard): void {
  markOriginalLoaded(card.photo.id)
}

function handleCardLeave(event: MouseEvent): void {
  const cardFace = getCardFaceElement(event.currentTarget)
  if (!cardFace) {
    return
  }

  handleMouseLeave(cardFace)
}

function handleBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    emit('collect')
  }
}
</script>

<template>
  <div
    v-show="open"
    ref="overlayRef"
    data-draw-scatter
    class="fixed inset-0 z-40 bg-black/75 backdrop-blur-ts-sm transition-opacity"
    @click="handleBackdropClick"
  >
    <button
      type="button"
      class="absolute right-4 top-4 z-10 rounded border border-ts-accent/60 bg-ts-panel px-4 py-2 text-sm font-semibold text-ts-accent hover:bg-ts-accent hover:text-black"
      @click.stop="emit('collect')"
    >
      {{ $t('draw.collect') }}
    </button>

    <div class="relative h-full w-full">
      <button
        v-for="(card, index) in cards"
        :key="card.photo.id"
        type="button"
        data-scatter-card
        class="absolute h-44 w-32 [perspective:900px]"
        :style="scatterCardStyle(card, index)"
        @mouseenter="handleCardEnter(card)"
        @mousemove="handleCardMove"
        @mouseleave="handleCardLeave"
        @click.stop="handleCardTap(card)"
      >
        <div
          data-scatter-card-face
          class="h-full w-full overflow-hidden rounded-xl border border-white/20 bg-ts-panel shadow-xl [transform-style:preserve-3d]"
        >
          <img
            :src="getCardImageSrc(card)"
            :alt="card.photo.filename"
            class="h-full w-full object-cover"
            draggable="false"
          >
        </div>
      </button>
    </div>
  </div>
</template>
