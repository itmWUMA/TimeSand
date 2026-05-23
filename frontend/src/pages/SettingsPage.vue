<script setup lang="ts">
import type { StorageInfo } from '../services/settings'
import type { Album } from '../types/album'
import type { DrawWeightMode } from '../types/draw'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { TsDialog } from '../components/ui'
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

interface SectionLink {
  id: 'storage' | 'backup' | 'draw' | 'playback' | 'i18n' | 'about'
  labelKey: string
}

interface StorageLegendRow {
  id: string
  label: string
  meta: string
  bytes: number
  swatch: string
}

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
const activeSection = ref<SectionLink['id']>('storage')

const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.1.0'
const circleCircumference = 302
const localeOptions = ['zh-CN', 'en'] as const
const sectionLinks: SectionLink[] = [
  { id: 'storage', labelKey: 'settings.sections.storage' },
  { id: 'backup', labelKey: 'settings.sections.backup' },
  { id: 'draw', labelKey: 'settings.sections.draw' },
  { id: 'playback', labelKey: 'settings.sections.playback' },
  { id: 'i18n', labelKey: 'settings.sections.i18n' },
  { id: 'about', labelKey: 'settings.sections.about' },
]

const slideshowInterval = computed({
  get: () => settingsStore.getInterval(),
  set: (value: number) => settingsStore.setInterval(value),
})

const drawWeightModeValue = computed({
  get: () => settingsStore.drawWeightMode,
  set: (mode: DrawWeightMode) => settingsStore.setDrawWeightMode(mode),
})

const drawNearbyDaysValue = computed({
  get: () => settingsStore.drawNearbyDays,
  set: (days: number) => settingsStore.setDrawNearbyDays(days),
})

const drawAnimationSpeedValue = computed({
  get: () => settingsStore.drawAnimSpeed,
  set: (speed: number) => settingsStore.setDrawAnimSpeed(speed),
})

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
const storageTotalBytes = computed(() => storageInfo.value?.total_storage_bytes ?? 0)
const thumbnailStorageBytes = computed(() => {
  if (!storageInfo.value) {
    return 0
  }

  return Math.max(
    storageInfo.value.total_storage_bytes
    - storageInfo.value.photo_storage_bytes
    - storageInfo.value.music_storage_bytes,
    0,
  )
})

const storageLegendRows = computed<StorageLegendRow[]>(() => {
  const info = storageInfo.value
  if (!info) {
    return []
  }

  return [
    {
      id: 'photos',
      label: t('settings.photos'),
      meta: t('common.photos', { count: info.photo_count }),
      bytes: info.photo_storage_bytes,
      swatch: 'var(--ts-accent)',
    },
    {
      id: 'music',
      label: t('settings.musicTracks'),
      meta: t('common.tracks', { count: info.music_count }),
      bytes: info.music_storage_bytes,
      swatch: 'oklch(60% 0.08 30)',
    },
    {
      id: 'thumbnails',
      label: t('settings.thumbnails'),
      meta: t('settings.thumbnailMeta', { count: info.thumbnail_count }),
      bytes: thumbnailStorageBytes.value,
      swatch: 'oklch(50% 0.04 80)',
    },
    {
      id: 'total',
      label: t('settings.totalStorage'),
      meta: t('settings.dataDirectory'),
      bytes: info.total_storage_bytes,
      swatch: 'var(--ts-border)',
    },
  ]
})

const storageSegments = computed(() => {
  const total = storageTotalBytes.value
  if (total <= 0 || !storageInfo.value) {
    return [
      { id: 'photos', length: 0, offset: 0, color: 'var(--ts-accent)' },
      { id: 'music', length: 0, offset: 0, color: 'oklch(60% 0.08 30)' },
      { id: 'thumbnails', length: 0, offset: 0, color: 'oklch(50% 0.04 80)' },
    ]
  }

  const photoLength = Math.round((storageInfo.value.photo_storage_bytes / total) * circleCircumference)
  const musicLength = Math.round((storageInfo.value.music_storage_bytes / total) * circleCircumference)
  const thumbnailLength = Math.max(circleCircumference - photoLength - musicLength, 0)

  return [
    { id: 'photos', length: photoLength, offset: 0, color: 'var(--ts-accent)' },
    { id: 'music', length: musicLength, offset: -photoLength, color: 'oklch(60% 0.08 30)' },
    { id: 'thumbnails', length: thumbnailLength, offset: -(photoLength + musicLength), color: 'oklch(50% 0.04 80)' },
  ]
})

const storagePercent = computed(() => storageTotalBytes.value > 0 ? 100 : 0)
const exportStatus = computed(() => {
  if (isExportingBackup.value) {
    return t('settings.backup.downloadProgress', { progress: exportBackupProgress.value })
  }

  return t('settings.backup.exportStat')
})
const importStatus = computed(() => {
  if (isImportingBackup.value) {
    return t('settings.backup.uploadProgress', { progress: importBackupProgress.value })
  }

  return t('settings.backup.importStat')
})

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

function drawNearbyDaysLabel(days: number): string {
  if (days === 1) {
    return t('settings.drawNearbyDays.one')
  }
  if (days === 7) {
    return t('settings.drawNearbyDays.seven')
  }

  return t('settings.drawNearbyDays.three')
}

function drawAnimationSpeedLabel(speed: number): string {
  if (speed === 0.6) {
    return t('settings.drawAnimSpeed.fast')
  }
  if (speed === 1.5) {
    return t('settings.drawAnimSpeed.relaxed')
  }

  return t('settings.drawAnimSpeed.standard')
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

function setLocale(nextLocale: 'zh-CN' | 'en'): void {
  locale.value = nextLocale
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('ts-locale', nextLocale)
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = nextLocale
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
  <section class="settings-page">
    <header class="page-head">
      <div>
        <div class="h-eyebrow">
          {{ $t('settings.eyebrow') }}
        </div>
        <h1 class="h-title">
          {{ $t('settings.title') }}
        </h1>
        <p class="h-sub">
          {{ $t('settings.description') }}
          <code>/data</code>
        </p>
      </div>
      <span class="chip">{{ $t('settings.versionChip', { version: appVersion }) }}</span>
    </header>

    <p v-if="errorMessage" class="settings-alert">
      {{ errorMessage }}
    </p>

    <div class="set-layout">
      <nav data-testid="settings-side-nav" class="set-side" :aria-label="$t('settings.groupNav')">
        <div class="label">
          {{ $t('settings.groupLabel') }}
        </div>
        <a
          v-for="section in sectionLinks"
          :key="section.id"
          :href="`#${section.id}`"
          :class="{ 'is-on': activeSection === section.id }"
          @click="activeSection = section.id"
        >
          {{ $t(section.labelKey) }}
        </a>
      </nav>

      <div class="set-content">
        <section id="storage" data-testid="settings-storage-section" class="sect">
          <div class="sect-head">
            <h2 class="sect-h">
              {{ $t('settings.sections.storage') }}
            </h2>
            <span class="sect-num">
              {{ storageInfo ? $t('settings.storageSummary', { used: formatBytes(storageTotalBytes) }) : $t('settings.loadingStorage') }}
            </span>
          </div>

          <div class="storage">
            <div class="donut" aria-hidden="true">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="48" fill="none" stroke="var(--ts-border)" stroke-width="14" />
                <circle
                  v-for="segment in storageSegments"
                  :key="segment.id"
                  cx="60"
                  cy="60"
                  r="48"
                  fill="none"
                  :stroke="segment.color"
                  stroke-width="14"
                  :stroke-dasharray="`${segment.length} ${circleCircumference}`"
                  :stroke-dashoffset="segment.offset"
                />
              </svg>
              <div class="donut-center">
                <div>
                  <div class="pct">
                    {{ storagePercent }}<span>%</span>
                  </div>
                  <div class="lbl">
                    {{ $t('settings.storageUsedLabel') }}
                  </div>
                </div>
              </div>
            </div>

            <p v-if="loadingStorage" class="storage-state">
              {{ $t('settings.loadingStorage') }}
            </p>
            <div v-else-if="storageInfo" class="legend">
              <div v-for="row in storageLegendRows" :key="row.id" class="legend-row">
                <span class="swatch" :style="{ background: row.swatch }" />
                <div>
                  <div class="name">
                    {{ row.label }}
                  </div>
                  <div class="meta num">
                    {{ row.meta }}
                  </div>
                </div>
                <span class="meta num">{{ formatBytes(row.bytes) }}</span>
              </div>
            </div>
            <p v-else class="storage-state">
              {{ $t('settings.noStorageData') }}
            </p>
          </div>
        </section>

        <section id="backup" data-testid="settings-backup-section" class="sect">
          <div class="sect-head">
            <h2 class="sect-h">
              {{ $t('settings.sections.backup') }}
            </h2>
            <span class="sect-num">{{ $t('settings.backup.meta') }}</span>
          </div>

          <div class="data-row">
            <article class="data-card">
              <div class="data-eye">
                {{ $t('settings.backup.exportEyebrow') }}
              </div>
              <div class="data-h">
                {{ $t('settings.backup.exportTitle') }}
              </div>
              <p class="data-desc">
                {{ $t('settings.backup.exportDescription') }}
              </p>
              <div v-if="isExportingBackup" class="progress-line">
                <span :style="{ width: `${exportBackupProgress}%` }" />
              </div>
              <div class="data-foot">
                <span class="data-stat">{{ exportStatus }}</span>
                <button
                  type="button"
                  class="btn btn-primary"
                  :disabled="isExportingBackup || isImportingBackup"
                  @click="onExportBackup"
                >
                  {{ isExportingBackup ? $t('settings.backup.exporting') : $t('settings.backup.exportAction') }}
                </button>
              </div>
            </article>

            <article class="data-card danger">
              <div class="data-eye">
                {{ $t('settings.backup.importEyebrow') }}
              </div>
              <div class="data-h">
                {{ $t('settings.backup.importTitle') }}
              </div>
              <p class="data-desc">
                <strong>{{ $t('settings.backup.importWarningLead') }}</strong>
                {{ $t('settings.backup.importDescription') }}
              </p>
              <div v-if="isImportingBackup" class="progress-line">
                <span :style="{ width: `${importBackupProgress}%` }" />
              </div>
              <div class="data-foot">
                <span class="data-stat">{{ importStatus }}</span>
                <button
                  type="button"
                  class="btn btn-danger"
                  :disabled="isExportingBackup || isImportingBackup"
                  @click="onImportBackupClick"
                >
                  {{ isImportingBackup ? $t('settings.backup.restoring') : $t('settings.backup.importAction') }}
                </button>
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

        <section id="draw" class="sect">
          <div class="sect-head">
            <h2 class="sect-h">
              {{ $t('settings.sections.draw') }}
            </h2>
            <span class="sect-num">{{ $t('settings.drawSubtitle') }}</span>
          </div>

          <div class="pref">
            <div class="pref-row">
              <div>
                <div class="pref-name">
                  {{ $t('settings.weightEnabled') }}
                </div>
                <div class="pref-help">
                  {{ $t('settings.weightEnabledHelp') }}
                </div>
              </div>
              <div class="pref-control">
                <button
                  type="button"
                  class="switch"
                  :class="{ 'is-on': drawWeightModeValue !== 'off' }"
                  :aria-pressed="drawWeightModeValue !== 'off'"
                  :aria-label="$t('settings.weightEnabled')"
                  @click="drawWeightModeValue = drawWeightModeValue === 'off' ? 'standard' : 'off'"
                />
              </div>
            </div>

            <div class="pref-row">
              <div>
                <div class="pref-name">
                  {{ $t('settings.weightStrength') }}
                </div>
                <div class="pref-help">
                  {{ $t('settings.weightStrengthHelp') }}
                </div>
              </div>
              <div class="pref-control">
                <div class="seg" role="group" :aria-label="$t('settings.weightStrength')">
                  <button
                    v-for="mode in DRAW_WEIGHT_MODES.filter(item => item !== 'off')"
                    :key="mode"
                    :data-testid="`settings-draw-weight-${mode}`"
                    type="button"
                    :class="{ 'is-on': drawWeightModeValue === mode }"
                    :aria-pressed="drawWeightModeValue === mode"
                    @click="drawWeightModeValue = mode"
                  >
                    {{ $t(`settings.drawWeight.${mode}`) }}
                  </button>
                </div>
              </div>
            </div>

            <div class="pref-row">
              <div>
                <div class="pref-name">
                  {{ $t('settings.dateRange') }}
                </div>
                <div class="pref-help">
                  {{ $t('settings.dateRangeHelp') }}
                </div>
              </div>
              <div class="pref-control">
                <div class="seg" role="group" :aria-label="$t('settings.dateRange')">
                  <button
                    v-for="days in DRAW_NEARBY_DAYS_OPTIONS"
                    :key="days"
                    :data-testid="`settings-nearby-days-${days}`"
                    type="button"
                    :class="{ 'is-on': drawNearbyDaysValue === days }"
                    :aria-pressed="drawNearbyDaysValue === days"
                    @click="drawNearbyDaysValue = days"
                  >
                    {{ drawNearbyDaysLabel(days) }}
                  </button>
                </div>
              </div>
            </div>

            <div class="pref-row">
              <div>
                <div class="pref-name">
                  {{ $t('settings.animationSpeed') }}
                </div>
                <div class="pref-help">
                  {{ $t('settings.animationSpeedHelp') }}
                </div>
              </div>
              <div class="pref-control">
                <div class="seg" role="group" :aria-label="$t('settings.animationSpeed')">
                  <button
                    v-for="speed in DRAW_ANIMATION_SPEED_OPTIONS"
                    :key="speed"
                    type="button"
                    :class="{ 'is-on': drawAnimationSpeedValue === speed }"
                    :aria-pressed="drawAnimationSpeedValue === speed"
                    @click="drawAnimationSpeedValue = speed"
                  >
                    {{ drawAnimationSpeedLabel(speed) }}
                  </button>
                </div>
              </div>
            </div>

            <div class="pref-row">
              <div>
                <div class="pref-name">
                  {{ $t('settings.defaultSource') }}
                </div>
                <div class="pref-help">
                  {{ $t('settings.defaultSourceHelp') }}
                </div>
              </div>
              <div class="pref-control">
                <select v-model="drawDefaultAlbumValue" class="pref-select" :disabled="loadingAlbums">
                  <option value="all">
                    {{ $t('settings.allPhotos') }}
                  </option>
                  <option v-for="album in albums" :key="album.id" :value="String(album.id)">
                    {{ album.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section id="playback" class="sect">
          <div class="sect-head">
            <h2 class="sect-h">
              {{ $t('settings.sections.playback') }}
            </h2>
            <span class="sect-num">{{ $t('settings.playbackSubtitle') }}</span>
          </div>

          <div class="pref">
            <div class="pref-row">
              <div>
                <div class="pref-name">
                  {{ $t('settings.defaultInterval') }}
                </div>
                <div class="pref-help">
                  {{ $t('settings.slideshowDesc') }}
                </div>
              </div>
              <div class="pref-control">
                <div class="seg" role="group" :aria-label="$t('settings.defaultInterval')">
                  <button
                    v-for="option in SLIDESHOW_INTERVAL_OPTIONS"
                    :key="option"
                    :data-testid="`settings-slideshow-interval-${option}`"
                    type="button"
                    :class="{ 'is-on': slideshowInterval === option }"
                    :aria-pressed="slideshowInterval === option"
                    @click="slideshowInterval = option"
                  >
                    {{ option }}s
                  </button>
                </div>
              </div>
            </div>

            <div class="pref-row">
              <div>
                <div class="pref-name">
                  {{ $t('settings.volume') }}
                </div>
                <div class="pref-help">
                  {{ $t('settings.volumeHelp') }}
                </div>
              </div>
              <div class="pref-control">
                <div class="slider-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    :value="sfxVolumePercent"
                    class="native-slider"
                    :aria-label="$t('settings.volume')"
                    @input="onSfxVolumeInput"
                  >
                  <span class="slider-num">{{ sfxVolumePercent }}%</span>
                </div>
              </div>
            </div>

            <div class="pref-row">
              <div>
                <div class="pref-name">
                  {{ $t('settings.mute') }}
                </div>
                <div class="pref-help">
                  {{ $t('settings.muteHelp') }}
                </div>
              </div>
              <div class="pref-control">
                <button
                  type="button"
                  class="switch"
                  :class="{ 'is-on': !isSfxMuted }"
                  :aria-pressed="!isSfxMuted"
                  :aria-label="$t('settings.mute')"
                  @click="toggleSfxMute"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="i18n" class="sect">
          <div class="sect-head">
            <h2 class="sect-h">
              {{ $t('settings.sections.i18n') }}
            </h2>
            <span class="sect-num">{{ $t('settings.i18nSubtitle') }}</span>
          </div>

          <div class="pref">
            <div class="pref-row">
              <div>
                <div class="pref-name">
                  {{ $t('settings.language') }}
                </div>
                <div class="pref-help">
                  {{ $t('settings.languageDescription') }}
                </div>
              </div>
              <div class="pref-control">
                <div class="seg" role="group" :aria-label="$t('settings.language')">
                  <button
                    v-for="option in localeOptions"
                    :key="option"
                    :data-testid="`settings-locale-${option}`"
                    type="button"
                    :class="{ 'is-on': locale === option }"
                    :aria-pressed="locale === option"
                    @click="setLocale(option)"
                  >
                    {{ $t(`settings.locale.${option}`) }}
                  </button>
                </div>
              </div>
            </div>

            <div class="pref-row">
              <div>
                <div class="pref-name">
                  {{ $t('settings.demoData') }}
                </div>
                <div class="pref-help">
                  {{ $t('settings.demoDataHelp') }}
                </div>
              </div>
              <div class="pref-control">
                <span class="chip">{{ $t('settings.demoDataState') }}</span>
              </div>
            </div>
          </div>
        </section>

        <section id="about" class="sect about-sect">
          <div class="sect-head">
            <h2 class="sect-h">
              {{ $t('settings.sections.about') }}
            </h2>
          </div>

          <div class="about">
            <div class="about-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 3h12M6 21h12" />
                <path d="M7 3c0 4 5 5.5 5 9s-5 5-5 9" />
                <path d="M17 3c0 4-5 5.5-5 9s5 5 5 9" />
                <line x1="9" y1="11" x2="15" y2="11" />
              </svg>
            </div>
            <div>
              <div class="about-name">
                {{ $t('settings.aboutName', { version: appVersion }) }}
              </div>
              <div class="about-meta">
                {{ $t('settings.aboutMeta') }}
              </div>
            </div>
            <div class="about-actions">
              <a class="btn" href="https://github.com/itmWUMA/TimeSand" target="_blank" rel="noreferrer">
                {{ $t('settings.github') }}
              </a>
              <span class="btn btn-ghost">{{ $t('settings.deploymentBadge') }}</span>
            </div>
          </div>

          <dl class="decision-grid" :aria-label="$t('settings.projectDecisions')">
            <div>
              <dt>{{ $t('settings.decisions.network') }}</dt>
              <dd>axios</dd>
            </div>
            <div>
              <dt>{{ $t('settings.decisions.deployment') }}</dt>
              <dd>{{ $t('settings.decisions.deploymentValue') }}</dd>
            </div>
            <div>
              <dt>{{ $t('settings.decisions.auth') }}</dt>
              <dd>{{ $t('settings.decisions.authValue') }}</dd>
            </div>
            <div>
              <dt>{{ $t('settings.decisions.browser') }}</dt>
              <dd>Chrome 110+ / iOS Safari 16+</dd>
            </div>
            <div>
              <dt>{{ $t('settings.decisions.heic') }}</dt>
              <dd>{{ $t('settings.decisions.heicValue') }}</dd>
            </div>
            <div>
              <dt>{{ $t('settings.decisions.upload') }}</dt>
              <dd>{{ $t('settings.decisions.uploadValue') }}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>

    <TsDialog
      :open="isRestoreDialogOpen"
      :title="$t('settings.backup.confirmTitle')"
      :description="$t('settings.backup.confirmDescription')"
      @update:open="onRestoreDialogOpenChange"
    >
      <div data-testid="settings-restore-dialog" class="restore-dialog">
        <p class="restore-warning">
          {{ $t('settings.backup.confirmWarning') }}
        </p>
        <p class="restore-file">
          {{ $t('settings.backup.selectedFile', { filename: selectedBackupFilename || '-' }) }}
        </p>

        <div v-if="isImportingBackup" class="progress-line">
          <span :style="{ width: `${importBackupProgress}%` }" />
        </div>

        <p class="restore-hint">
          {{ $t('settings.backup.restartHint') }}
        </p>

        <div class="restore-actions">
          <button type="button" class="btn btn-ghost" :disabled="isImportingBackup" @click="closeRestoreDialog">
            {{ $t('common.cancel') }}
          </button>
          <button type="button" class="btn btn-primary" :disabled="isImportingBackup || !selectedBackupFile" @click="onConfirmRestoreBackup">
            {{ isImportingBackup ? $t('settings.backup.restoring') : $t('settings.backup.confirmAction') }}
          </button>
        </div>
      </div>
    </TsDialog>
  </section>
</template>

<style scoped>
.settings-page {
  padding-bottom: 24px;
}

.h-sub code {
  color: var(--ts-accent);
  font-family: var(--ts-font-mono);
}

.settings-alert {
  margin-bottom: 18px;
  border: 1px solid rgb(248 113 113 / 40%);
  border-radius: var(--ts-radius);
  background: rgb(239 68 68 / 10%);
  color: rgb(254 202 202);
  padding: 12px 16px;
  font-size: 14px;
}

.set-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 36px;
}

.set-side {
  position: sticky;
  top: 32px;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.set-side a {
  border-radius: 8px;
  color: var(--ts-fg-soft);
  font-size: 13.5px;
  padding: 8px 12px;
  transition:
    background var(--ts-duration-fast) var(--ts-ease),
    color var(--ts-duration-fast) var(--ts-ease);
}

.set-side a:hover {
  background: var(--ts-surface);
  color: var(--ts-fg);
}

.set-side a.is-on {
  position: relative;
  background: var(--ts-surface-2);
  color: var(--ts-fg);
}

.set-side a.is-on::before {
  content: "";
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 0;
  width: 2px;
  background: var(--ts-accent);
}

.set-side .label {
  color: var(--ts-muted-2);
  font-family: var(--ts-font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  padding: 14px 12px 4px;
  text-transform: uppercase;
}

.sect {
  margin-bottom: 48px;
  scroll-margin-top: 32px;
}

.sect-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--ts-border-soft);
  padding-bottom: 12px;
}

.sect-h {
  font-family: var(--ts-font-display);
  font-size: 24px;
  font-weight: 500;
}

.sect-num {
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-align: right;
  text-transform: uppercase;
}

.storage {
  display: grid;
  grid-template-columns: 240px 1fr;
  align-items: center;
  gap: 32px;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-lg);
  background: var(--ts-surface);
  padding: 26px;
}

.donut {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 0 auto;
}

.donut svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.donut-center {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  text-align: center;
}

.pct {
  color: var(--ts-fg);
  font-family: var(--ts-font-display);
  font-size: 38px;
  font-weight: 500;
  line-height: 1;
}

.pct span {
  color: var(--ts-muted);
  font-size: 18px;
}

.lbl {
  margin-top: 6px;
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 24px;
}

.legend-row {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 10px;
}

.swatch {
  width: 12px;
  height: 12px;
  align-self: center;
  border-radius: 3px;
}

.name {
  font-size: 13px;
}

.meta,
.storage-state {
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0;
}

.data-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.data-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-lg);
  background: var(--ts-surface);
  padding: 22px;
}

.data-card.danger {
  border-color: oklch(35% 0.07 25);
  background:
    linear-gradient(135deg, oklch(20% 0.04 25) 0%, var(--ts-surface) 60%);
}

.data-eye {
  color: var(--ts-accent);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.danger .data-eye,
.danger strong {
  color: oklch(78% 0.14 25);
}

.data-h {
  font-family: var(--ts-font-display);
  font-size: 20px;
  font-weight: 500;
}

.data-desc {
  color: var(--ts-fg-soft);
  font-size: 13.5px;
  line-height: 1.55;
}

.data-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
}

.data-stat {
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0;
}

.progress-line {
  height: 4px;
  overflow: hidden;
  border-radius: var(--ts-radius-pill);
  background: var(--ts-border);
}

.progress-line span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--ts-accent);
  transition: width var(--ts-duration-fast) var(--ts-ease);
}

.pref {
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-lg);
  background: var(--ts-surface);
}

.pref-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  align-items: center;
  gap: 22px;
  border-bottom: 1px solid var(--ts-border-soft);
  padding: 18px 22px;
}

.pref-row:last-child {
  border-bottom: 0;
}

.pref-name {
  font-size: 14.5px;
  font-weight: 500;
}

.pref-help {
  margin-top: 4px;
  color: var(--ts-muted);
  font-size: 12.5px;
  line-height: 1.5;
}

.pref-control {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.seg {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0;
  border-radius: var(--ts-radius-pill);
  background: var(--ts-bg-deep);
  padding: 3px;
  font-family: var(--ts-font-mono);
  font-size: 11px;
}

.seg button {
  border: 0;
  border-radius: var(--ts-radius-pill);
  background: transparent;
  color: var(--ts-muted);
  letter-spacing: 0.04em;
  padding: 6px 12px;
  transition:
    background var(--ts-duration-fast) var(--ts-ease),
    color var(--ts-duration-fast) var(--ts-ease);
}

.seg button.is-on {
  background: var(--ts-surface-2);
  color: var(--ts-fg);
}

.switch {
  position: relative;
  width: 38px;
  height: 22px;
  border: 0;
  border-radius: 22px;
  background: var(--ts-border);
  transition: background var(--ts-duration-fast) var(--ts-ease);
}

.switch::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ts-fg);
  transition: left var(--ts-duration-fast) var(--ts-ease), background var(--ts-duration-fast) var(--ts-ease);
}

.switch.is-on {
  background: var(--ts-accent);
}

.switch.is-on::after {
  left: 19px;
  background: var(--ts-bg-deep);
}

.pref-select {
  width: min(240px, 100%);
  border: 1px solid var(--ts-border);
  border-radius: var(--ts-radius);
  background: var(--ts-bg-deep);
  color: var(--ts-fg);
  padding: 8px 12px;
  outline: none;
}

.pref-select:focus {
  border-color: var(--ts-accent);
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.native-slider {
  width: 200px;
  accent-color: var(--ts-accent);
}

.slider-num {
  min-width: 50px;
  color: var(--ts-accent);
  font-family: var(--ts-font-mono);
  font-size: 12px;
  text-align: right;
}

.about {
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr) auto;
  align-items: center;
  gap: 20px;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-lg);
  background: var(--ts-surface);
  padding: 24px;
}

.about-mark {
  display: grid;
  width: 60px;
  height: 60px;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(145deg, var(--ts-accent), var(--ts-accent-deep));
  box-shadow: 0 6px 22px var(--ts-accent-glow);
  color: var(--ts-bg-deep);
}

.about-mark svg {
  width: 28px;
  height: 28px;
}

.about-name {
  font-family: var(--ts-font-display);
  font-size: 20px;
  font-weight: 500;
}

.about-meta {
  margin-top: 4px;
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.about-actions {
  display: flex;
  gap: 10px;
}

.decision-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  margin-top: 14px;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius);
  background: var(--ts-border-soft);
}

.decision-grid div {
  background: var(--ts-surface);
  padding: 14px;
}

.decision-grid dt {
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.decision-grid dd {
  margin: 4px 0 0;
  color: var(--ts-fg-soft);
  font-size: 13px;
}

.restore-dialog {
  display: grid;
  gap: 14px;
}

.restore-warning {
  border: 1px solid rgb(248 113 113 / 40%);
  border-radius: var(--ts-radius);
  background: rgb(239 68 68 / 10%);
  color: rgb(254 202 202);
  padding: 10px 12px;
  font-size: 14px;
}

.restore-file,
.restore-hint {
  color: var(--ts-muted);
  font-size: 13px;
}

.restore-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}

@media (max-width: 880px) {
  .set-layout {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  .set-side {
    position: sticky;
    top: 0;
    z-index: var(--ts-z-sticky);
    flex-direction: row;
    gap: 6px;
    overflow-x: auto;
    border-bottom: 1px solid var(--ts-border-soft);
    background: var(--ts-bg);
    padding: 8px 0;
    -webkit-overflow-scrolling: touch;
  }

  .set-side .label {
    display: none;
  }

  .set-side a {
    flex-shrink: 0;
    border-radius: var(--ts-radius-pill);
    background: var(--ts-surface);
    font-size: 12.5px;
    padding: 8px 14px;
  }

  .set-side a.is-on {
    background: var(--ts-accent-soft);
    color: var(--ts-accent);
  }

  .set-side a.is-on::before {
    display: none;
  }

  .storage {
    grid-template-columns: 1fr;
    gap: 22px;
    padding: 18px;
  }

  .donut {
    width: 160px;
    height: 160px;
  }

  .legend,
  .data-row,
  .decision-grid {
    grid-template-columns: 1fr;
  }

  .pref-row {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 16px 18px;
  }

  .pref-control {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .native-slider {
    width: min(240px, calc(100vw - 120px));
  }

  .sect {
    margin-bottom: 32px;
  }

  .sect-h {
    font-size: 20px;
  }

  .sect-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }

  .sect-num {
    text-align: left;
  }

  .about {
    grid-template-columns: 50px 1fr;
    gap: 14px;
    padding: 18px;
  }

  .about-mark {
    width: 50px;
    height: 50px;
  }

  .about-actions {
    grid-column: 1 / -1;
    justify-self: start;
    flex-wrap: wrap;
  }
}
</style>
