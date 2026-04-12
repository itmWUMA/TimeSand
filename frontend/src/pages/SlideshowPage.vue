<template>
  <section class="fixed inset-0 z-50 bg-[#0a0a0a]">
    <div v-if="loading" class="flex h-full items-center justify-center text-sm text-white/75">
      Loading slideshow...
    </div>

    <div
      v-else-if="errorMessage"
      class="flex h-full flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <p class="rounded border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {{ errorMessage }}
      </p>
      <button
        type="button"
        class="rounded border border-white/35 px-4 py-2 text-sm text-white transition hover:border-white/70 hover:bg-white/10"
        @click="exitSlideshow"
      >
        Go Back
      </button>
    </div>

    <div
      v-else-if="photos.length === 0"
      class="flex h-full flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <p class="text-sm text-white/70">
        {{ albumId ? "No photos found in this album." : "No photos available for slideshow." }}
      </p>
      <button
        type="button"
        class="rounded border border-white/35 px-4 py-2 text-sm text-white transition hover:border-white/70 hover:bg-white/10"
        @click="exitSlideshow"
      >
        Go Back
      </button>
    </div>

    <SlideshowPlayer
      v-else
      :photos="photos"
      :current-index="currentIndex"
      :is-playing="isPlaying"
      :interval-seconds="intervalSeconds"
      :interval-options="intervalOptions"
      :controls-visible="controlsVisible"
      @next="next"
      @prev="prev"
      @toggle-play="togglePlayPause"
      @set-interval="setIntervalSeconds"
      @exit="exitSlideshow"
      @activity="reportActivity"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import SlideshowPlayer from "../components/SlideshowPlayer.vue";
import { useSlideshow } from "../composables/useSlideshow";
import { listSlideshowPhotos } from "../services/slideshow";
import type { Photo } from "../types/photo";

const route = useRoute();
const router = useRouter();

const photos = ref<Photo[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const parseAlbumId = (value: unknown): number | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

const albumId = computed(() => parseAlbumId(route.query.album_id));

const {
  currentIndex,
  isPlaying,
  intervalSeconds,
  intervalOptions,
  controlsVisible,
  next,
  prev,
  togglePlayPause,
  setIntervalSeconds,
  reportActivity
} = useSlideshow(photos);

const loadPhotos = async (): Promise<void> => {
  loading.value = true;
  errorMessage.value = null;

  try {
    const payload = await listSlideshowPhotos({
      albumId: albumId.value
    });
    photos.value = payload.photos;
  } catch {
    errorMessage.value = "Failed to load slideshow photos.";
  } finally {
    loading.value = false;
  }
};

const exitSlideshow = (): void => {
  router.back();
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === " ") {
    event.preventDefault();
    togglePlayPause();
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    prev();
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    next();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    exitSlideshow();
  }
};

watch(albumId, async () => {
  await loadPhotos();
}, { immediate: true });

let previousOverflow = "";

onMounted(() => {
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.body.style.overflow = previousOverflow;
  window.removeEventListener("keydown", handleKeydown);
});
</script>
