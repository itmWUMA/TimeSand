<script setup lang="ts">
import type { Album } from '../types/album'

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import CardDeck from '../components/draw/CardDeck.vue'
import CardPile from '../components/draw/CardPile.vue'
import CardScatter from '../components/draw/CardScatter.vue'
import DrawnCard from '../components/draw/DrawnCard.vue'
import TsEmptyState from '../components/TsEmptyState.vue'
import { particleDrift } from '../composables/motion/sequences'
import { useCardDraw } from '../composables/useCardDraw'
import { useMemoryText } from '../composables/useMemoryText'
import { useMusicPlayer } from '../composables/useMusicPlayer'
import { listAlbums } from '../services/album'
import { listPhotos } from '../services/photo'
import { useDrawStore } from '../stores/draw'

interface ParticleSeed {
  left: string
  top: string
  size: string
  opacity: string
}

const drawStore = useDrawStore()
const { setContext } = useMusicPlayer()
const albums = ref<Album[]>([])
const touchStartX = ref<number | null>(null)
const ceremonyContainerRef = ref<HTMLElement | null>(null)
const photoTotal = ref(0)
const hasPhotoStats = ref(false)

let particleTimeline: ReturnType<typeof particleDrift> | null = null

const particleSeeds: ParticleSeed[] = [
  { left: '12%', top: '22%', size: '6px', opacity: '0.34' },
  { left: '22%', top: '68%', size: '5px', opacity: '0.26' },
  { left: '38%', top: '18%', size: '4px', opacity: '0.3' },
  { left: '64%', top: '24%', size: '6px', opacity: '0.28' },
  { left: '78%', top: '63%', size: '5px', opacity: '0.24' },
  { left: '88%', top: '32%', size: '4px', opacity: '0.3' },
]

const {
  ceremonyState,
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
  killCeremony,
} = useCardDraw()

const memoryText = useMemoryText(lastWeightReason)

const selectedAlbumValue = computed(() =>
  drawStore.albumId === null ? '' : String(drawStore.albumId),
)

const noPhotos = computed(() => hasPhotoStats.value && photoTotal.value === 0)

const ceremonyClass = computed<Record<string, boolean>>(() => {
  const state = ceremonyState.value

  return {
    'ceremony-idle': state === 'IDLE',
    'ceremony-active': state === 'DRAWING' || state === 'EMERGING' || state === 'REVEALING',
    'ceremony-display': state === 'DISPLAYING',
  }
})

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

async function refreshPhotoTotal(): Promise<void> {
  try {
    const payload = await listPhotos(1, 1, {
      albumId: drawStore.albumId ?? undefined,
    })

    hasPhotoStats.value = true
    photoTotal.value = payload.total
  }
  catch {
    hasPhotoStats.value = false
    photoTotal.value = 0
  }
}

function stopParticleDrift(): void {
  particleTimeline?.kill()
  particleTimeline = null
}

function startParticleDrift(): void {
  stopParticleDrift()

  if (prefersReducedMotion()) {
    return
  }

  const container = ceremonyContainerRef.value
  if (!container) {
    return
  }

  const particles = container.querySelectorAll<HTMLElement>('[data-ceremony-particle]')
  if (particles.length === 0) {
    return
  }

  particleTimeline = particleDrift(particles)
  if (ceremonyState.value !== 'IDLE') {
    particleTimeline.pause()
  }
}

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

  await Promise.all([
    syncPlayerContext(),
    refreshPhotoTotal(),
  ])

  await nextTick()
  startParticleDrift()
})

onUnmounted(() => {
  killCeremony()
  stopParticleDrift()
})

watch(
  () => drawStore.albumId,
  async () => {
    await Promise.all([
      syncPlayerContext(),
      refreshPhotoTotal(),
    ])
  },
)

watch(
  () => ceremonyState.value,
  (state) => {
    if (!particleTimeline) {
      return
    }

    if (state === 'IDLE') {
      particleTimeline.resume()
      return
    }

    particleTimeline.pause()
  },
)

watch(
  () => noPhotos.value,
  async (empty) => {
    if (empty) {
      stopParticleDrift()
      return
    }

    await nextTick()
    startParticleDrift()
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
          class="rounded border border-white/20 px-4 py-2 text-sm font-semibold text-ts-text transition hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
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

    <TsEmptyState
      v-if="noPhotos"
      :title="$t('empty.photos.title')"
      :description="$t('empty.photos.description')"
      :action-label="$t('empty.photos.action')"
      action-to="/upload"
    />

    <div
      v-else
      ref="ceremonyContainerRef"
      class="ceremony-container relative overflow-hidden rounded-2xl border border-white/10 bg-ts-panel/70 px-4 py-8 md:px-8"
      :class="ceremonyClass"
    >
      <div class="ceremony-vignette" />

      <div class="pointer-events-none absolute inset-0 overflow-hidden">
        <span
          v-for="(particle, index) in particleSeeds"
          :key="index"
          data-ceremony-particle
          class="ceremony-particle absolute rounded-full bg-ts-accent"
          :style="{
            'left': particle.left,
            'top': particle.top,
            'width': particle.size,
            'height': particle.size,
            '--particle-opacity': particle.opacity,
          }"
        />
      </div>

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

      <div
        v-if="memoryText"
        data-memory-text
        class="mt-3 flex items-center justify-center gap-1.5 text-lg font-medium text-ts-accent/85 opacity-0"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{{ memoryText }}</span>
      </div>
    </div>

    <CardScatter :open="isScatterOpen" :cards="drawnCards" @collect="collectScatter" />
  </section>
</template>

<style scoped>
.ceremony-container {
  transition: background-color 0.5s ease, box-shadow 0.5s ease;
}

.ceremony-vignette {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.5s ease;
  background: radial-gradient(circle at center, rgb(0 0 0 / 0%) 36%, rgb(0 0 0 / 35%) 100%);
}

.ceremony-container.ceremony-active {
  background-color: rgb(23 25 35 / 92%);
  box-shadow: inset 0 0 60px rgb(0 0 0 / 30%);
}

.ceremony-container.ceremony-active .ceremony-vignette {
  opacity: 1;
}

.ceremony-container.ceremony-display {
  box-shadow: 0 0 40px rgb(212 168 67 / 20%), inset 0 0 48px rgb(212 168 67 / 10%);
}

.ceremony-container.ceremony-display .ceremony-vignette {
  opacity: 0.35;
}

.ceremony-particle {
  opacity: var(--particle-opacity, 0.3);
  transition: opacity 0.3s ease;
  filter: blur(0.5px);
}

.ceremony-container:not(.ceremony-idle) .ceremony-particle {
  opacity: 0;
}
</style>
