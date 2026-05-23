<script setup lang="ts">
import type { TransitionMode } from '../composables/useSlideshow'
import type { Photo } from '../types/photo'

import { gsap } from 'gsap'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMusicPlayer } from '../composables/useMusicPlayer'
import { useSoundEffects } from '../composables/useSoundEffects'

interface KenBurnsVariant {
  from: {
    scale: number
    x: string
    y: string
  }
  to: {
    scale: number
    x: string
    y: string
  }
}

const props = defineProps<{
  photos: Photo[]
  currentIndex: number
  isPlaying: boolean
  intervalSeconds: number
  intervalOptions: number[]
  transitionMode: TransitionMode
  controlsVisible: boolean
}>()

const emit = defineEmits<{
  (event: 'next'): void
  (event: 'prev'): void
  (event: 'togglePlay'): void
  (event: 'setInterval', seconds: number): void
  (event: 'cycleTransition'): void
  (event: 'exit'): void
  (event: 'activity'): void
}>()

const KEN_BURNS_VARIANTS: KenBurnsVariant[] = [
  { from: { scale: 1, x: '0%', y: '0%' }, to: { scale: 1.12, x: '2%', y: '-1.5%' } },
  { from: { scale: 1.12, x: '-2%', y: '1%' }, to: { scale: 1, x: '0%', y: '0%' } },
  { from: { scale: 1, x: '-1%', y: '-1%' }, to: { scale: 1.08, x: '1%', y: '1%' } },
  { from: { scale: 1.08, x: '1.5%', y: '0%' }, to: { scale: 1, x: '-1%', y: '0.5%' } },
]

const { t } = useI18n()
const musicPlayer = useMusicPlayer()
const soundEffects = useSoundEffects()

const touchStartX = ref<number | null>(null)
const activeImg = ref<'A' | 'B'>('A')
const imgARef = ref<HTMLImageElement | null>(null)
const imgBRef = ref<HTMLImageElement | null>(null)
const displayedPhotoId = ref<number | null>(null)
const prefersReducedMotion = ref(false)

const currentPhoto = computed(() => props.photos[props.currentIndex] ?? null)
const transitionLabel = computed(() => t(`slideshow.transition.${props.transitionMode}`))
const photoPositionLabel = computed(() => `${String(props.currentIndex + 1).padStart(2, '0')} / ${String(props.photos.length).padStart(2, '0')}`)
const progressStyle = computed(() => {
  const progress = props.photos.length > 0
    ? ((props.currentIndex + 1) / props.photos.length) * 100
    : 0
  return { width: `${Math.min(100, Math.max(0, progress))}%` }
})
const currentPhotoTitle = computed(() => currentPhoto.value?.filename ?? t('slideshow.noPhotos'))
const currentPhotoEyebrow = computed(() => {
  const photo = currentPhoto.value
  if (!photo) {
    return t('slideshow.noPhotos')
  }

  const parts = [
    formatPhotoDate(photo.taken_at ?? photo.uploaded_at),
    formatCoordinate(photo.latitude, photo.longitude),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : t('slideshow.photoMetaFallback')
})
const currentPhotoDetails = computed(() => {
  const photo = currentPhoto.value
  if (!photo) {
    return t('slideshow.photoDetailsFallback')
  }

  return t('slideshow.photoDetails', {
    width: photo.width,
    height: photo.height,
    format: photo.mime_type,
  })
})
const nextInLabel = computed(() => t('slideshow.nextIn', { seconds: props.intervalSeconds }))
const visibleThumbs = computed(() => props.photos.slice(0, 12))
const musicReadout = computed(() => {
  const track = musicPlayer.currentTrack.value
  if (!track) {
    return t('player.noMusicLoaded')
  }

  const playlist = musicPlayer.playlistName.value
  const prefix = playlist ? `${playlist} · ${track.title}` : track.title
  return `${prefix} · ${musicPlayer.formatTime(musicPlayer.currentTime.value)} / ${musicPlayer.formatTime(musicPlayer.duration.value)}`
})

let motionQuery: MediaQueryList | null = null
let transitionTween: gsap.core.Tween | gsap.core.Timeline | null = null
let kenBurnsTween: gsap.core.Tween | null = null
let duckTween: gsap.core.Tween | null = null
let unduckTween: gsap.core.Tween | null = null
let imageLoadToken = 0
let duckRestoreTarget: number | null = null
function handleMotionQueryEvent(event: MediaQueryListEvent): void {
  applyReducedMotionChange(event.matches)
}

function getCurrentImg(): HTMLImageElement | null {
  return activeImg.value === 'A' ? imgARef.value : imgBRef.value
}

function getNextImg(): HTMLImageElement | null {
  return activeImg.value === 'A' ? imgBRef.value : imgARef.value
}

function buildPhotoSrc(photo: Photo): string {
  return `/api/photos/${photo.id}/file`
}

function formatPhotoDate(value: string | null): string {
  if (!value) {
    return ''
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  }
  catch {
    return value
  }
}

function formatCoordinate(latitude: number | null, longitude: number | null): string {
  if (latitude == null || longitude == null) {
    return ''
  }

  return `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
}

function getRandomKenBurnsVariant(): KenBurnsVariant {
  const randomIndex = Math.floor(Math.random() * KEN_BURNS_VARIANTS.length)
  return KEN_BURNS_VARIANTS[randomIndex]
}

function killTransitionTweens(): void {
  transitionTween?.kill()
  transitionTween = null
  kenBurnsTween?.kill()
  kenBurnsTween = null
}

function killAudioTweens(): void {
  duckTween?.kill()
  duckTween = null
  unduckTween?.kill()
  unduckTween = null
}

function resetImageTransform(image: HTMLImageElement): void {
  gsap.set(image, { scale: 1, x: '0%', y: '0%' })
}

function resetImageToHidden(image: HTMLImageElement): void {
  gsap.set(image, { opacity: 0, zIndex: 0, scale: 1, x: '0%', y: '0%' })
}

function setImageContent(image: HTMLImageElement, photo: Photo): void {
  image.alt = photo.filename
  image.src = buildPhotoSrc(photo)
}

function duckMusic(): void {
  if (!musicPlayer.isPlaying.value) {
    duckRestoreTarget = null
    return
  }

  duckRestoreTarget = musicPlayer.volume.value
  const targetVolume = Math.max(0, Math.min(1, duckRestoreTarget * 0.7))
  const tweenState = { volume: musicPlayer.volume.value }

  killAudioTweens()

  duckTween = gsap.to(tweenState, {
    volume: targetVolume,
    duration: 0.3,
    ease: 'power1.out',
    onUpdate: () => {
      musicPlayer.setVolume(tweenState.volume)
    },
  })
}

function unduckMusic(): void {
  if (duckRestoreTarget == null) {
    return
  }

  const restoreTo = duckRestoreTarget
  duckRestoreTarget = null

  if (!musicPlayer.isPlaying.value) {
    musicPlayer.setVolume(restoreTo)
    return
  }

  unduckTween?.kill()

  const tweenState = { volume: musicPlayer.volume.value }
  unduckTween = gsap.to(tweenState, {
    volume: restoreTo,
    duration: 0.3,
    ease: 'power1.out',
    onUpdate: () => {
      musicPlayer.setVolume(tweenState.volume)
    },
  })
}

function finalizeTransition(
  nextPhoto: Photo,
  outgoing: HTMLImageElement,
  incoming: HTMLImageElement,
  options: {
    preserveIncomingTransform?: boolean
  } = {},
): void {
  resetImageToHidden(outgoing)

  if (!options.preserveIncomingTransform) {
    resetImageTransform(incoming)
  }

  gsap.set(incoming, { opacity: 1, zIndex: 1 })
  activeImg.value = activeImg.value === 'A' ? 'B' : 'A'
  displayedPhotoId.value = nextPhoto.id
  unduckMusic()
}

function startKenBurnsTween(image: HTMLImageElement, variant: KenBurnsVariant): void {
  kenBurnsTween?.kill()
  kenBurnsTween = gsap.fromTo(
    image,
    variant.from,
    {
      ...variant.to,
      duration: Math.max(props.intervalSeconds, 0.1),
      ease: 'none',
    },
  )
}

function ensureKenBurnsForCurrentPhoto(): void {
  if (props.transitionMode !== 'kenBurns' || prefersReducedMotion.value) {
    kenBurnsTween?.kill()
    kenBurnsTween = null
    return
  }

  const current = getCurrentImg()
  if (!current || displayedPhotoId.value == null) {
    return
  }

  const variant = getRandomKenBurnsVariant()
  gsap.set(current, { ...variant.from, opacity: 1, zIndex: 1 })
  startKenBurnsTween(current, variant)
}

function transitionCrossfade(current: HTMLImageElement, next: HTMLImageElement, nextPhoto: Photo): void {
  gsap.set(next, { opacity: 0, zIndex: 1, scale: 1, x: '0%', y: '0%' })
  gsap.set(current, { zIndex: 0 })

  transitionTween = gsap.timeline({
    onComplete: () => finalizeTransition(nextPhoto, current, next),
  })
  transitionTween
    .to(current, { opacity: 0, duration: 0.8, ease: 'power1.inOut' }, 0)
    .to(next, { opacity: 1, duration: 0.8, ease: 'power1.inOut' }, 0)
}

function transitionFadeThroughBlack(current: HTMLImageElement, next: HTMLImageElement, nextPhoto: Photo): void {
  gsap.set(next, { opacity: 0, zIndex: 1, scale: 1, x: '0%', y: '0%' })
  gsap.set(current, { zIndex: 0, scale: 1, x: '0%', y: '0%' })

  transitionTween = gsap.timeline({
    onComplete: () => finalizeTransition(nextPhoto, current, next),
  })
  transitionTween
    .to(current, { opacity: 0, duration: 0.7, ease: 'power1.in' }, 0)
    .to(next, { opacity: 1, duration: 0.7, ease: 'power1.out' }, 0.7)
}

function transitionZoomReveal(current: HTMLImageElement, next: HTMLImageElement, nextPhoto: Photo): void {
  gsap.set(next, { opacity: 0, scale: 1, x: '0%', y: '0%', zIndex: 1 })
  gsap.set(current, { zIndex: 0 })

  transitionTween = gsap.timeline({
    onComplete: () => finalizeTransition(nextPhoto, current, next),
  })
  transitionTween
    .to(current, { scale: 1.3, opacity: 0, duration: 1, ease: 'power2.in' }, 0)
    .to(next, { opacity: 1, duration: 1, ease: 'power2.out' }, 0)
}

function transitionKenBurns(current: HTMLImageElement, next: HTMLImageElement, nextPhoto: Photo): void {
  const variant = getRandomKenBurnsVariant()

  gsap.set(next, { opacity: 0, zIndex: 1, ...variant.from })
  gsap.set(current, { zIndex: 0 })

  transitionTween = gsap.timeline({
    onComplete: () => {
      startKenBurnsTween(next, variant)
      finalizeTransition(nextPhoto, current, next, { preserveIncomingTransform: true })
    },
  })
  transitionTween
    .to(current, { opacity: 0, duration: 0.8, ease: 'power1.inOut' }, 0)
    .to(next, { opacity: 1, duration: 0.8, ease: 'power1.inOut' }, 0)
}

function runTransition(current: HTMLImageElement, next: HTMLImageElement, nextPhoto: Photo): void {
  if (prefersReducedMotion.value) {
    killTransitionTweens()
    resetImageToHidden(current)
    gsap.set(next, { opacity: 1, zIndex: 1, scale: 1, x: '0%', y: '0%' })
    activeImg.value = activeImg.value === 'A' ? 'B' : 'A'
    displayedPhotoId.value = nextPhoto.id
    return
  }

  soundEffects.play('slideSwish')
  duckMusic()
  killTransitionTweens()

  switch (props.transitionMode) {
    case 'crossfade':
      transitionCrossfade(current, next, nextPhoto)
      break
    case 'fadeThroughBlack':
      transitionFadeThroughBlack(current, next, nextPhoto)
      break
    case 'zoomReveal':
      transitionZoomReveal(current, next, nextPhoto)
      break
    case 'kenBurns':
      transitionKenBurns(current, next, nextPhoto)
      break
  }
}

function showPhotoInstant(photo: Photo): void {
  const current = getCurrentImg()
  const next = getNextImg()
  if (!current || !next) {
    return
  }

  killTransitionTweens()
  setImageContent(current, photo)
  gsap.set(current, { opacity: 1, zIndex: 1, scale: 1, x: '0%', y: '0%' })
  resetImageToHidden(next)
  displayedPhotoId.value = photo.id

  ensureKenBurnsForCurrentPhoto()
}

function loadIncomingAndTransition(nextPhoto: Photo): void {
  const current = getCurrentImg()
  const next = getNextImg()
  if (!current || !next) {
    return
  }

  const token = ++imageLoadToken

  const cleanupImageHandlers = () => {
    next.onload = null
    next.onerror = null
  }

  const beginTransition = () => {
    cleanupImageHandlers()
    if (token !== imageLoadToken) {
      return
    }
    runTransition(current, next, nextPhoto)
  }

  const handleLoadError = () => {
    cleanupImageHandlers()
    if (token !== imageLoadToken) {
      return
    }
    resetImageToHidden(next)
  }

  next.onload = beginTransition
  next.onerror = handleLoadError
  setImageContent(next, nextPhoto)

  if (next.complete) {
    if (next.naturalWidth > 0) {
      beginTransition()
      return
    }

    handleLoadError()
  }
}

function syncDisplayedPhoto(forceInitial = false): void {
  const photo = currentPhoto.value
  if (!photo) {
    displayedPhotoId.value = null
    return
  }

  if (forceInitial || displayedPhotoId.value == null) {
    showPhotoInstant(photo)
    return
  }

  if (displayedPhotoId.value === photo.id) {
    return
  }

  loadIncomingAndTransition(photo)
}

function applyReducedMotionChange(matches: boolean): void {
  prefersReducedMotion.value = matches

  if (!matches) {
    ensureKenBurnsForCurrentPhoto()
    return
  }

  killTransitionTweens()
  const current = getCurrentImg()
  const next = getNextImg()
  if (current) {
    gsap.set(current, { opacity: 1, zIndex: 1, scale: 1, x: '0%', y: '0%' })
  }
  if (next) {
    resetImageToHidden(next)
  }
  unduckMusic()
}

function emitActivity(): void {
  emit('activity')
}

function onCycleTransition(): void {
  emit('cycleTransition')
}

function onIntervalChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  const nextValue = Number.parseInt(target.value, 10)

  if (!Number.isNaN(nextValue)) {
    emit('setInterval', nextValue)
  }
}

function onThumbnailClick(index: number): void {
  if (index === props.currentIndex) {
    emitActivity()
    return
  }

  if (index > props.currentIndex) {
    emit('next')
    return
  }

  emit('prev')
}

function onTouchStart(event: TouchEvent): void {
  emitActivity()
  touchStartX.value = event.changedTouches[0]?.clientX ?? null
}

function onTouchEnd(event: TouchEvent): void {
  emitActivity()

  const startX = touchStartX.value
  const endX = event.changedTouches[0]?.clientX ?? null
  touchStartX.value = null

  if (startX === null || endX === null) {
    return
  }

  const distance = endX - startX
  if (Math.abs(distance) < 40) {
    return
  }

  if (distance < 0) {
    emit('next')
    return
  }

  emit('prev')
}

watch(currentPhoto, () => {
  syncDisplayedPhoto()
}, { flush: 'post' })

watch(() => props.transitionMode, () => {
  if (props.transitionMode !== 'kenBurns') {
    kenBurnsTween?.kill()
    kenBurnsTween = null
    const current = getCurrentImg()
    if (current) {
      resetImageTransform(current)
    }
    return
  }

  ensureKenBurnsForCurrentPhoto()
})

watch(() => props.intervalSeconds, () => {
  if (props.transitionMode === 'kenBurns') {
    ensureKenBurnsForCurrentPhoto()
  }
})

onMounted(() => {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    applyReducedMotionChange(motionQuery.matches)
    motionQuery.addEventListener('change', handleMotionQueryEvent)
  }

  syncDisplayedPhoto(true)
})

onUnmounted(() => {
  imageLoadToken += 1
  const imgA = imgARef.value
  const imgB = imgBRef.value
  if (imgA) {
    imgA.onload = null
    imgA.onerror = null
  }
  if (imgB) {
    imgB.onload = null
    imgB.onerror = null
  }
  motionQuery?.removeEventListener('change', handleMotionQueryEvent)
  killTransitionTweens()
  killAudioTweens()

  if (duckRestoreTarget != null) {
    musicPlayer.setVolume(duckRestoreTarget)
    duckRestoreTarget = null
  }
})
</script>

<template>
  <section
    class="slideshow-root"
    @mousemove="emitActivity"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <div data-testid="slideshow-stage" class="slideshow-stage">
      <figure class="slideshow-photo-stack">
        <img
          ref="imgARef"
          data-testid="slideshow-img-a"
          class="slideshow-photo"
          draggable="false"
        >
        <img
          ref="imgBRef"
          data-testid="slideshow-img-b"
          class="slideshow-photo"
          draggable="false"
        >
      </figure>

      <div
        class="slideshow-overlay"
        :class="controlsVisible ? 'is-visible' : 'is-hidden'"
      >
        <div class="slideshow-top">
          <div class="slideshow-meta">
            <div class="slideshow-eye">
              {{ currentPhotoEyebrow }}
            </div>
            <div class="slideshow-caption">
              {{ currentPhotoTitle }}
            </div>
            <div class="slideshow-place">
              {{ currentPhotoDetails }}
            </div>
          </div>

          <div class="slideshow-top-actions">
            <button
              type="button"
              class="slideshow-round-button"
              :title="$t('slideshow.transition.label')"
              @click="onCycleTransition"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" />
              </svg>
            </button>
            <button
              data-testid="control-exit"
              type="button"
              class="slideshow-round-button"
              :title="$t('slideshow.exit')"
              @click="$emit('exit')"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>
        </div>

        <div class="slideshow-hint">
          {{ $t('slideshow.keyboardHint') }}
        </div>

        <div class="slideshow-bottom">
          <div data-testid="slideshow-progress" class="slideshow-progress">
            <span class="num">{{ photoPositionLabel }}</span>
            <div class="slideshow-bar" aria-hidden="true">
              <span :style="progressStyle" />
            </div>
            <span class="num">{{ nextInLabel }}</span>
          </div>

          <div class="slideshow-controls">
            <div data-testid="slideshow-filmstrip" class="slideshow-strip">
              <button
                v-for="(photo, index) in visibleThumbs"
                :key="photo.id"
                type="button"
                class="slideshow-strip-thumb"
                :class="{ 'is-on': index === currentIndex }"
                :style="{ backgroundImage: `url(${buildPhotoSrc(photo)})` }"
                :aria-label="$t('slideshow.thumbnailLabel', { index: index + 1 })"
                @click="onThumbnailClick(index)"
              />
            </div>

            <div class="slideshow-ctl">
              <button
                data-testid="control-prev"
                type="button"
                class="slideshow-button"
                :aria-label="$t('slideshow.prev')"
                @click="$emit('prev')"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                data-testid="control-play-pause"
                type="button"
                class="slideshow-button play"
                :aria-label="isPlaying ? $t('slideshow.pause') : $t('slideshow.play')"
                @click="$emit('togglePlay')"
              >
                <svg v-if="isPlaying" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" />
                  <rect x="14" y="5" width="4" height="14" />
                </svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 4l14 8L6 20V4z" />
                </svg>
              </button>
              <button
                data-testid="control-next"
                type="button"
                class="slideshow-button"
                :aria-label="$t('slideshow.next')"
                @click="$emit('next')"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>

            <div data-testid="slideshow-music-readout" class="slideshow-music">
              <span class="slideshow-music-dot" aria-hidden="true" />
              <span>{{ musicReadout }}</span>
            </div>
          </div>

          <div class="slideshow-secondary-controls">
            <button
              data-testid="control-transition"
              type="button"
              class="slideshow-chip-button"
              @click="onCycleTransition"
            >
              {{ transitionLabel }}
            </button>
            <label class="slideshow-interval-group">
              <span>{{ $t('slideshow.interval') }}</span>
              <select
                data-testid="control-interval"
                :value="intervalSeconds"
                class="slideshow-interval-select"
                @change="onIntervalChange"
              >
                <option v-for="option in intervalOptions" :key="option" :value="option">
                  {{ option }}s
                </option>
              </select>
            </label>
          </div>
        </div>

        <div data-testid="slideshow-counter" class="slideshow-counter">
          <span class="now">{{ String(currentIndex + 1).padStart(2, '0') }}</span>
          <span class="slash">/</span>
          {{ String(photos.length).padStart(2, '0') }}
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.slideshow-root {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 30% 30%, oklch(28% 0.04 50) 0%, #000 70%),
    #000;
}

.slideshow-stage,
.slideshow-photo-stack {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.slideshow-stage::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgb(0 0 0 / 45%) 0%, transparent 22%, transparent 60%, rgb(0 0 0 / 85%) 100%);
}

.slideshow-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  will-change: opacity, transform;
}

.slideshow-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  transition: opacity 300ms var(--ts-ease);
}

.slideshow-overlay.is-hidden {
  pointer-events: none;
  opacity: 0;
}

.slideshow-overlay.is-visible {
  opacity: 1;
}

.slideshow-top {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 28px;
  padding: 22px 32px;
}

.slideshow-meta {
  max-width: 50ch;
}

.slideshow-eye {
  margin-bottom: 6px;
  color: var(--ts-accent);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.slideshow-caption {
  color: oklch(96% 0.02 80);
  font-family: var(--ts-font-display);
  font-size: clamp(22px, 2.2vw, 32px);
  font-weight: 500;
  line-height: 1.2;
  text-shadow: 0 2px 16px rgb(0 0 0 / 50%);
}

.slideshow-place {
  margin-top: 8px;
  color: oklch(85% 0.02 70);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.slideshow-top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slideshow-round-button,
.slideshow-button {
  display: grid;
  place-items: center;
  border: 1px solid oklch(40% 0.014 50 / 50%);
  border-radius: 50%;
  background: oklch(15% 0.012 45 / 60%);
  color: oklch(92% 0.015 70);
  backdrop-filter: blur(10px);
}

.slideshow-round-button {
  width: 38px;
  height: 38px;
}

.slideshow-round-button svg,
.slideshow-button svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.slideshow-round-button:hover,
.slideshow-button:hover {
  background: oklch(25% 0.018 50 / 70%);
}

.slideshow-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  color: oklch(70% 0.02 70 / 35%);
  font-family: var(--ts-font-mono);
  font-size: 12px;
  letter-spacing: 0.16em;
  pointer-events: none;
  text-transform: uppercase;
  transform: translate(-50%, -50%);
}

.slideshow-bottom {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px 32px 28px;
}

.slideshow-progress {
  display: flex;
  align-items: center;
  gap: 18px;
  color: oklch(85% 0.02 70);
  font-family: var(--ts-font-mono);
  font-size: 11px;
}

.slideshow-bar {
  position: relative;
  flex: 1;
  height: 2px;
  overflow: hidden;
  background: oklch(40% 0.014 50 / 40%);
}

.slideshow-bar span {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, var(--ts-accent-deep), var(--ts-accent));
}

.slideshow-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
}

.slideshow-strip {
  display: flex;
  max-width: 60%;
  gap: 6px;
  overflow: hidden;
}

.slideshow-strip-thumb {
  width: 36px;
  height: 28px;
  flex-shrink: 0;
  border: 0;
  border-radius: 4px;
  background-color: var(--ts-surface);
  background-position: center;
  background-size: cover;
  opacity: 0.5;
  transition:
    opacity 200ms var(--ts-ease),
    transform 200ms var(--ts-ease);
}

.slideshow-strip-thumb:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.slideshow-strip-thumb.is-on {
  box-shadow: 0 0 0 2px var(--ts-accent);
  opacity: 1;
}

.slideshow-ctl {
  display: flex;
  align-items: center;
  gap: 14px;
}

.slideshow-button {
  width: 42px;
  height: 42px;
}

.slideshow-button.play {
  width: 56px;
  height: 56px;
  border-color: transparent;
  background: var(--ts-accent);
  box-shadow: 0 10px 28px var(--ts-accent-glow);
  color: var(--ts-bg-deep);
}

.slideshow-button.play svg {
  fill: currentColor;
  stroke: none;
}

.slideshow-music {
  display: flex;
  min-width: 0;
  max-width: 32vw;
  align-items: center;
  gap: 12px;
  color: oklch(90% 0.02 70);
  font-family: var(--ts-font-mono);
  font-size: 11.5px;
}

.slideshow-music span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slideshow-music-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--ts-accent);
  box-shadow: 0 0 8px var(--ts-accent-glow);
  animation: slideshow-pulse 2s ease-in-out infinite;
}

.slideshow-secondary-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.slideshow-chip-button,
.slideshow-interval-group {
  min-height: 34px;
  border: 1px solid oklch(40% 0.014 50 / 50%);
  border-radius: var(--ts-radius-pill);
  background: oklch(15% 0.012 45 / 55%);
  color: oklch(92% 0.015 70);
  backdrop-filter: blur(10px);
  font-family: var(--ts-font-mono);
  font-size: 11px;
}

.slideshow-chip-button {
  padding: 0 14px;
}

.slideshow-interval-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px 0 14px;
}

.slideshow-interval-select {
  min-height: 26px;
  border: 0;
  border-radius: var(--ts-radius-pill);
  background: oklch(25% 0.018 50 / 70%);
  color: inherit;
  outline: none;
  padding: 0 8px;
}

.slideshow-counter {
  position: absolute;
  right: 32px;
  bottom: 28px;
  z-index: 22;
  color: oklch(80% 0.02 70);
  font-family: var(--ts-font-mono);
  font-size: 13px;
}

.slideshow-counter .now {
  color: var(--ts-fg);
  font-family: var(--ts-font-display);
  font-size: 22px;
}

.slideshow-counter .slash {
  color: var(--ts-muted-2);
}

@keyframes slideshow-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

@media (max-width: 720px) {
  .slideshow-top {
    padding: 16px 18px calc(env(safe-area-inset-top, 0px) + 14px);
  }

  .slideshow-eye {
    font-size: 9.5px;
    letter-spacing: 0.12em;
  }

  .slideshow-caption {
    max-width: 22ch;
    font-size: 18px;
  }

  .slideshow-place {
    font-size: 10px;
    letter-spacing: 0.04em;
  }

  .slideshow-top-actions {
    flex-direction: column;
    gap: 6px;
  }

  .slideshow-round-button {
    width: 36px;
    height: 36px;
  }

  .slideshow-bottom {
    gap: 12px;
    padding: 14px 16px calc(env(safe-area-inset-bottom, 0px) + 18px);
  }

  .slideshow-progress {
    gap: 10px;
    font-size: 10px;
  }

  .slideshow-controls {
    gap: 14px;
  }

  .slideshow-strip {
    display: none;
  }

  .slideshow-ctl {
    gap: 10px;
  }

  .slideshow-button {
    width: 44px;
    height: 44px;
  }

  .slideshow-button.play {
    width: 52px;
    height: 52px;
  }

  .slideshow-music {
    max-width: 44vw;
    font-size: 10.5px;
  }

  .slideshow-counter,
  .slideshow-hint {
    display: none;
  }

  .slideshow-chip-button,
  .slideshow-interval-group {
    min-height: 44px;
  }

  .slideshow-interval-select {
    min-height: 34px;
    font-size: 16px;
  }
}
</style>
