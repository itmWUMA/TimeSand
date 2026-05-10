<script setup lang="ts">
import type { StorageInfo } from '../services/settings'
import type { Album } from '../types/album'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { TsButton, TsDialog, TsSelect } from '../components/ui'
import { useSoundEffects } from '../composables/useSoundEffects'
import { useToast } from '../composables/useToast'
import { listAlbums } from '../services/album'
import { exportBackup, importBackup } from '../services/backup'
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
const { showToast } = useToast()
const { t, locale } = useI18n()

const loadingStorage = ref(false)
const storageInfo = ref<StorageInfo | null>(null)
const errorMessage = ref<string | null>(null)
const loadingAlbums = ref(false)
const albums = ref<Album[]>([])
const sfxVolumePercent = ref(Math.round(soundEffects.getVolume() * 100))
const backupFileInput = ref<HTMLInputElement | null>(null)
const selectedBackupFile = ref<File | null>(null)
const isExportingBackup = ref(false)
const exportBackupProgress = ref(0)
const isImportingBackup = ref(false)
const importBackupProgress = ref(0)
const isRestoreDialogOpen = ref(false)

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
const selectedBackupFilename = computed(() => selectedBackupFile.value?.name ?? '')

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
    settingsStore.setDrawDefaultAlbumId(null)
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

function triggerBrowserDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Delay revoke to ensure download starts on slower browsers
  setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl)
  }, 100)
}

async function onExportBackup(): Promise<void> {
  isExportingBackup.value = true
  exportBackupProgress.value = 0

  try {
    const payload = await exportBackup((progress) => {
      exportBackupProgress.value = progress
    })
    triggerBrowserDownload(payload.blob, payload.filename)
    showToast(t('settings.backup.exportSuccess'), undefined, 'success')
  }
  finally {
    isExportingBackup.value = false
    exportBackupProgress.value = 0
  }
}

function onImportBackupClick(): void {
  backupFileInput.value?.click()
}

function onBackupFileSelected(event: Event): void {
  const target = event.target as HTMLInputElement
  const selected = target.files?.[0]
  target.value = ''

  if (!selected) {
    return
  }

  selectedBackupFile.value = selected
  importBackupProgress.value = 0
  isRestoreDialogOpen.value = true
}

function closeRestoreDialog(): void {
  if (isImportingBackup.value) {
    return
  }

  isRestoreDialogOpen.value = false
  selectedBackupFile.value = null
  importBackupProgress.value = 0
}

function onRestoreDialogOpenChange(value: boolean): void {
  if (value) {
    isRestoreDialogOpen.value = true
    return
  }

  closeRestoreDialog()
}

async function onConfirmRestoreBackup(): Promise<void> {
  const file = selectedBackupFile.value
  if (!file) {
    return
  }

  isImportingBackup.value = true
  importBackupProgress.value = 0

  try {
    const payload = await importBackup(file, (progress) => {
      importBackupProgress.value = progress
    })
    showToast(t('settings.backup.restoreSuccess'), payload.message, 'success', 8000)
    isRestoreDialogOpen.value = false
    selectedBackupFile.value = null
    await loadStorageInfo()
  }
  finally {
    isImportingBackup.value = false
    importBackupProgress.value = 0
  }
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

    <section
      data-testid="settings-backup-section"
      class="space-y-4 rounded-xl border border-white/10 bg-ts-panel p-4"
    >
      <h2 class="text-xl font-semibold text-ts-accent">
        {{ $t('settings.dataManagement') }}
      </h2>
      <p class="text-sm text-ts-muted">
        {{ $t('settings.dataManagementDescription') }}
      </p>

      <div class="grid gap-3 lg:grid-cols-2">
        <article class="space-y-3 rounded border border-white/10 bg-ts-panelSoft px-4 py-4">
          <div class="space-y-1">
            <h3 class="text-sm font-semibold text-ts-text">
              {{ $t('settings.backup.exportTitle') }}
            </h3>
            <p class="text-xs text-ts-muted">
              {{ $t('settings.backup.exportDescription') }}
            </p>
          </div>

          <TsButton
            :disabled="isExportingBackup || isImportingBackup"
            @click="onExportBackup"
          >
            {{ isExportingBackup ? $t('settings.backup.exporting') : $t('settings.backup.exportAction') }}
          </TsButton>

          <div
            v-if="isExportingBackup"
            class="space-y-2 rounded border border-ts-accent/20 bg-black/20 px-3 py-2"
          >
            <p class="text-xs text-ts-muted">
              {{ $t('settings.backup.downloadProgress', { progress: exportBackupProgress }) }}
            </p>
            <div class="h-2 overflow-hidden rounded bg-white/10">
              <div
                class="h-full bg-ts-accent transition-all duration-200"
                :style="{ width: `${exportBackupProgress}%` }"
              />
            </div>
          </div>
        </article>

        <article class="space-y-3 rounded border border-white/10 bg-ts-panelSoft px-4 py-4">
          <div class="space-y-1">
            <h3 class="text-sm font-semibold text-ts-text">
              {{ $t('settings.backup.importTitle') }}
            </h3>
            <p class="text-xs text-ts-muted">
              {{ $t('settings.backup.importDescription') }}
            </p>
          </div>

          <TsButton
            variant="secondary"
            :disabled="isExportingBackup || isImportingBackup"
            @click="onImportBackupClick"
          >
            {{ isImportingBackup ? $t('settings.backup.restoring') : $t('settings.backup.importAction') }}
          </TsButton>

          <div
            v-if="isImportingBackup"
            class="space-y-2 rounded border border-ts-accent/20 bg-black/20 px-3 py-2"
          >
            <p class="text-xs text-ts-muted">
              {{ $t('settings.backup.uploadProgress', { progress: importBackupProgress }) }}
            </p>
            <div class="h-2 overflow-hidden rounded bg-white/10">
              <div
                class="h-full bg-ts-accent transition-all duration-200"
                :style="{ width: `${importBackupProgress}%` }"
              />
            </div>
          </div>
        </article>
      </div>

      <input
        ref="backupFileInput"
        type="file"
        accept=".zip,application/zip"
        class="hidden"
        @change="onBackupFileSelected"
      >
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

    <TsDialog
      :open="isRestoreDialogOpen"
      :title="$t('settings.backup.confirmTitle')"
      :description="$t('settings.backup.confirmDescription')"
      @update:open="onRestoreDialogOpenChange"
    >
      <div
        data-testid="settings-restore-dialog"
        class="space-y-4"
      >
        <p class="rounded border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {{ $t('settings.backup.confirmWarning') }}
        </p>
        <p class="text-sm text-ts-muted">
          {{ $t('settings.backup.selectedFile', { filename: selectedBackupFilename || '-' }) }}
        </p>

        <div v-if="isImportingBackup" class="space-y-2">
          <p class="text-xs text-ts-muted">
            {{ $t('settings.backup.uploadProgress', { progress: importBackupProgress }) }}
          </p>
          <div class="h-2 overflow-hidden rounded bg-white/10">
            <div
              class="h-full bg-ts-accent transition-all duration-200"
              :style="{ width: `${importBackupProgress}%` }"
            />
          </div>
        </div>

        <p class="text-xs text-ts-muted">
          {{ $t('settings.backup.restartHint') }}
        </p>

        <div class="flex items-center justify-end gap-2">
          <TsButton
            variant="ghost"
            :disabled="isImportingBackup"
            @click="closeRestoreDialog"
          >
            {{ $t('common.cancel') }}
          </TsButton>
          <TsButton
            :disabled="isImportingBackup || !selectedBackupFile"
            @click="onConfirmRestoreBackup"
          >
            {{ isImportingBackup ? $t('settings.backup.restoring') : $t('settings.backup.confirmAction') }}
          </TsButton>
        </div>
      </div>
    </TsDialog>
  </section>
</template>
