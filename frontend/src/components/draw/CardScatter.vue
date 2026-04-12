<template>
  <div
    v-show="open"
    ref="overlayRef"
    data-draw-scatter
    class="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm transition-opacity"
    @click="handleBackdropClick"
  >
    <button
      type="button"
      class="absolute right-4 top-4 rounded border border-ts-accent/60 bg-ts-panel px-4 py-2 text-sm font-semibold text-ts-accent hover:bg-ts-accent hover:text-black"
      @click.stop="emit('collect')"
    >
      Collect
    </button>

    <div class="relative h-full w-full">
      <button
        v-for="(card, index) in cards"
        :key="card.photo.id"
        type="button"
        class="absolute h-44 w-32 overflow-hidden rounded-xl border border-white/20 bg-ts-panel shadow-xl"
        :style="scatterCardStyle(card, index)"
        @mouseenter="handleCardEnter(card, $event)"
        @mouseleave="handleCardLeave(card, $event)"
        @click.stop="handleCardTap(card, $event)"
      >
        <img
          :src="getCardImageSrc(card)"
          :alt="card.photo.filename"
          class="h-full w-full object-cover"
          draggable="false"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { gsap } from "gsap";
import { nextTick, ref, watch } from "vue";

import type { DrawnCard } from "../../stores/draw";

const props = defineProps<{
  open: boolean;
  cards: DrawnCard[];
}>();

const emit = defineEmits<{
  collect: [];
}>();

const overlayRef = ref<HTMLElement | null>(null);
const loadedOriginalCardIds = ref<Set<number>>(new Set());

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      return;
    }

    await nextTick();
    if (!overlayRef.value) {
      return;
    }

    gsap.fromTo(
      overlayRef.value,
      { opacity: 0 },
      { opacity: 1, duration: 0.25, ease: "power2.out" }
    );
  }
);

const scatterCardStyle = (card: DrawnCard, index: number): Record<string, string> => ({
  left: `${50 + card.scatterX}%`,
  top: `${45 + card.scatterY}%`,
  transform: `translate(-50%, -50%) rotate(${card.scatterRotation}deg)`,
  zIndex: String(index + 10)
});

const markOriginalLoaded = (photoId: number): void => {
  if (loadedOriginalCardIds.value.has(photoId)) {
    return;
  }

  loadedOriginalCardIds.value = new Set(loadedOriginalCardIds.value).add(photoId);
};

const getCardImageSrc = (card: DrawnCard): string =>
  loadedOriginalCardIds.value.has(card.photo.id)
    ? `/api/photos/${card.photo.id}/file`
    : `/api/photos/${card.photo.id}/thumbnail`;

const raiseCard = (event: MouseEvent): void => {
  const target = event.currentTarget as HTMLElement | null;
  if (!target) {
    return;
  }

  gsap.to(target, {
    y: -26,
    scale: 1.24,
    rotate: 0,
    duration: 0.2,
    ease: "power2.out"
  });
};

const settleCard = (event: MouseEvent, rotation: number): void => {
  const target = event.currentTarget as HTMLElement | null;
  if (!target) {
    return;
  }

  gsap.to(target, {
    y: 0,
    scale: 1,
    rotate: rotation,
    duration: 0.2,
    ease: "power2.out"
  });
};

const handleCardEnter = (card: DrawnCard, event: MouseEvent): void => {
  markOriginalLoaded(card.photo.id);
  raiseCard(event);
};

const handleCardTap = (card: DrawnCard, event: MouseEvent): void => {
  markOriginalLoaded(card.photo.id);
  raiseCard(event);
};

const handleCardLeave = (card: DrawnCard, event: MouseEvent): void => {
  settleCard(event, card.scatterRotation);
};

const handleBackdropClick = (event: MouseEvent): void => {
  if (event.target === event.currentTarget) {
    emit("collect");
  }
};
</script>
