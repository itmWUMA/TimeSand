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
    class="relative h-full w-full overflow-hidden bg-[#0a0a0a]"
    @mousemove="emitActivity"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <figure class="absolute inset-0">
      <img
        ref="imgARef"
        data-testid="slideshow-img-a"
        class="absolute inset-0 h-full w-full object-contain"
        draggable="false"
      >
      <img
        ref="imgBRef"
        data-testid="slideshow-img-b"
        class="absolute inset-0 h-full w-full object-contain"
        draggable="false"
      >
    </figure>

    <div
      class="absolute inset-x-0 bottom-0 top-0 z-20 flex flex-col justify-between p-4 transition-opacity duration-300 md:p-6"
      :class="controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'"
    >
      <div class="flex items-center justify-between">
        <p class="rounded bg-black/45 px-3 py-1 text-xs text-white/80">
          {{ currentPhoto ? currentPhoto.filename : $t('slideshow.noPhotos') }}
        </p>
        <button
          data-testid="control-exit"
          type="button"
          class="rounded border border-white/35 bg-black/35 px-3 py-1.5 text-sm text-white transition hover:border-white/70 hover:bg-black/60"
          @click="$emit('exit')"
        >
          {{ $t('slideshow.exit') }}
        </button>
      </div>

      <div class="mx-auto flex w-full max-w-xl flex-wrap items-center justify-center gap-2 rounded-xl border border-white/20 bg-black/45 px-3 py-3 backdrop-blur">
        <button
          data-testid="control-prev"
          type="button"
          class="rounded border border-white/35 px-3 py-2 text-sm text-white transition hover:border-white/70 hover:bg-white/10"
          @click="$emit('prev')"
        >
          {{ $t('slideshow.prev') }}
        </button>
        <button
          data-testid="control-play-pause"
          type="button"
          class="rounded border border-white/35 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/70 hover:bg-white/10"
          @click="$emit('togglePlay')"
        >
          {{ isPlaying ? $t('slideshow.pause') : $t('slideshow.play') }}
        </button>
        <button
          data-testid="control-next"
          type="button"
          class="rounded border border-white/35 px-3 py-2 text-sm text-white transition hover:border-white/70 hover:bg-white/10"
          @click="$emit('next')"
        >
          {{ $t('slideshow.next') }}
        </button>
        <button
          data-testid="control-transition"
          type="button"
          class="rounded border border-white/35 px-3 py-2 text-sm text-white transition hover:border-white/70 hover:bg-white/10"
          @click="onCycleTransition"
        >
          {{ transitionLabel }}
        </button>
        <label class="flex items-center gap-2 text-sm text-white/85">
          <span>{{ $t('slideshow.interval') }}</span>
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
