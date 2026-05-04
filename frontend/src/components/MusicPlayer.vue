<script setup lang="ts">
import { gsap } from 'gsap'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMusicPlayer } from '../composables/useMusicPlayer'

const EXPAND_STORAGE_KEY = 'ts-player-expanded'
const MAIN_PADDING_VARIABLE = '--ts-player-main-padding'
const MOBILE_MEDIA_QUERY = '(max-width: 767px)'
const COLLAPSED_PADDING = '5rem'
const MOBILE_EXPANDED_PADDING = '14.5rem'
const EXPANDED_PADDING = '10rem'

const { t } = useI18n()

const {
  currentTrack,
  isPlaying,
  tracks,
  currentTime,
  duration,
  playlistName,
  progressPercent,
  volume,
  repeatMode,
  togglePlayPause,
  next,
  prev,
  seekTo,
  setVolume,
  cycleRepeatMode,
  formatTime,
} = useMusicPlayer()

const isExpanded = ref(false)
const isMobileExpanded = ref(false)
const isMobileViewport = ref(false)
const mobileExpandedRef = ref<HTMLElement | null>(null)
const mobileExpandedInnerRef = ref<HTMLElement | null>(null)
const hasTracks = computed(() => tracks.value.length > 0)
const canControl = computed(() => hasTracks.value && currentTrack.value != null)
const volumePercent = computed(() => Math.round(volume.value * 100))
const progressMax = computed(() => (duration.value > 0 ? duration.value : 0))
const expandedState = computed(() => {
  const isPanelExpanded = isMobileViewport.value ? isMobileExpanded.value : isExpanded.value
  return isPanelExpanded && hasTracks.value ? 'true' : 'false'
})
const repeatButtonClass = computed(() => (repeatMode.value === 'none' ? 'text-ts-muted' : 'text-ts-accent'))
const repeatLabel = computed(() => {
  if (repeatMode.value === 'one') {
    return t('player.repeatOne')
  }

  if (repeatMode.value === 'none') {
    return t('player.repeatNone')
  }

  return t('player.repeatAll')
})
const currentTrackTitle = computed(() => {
  if (!canControl.value) {
    return t('player.noMusicLoaded')
  }

  return currentTrack.value?.title ?? t('player.noTrack')
})
const trackSubtitle = computed(() => {
  if (!canControl.value) {
    return t('player.unknownArtist')
  }

  const artist = currentTrack.value?.artist || t('player.unknownArtist')
  if (!playlistName.value) {
    return artist
  }

  return `${artist} - ${playlistName.value}`
})
const mobileProgressStyle = computed(() => ({ width: `${progressPercent.value}%` }))
const mobileMiniSafeAreaStyle = computed(() => ({
  paddingBottom: isMobileExpanded.value ? '0px' : 'env(safe-area-inset-bottom)',
}))

let mobileMediaQueryList: MediaQueryList | null = null
let mobileMediaQueryListener: ((event: MediaQueryListEvent) => void) | null = null
let mobilePanelReady = false

function syncMainPadding(): void {
  const isPanelExpanded = isMobileViewport.value ? isMobileExpanded.value : isExpanded.value
  const padding = isMobileViewport.value
    ? isPanelExpanded && hasTracks.value
      ? MOBILE_EXPANDED_PADDING
      : COLLAPSED_PADDING
    : isPanelExpanded && hasTracks.value
      ? EXPANDED_PADDING
      : COLLAPSED_PADDING

  document.documentElement.style.setProperty(MAIN_PADDING_VARIABLE, padding)
}

function readStoredExpanded(): boolean {
  try {
    return localStorage.getItem(EXPAND_STORAGE_KEY) === 'true'
  }
  catch {
    return false
  }
}

function writeStoredExpanded(value: boolean): void {
  try {
    localStorage.setItem(EXPAND_STORAGE_KEY, value ? 'true' : 'false')
  }
  catch {
  }
}

function toggleExpanded(): void {
  if (!hasTracks.value) {
    return
  }

  isExpanded.value = !isExpanded.value
  writeStoredExpanded(isExpanded.value)
}

function expandMobile(): void {
  if (!hasTracks.value || isMobileExpanded.value) {
    return
  }

  isMobileExpanded.value = true
}

function collapseMobile(): void {
  if (!isMobileExpanded.value) {
    return
  }

  isMobileExpanded.value = false
}

function onMiniBarClick(): void {
  expandMobile()
}

function onSeek(event: Event): void {
  const target = event.target as HTMLInputElement
  seekTo(Number(target.value))
}

function onVolumeChange(event: Event): void {
  const target = event.target as HTMLInputElement
  setVolume(Number(target.value) / 100)
}

function syncMobileExpandedVisibility(): void {
  const panel = mobileExpandedRef.value

  if (!panel) {
    return
  }

  const shouldExpand = isMobileExpanded.value && hasTracks.value
  panel.style.display = shouldExpand ? 'block' : 'none'
  panel.style.height = shouldExpand ? 'auto' : '0px'
}

function animateMobileExpanded(shouldExpand: boolean): void {
  const panel = mobileExpandedRef.value
  const panelInner = mobileExpandedInnerRef.value

  if (!panel || !panelInner) {
    return
  }

  const animatedItems = Array.from(panelInner.querySelectorAll<HTMLElement>('[data-mobile-fade]'))
  gsap.killTweensOf([panel, ...animatedItems])

  if (shouldExpand) {
    gsap.set(panel, {
      display: 'block',
      overflow: 'hidden',
    })
    const expandedHeight = panelInner.scrollHeight

    gsap.fromTo(panel, { height: 0 }, {
      height: expandedHeight,
      duration: 0.25,
      ease: 'power2.out',
      onComplete: () => {
        gsap.set(panel, {
          height: 'auto',
        })
      },
    })

    gsap.fromTo(animatedItems, {
      autoAlpha: 0,
      y: 8,
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.18,
      delay: 0.06,
      stagger: 0.04,
      ease: 'power2.out',
    })
    return
  }

  const collapsedFrom = panel.getBoundingClientRect().height

  if (collapsedFrom <= 0) {
    gsap.set(panel, {
      display: 'none',
      height: 0,
    })
    return
  }

  gsap.to(animatedItems, {
    autoAlpha: 0,
    y: 6,
    duration: 0.12,
    stagger: 0.02,
    ease: 'power1.in',
  })

  gsap.fromTo(panel, { height: collapsedFrom }, {
    height: 0,
    duration: 0.2,
    ease: 'power2.in',
    onComplete: () => {
      gsap.set(panel, {
        display: 'none',
      })
    },
  })
}

function setupMobileMediaQuery(): void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return
  }

  mobileMediaQueryList = window.matchMedia(MOBILE_MEDIA_QUERY)
  isMobileViewport.value = mobileMediaQueryList.matches

  mobileMediaQueryListener = (event: MediaQueryListEvent) => {
    isMobileViewport.value = event.matches

    if (!event.matches) {
      isMobileExpanded.value = false
    }
  }

  if (typeof mobileMediaQueryList.addEventListener === 'function') {
    mobileMediaQueryList.addEventListener('change', mobileMediaQueryListener)
  }
  else {
    mobileMediaQueryList.addListener(mobileMediaQueryListener)
  }
}

onMounted(async () => {
  isExpanded.value = readStoredExpanded()
  setupMobileMediaQuery()
  syncMainPadding()
  await nextTick()
  syncMobileExpandedVisibility()
  mobilePanelReady = true
})

watch([isExpanded, isMobileExpanded, hasTracks, isMobileViewport], syncMainPadding)

watch(() => hasTracks.value, (nextHasTracks) => {
  if (!nextHasTracks) {
    isMobileExpanded.value = false
  }
})

watch(() => isMobileExpanded.value && hasTracks.value, (shouldExpand) => {
  if (!mobilePanelReady) {
    syncMobileExpandedVisibility()
    return
  }

  if (!isMobileViewport.value) {
    syncMobileExpandedVisibility()
    return
  }

  animateMobileExpanded(shouldExpand)
})

onBeforeUnmount(() => {
  document.documentElement.style.removeProperty(MAIN_PADDING_VARIABLE)

  if (mobileMediaQueryList && mobileMediaQueryListener) {
    if (typeof mobileMediaQueryList.removeEventListener === 'function') {
      mobileMediaQueryList.removeEventListener('change', mobileMediaQueryListener)
    }
    else {
      mobileMediaQueryList.removeListener(mobileMediaQueryListener)
    }
  }

  const panel = mobileExpandedRef.value
  const panelInner = mobileExpandedInnerRef.value
  const animatedItems = panelInner
    ? Array.from(panelInner.querySelectorAll<HTMLElement>('[data-mobile-fade]'))
    : []

  gsap.killTweensOf([panel, ...animatedItems])
})
</script>

<template>
  <section
    data-testid="music-player"
    :data-expanded="expandedState"
    class="border-t border-white/10 bg-ts-panel/95 text-ts-text shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur"
  >
    <div
      class="relative md:hidden"
      :style="mobileMiniSafeAreaStyle"
    >
      <div class="absolute inset-x-0 top-0 h-0.5 bg-white/10">
        <div
          data-testid="music-player-mobile-progress"
          class="h-full bg-ts-accent transition-[width] duration-150"
          :style="mobileProgressStyle"
        />
      </div>

      <div
        data-testid="music-player-mobile-mini"
        class="flex items-center gap-3 px-3 pb-2 pt-2.5"
        :class="!isMobileExpanded && hasTracks ? 'cursor-pointer' : ''"
        @click="onMiniBarClick"
      >
        <div
          class="flex shrink-0 items-center justify-center rounded-md bg-white/10 text-ts-muted"
          :class="isMobileExpanded ? 'h-10 w-10' : 'h-8 w-8'"
          aria-hidden="true"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>

        <button
          data-testid="music-player-mobile-expand-hitarea"
          type="button"
          class="min-w-0 flex-1 text-left"
          :disabled="!hasTracks"
          :aria-label="$t('player.expand')"
          @click.stop="expandMobile"
        >
          <p class="truncate text-sm font-semibold" :class="canControl ? 'text-ts-accent' : 'text-ts-muted'">
            {{ currentTrackTitle }}
          </p>
          <p class="truncate text-xs text-ts-muted">
            {{ trackSubtitle }}
          </p>
        </button>

        <button
          v-if="!isMobileExpanded"
          data-testid="music-player-mobile-play-pause"
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-full text-ts-accent transition hover:bg-ts-accent/15 disabled:opacity-40"
          :disabled="!canControl"
          :aria-label="isPlaying ? $t('player.pause') : $t('player.play')"
          @click.stop="togglePlayPause"
        >
          <svg
            v-if="isPlaying"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="6" y="5" width="4" height="14" />
            <rect x="14" y="5" width="4" height="14" />
          </svg>
          <svg
            v-else
            class="h-5 w-5"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </button>

        <button
          v-else
          data-testid="music-player-mobile-collapse"
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-full text-ts-muted transition hover:bg-white/10 hover:text-ts-text"
          :aria-label="$t('player.collapse')"
          @click.stop="collapseMobile"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6,15 12,9 18,15" />
          </svg>
        </button>
      </div>

      <div
        ref="mobileExpandedRef"
        data-testid="music-player-mobile-expanded"
        class="overflow-hidden"
        :aria-hidden="!isMobileExpanded"
      >
        <div
          ref="mobileExpandedInnerRef"
          class="space-y-3 px-3"
          style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));"
        >
          <div data-mobile-fade class="space-y-1.5">
            <input
              data-testid="music-player-mobile-expanded-progress"
              type="range"
              min="0"
              :max="progressMax"
              step="0.1"
              :value="currentTime"
              class="h-2 w-full cursor-pointer appearance-none rounded bg-white/15 accent-ts-accent"
              :style="{ backgroundSize: `${progressPercent}% 100%` }"
              :disabled="!canControl"
              @input="onSeek"
            >
            <div class="flex items-center justify-between text-xs text-ts-muted">
              <span>{{ formatTime(currentTime) }}</span>
              <span>{{ formatTime(duration) }}</span>
            </div>
          </div>

          <div data-mobile-fade class="flex items-center justify-center gap-4">
            <button
              data-testid="music-player-mobile-expanded-prev"
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded-full text-ts-muted transition hover:bg-white/10 hover:text-ts-text disabled:opacity-40"
              :disabled="!canControl"
              :aria-label="$t('player.prev')"
              @click="prev"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="11,7 5,12 11,17" />
                <polygon points="19,7 13,12 19,17" />
              </svg>
            </button>
            <button
              data-testid="music-player-mobile-expanded-play-pause"
              type="button"
              class="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-ts-accent text-ts-accent transition hover:bg-ts-accent/15 disabled:opacity-40"
              :disabled="!canControl"
              :aria-label="isPlaying ? $t('player.pause') : $t('player.play')"
              @click="togglePlayPause"
            >
              <svg
                v-if="isPlaying"
                class="h-6 w-6"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="6" y="5" width="4" height="14" />
                <rect x="14" y="5" width="4" height="14" />
              </svg>
              <svg
                v-else
                class="h-6 w-6"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </button>
            <button
              data-testid="music-player-mobile-expanded-next"
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded-full text-ts-muted transition hover:bg-white/10 hover:text-ts-text disabled:opacity-40"
              :disabled="!canControl"
              :aria-label="$t('player.next')"
              @click="next"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="5,7 11,12 5,17" />
                <polygon points="13,7 19,12 13,17" />
              </svg>
            </button>
          </div>

          <div data-mobile-fade class="flex items-center justify-center">
            <button
              data-testid="music-player-mobile-expanded-repeat"
              type="button"
              class="flex h-11 min-w-24 items-center justify-center gap-2 rounded-full px-4 transition hover:bg-white/10 disabled:opacity-40"
              :class="repeatButtonClass"
              :disabled="!canControl"
              :aria-label="repeatLabel"
              @click="cycleRepeatMode"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m17 2 4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="m7 22-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                <text
                  v-if="repeatMode === 'one'"
                  x="15.5"
                  y="11"
                  font-size="7"
                  fill="currentColor"
                  stroke="none"
                >
                  1
                </text>
              </svg>
              <span class="text-xs">{{ repeatLabel }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="hidden space-y-2.5 px-6 py-2.5 md:block">
      <div class="flex items-center gap-3">
        <p
          data-testid="music-player-track-title"
          class="min-w-0 flex-1 truncate text-sm"
          :class="canControl ? 'font-semibold text-ts-accent' : 'text-ts-muted'"
        >
          {{ canControl ? currentTrack?.title : $t('player.noMusicLoaded') }}
        </p>

        <button
          v-if="hasTracks"
          data-testid="music-player-expand-toggle"
          type="button"
          class="rounded p-1.5 text-ts-muted transition hover:bg-white/10 hover:text-ts-text"
          :aria-label="isExpanded ? $t('player.collapse') : $t('player.expand')"
          @click="toggleExpanded"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline
              v-if="isExpanded"
              points="6,15 12,9 18,15"
            />
            <polyline
              v-else
              points="6,9 12,15 18,9"
            />
          </svg>
        </button>
      </div>

      <input
        data-testid="music-player-progress"
        type="range"
        min="0"
        :max="progressMax"
        step="0.1"
        :value="currentTime"
        class="h-1 w-full cursor-pointer appearance-none rounded bg-white/15 accent-ts-accent"
        :style="{ backgroundSize: `${progressPercent}% 100%` }"
        :disabled="!canControl"
        @input="onSeek"
      >

      <div class="flex items-center gap-1">
        <button
          data-testid="music-player-prev"
          type="button"
          class="rounded p-2 text-ts-muted transition hover:bg-white/10 hover:text-ts-text disabled:opacity-40"
          :disabled="!canControl"
          :aria-label="$t('player.prev')"
          @click="prev"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon points="11,7 5,12 11,17" />
            <polygon points="19,7 13,12 19,17" />
          </svg>
        </button>
        <button
          data-testid="music-player-play-pause"
          type="button"
          class="rounded p-2 text-ts-accent transition hover:bg-ts-accent/15 disabled:opacity-40"
          :disabled="!canControl"
          :aria-label="isPlaying ? $t('player.pause') : $t('player.play')"
          @click="togglePlayPause"
        >
          <svg
            v-if="isPlaying"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="6" y="5" width="4" height="14" />
            <rect x="14" y="5" width="4" height="14" />
          </svg>
          <svg
            v-else
            class="h-5 w-5"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </button>
        <button
          data-testid="music-player-next"
          type="button"
          class="rounded p-2 text-ts-muted transition hover:bg-white/10 hover:text-ts-text disabled:opacity-40"
          :disabled="!canControl"
          :aria-label="$t('player.next')"
          @click="next"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon points="5,7 11,12 5,17" />
            <polygon points="13,7 19,12 13,17" />
          </svg>
        </button>
        <button
          data-testid="music-player-repeat"
          type="button"
          class="rounded p-2 transition hover:bg-white/10 disabled:opacity-40"
          :class="repeatButtonClass"
          :disabled="!canControl"
          :aria-label="repeatLabel"
          @click="cycleRepeatMode"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m17 2 4 4-4 4" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="m7 22-4-4 4-4" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            <text
              v-if="repeatMode === 'one'"
              x="15.5"
              y="11"
              font-size="7"
              fill="currentColor"
              stroke="none"
            >
              1
            </text>
          </svg>
        </button>
      </div>

      <div
        v-if="hasTracks"
        class="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
        :class="isExpanded && hasTracks ? 'max-h-80 opacity-100 pt-3' : 'pointer-events-none max-h-0 opacity-0'"
        :aria-hidden="!isExpanded"
      >
        <div class="rounded-lg border border-white/10 bg-black/20 p-3">
          <div class="mb-2 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-base font-semibold text-ts-text">
                {{ currentTrack?.title ?? $t('player.noTrack') }}
              </p>
              <p class="truncate text-xs text-ts-muted">
                {{ currentTrack?.artist || $t('player.unknownArtist') }}
                <span v-if="playlistName" class="mx-1">-</span>
                <span v-if="playlistName">{{ playlistName }}</span>
              </p>
            </div>
            <button
              type="button"
              class="rounded p-1.5 text-ts-muted transition hover:bg-white/10 hover:text-ts-text"
              :aria-label="$t('player.collapse')"
              @click="toggleExpanded"
            >
              <svg
                class="h-6 w-6"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="6,15 12,9 18,15" />
              </svg>
            </button>
          </div>

          <div class="space-y-1.5">
            <input
              data-testid="music-player-expanded-progress"
              type="range"
              min="0"
              :max="progressMax"
              step="0.1"
              :value="currentTime"
              class="h-2 w-full cursor-pointer appearance-none rounded bg-white/15 accent-ts-accent"
              :style="{ backgroundSize: `${progressPercent}% 100%` }"
              :disabled="!canControl"
              @input="onSeek"
            >
            <p class="text-right text-xs text-ts-muted">
              {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
            </p>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              class="rounded p-2 text-ts-muted transition hover:bg-white/10 hover:text-ts-text disabled:opacity-40"
              :disabled="!canControl"
              :aria-label="$t('player.prev')"
              @click="prev"
            >
              <svg
                class="h-6 w-6"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="11,7 5,12 11,17" />
                <polygon points="19,7 13,12 19,17" />
              </svg>
            </button>
            <button
              type="button"
              class="rounded p-2 text-ts-accent transition hover:bg-ts-accent/15 disabled:opacity-40"
              :disabled="!canControl"
              :aria-label="isPlaying ? $t('player.pause') : $t('player.play')"
              @click="togglePlayPause"
            >
              <svg
                v-if="isPlaying"
                class="h-6 w-6"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="6" y="5" width="4" height="14" />
                <rect x="14" y="5" width="4" height="14" />
              </svg>
              <svg
                v-else
                class="h-6 w-6"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </button>
            <button
              type="button"
              class="rounded p-2 text-ts-muted transition hover:bg-white/10 hover:text-ts-text disabled:opacity-40"
              :disabled="!canControl"
              :aria-label="$t('player.next')"
              @click="next"
            >
              <svg
                class="h-6 w-6"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="5,7 11,12 5,17" />
                <polygon points="13,7 19,12 13,17" />
              </svg>
            </button>
            <button
              type="button"
              class="rounded p-2 transition hover:bg-white/10 disabled:opacity-40"
              :class="repeatButtonClass"
              :disabled="!canControl"
              :aria-label="repeatLabel"
              @click="cycleRepeatMode"
            >
              <svg
                class="h-6 w-6"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m17 2 4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="m7 22-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                <text
                  v-if="repeatMode === 'one'"
                  x="15.5"
                  y="11"
                  font-size="7"
                  fill="currentColor"
                  stroke="none"
                >
                  1
                </text>
              </svg>
            </button>

            <label class="ml-auto flex min-w-36 items-center gap-2 text-xs text-ts-muted">
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polygon points="11,5 6,9 3,9 3,15 6,15 11,19" />
                <path d="M15 9a5 5 0 0 1 0 6" />
                <path d="M18.5 6.5a9 9 0 0 1 0 11" />
              </svg>
              <span>{{ t('player.volume') }}</span>
              <input
                data-testid="music-player-volume"
                type="range"
                min="0"
                max="100"
                step="1"
                :value="volumePercent"
                class="h-2 w-full cursor-pointer appearance-none rounded bg-white/15 accent-ts-accent"
                :disabled="!canControl"
                @input="onVolumeChange"
              >
            </label>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
