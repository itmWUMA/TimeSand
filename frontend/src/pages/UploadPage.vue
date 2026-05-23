<script setup lang="ts">
import type { Album } from '../types/album'
import type { Photo } from '../types/photo'

import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PhotoGrid from '../components/PhotoGrid.vue'
import PhotoUploader from '../components/PhotoUploader.vue'
import TsLightbox from '../components/TsLightbox.vue'
import { addPhotosToAlbum, listAlbums } from '../services/album'
import { listPhotos, uploadPhotos } from '../services/photo'

type UploadStatus = 'queued' | 'uploading' | 'done' | 'failed' | 'canceled'

interface UploadQueueItem {
  id: string
  filename: string
  sizeLabel: string
  status: UploadStatus
  progress: number
  file: File
}

const { t } = useI18n()
const photos = ref<Photo[]>([])
const albums = ref<Album[]>([])
const uploading = ref(false)
const progress = ref(0)
const errorMessage = ref<string | null>(null)
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)
const lightboxOrigin = ref<DOMRect | null>(null)
const selectedAlbumId = ref(0)
const uploadQueue = ref<UploadQueueItem[]>([])

let uploadSequence = 0
let activeUploadController: AbortController | null = null

const selectedAlbumName = computed(() => {
  if (selectedAlbumId.value === 0) {
    return null
  }

  return albums.value.find(album => album.id === selectedAlbumId.value)?.name ?? null
})

const recentPhotoCount = computed(() => photos.value.length)
const totalAlbumCount = computed(() => albums.value.length)
const uploadQueueItems = computed(() => uploadQueue.value.map(item => ({
  id: item.id,
  filename: item.filename,
  sizeLabel: item.sizeLabel,
  status: item.status,
  progress: item.progress,
})))

async function loadPhotos(): Promise<void> {
  const payload = await listPhotos(1, 60)
  photos.value = payload.items
}

async function loadAlbums(): Promise<void> {
  const payload = await listAlbums()
  albums.value = payload.items
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function createQueueItem(file: File): UploadQueueItem {
  uploadSequence += 1
  return {
    id: `${Date.now()}-${uploadSequence}`,
    filename: file.name,
    sizeLabel: formatBytes(file.size),
    status: 'queued',
    progress: 0,
    file,
  }
}

function patchQueueItems(ids: string[], patch: Partial<Omit<UploadQueueItem, 'id' | 'file'>>): void {
  const idSet = new Set(ids)
  uploadQueue.value = uploadQueue.value.map((item) => {
    if (!idSet.has(item.id)) {
      return item
    }

    return {
      ...item,
      ...patch,
    }
  })
}

async function runUpload(files: File[], queueIds: string[]): Promise<void> {
  uploading.value = true
  progress.value = 0
  errorMessage.value = null
  activeUploadController = new AbortController()
  patchQueueItems(queueIds, { status: 'uploading', progress: 0 })

  try {
    const uploaded = await uploadPhotos(files, (value) => {
      progress.value = value
      patchQueueItems(queueIds, { progress: value })
    }, activeUploadController.signal)

    if (selectedAlbumId.value > 0 && uploaded.length > 0) {
      await addPhotosToAlbum(selectedAlbumId.value, uploaded.map(photo => photo.id))
    }

    patchQueueItems(queueIds, { status: 'done', progress: 100 })
    photos.value = [...uploaded, ...photos.value]
  }
  catch {
    if (activeUploadController.signal.aborted) {
      patchQueueItems(queueIds, { status: 'canceled', progress: 0 })
      errorMessage.value = t('photo.uploadCanceled')
    }
    else {
      patchQueueItems(queueIds, { status: 'failed' })
      errorMessage.value = t('photo.uploadFailed')
    }
  }
  finally {
    uploading.value = false
    activeUploadController = null
  }
}

async function handleUpload(files: File[]): Promise<void> {
  if (files.length === 0 || uploading.value) {
    return
  }

  const nextItems = files.map(createQueueItem)
  uploadQueue.value = [...nextItems, ...uploadQueue.value]
  await runUpload(files, nextItems.map(item => item.id))
}

function cancelUpload(): void {
  activeUploadController?.abort()
}

async function retryUpload(queueId: string): Promise<void> {
  if (uploading.value) {
    return
  }

  const item = uploadQueue.value.find(entry => entry.id === queueId)
  if (!item) {
    return
  }

  await runUpload([item.file], [item.id])
}

function clearDone(): void {
  uploadQueue.value = uploadQueue.value.filter(item => item.status !== 'done')
}

function onPhotoClick(payload: { index: number, rect: DOMRect }): void {
  lightboxIndex.value = payload.index
  lightboxOrigin.value = payload.rect
  lightboxOpen.value = true
}

onMounted(async () => {
  try {
    await Promise.all([loadPhotos(), loadAlbums()])
  }
  catch {
    errorMessage.value = t('photo.loadFailed')
  }
})
</script>

<template>
  <section
    class="upload-page"
    :style="{ paddingBottom: 'calc(var(--ts-player-main-padding, 5rem) + 1rem)' }"
  >
    <header class="page-head">
      <div>
        <div class="h-eyebrow">
          {{ $t('photo.uploadEyebrow') }}
        </div>
        <h1 class="h-title">
          {{ $t('photo.uploadTitle') }}
        </h1>
        <p class="h-sub">
          {{ $t('photo.uploadDesc') }}
        </p>
      </div>
    </header>

    <div class="upload-grid">
      <PhotoUploader
        :uploading="uploading"
        :progress="progress"
        :queue="uploadQueueItems"
        :selected-album-name="selectedAlbumName"
        @upload="handleUpload"
        @cancel="cancelUpload"
        @retry="retryUpload"
        @clear-done="clearDone"
      />

      <aside class="side">
        <section class="quota">
          <div class="quota-head">
            <span class="quota-h">{{ $t('photo.localLibrary') }}</span>
            <span class="quota-pct num">{{ recentPhotoCount }}</span>
          </div>
          <div class="quota-bar" aria-hidden="true">
            <span class="qb-photos" />
            <span class="qb-albums" />
            <span class="qb-queue" />
          </div>
          <div class="quota-key">
            <span><span class="dot photos" />{{ $t('photo.libraryPhotos', { count: recentPhotoCount }) }}</span>
            <span><span class="dot albums" />{{ $t('photo.libraryAlbums', { count: totalAlbumCount }) }}</span>
            <span><span class="dot queue" />{{ $t('photo.libraryQueue', { count: uploadQueue.length }) }}</span>
            <span><span class="dot free" />{{ $t('photo.localOnly') }}</span>
          </div>
        </section>

        <section class="dest">
          <h2 class="dest-h">
            {{ $t('photo.destinationAlbum') }}
          </h2>
          <div class="dest-row">
            <button
              type="button"
              class="chip"
              :class="{ 'is-on': selectedAlbumId === 0 }"
              @click="selectedAlbumId = 0"
            >
              {{ $t('photo.unfiledAlbum') }}
            </button>
            <button
              v-for="album in albums"
              :key="album.id"
              type="button"
              class="chip"
              :class="{ 'is-on': selectedAlbumId === album.id }"
              @click="selectedAlbumId = album.id"
            >
              {{ album.name }}
            </button>
            <RouterLink class="chip accent" to="/albums">
              {{ $t('photo.manageAlbums') }}
            </RouterLink>
          </div>
        </section>
      </aside>
    </div>

    <p v-if="errorMessage" class="surface-message danger">
      {{ errorMessage }}
    </p>

    <PhotoGrid :photos="photos" @photo-click="onPhotoClick" />
    <TsLightbox
      v-model:open="lightboxOpen"
      :photos="photos"
      :initial-index="lightboxIndex"
      :origin-rect="lightboxOrigin"
      origin-kind="grid"
    />
  </section>
</template>

<style scoped>
.upload-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.upload-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 28px;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.quota,
.dest {
  padding: 20px 22px;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-lg);
  background: var(--ts-surface);
}

.quota-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.quota-h,
.dest-h {
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.quota-pct {
  color: var(--ts-fg);
  font-family: var(--ts-font-display);
  font-size: 22px;
  font-weight: 500;
}

.quota-bar {
  display: flex;
  position: relative;
  height: 8px;
  overflow: hidden;
  border-radius: var(--ts-radius-pill);
  background: var(--ts-bg-deep);
}

.quota-bar > span {
  display: block;
  height: 100%;
}

.qb-photos {
  width: 42%;
  background: var(--ts-accent);
}

.qb-albums {
  width: 16%;
  background: oklch(60% 0.08 30);
}

.qb-queue {
  width: 10%;
  background: oklch(50% 0.04 80);
}

.quota-key {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 18px;
  margin-top: 14px;
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border-radius: 2px;
  vertical-align: 1px;
}

.dot.photos {
  background: var(--ts-accent);
}

.dot.albums {
  background: oklch(60% 0.08 30);
}

.dot.queue {
  background: oklch(50% 0.04 80);
}

.dot.free {
  background: var(--ts-border);
}

.dest-h {
  margin-bottom: 14px;
}

.dest-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dest-row .chip {
  cursor: pointer;
}

.dest-row .chip.is-on {
  border-color: var(--ts-accent-soft);
  background: var(--ts-accent-soft);
  color: var(--ts-accent);
}

.surface-message {
  border-radius: var(--ts-radius);
  padding: 14px 16px;
  font-size: 14px;
}

.surface-message.danger {
  border: 1px solid oklch(60% 0.18 25 / 55%);
  background: oklch(30% 0.08 25 / 24%);
  color: oklch(85% 0.14 25);
}

@media (max-width: 1000px) {
  .upload-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .upload-page,
  .upload-grid {
    gap: 18px;
  }

  .quota,
  .dest {
    padding: 16px 18px;
  }

  .quota-key {
    gap: 6px 14px;
  }
}
</style>
