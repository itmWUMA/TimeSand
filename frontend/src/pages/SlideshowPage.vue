<script setup lang="ts">
import type { Photo } from '../types/photo'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import SlideshowPlayer from '../components/SlideshowPlayer.vue'
import TsEmptyState from '../components/TsEmptyState.vue'
import { useMusicPlayer } from '../composables/useMusicPlayer'
import { useSlideshow } from '../composables/useSlideshow'
import { listSlideshowPhotos } from '../services/slideshow'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { playlistId, setContext, tracks } = useMusicPlayer()
const settingsStore = useSettingsStore()

const photos = ref<Photo[]>([])
const loading = ref(false)
const errorMessage = ref<string | null>(null)

function parseAlbumId(value: unknown): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined
  }

  return parsed
}

function parseInterval(value: unknown): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined
  }

  return parsed
}

const albumId = computed(() => parseAlbumId(route.params.albumId ?? route.query.album_id))
const intervalOverride = computed(() => parseInterval(route.query.interval))

const {
  currentIndex,
  isPlaying,
  intervalSeconds,
  intervalOptions,
  transitionMode,
  controlsVisible,
  next,
  prev,
  togglePlayPause,
  setIntervalSeconds,
  cycleTransitionMode,
  reportActivity,
} = useSlideshow(photos)

async function loadPhotos(): Promise<void> {
  loading.value = true
  errorMessage.value = null

  try {
    const payload = await listSlideshowPhotos({
      albumId: albumId.value,
    })
    photos.value = payload.photos
  }
  catch {
    errorMessage.value = t('slideshow.loadFailed')
  }
  finally {
    loading.value = false
  }
}

async function syncPlayerContext(nextAlbumId: number | undefined): Promise<void> {
  if (nextAlbumId != null) {
    await setContext('album', nextAlbumId)
    return
  }

  if (playlistId.value != null && tracks.value.length > 0) {
    return
  }

  await setContext('default')
}

function exitSlideshow(): void {
  router.back()
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === ' ') {
    event.preventDefault()
    togglePlayPause()
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    prev()
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    next()
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    exitSlideshow()
  }
}

watch(albumId, async (nextAlbumId) => {
  await Promise.all([
    loadPhotos(),
    syncPlayerContext(nextAlbumId),
  ])
}, { immediate: true })

watch(intervalOverride, (value) => {
  if (value != null) {
    setIntervalSeconds(value)
    return
  }

  setIntervalSeconds(settingsStore.getInterval())
}, { immediate: true })

let previousOverflow = ''

onMounted(() => {
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.body.style.overflow = previousOverflow
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <section class="fixed inset-0 z-50 bg-[#0a0a0a]">
    <div v-if="loading" class="flex h-full items-center justify-center text-sm text-white/75">
      {{ $t('slideshow.loading') }}
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
        class="slideshow-page-action rounded border border-white/35 px-4 py-2 text-sm text-white transition hover:border-white/70 hover:bg-white/10"
        @click="exitSlideshow"
      >
        {{ $t('slideshow.goBack') }}
      </button>
    </div>

    <div v-else-if="photos.length === 0" class="flex h-full items-center justify-center px-6">
      <TsEmptyState
        :title="$t('empty.slideshow.title')"
        :description="$t('empty.slideshow.description')"
        :action-label="$t('empty.slideshow.action')"
        action-to="/upload"
      />
    </div>

    <SlideshowPlayer
      v-else
      :photos="photos"
      :current-index="currentIndex"
      :is-playing="isPlaying"
      :interval-seconds="intervalSeconds"
      :interval-options="intervalOptions"
      :transition-mode="transitionMode"
      :controls-visible="controlsVisible"
      @next="next"
      @prev="prev"
      @toggle-play="togglePlayPause"
      @set-interval="setIntervalSeconds"
      @cycle-transition="cycleTransitionMode"
      @exit="exitSlideshow"
      @activity="reportActivity"
    />
  </section>
</template>

<style scoped>
@media (max-width: 767px) {
  .slideshow-page-action {
    min-height: 44px;
    min-width: 44px;
  }
}
</style>
