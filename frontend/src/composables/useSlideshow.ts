import type { Ref } from 'vue'

import type { Photo } from '../types/photo'
import { computed, onScopeDispose, ref, watch } from 'vue'

const CONTROL_HIDE_DELAY_MS = 3000
const TRANSITION_KEY = 'ts-slideshow-transition'

export const INTERVAL_OPTIONS = [3, 5, 8, 10, 15] as const
export const TRANSITION_ORDER = ['kenBurns', 'crossfade', 'fadeThroughBlack', 'zoomReveal'] as const

export type TransitionMode = (typeof TRANSITION_ORDER)[number]

function canUseBrowserApis(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function isTransitionMode(value: string): value is TransitionMode {
  return TRANSITION_ORDER.includes(value as TransitionMode)
}

function readTransitionMode(): TransitionMode {
  if (!canUseBrowserApis()) {
    return 'kenBurns'
  }

  const stored = localStorage.getItem(TRANSITION_KEY)
  if (stored && isTransitionMode(stored)) {
    return stored
  }

  return 'kenBurns'
}

export function useSlideshow(photos: Ref<Photo[]>) {
  const currentIndex = ref(0)
  const isPlaying = ref(true)
  const intervalSeconds = ref<number>(5)
  const transitionMode = ref<TransitionMode>(readTransitionMode())
  const controlsVisible = ref(true)

  let advanceTimer: ReturnType<typeof setTimeout> | null = null
  let controlsTimer: ReturnType<typeof setTimeout> | null = null

  const currentPhoto = computed(() => photos.value[currentIndex.value] ?? null)

  const clearAdvanceTimer = (): void => {
    if (advanceTimer !== null) {
      clearTimeout(advanceTimer)
      advanceTimer = null
    }
  }

  const clearControlsTimer = (): void => {
    if (controlsTimer !== null) {
      clearTimeout(controlsTimer)
      controlsTimer = null
    }
  }

  const normalizeCurrentIndex = (): void => {
    if (photos.value.length === 0) {
      currentIndex.value = 0
      return
    }

    if (currentIndex.value >= photos.value.length) {
      currentIndex.value = photos.value.length - 1
    }
  }

  const scheduleControlsAutoHide = (): void => {
    clearControlsTimer()
    controlsTimer = setTimeout(() => {
      controlsVisible.value = false
    }, CONTROL_HIDE_DELAY_MS)
  }

  const scheduleAutoAdvance = (): void => {
    clearAdvanceTimer()

    if (!isPlaying.value || photos.value.length <= 1) {
      return
    }

    advanceTimer = setTimeout(() => {
      currentIndex.value = (currentIndex.value + 1) % photos.value.length
      scheduleAutoAdvance()
    }, intervalSeconds.value * 1000)
  }

  const restartAfterManualAction = (): void => {
    scheduleAutoAdvance()
    controlsVisible.value = true
    scheduleControlsAutoHide()
  }

  const next = (): void => {
    if (photos.value.length === 0) {
      return
    }

    currentIndex.value = (currentIndex.value + 1) % photos.value.length
    restartAfterManualAction()
  }

  const prev = (): void => {
    if (photos.value.length === 0) {
      return
    }

    currentIndex.value = (currentIndex.value - 1 + photos.value.length) % photos.value.length
    restartAfterManualAction()
  }

  const togglePlayPause = (): void => {
    isPlaying.value = !isPlaying.value
    restartAfterManualAction()
  }

  const setIntervalSeconds = (seconds: number): void => {
    intervalSeconds.value = seconds
    restartAfterManualAction()
  }

  const cycleTransitionMode = (): void => {
    const currentIdx = TRANSITION_ORDER.indexOf(transitionMode.value)
    const nextIdx = (currentIdx + 1) % TRANSITION_ORDER.length
    transitionMode.value = TRANSITION_ORDER[nextIdx]

    if (canUseBrowserApis()) {
      localStorage.setItem(TRANSITION_KEY, transitionMode.value)
    }
  }

  const reportActivity = (): void => {
    controlsVisible.value = true
    scheduleControlsAutoHide()
  }

  watch(
    photos,
    () => {
      normalizeCurrentIndex()
      scheduleAutoAdvance()
      reportActivity()
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    clearAdvanceTimer()
    clearControlsTimer()
  }, true)

  return {
    currentIndex,
    currentPhoto,
    isPlaying,
    intervalSeconds,
    transitionMode,
    intervalOptions: [...INTERVAL_OPTIONS],
    controlsVisible,
    next,
    prev,
    togglePlayPause,
    setIntervalSeconds,
    cycleTransitionMode,
    reportActivity,
  }
}
