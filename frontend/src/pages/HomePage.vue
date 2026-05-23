<script setup lang="ts">
import type { GestureExitInfo } from '../composables/useCardDraw'
import type { Album } from '../types/album'
import type { Photo } from '../types/photo'

import { gsap } from 'gsap'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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
const { t } = useI18n()
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
const drawnCount = computed(() => drawnCards.value.length)
const remainingPhotoCount = computed(() => Math.max(photoTotal.value - drawStore.excludeIds.length, 0))
const formattedPhotoTotal = computed(() => formatCount(photoTotal.value))
const formattedRemainingCount = computed(() => formatCount(remainingPhotoCount.value))
const selectedAlbumName = computed(() => {
  if (drawStore.albumId === null) {
    return t('draw.allPhotos')
  }

  return albums.value.find(album => album.id === drawStore.albumId)?.name ?? t('draw.allPhotos')
})
const activeCaptureYear = computed(() => {
  const takenAt = activeCard.value?.photo.taken_at
  if (!takenAt) {
    return t('draw.unknownDate')
  }

  const date = new Date(takenAt)
  if (Number.isNaN(date.getTime())) {
    return t('draw.unknownDate')
  }

  return String(date.getFullYear())
})
const weightModeLabel = computed(() => t(`settings.drawWeight.${settingsStore.drawWeightMode}`))
const nearbyRangeLabel = computed(() => `+/-${settingsStore.drawNearbyDays} d`)
const todayPanelMemory = computed(() => memoryText.value || t('draw.todayPanelIdle'))
const todayPanelDescription = computed(() =>
  memoryText.value
    ? t('draw.todayPanelBoosted')
    : t('draw.todayPanelWaiting'),
)
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

function formatCount(value: number): string {
  return new Intl.NumberFormat().format(value)
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

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()
  return tagName === 'input'
    || tagName === 'select'
    || tagName === 'textarea'
    || target.isContentEditable
}

async function handleKeyboardShortcut(event: KeyboardEvent): Promise<void> {
  if (isEditableKeyboardTarget(event.target)) {
    return
  }

  if (event.code === 'Space') {
    event.preventDefault()
    await drawNextCard()
    return
  }

  if (event.code === 'ArrowLeft') {
    event.preventDefault()
    await undoLastCard()
    return
  }

  if (event.code === 'ArrowRight') {
    event.preventDefault()
    await drawNextCard()
    return
  }

  if (event.code === 'Escape' && isScatterOpen.value) {
    event.preventDefault()
    await collectScatter()
  }
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
  window.addEventListener('keydown', handleKeyboardShortcut)

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
  window.removeEventListener('keydown', handleKeyboardShortcut)
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
  <section data-draw-stage class="draw-stage">
    <header class="stage-head">
      <div class="stage-head-left">
        <div class="h-eyebrow">
          {{ $t('draw.stageEyebrow') }}
        </div>
        <h1 class="h-title">
          {{ $t('draw.title') }}
        </h1>
        <p class="h-sub">
          {{ $t('draw.description', { count: formattedPhotoTotal }) }}
        </p>
      </div>

      <label data-draw-album-picker class="album-pick">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 14l4-4 5 5 3-3 6 6" />
        </svg>
        <span>{{ selectedAlbumName }}</span>
        <span class="num">· {{ formattedPhotoTotal }}</span>
        <svg class="chevron" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
        <select
          :value="selectedAlbumValue"
          :aria-label="$t('draw.albumLabel')"
          @change="onAlbumChange"
        >
          <option value="">
            {{ $t('draw.allPhotos') }}
          </option>
          <option
            v-for="album in albums"
            :key="album.id"
            :value="album.id"
          >
            {{ album.name }}
          </option>
        </select>
      </label>
    </header>

    <div
      v-if="poolEmpty"
      class="draw-alert draw-alert-accent"
    >
      <p>{{ $t('draw.poolEmpty') }}</p>
      <button type="button" class="draw-alert-action" @click="reshuffle">
        {{ $t('draw.reshuffle') }}
      </button>
    </div>

    <p
      v-else-if="errorMessage"
      class="draw-alert draw-alert-danger"
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

    <section
      v-else
      ref="ceremonyContainerRef"
      data-draw-arena
      class="draw-arena ceremony-container"
      :class="ceremonyClass"
    >
      <div class="ceremony-vignette" />

      <div class="draw-motes" aria-hidden="true">
        <span
          v-for="(particle, index) in particleSeeds"
          :key="index"
          data-ceremony-particle
          class="ceremony-particle mote"
          :style="{
            'left': particle.left,
            'top': particle.top,
            'width': particle.size,
            'height': particle.size,
            '--particle-opacity': particle.opacity,
          }"
        />
      </div>

      <aside data-draw-today-panel class="today-panel">
        <div class="today-eye">
          {{ $t('draw.todayEye') }}
        </div>
        <div class="today-line">
          <strong>{{ todayPanelMemory }}</strong>
          {{ todayPanelDescription }}
        </div>
      </aside>

      <aside class="arena-side left" aria-label="Draw session stats">
        <div class="side-stat">
          <span class="dot" />
          {{ $t('draw.remaining') }} <span class="num">{{ formattedRemainingCount }}</span>
        </div>
        <div class="side-stat">
          {{ $t('draw.drawn') }} <span class="num">{{ drawnCount }}</span>
        </div>
        <div class="side-stat">
          {{ $t('draw.source') }} <span class="num">{{ selectedAlbumName }}</span>
        </div>
      </aside>

      <aside class="arena-side right" aria-label="Weight metadata">
        <div class="side-stat">
          {{ $t('draw.weight') }} · <span class="num">{{ weightModeLabel }}</span>
        </div>
        <div class="side-stat">
          {{ $t('draw.range') }} · <span class="num">{{ nearbyRangeLabel }}</span>
        </div>
        <div class="side-stat">
          {{ $t('draw.depth') }} · <span class="num">{{ activeCaptureYear }}</span>
        </div>
      </aside>

      <div class="arena-center">
        <div class="deck-layer">
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
          class="active-card-layer"
          @touchstart.passive="handleTouchStart"
          @touchmove.passive="handleTouchMove"
          @touchend.passive="handleTouchEnd"
          @touchcancel.passive="handleTouchCancel"
        >
          <div class="gesture-rail">
            <span :style="{ opacity: drawIndicatorOpacity }">
              {{ $t('draw.gestureDrawHint') }}
            </span>
            <span :style="{ opacity: undoIndicatorOpacity }">
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

      <div
        data-draw-mobile-gesture-hint
        class="gesture-hint"
      >
        <span>←</span> {{ $t('draw.mobileSwipeLeft') }} · <span>→</span> {{ $t('draw.mobileSwipeRight') }}
      </div>

      <div
        v-if="memoryText"
        data-memory-text
        class="memory-line"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{{ memoryText }}</span>
      </div>
    </section>

    <div class="draw-actions">
      <button
        type="button"
        class="draw-btn draw-btn-primary action-main"
        :disabled="isDrawing || noPhotos"
        @click="drawNextCard()"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v16M4 12h16" />
        </svg>
        {{ isDrawing ? $t('draw.drawing') : $t('draw.drawNext') }}
      </button>
      <button
        type="button"
        class="draw-btn"
        :disabled="!hasDrawnCards || isDrawing"
        @click="undoLastCard()"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
        {{ $t('draw.undo') }}
      </button>
      <button
        type="button"
        class="draw-btn draw-btn-ghost draw-action-scatter"
        :disabled="!hasDrawnCards || isDrawing"
        @click="openScatter"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        {{ $t('draw.scatter') }}
      </button>

      <span data-draw-keyboard-hints class="action-hint">
        <span class="kbd">Space</span> {{ $t('draw.drawShortcut') }}
        <span class="kbd">←</span> {{ $t('draw.undo') }}
        <span class="kbd">→</span> {{ $t('draw.drawShortcut') }}
        <span class="kbd">Esc</span> {{ $t('draw.collect') }}
      </span>
    </div>

    <CardPile
      :cards="drawnCards"
      :total-photos="photoTotal"
      @open-scatter="openScatter"
    />

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
.draw-stage {
  position: relative;
  display: grid;
  grid-template-rows: auto auto 1fr auto auto;
  gap: 28px;
  max-width: 1180px;
  margin: 0 auto;
  min-height: calc(100vh - 200px);
}

.stage-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.stage-head-left {
  max-width: 640px;
}

.h-eyebrow {
  color: var(--ts-accent);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.h-title {
  margin: 8px 0 6px;
  color: var(--ts-fg);
  font-family: var(--ts-font-display);
  font-size: clamp(30px, 3.6vw, 48px);
  font-weight: 500;
  line-height: 1.12;
}

.h-sub {
  max-width: 64ch;
  color: var(--ts-muted);
  font-size: 14px;
}

.album-pick {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px 8px 16px;
  border: 1px solid var(--ts-border);
  border-radius: var(--ts-radius-pill);
  background: var(--ts-surface);
  color: var(--ts-fg);
  cursor: pointer;
  font-size: 13px;
  transition:
    background var(--ts-duration-fast) var(--ts-ease),
    border-color var(--ts-duration-fast) var(--ts-ease);
}

.album-pick:hover {
  border-color: var(--ts-muted);
  background: var(--ts-surface-2);
}

.album-pick svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
}

.album-pick .chevron {
  width: 12px;
  height: 12px;
  opacity: 0.6;
}

.album-pick .num {
  color: var(--ts-muted);
}

.album-pick select {
  position: absolute;
  inset: 0;
  width: 100%;
  cursor: pointer;
  opacity: 0;
}

.draw-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-radius: var(--ts-radius);
  padding: 12px 16px;
  font-size: 13px;
}

.draw-alert-accent {
  border: 1px solid var(--ts-accent-soft);
  background: oklch(78% 0.14 72 / 10%);
  color: var(--ts-accent);
}

.draw-alert-danger {
  border: 1px solid oklch(60% 0.18 25 / 45%);
  background: oklch(60% 0.18 25 / 12%);
  color: oklch(84% 0.12 25);
}

.draw-alert-action {
  flex-shrink: 0;
  border: 1px solid var(--ts-accent);
  border-radius: var(--ts-radius-pill);
  background: transparent;
  color: var(--ts-accent);
  font-size: 12px;
  font-weight: 600;
  padding: 7px 12px;
}

.draw-arena {
  position: relative;
  display: grid;
  min-height: 540px;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-lg);
  background:
    radial-gradient(ellipse at center, oklch(22% 0.024 55) 0%, oklch(15% 0.016 50) 70%),
    var(--ts-bg-deep);
}

.draw-arena::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d4a36a' stroke-width='0.5' stroke-linecap='round' stroke-linejoin='round'><path d='M6 3h12M6 21h12'/><path d='M7 3c0 4 5 5.5 5 9s-5 5-5 9'/><path d='M17 3c0 4-5 5.5-5 9s5 5 5 9'/></svg>");
  background-repeat: no-repeat;
  background-position: center;
  background-size: min(70%, 540px);
}

.draw-motes {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.mote {
  position: absolute;
  border-radius: 50%;
  background: var(--ts-accent);
  box-shadow: 0 0 8px var(--ts-accent-glow);
  filter: blur(0.4px);
  opacity: var(--particle-opacity, 0.3);
}

.today-panel {
  position: absolute;
  top: 22px;
  right: 22px;
  z-index: 6;
  width: min(240px, calc(100% - 44px));
  padding: 16px 18px;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius);
  background: oklch(20% 0.022 52 / 70%);
  backdrop-filter: blur(10px);
}

.today-eye {
  margin-bottom: 6px;
  color: var(--ts-accent);
  font-family: var(--ts-font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.today-line {
  color: var(--ts-fg-soft);
  font-family: var(--ts-font-display);
  font-size: 14px;
  line-height: 1.45;
}

.today-line strong {
  color: var(--ts-fg);
  font-weight: 500;
}

.arena-side {
  position: absolute;
  top: 50%;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transform: translateY(-50%);
}

.arena-side.left {
  left: 22px;
}

.arena-side.right {
  right: 22px;
  align-items: flex-end;
}

.side-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.side-stat .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ts-accent);
  box-shadow: 0 0 8px var(--ts-accent-glow);
}

.arena-center {
  position: relative;
  width: 100%;
  min-height: 540px;
}

.deck-layer,
.active-card-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.deck-layer {
  z-index: 2;
}

.active-card-layer {
  z-index: 4;
  touch-action: pan-y;
}

.gesture-rail {
  position: absolute;
  inset: 18px 24px auto;
  display: flex;
  justify-content: space-between;
  color: var(--ts-accent);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  pointer-events: none;
  text-transform: uppercase;
}

.gesture-hint {
  position: absolute;
  right: 0;
  bottom: 24px;
  left: 0;
  z-index: 5;
  color: var(--ts-muted-2);
  font-family: var(--ts-font-mono);
  font-size: 9.5px;
  letter-spacing: 0.22em;
  text-align: center;
  text-transform: uppercase;
}

.gesture-hint span {
  color: var(--ts-accent);
  font-size: 11px;
}

.memory-line {
  position: absolute;
  right: 24px;
  bottom: 20px;
  left: 24px;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--ts-accent);
  font-family: var(--ts-font-display);
  font-size: 15px;
  opacity: 0;
  pointer-events: none;
}

.memory-line svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.draw-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 4px 0 0;
}

.draw-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--ts-border);
  border-radius: var(--ts-radius-pill);
  background: var(--ts-surface);
  color: var(--ts-fg);
  font-size: 13px;
  font-weight: 500;
  padding: 10px 18px;
  transition:
    background var(--ts-duration-normal) var(--ts-ease),
    border-color var(--ts-duration-normal) var(--ts-ease),
    color var(--ts-duration-normal) var(--ts-ease),
    transform var(--ts-duration-fast) var(--ts-ease);
}

.draw-btn:hover:not(:disabled) {
  border-color: var(--ts-muted);
  background: var(--ts-surface-2);
}

.draw-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.draw-btn svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.draw-btn-primary {
  border-color: transparent;
  background: var(--ts-accent);
  box-shadow: var(--ts-glow-accent);
  color: var(--ts-bg-deep);
  font-weight: 600;
}

.draw-btn-primary:hover:not(:disabled) {
  border-color: transparent;
  background: var(--ts-accent);
  color: var(--ts-bg-deep);
  transform: translateY(-1px);
}

.draw-btn-ghost {
  border-color: transparent;
  background: transparent;
  color: var(--ts-fg-soft);
}

.action-main {
  padding: 16px 38px;
  font-size: 14.5px;
  letter-spacing: 0.04em;
}

.action-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
  color: var(--ts-muted-2);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.kbd {
  display: inline-grid;
  min-width: 22px;
  height: 22px;
  place-items: center;
  padding: 0 6px;
  border: 1px solid var(--ts-border);
  border-radius: 6px;
  background: var(--ts-surface);
  color: var(--ts-fg-soft);
  font-size: 10.5px;
}

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

@media (prefers-reduced-motion: reduce) {
  .draw-btn,
  .album-pick,
  .ceremony-container,
  .ceremony-vignette {
    transition: none;
  }
}

@media (max-width: 720px) {
  .draw-stage {
    gap: 18px;
  }

  .stage-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .h-title {
    font-size: clamp(24px, 7.6vw, 34px);
  }

  .h-sub {
    font-size: 13.5px;
  }

  .album-pick {
    max-width: 100%;
    padding: 7px 12px 7px 14px;
    font-size: 12.5px;
  }

  .draw-arena,
  .arena-center {
    min-height: 420px;
    border-radius: var(--ts-radius);
  }

  .today-panel,
  .arena-side {
    display: none;
  }

  .draw-actions {
    flex-wrap: wrap;
    gap: 10px;
  }

  .action-main {
    min-width: 160px;
    flex: 1;
    justify-content: center;
    padding: 13px 28px;
  }

  .action-hint {
    display: none;
  }
}

@media (max-width: 420px) {
  .draw-arena,
  .arena-center {
    min-height: 380px;
  }

  .draw-action-scatter {
    display: none;
  }
}
</style>
