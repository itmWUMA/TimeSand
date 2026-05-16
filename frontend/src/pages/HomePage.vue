<script setup lang="ts">
import type { GestureExitInfo } from '../composables/useCardDraw'
import type { Album } from '../types/album'
import type { Photo } from '../types/photo'

import { gsap } from 'gsap'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CardDeck from '../components/draw/CardDeck.vue'
import CardPile from '../components/draw/CardPile.vue'
import CardScatter from '../components/draw/CardScatter.vue'
import DrawnCard from '../components/draw/DrawnCard.vue'
import OnboardingOverlay from '../components/OnboardingOverlay.vue'
import TsEmptyState from '../components/TsEmptyState.vue'
import TsLightbox from '../components/TsLightbox.vue'
import { particleDrift } from '../composables/motion/sequences'
import { useCardDraw } from '../composables/useCardDraw'
import { useMemoryText } from '../composables/useMemoryText'
import { useMusicPlayer } from '../composables/useMusicPlayer'
import { listAlbums } from '../services/album'
import { listPhotos } from '../services/photo'
import { useDrawStore } from '../stores/draw'
import { useSettingsStore } from '../stores/settings'

interface ParticleSeed {
  left: string
  top: string
  size: string
  opacity: string
}

interface GesturePreview {
  deltaX: number
  rotation: number
  indicatorOpacity: number
}

const SWIPE_THRESHOLD = 42
const SWIPE_ROTATION_FACTOR = 0.05

const drawStore = useDrawStore()
const settingsStore = useSettingsStore()
const route = useRoute()
const { playlistId, setContext, tracks } = useMusicPlayer()
const albums = ref<Album[]>([])
const touchStartX = ref<number | null>(null)
const gestureDeltaX = ref(0)
const gestureIndicatorOpacity = ref(0)
const gestureDirection = ref<'left' | 'right' | null>(null)
const activeCardGestureRef = ref<HTMLElement | null>(null)
const ceremonyContainerRef = ref<HTMLElement | null>(null)
const photoTotal = ref(0)
const hasPhotoStats = ref(false)
const lightboxOpen = ref(false)
const lightboxPhotos = ref<Photo[]>([])
const lightboxIndex = ref(0)
const lightboxOrigin = ref<DOMRect | null>(null)

let particleTimeline: ReturnType<typeof particleDrift> | null = null
const gesturePreview: GesturePreview = {
  deltaX: 0,
  rotation: 0,
  indicatorOpacity: 0,
}

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
  poolEmpty,
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
const deckGestureX = computed(() => gestureDeltaX.value * 0.2)
const deckGestureRotation = computed(() => gestureDeltaX.value * 0.01)
const drawIndicatorOpacity = computed(() =>
  gestureDirection.value === 'left' ? gestureIndicatorOpacity.value : 0,
)
const undoIndicatorOpacity = computed(() =>
  gestureDirection.value === 'right' ? gestureIndicatorOpacity.value : 0,
)

const ceremonyClass = computed<Record<string, boolean>>(() => {
  const state = ceremonyState.value

  return {
    'ceremony-idle': state === 'IDLE',
    'ceremony-active': state === 'DRAWING' || state === 'EMERGING' || state === 'REVEALING',
    'ceremony-display': state === 'DISPLAYING',
  }
})
const forceShowOnboarding = computed(() => route.name === 'onboarding-debug')

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

function applyGestureTransform(deltaX: number, rotation: number): void {
  const target = activeCardGestureRef.value
  if (!target) {
    return
  }

  gsap.set(target, {
    x: deltaX,
    rotation,
  })
}

function syncGesturePreview(): void {
  gestureDeltaX.value = gesturePreview.deltaX
  gestureIndicatorOpacity.value = gesturePreview.indicatorOpacity
  applyGestureTransform(gesturePreview.deltaX, gesturePreview.rotation)
}

function resetGesturePreview(): void {
  touchStartX.value = null
  gestureDirection.value = null
  gesturePreview.deltaX = 0
  gesturePreview.rotation = 0
  gesturePreview.indicatorOpacity = 0
  syncGesturePreview()

  const target = activeCardGestureRef.value
  if (!target) {
    return
  }

  gsap.killTweensOf(target)
  gsap.set(target, { opacity: 1 })
}

function updateGesturePreview(deltaX: number): void {
  gesturePreview.deltaX = deltaX
  gesturePreview.rotation = deltaX * SWIPE_ROTATION_FACTOR
  gesturePreview.indicatorOpacity = Math.min(1, Math.abs(deltaX) / SWIPE_THRESHOLD)
  gestureDirection.value = deltaX < 0 ? 'left' : deltaX > 0 ? 'right' : null
  syncGesturePreview()
}

function animateGestureReset(): Promise<void> {
  const shouldAnimate = Math.abs(gesturePreview.deltaX) > 0.5 || gesturePreview.indicatorOpacity > 0.01

  if (!shouldAnimate) {
    resetGesturePreview()
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    gsap.killTweensOf(gesturePreview)
    gsap.to(gesturePreview, {
      deltaX: 0,
      rotation: 0,
      indicatorOpacity: 0,
      duration: 0.4,
      ease: 'back.out(1.7)',
      onUpdate: syncGesturePreview,
      onComplete: () => {
        gestureDirection.value = null
        touchStartX.value = null
        resolve()
      },
    })
  })
}

function animateGestureCommit(direction: 'left' | 'right'): Promise<GestureExitInfo> {
  const target = activeCardGestureRef.value
  if (!target) {
    return Promise.resolve({ exitX: 0, exitRotation: 0 })
  }

  const exitX = direction === 'left' ? -180 : 180
  const exitRotation = exitX * SWIPE_ROTATION_FACTOR

  return new Promise((resolve) => {
    gsap.killTweensOf(target)
    gsap.to(target, {
      x: exitX,
      rotation: exitRotation,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        gsap.set(target, { x: 0, rotation: 0 })
        resolve({ exitX, exitRotation })
      },
    })
  })
}

function handleTouchStart(event: TouchEvent): void {
  if (isDrawing.value) {
    return
  }

  touchStartX.value = event.changedTouches[0]?.clientX ?? null
  gsap.killTweensOf(gesturePreview)

  const target = activeCardGestureRef.value
  if (!target) {
    return
  }

  gsap.killTweensOf(target)
  gsap.set(target, { opacity: 1 })
}

function handleTouchMove(event: TouchEvent): void {
  const startX = touchStartX.value
  const currentX = event.touches[0]?.clientX ?? null
  if (startX === null || currentX === null) {
    return
  }

  updateGesturePreview(currentX - startX)
}

async function handleTouchCancel(): Promise<void> {
  await animateGestureReset()
}

function onCardPhotoClick(payload: { photo: Photo, rect: DOMRect }): void {
  lightboxPhotos.value = [payload.photo]
  lightboxIndex.value = 0
  lightboxOrigin.value = payload.rect
  lightboxOpen.value = true
}

async function handleTouchEnd(event: TouchEvent): Promise<void> {
  const startX = touchStartX.value
  const endX = event.changedTouches[0]?.clientX ?? null

  if (startX === null || endX === null) {
    await animateGestureReset()
    return
  }

  const distance = endX - startX
  if (Math.abs(distance) < SWIPE_THRESHOLD) {
    await animateGestureReset()
    return
  }

  const direction = distance < 0 ? 'left' : 'right'
  const gestureExit = await animateGestureCommit(direction)
  resetGesturePreview()

  if (direction === 'left') {
    await drawNextCard(gestureExit)
    return
  }

  await undoLastCard(gestureExit)
}

async function syncPlayerContext(): Promise<void> {
  if (drawStore.albumId != null) {
    await setContext('album', drawStore.albumId)
    return
  }

  if (playlistId.value != null && tracks.value.length > 0) {
    return
  }

  await setContext('default')
}

function applyDefaultAlbumSelection(): void {
  const defaultAlbumId = settingsStore.drawDefaultAlbumId
  if (defaultAlbumId == null) {
    drawStore.setAlbumFilter(null)
    return
  }

  const hasDefaultAlbum = albums.value.some(album => album.id === defaultAlbumId)
  drawStore.setAlbumFilter(hasDefaultAlbum ? defaultAlbumId : null)
}

onMounted(async () => {
  try {
    const payload = await listAlbums()
    albums.value = payload.items
  }
  catch {
    albums.value = []
  }

  applyDefaultAlbumSelection()

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
  resetGesturePreview()
  gsap.killTweensOf(gesturePreview)
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

watch(
  () => activeCard.value?.photo.id ?? null,
  () => {
    resetGesturePreview()
  },
)
</script>

<template>
  <section class="mx-auto max-w-6xl space-y-6">
    <header class="space-y-3">
      <h1 class="text-3xl font-semibold text-ts-accent">
        {{ $t('draw.title') }}
      </h1>
      <p class="text-sm text-ts-text/80">
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
          @click="drawNextCard()"
        >
          {{ isDrawing ? $t('draw.drawing') : $t('draw.drawNext') }}
        </button>

        <button
          type="button"
          class="rounded border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          :class="poolEmpty
            ? 'border-ts-accent text-ts-accent shadow-glow hover:bg-ts-accent/15'
            : 'border-white/30 text-ts-text/95 hover:border-white/50 hover:bg-white/10'"
          :disabled="!hasDrawnCards || isDrawing"
          @click="reshuffle"
        >
          {{ $t('draw.reshuffle') }}
        </button>

        <p class="text-xs text-ts-text/75 md:ml-auto">
          {{ $t('draw.swipeHint') }}
        </p>
      </div>
    </header>

    <div
      v-if="poolEmpty"
      class="flex flex-col items-start gap-2 rounded border border-ts-accent/45 bg-ts-accent/10 px-4 py-3 text-sm text-ts-accent md:flex-row md:items-center"
    >
      <p>
        Card pool is empty. Click Reshuffle to continue drawing.
      </p>
      <button
        type="button"
        class="rounded border border-ts-accent/80 px-3 py-1.5 text-xs font-semibold text-ts-accent transition hover:bg-ts-accent/20"
        @click="reshuffle"
      >
        {{ $t('draw.reshuffle') }}
      </button>
    </div>

    <p
      v-else-if="errorMessage"
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
          <CardDeck
            :disabled="isDrawing"
            :gesture-x="deckGestureX"
            :gesture-rotation="deckGestureRotation"
            @draw="drawNextCard"
          />
        </div>

        <div
          v-if="activeCard"
          ref="activeCardGestureRef"
          data-gesture-wrapper
          class="absolute inset-0 z-10 flex items-center justify-center"
          @touchstart.passive="handleTouchStart"
          @touchmove.passive="handleTouchMove"
          @touchend.passive="handleTouchEnd"
          @touchcancel.passive="handleTouchCancel"
        >
          <div class="pointer-events-none absolute inset-x-4 top-4 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em]">
            <span
              class="text-ts-accent transition-opacity duration-150"
              :style="{ opacity: drawIndicatorOpacity }"
            >
              {{ $t('draw.gestureDrawHint') }}
            </span>
            <span
              class="text-ts-accent transition-opacity duration-150"
              :style="{ opacity: undoIndicatorOpacity }"
            >
              {{ $t('draw.gestureUndoHint') }}
            </span>
          </div>
          <DrawnCard
            :key="activeCard.photo.id"
            :card="activeCard"
            center
            @photo-click="onCardPhotoClick"
          />
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
    <TsLightbox
      v-model:open="lightboxOpen"
      :photos="lightboxPhotos"
      :initial-index="lightboxIndex"
      :origin-rect="lightboxOrigin"
      origin-kind="card"
    />
    <OnboardingOverlay :force-show="forceShowOnboarding" />
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
