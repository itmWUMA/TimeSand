<script setup lang="ts">
import type { StorageInfo } from '../services/settings'
import type { Album } from '../types/album'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { TsButton, TsSelect } from '../components/ui'
import { useSoundEffects } from '../composables/useSoundEffects'
import { listAlbums } from '../services/album'
import { getStorageInfo } from '../services/settings'
import {
  DRAW_ANIMATION_SPEED_OPTIONS,
  DRAW_NEARBY_DAYS_OPTIONS,
  SLIDESHOW_INTERVAL_OPTIONS,
  useSettingsStore,
} from '../stores/settings'
import { DRAW_WEIGHT_MODES } from '../types/draw'

const settingsStore = useSettingsStore()
const soundEffects = useSoundEffects()
const { t, locale } = useI18n()

const loadingStorage = ref(false)
const storageInfo = ref<StorageInfo | null>(null)
const errorMessage = ref<string | null>(null)
const loadingAlbums = ref(false)
const albums = ref<Album[]>([])
const sfxVolumePercent = ref(Math.round(soundEffects.getVolume() * 100))

const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.1.0'
const localeOptions = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en', label: 'English' },
] as const

const slideshowInterval = computed({
  get: () => settingsStore.getInterval(),
  set: (value: number) => settingsStore.setInterval(value),
})

const selectedLocale = computed({
  get: () => locale.value as 'zh-CN' | 'en',
  set: (selected: string) => {
    if (selected !== 'zh-CN' && selected !== 'en') {
      return
    }

    locale.value = selected
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ts-locale', selected)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = selected
    }
  },
})

const drawWeightModeOptions = computed(() =>
  DRAW_WEIGHT_MODES.map(mode => ({
    value: mode,
    label: t(`settings.drawWeight.${mode}`),
  })),
)

const drawWeightModeValue = computed({
  get: () => settingsStore.drawWeightMode,
  set: (mode: string) => settingsStore.setDrawWeightMode(mode as (typeof DRAW_WEIGHT_MODES)[number]),
})

const drawNearbyDaysOptions = computed(() =>
  [
    { value: String(DRAW_NEARBY_DAYS_OPTIONS[0]), label: t('settings.drawNearbyDays.one') },
    { value: String(DRAW_NEARBY_DAYS_OPTIONS[1]), label: t('settings.drawNearbyDays.three') },
    { value: String(DRAW_NEARBY_DAYS_OPTIONS[2]), label: t('settings.drawNearbyDays.seven') },
  ],
)

const drawNearbyDaysValue = computed({
  get: () => String(settingsStore.drawNearbyDays),
  set: (days: string) => settingsStore.setDrawNearbyDays(Number.parseInt(days, 10)),
})

const drawAnimationSpeedOptions = computed(() =>
  [
    { value: String(DRAW_ANIMATION_SPEED_OPTIONS[0]), label: t('settings.drawAnimSpeed.fast') },
    { value: String(DRAW_ANIMATION_SPEED_OPTIONS[1]), label: t('settings.drawAnimSpeed.standard') },
    { value: String(DRAW_ANIMATION_SPEED_OPTIONS[2]), label: t('settings.drawAnimSpeed.relaxed') },
  ],
)

const drawAnimationSpeedValue = computed({
  get: () => String(settingsStore.drawAnimSpeed),
  set: (speed: string) => settingsStore.setDrawAnimSpeed(Number.parseFloat(speed)),
})

const drawDefaultSourceOptions = computed(() => [
  { value: 'all', label: t('settings.allPhotos') },
  ...albums.value.map(album => ({
    value: String(album.id),
    label: album.name,
  })),
])

const drawDefaultAlbumValue = computed({
  get: () => settingsStore.drawDefaultAlbumId == null ? 'all' : String(settingsStore.drawDefaultAlbumId),
  set: (albumId: string) => {
    if (albumId === 'all') {
      settingsStore.setDrawDefaultAlbumId(null)
      return
    }

    const parsed = Number.parseInt(albumId, 10)
    settingsStore.setDrawDefaultAlbumId(Number.isNaN(parsed) ? null : parsed)
  },
})

const isSfxMuted = computed(() => soundEffects.isMuted.value)

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

async function loadStorageInfo(): Promise<void> {
  loadingStorage.value = true
  errorMessage.value = null

  try {
    storageInfo.value = await getStorageInfo()
  }
  catch {
    errorMessage.value = t('settings.loadFailed')
  }
  finally {
    loadingStorage.value = false
  }
}

async function loadAlbums(): Promise<void> {
  loadingAlbums.value = true
  try {
    const payload = await listAlbums()
    albums.value = payload.items
    if (
      settingsStore.drawDefaultAlbumId != null
      && !payload.items.some(album => album.id === settingsStore.drawDefaultAlbumId)
    ) {
      settingsStore.setDrawDefaultAlbumId(null)
    }
  }
  catch {
    albums.value = []
  }
  finally {
    loadingAlbums.value = false
  }
}

function onSfxVolumeInput(event: Event): void {
  const target = event.target as HTMLInputElement
  const raw = Number.parseInt(target.value, 10)
  if (Number.isNaN(raw)) {
    return
  }

  const nextValue = Math.min(100, Math.max(0, raw))
  sfxVolumePercent.value = nextValue
  soundEffects.setVolume(nextValue / 100)
}

function toggleSfxMute(): void {
  if (soundEffects.isMuted.value) {
    soundEffects.unmute()
    return
  }

  soundEffects.mute()
}

onMounted(async () => {
  await Promise.all([
    loadStorageInfo(),
    loadAlbums(),
  ])
})
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold text-ts-accent">
        {{ $t('settings.title') }}
      </h1>
      <p class="text-ts-muted">
        {{ $t('settings.description') }}
      </p>
    </header>

    <p v-if="errorMessage" class="rounded border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {{ errorMessage }}
    </p>

    <section
      data-testid="settings-storage-section"
      class="space-y-4 rounded-xl border border-white/10 bg-ts-panel p-4"
    >
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-ts-accent">
          {{ $t('settings.storageInfo') }}
        </h2>
        <button
          type="button"
          class="rounded border border-white/25 px-3 py-1 text-xs text-ts-muted transition hover:border-white/40 hover:text-ts-text"
          @click="loadStorageInfo"
        >
          {{ $t('settings.refresh') }}
        </button>
      </div>

      <p
        v-if="loadingStorage"
        class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3 text-sm text-ts-muted"
      >
        {{ $t('settings.loadingStorage') }}
      </p>

      <div v-else-if="storageInfo" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3">
          <p class="text-xs uppercase tracking-wide text-ts-muted">
            {{ $t('settings.photos') }}
          </p>
          <p class="mt-1 text-lg font-semibold text-ts-text">
            {{ storageInfo.photo_count }}
          </p>
        </article>
        <article class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3">
          <p class="text-xs uppercase tracking-wide text-ts-muted">
            {{ $t('settings.musicTracks') }}
          </p>
          <p class="mt-1 text-lg font-semibold text-ts-text">
            {{ storageInfo.music_count }}
          </p>
        </article>
        <article class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3">
          <p class="text-xs uppercase tracking-wide text-ts-muted">
            {{ $t('settings.thumbnails') }}
          </p>
          <p class="mt-1 text-lg font-semibold text-ts-text">
            {{ storageInfo.thumbnail_count }}
          </p>
        </article>
        <article class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3">
          <p class="text-xs uppercase tracking-wide text-ts-muted">
            {{ $t('settings.photoStorage') }}
          </p>
          <p class="mt-1 text-sm font-semibold text-ts-text">
            {{ formatBytes(storageInfo.photo_storage_bytes) }}
          </p>
        </article>
        <article class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3">
          <p class="text-xs uppercase tracking-wide text-ts-muted">
            {{ $t('settings.musicStorage') }}
          </p>
          <p class="mt-1 text-sm font-semibold text-ts-text">
            {{ formatBytes(storageInfo.music_storage_bytes) }}
          </p>
        </article>
        <article class="rounded border border-ts-accent/45 bg-ts-panelSoft px-3 py-3">
          <p class="text-xs uppercase tracking-wide text-ts-muted">
            {{ $t('settings.totalStorage') }}
          </p>
          <p class="mt-1 text-sm font-semibold text-ts-accent">
            {{ formatBytes(storageInfo.total_storage_bytes) }}
          </p>
        </article>
      </div>
    </section>

    <section class="space-y-3 rounded-xl border border-white/10 bg-ts-panel p-4">
      <h2 class="text-xl font-semibold text-ts-accent">
        {{ $t('settings.slideshowDefaults') }}
      </h2>
      <p class="text-sm text-ts-muted">
        {{ $t('settings.slideshowDesc') }}
      </p>
      <label class="flex max-w-xs items-center justify-between gap-3 text-sm text-ts-text">
        <span>{{ $t('settings.defaultInterval') }}</span>
        <select
          v-model.number="slideshowInterval"
          data-testid="settings-interval-select"
          class="w-28 rounded border border-white/15 bg-ts-panelSoft px-3 py-2 text-sm text-ts-text outline-none focus:border-ts-accent"
        >
          <option v-for="option in SLIDESHOW_INTERVAL_OPTIONS" :key="option" :value="option">
            {{ option }}s
          </option>
        </select>
      </label>
    </section>

    <section class="space-y-3 rounded-xl border border-white/10 bg-ts-panel p-4">
      <h2 class="text-xl font-semibold text-ts-accent">
        {{ $t('settings.languageSection') }}
      </h2>
      <p class="text-sm text-ts-muted">
        {{ $t('settings.languageDescription') }}
      </p>
      <div class="max-w-xs">
        <TsSelect
          v-model="selectedLocale"
          :label="$t('settings.language')"
          :options="[...localeOptions]"
        />
      </div>
    </section>

    <section class="space-y-4 rounded-xl border border-white/10 bg-ts-panel p-4">
      <h2 class="text-xl font-semibold text-ts-accent">
        {{ $t('settings.cardDraw') }}
      </h2>

      <div class="grid gap-3 md:grid-cols-2">
        <TsSelect
          v-model="drawWeightModeValue"
          :label="$t('settings.timeWeighting')"
          :options="drawWeightModeOptions"
        />
        <TsSelect
          v-model="drawNearbyDaysValue"
          :label="$t('settings.nearbyDateRange')"
          :options="drawNearbyDaysOptions"
        />
        <TsSelect
          v-model="drawAnimationSpeedValue"
          :label="$t('settings.animationSpeed')"
          :options="drawAnimationSpeedOptions"
        />
        <TsSelect
          v-model="drawDefaultAlbumValue"
          :label="$t('settings.defaultSource')"
          :disabled="loadingAlbums"
          :options="drawDefaultSourceOptions"
        />
      </div>
    </section>

    <section class="space-y-4 rounded-xl border border-white/10 bg-ts-panel p-4">
      <h2 class="text-xl font-semibold text-ts-accent">
        {{ $t('settings.soundEffects') }}
      </h2>

      <div class="space-y-2">
        <label class="text-sm text-ts-text">{{ $t('settings.volume') }}</label>
        <div class="flex max-w-md items-center gap-3">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            :value="sfxVolumePercent"
            class="h-2 w-full cursor-pointer accent-ts-accent"
            @input="onSfxVolumeInput"
          >
          <span class="w-14 text-right text-sm text-ts-muted">{{ sfxVolumePercent }}%</span>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-sm text-ts-text">{{ $t('settings.mute') }}</span>
        <TsButton
          size="sm"
          variant="ghost"
          :class="isSfxMuted ? 'text-ts-accent' : 'text-ts-muted'"
          @click="toggleSfxMute"
        >
          {{ isSfxMuted ? $t('settings.switchOn') : $t('settings.switchOff') }}
        </TsButton>
      </div>
    </section>

    <section class="space-y-2 rounded-xl border border-white/10 bg-ts-panel p-4">
      <h2 class="text-xl font-semibold text-ts-accent">
        {{ $t('settings.about') }}
      </h2>
      <p class="text-sm text-ts-text">
        {{ $t('app.name') }}
      </p>
      <p class="text-sm text-ts-muted">
        {{ $t('settings.version', { version: appVersion }) }}
      </p>
      <a
        href="https://github.com/itmWUMA/TimeSand"
        target="_blank"
        rel="noreferrer"
        class="inline-flex w-fit rounded border border-ts-accent/60 px-3 py-1.5 text-sm font-medium text-ts-accent transition hover:bg-ts-accent hover:text-black"
      >
        {{ $t('settings.github') }}
      </a>
    </section>
  </section>
</template>
