<script setup lang="ts">
import type { Album } from '../types/album'

import { computed, onMounted, ref, watch } from 'vue'
import CardDeck from '../components/draw/CardDeck.vue'
import CardPile from '../components/draw/CardPile.vue'
import CardScatter from '../components/draw/CardScatter.vue'
import DrawnCard from '../components/draw/DrawnCard.vue'
import { useCardDraw } from '../composables/useCardDraw'
import { useMusicPlayer } from '../composables/useMusicPlayer'
import { listAlbums } from '../services/album'
import { useDrawStore } from '../stores/draw'

const drawStore = useDrawStore()
const { setContext } = useMusicPlayer()
const albums = ref<Album[]>([])
const touchStartX = ref<number | null>(null)

const {
  activeCard,
  pileCards,
  drawnCards,
  hasDrawnCards,
  isDrawing,
  isScatterOpen,
  errorMessage,
  lastWeightReason,
  drawNextCard,
  openScatter,
  collectScatter,
  reshuffle,
  undoLastCard,
} = useCardDraw()

const selectedAlbumValue = computed(() =>
  drawStore.albumId === null ? '' : String(drawStore.albumId),
)

function onAlbumChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  const nextValue = Number.parseInt(target.value, 10)
  drawStore.setAlbumFilter(Number.isNaN(nextValue) ? null : nextValue)
}

function handleTouchStart(event: TouchEvent): void {
  touchStartX.value = event.changedTouches[0]?.clientX ?? null
}

async function handleTouchEnd(event: TouchEvent): Promise<void> {
  const startX = touchStartX.value
  const endX = event.changedTouches[0]?.clientX ?? null
  touchStartX.value = null

  if (startX === null || endX === null) {
    return
  }

  const distance = endX - startX
  if (Math.abs(distance) < 42) {
    return
  }

  if (distance < 0) {
    await drawNextCard()
    return
  }

  await undoLastCard()
}

async function syncPlayerContext(): Promise<void> {
  if (drawStore.albumId != null) {
    await setContext('album', drawStore.albumId)
    return
  }

  await setContext('default')
}

onMounted(async () => {
  try {
    const payload = await listAlbums()
    albums.value = payload.items
  }
  catch {
    albums.value = []
  }

  await syncPlayerContext()
})

watch(
  () => drawStore.albumId,
  async () => {
    await syncPlayerContext()
  },
)
</script>

<template>
  <section class="mx-auto max-w-6xl space-y-6">
    <header class="space-y-3">
      <h1 class="text-3xl font-semibold text-ts-accent">
        {{ $t('draw.title') }}
      </h1>
      <p class="text-sm text-ts-muted">
        {{ $t('draw.description') }}
      </p>

      <div class="flex flex-col gap-3 rounded-xl border border-white/10 bg-ts-panel p-4 md:flex-row md:items-center">
        <label class="flex items-center gap-2 text-sm text-ts-muted">
          <span>{{ $t('draw.albumLabel') }}</span>
          <select
            :value="selectedAlbumValue"
            class="rounded border border-white/15 bg-ts-panelSoft px-3 py-2 text-sm text-ts-text focus:border-ts-accent focus:outline-none"
            @change="onAlbumChange"
          >
            <option value="">{{ $t('draw.allPhotos') }}</option>
            <option
              v-for="album in albums"
              :key="album.id"
              :value="album.id"
            >
              {{ album.name }}
            </option>
          </select>
        </label>

        <button
          type="button"
          class="rounded border border-ts-accent/70 px-4 py-2 text-sm font-semibold text-ts-accent transition hover:bg-ts-accent hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isDrawing"
          @click="drawNextCard"
        >
          {{ isDrawing ? $t('draw.drawing') : $t('draw.drawNext') }}
        </button>

        <button
          type="button"
          class="rounded border border-white/20 px-4 py-2 text-sm font-semibold text-ts-text transition hover:border-white/40 hover:bg-white/10"
          :disabled="!hasDrawnCards || isDrawing"
          @click="reshuffle"
        >
          {{ $t('draw.reshuffle') }}
        </button>

        <p class="text-xs text-ts-muted md:ml-auto">
          {{ $t('draw.swipeHint') }}
        </p>
      </div>
    </header>

    <p
      v-if="errorMessage"
      class="rounded border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
    >
      {{ errorMessage }}
    </p>

    <div class="relative overflow-hidden rounded-2xl border border-white/10 bg-ts-panel/70 px-4 py-8 md:px-8">
      <div class="relative mx-auto h-[32rem] max-w-5xl">
        <div class="absolute inset-0 flex items-center justify-center">
          <CardDeck :disabled="isDrawing" @draw="drawNextCard" />
        </div>

        <div
          v-if="activeCard"
          class="absolute inset-0 z-10 flex items-center justify-center"
          @touchstart.passive="handleTouchStart"
          @touchend.passive="handleTouchEnd"
        >
          <DrawnCard :key="activeCard.photo.id" :card="activeCard" center />
        </div>
      </div>

      <div class="mt-6 flex items-center justify-center">
        <CardPile :cards="pileCards" @open-scatter="openScatter" />
      </div>

      <p v-if="lastWeightReason" class="mt-3 text-center text-xs font-medium uppercase tracking-wider text-ts-accent">
        {{ lastWeightReason.replaceAll("_", " ") }}
      </p>
    </div>

    <CardScatter :open="isScatterOpen" :cards="drawnCards" @collect="collectScatter" />
  </section>
</template>
