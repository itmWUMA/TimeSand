import type { Ref } from 'vue'

import type { Photo } from '../types/photo'
import { computed, onScopeDispose, ref, watch } from 'vue'

const CONTROL_HIDE_DELAY_MS = 3000

export const INTERVAL_OPTIONS = [3, 5, 8, 10, 15] as const

export function useSlideshow(photos: Ref<Photo[]>) {
  const currentIndex = ref(0)
  const isPlaying = ref(true)
  const intervalSeconds = ref<number>(5)
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
    intervalOptions: [...INTERVAL_OPTIONS],
    controlsVisible,
    next,
    prev,
    togglePlayPause,
    setIntervalSeconds,
    reportActivity,
  }
}
