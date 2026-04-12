<template>
  <section
    class="relative h-full w-full overflow-hidden bg-[#0a0a0a]"
    @mousemove="emitActivity"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <Transition name="slideshow-fade" mode="out-in">
      <figure
        v-if="currentPhoto"
        :key="currentPhoto.id"
        class="absolute inset-0 flex items-center justify-center"
      >
        <img
          data-testid="slideshow-photo"
          :src="`/api/photos/${currentPhoto.id}/file`"
          :alt="currentPhoto.filename"
          class="max-h-full max-w-full object-contain slideshow-ken-burns"
          :style="{ animationDuration: `${intervalSeconds}s` }"
          draggable="false"
        />
      </figure>
    </Transition>

    <div
      class="absolute inset-x-0 bottom-0 top-0 z-20 flex flex-col justify-between p-4 transition-opacity duration-300 md:p-6"
      :class="controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'"
    >
      <div class="flex items-center justify-between">
        <p class="rounded bg-black/45 px-3 py-1 text-xs text-white/80">
          {{ currentPhoto ? currentPhoto.filename : "No photos" }}
        </p>
        <button
          data-testid="control-exit"
          type="button"
          class="rounded border border-white/35 bg-black/35 px-3 py-1.5 text-sm text-white transition hover:border-white/70 hover:bg-black/60"
          @click="$emit('exit')"
        >
          Exit
        </button>
      </div>

      <div class="mx-auto flex w-full max-w-xl flex-wrap items-center justify-center gap-2 rounded-xl border border-white/20 bg-black/45 px-3 py-3 backdrop-blur">
        <button
          data-testid="control-prev"
          type="button"
          class="rounded border border-white/35 px-3 py-2 text-sm text-white transition hover:border-white/70 hover:bg-white/10"
          @click="$emit('prev')"
        >
          Prev
        </button>
        <button
          data-testid="control-play-pause"
          type="button"
          class="rounded border border-white/35 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/70 hover:bg-white/10"
          @click="$emit('toggle-play')"
        >
          {{ isPlaying ? "Pause" : "Play" }}
        </button>
        <button
          data-testid="control-next"
          type="button"
          class="rounded border border-white/35 px-3 py-2 text-sm text-white transition hover:border-white/70 hover:bg-white/10"
          @click="$emit('next')"
        >
          Next
        </button>
        <label class="flex items-center gap-2 text-sm text-white/85">
          <span>Interval</span>
          <select
            data-testid="control-interval"
            :value="intervalSeconds"
            class="rounded border border-white/35 bg-black/50 px-2 py-1 text-sm text-white outline-none focus:border-white/70"
            @change="onIntervalChange"
          >
            <option v-for="option in intervalOptions" :key="option" :value="option">
              {{ option }}s
            </option>
          </select>
        </label>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import type { Photo } from "../types/photo";

const props = defineProps<{
  photos: Photo[];
  currentIndex: number;
  isPlaying: boolean;
  intervalSeconds: number;
  intervalOptions: number[];
  controlsVisible: boolean;
}>();

const emit = defineEmits<{
  (event: "next"): void;
  (event: "prev"): void;
  (event: "toggle-play"): void;
  (event: "set-interval", seconds: number): void;
  (event: "exit"): void;
  (event: "activity"): void;
}>();

const touchStartX = ref<number | null>(null);

const currentPhoto = computed(() => props.photos[props.currentIndex] ?? null);

const emitActivity = (): void => {
  emit("activity");
};

const onIntervalChange = (event: Event): void => {
  const target = event.target as HTMLSelectElement;
  const nextValue = Number.parseInt(target.value, 10);

  if (!Number.isNaN(nextValue)) {
    emit("set-interval", nextValue);
  }
};

const onTouchStart = (event: TouchEvent): void => {
  emitActivity();
  touchStartX.value = event.changedTouches[0]?.clientX ?? null;
};

const onTouchEnd = (event: TouchEvent): void => {
  emitActivity();

  const startX = touchStartX.value;
  const endX = event.changedTouches[0]?.clientX ?? null;
  touchStartX.value = null;

  if (startX === null || endX === null) {
    return;
  }

  const distance = endX - startX;
  if (Math.abs(distance) < 40) {
    return;
  }

  if (distance < 0) {
    emit("next");
    return;
  }

  emit("prev");
};
</script>

<style scoped>
.slideshow-fade-enter-active,
.slideshow-fade-leave-active {
  transition: opacity 0.8s ease;
}

.slideshow-fade-enter-from,
.slideshow-fade-leave-to {
  opacity: 0;
}

.slideshow-ken-burns {
  animation-name: slideshow-ken-burns;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

@keyframes slideshow-ken-burns {
  from {
    transform: scale(1) translate3d(0, 0, 0);
  }

  to {
    transform: scale(1.1) translate3d(1.5%, -1.5%, 0);
  }
}
</style>
