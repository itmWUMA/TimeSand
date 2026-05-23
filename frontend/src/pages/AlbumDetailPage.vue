<script setup lang="ts">
import type { Album, Tag } from '../types/album'
import type { Photo } from '../types/photo'

import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import TagManager from '../components/TagManager.vue'
import TsLightbox from '../components/TsLightbox.vue'
import {
  addPhotosToAlbum,
  deleteAlbum,
  getAlbum,
  removePhotoFromAlbum,
  updateAlbum,
} from '../services/album'
import { listPhotos } from '../services/photo'
import {
  addTagsToPhoto,
  createTag,
  listPhotoTags,
  listTags,
  removeTagFromPhoto,
} from '../services/tag'
import { buildThumbnailUrl } from '../utils/photoUrl'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const album = ref<Album | null>(null)
const albumPhotos = ref<Photo[]>([])
const allPhotos = ref<Photo[]>([])
const availableTags = ref<Tag[]>([])
const photoTags = ref<Record<number, Tag[]>>({})

const loading = ref(false)
const savingAlbum = ref(false)
const updatingPhotos = ref(false)
const errorMessage = ref<string | null>(null)

const editName = ref('')
const editDescription = ref('')
const selectedCoverPhotoId = ref(0)
const selectedPhotoToAdd = ref(0)
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)
const lightboxOrigin = ref<DOMRect | null>(null)
const deletingAlbum = ref(false)

const albumId = computed(() => Number(route.params.id))
const PHOTO_PAGE_SIZE = 100
const albumTotalSizeLabel = computed(() => formatBytes(albumPhotos.value.reduce((total, photo) => total + photo.file_size, 0)))
const albumDateLabel = computed(() => {
  const candidates = albumPhotos.value
    .map(photo => photo.taken_at ?? photo.uploaded_at)
    .filter(Boolean)
    .map(value => new Date(value))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  if (candidates.length === 0) {
    return t('album.unknownDateRange')
  }

  const first = candidates[0]
  const last = candidates[candidates.length - 1]
  if (first.toDateString() === last.toDateString()) {
    return first.toLocaleDateString()
  }

  return `${first.toLocaleDateString()} - ${last.toLocaleDateString()}`
})
const heroPhoto = computed(() => {
  if (!album.value?.cover_photo_id) {
    return albumPhotos.value[0] ?? null
  }

  return albumPhotos.value.find(photo => photo.id === album.value?.cover_photo_id) ?? albumPhotos.value[0] ?? null
})
const heroStyle = computed(() => {
  if (!heroPhoto.value) {
    return {}
  }

  return { backgroundImage: `url("${buildThumbnailUrl(heroPhoto.value)}")` }
})

const availablePhotosToAdd = computed(() => {
  const albumPhotoIds = new Set(albumPhotos.value.map(photo => photo.id))
  const uniquePhotoIds = new Set<number>()
  const options: Photo[] = []

  for (const photo of allPhotos.value) {
    if (albumPhotoIds.has(photo.id) || uniquePhotoIds.has(photo.id)) {
      continue
    }

    uniquePhotoIds.add(photo.id)
    options.push(photo)
  }

  return options
})

async function loadAllPhotos(): Promise<Photo[]> {
  const allItems: Photo[] = []
  let page = 1
  let total = 0

  while (page === 1 || allItems.length < total) {
    const payload = await listPhotos(page, PHOTO_PAGE_SIZE)
    total = payload.total

    if (payload.items.length === 0) {
      break
    }

    allItems.push(...payload.items)
    page += 1
  }

  const uniqueById = new Map<number, Photo>()
  for (const photo of allItems) {
    if (!uniqueById.has(photo.id)) {
      uniqueById.set(photo.id, photo)
    }
  }

  return Array.from(uniqueById.values())
}

async function loadPhotoTags(photoId: number): Promise<void> {
  const payload = await listPhotoTags(photoId)
  photoTags.value = {
    ...photoTags.value,
    [photoId]: payload.items,
  }
}

async function loadAlbumData(): Promise<void> {
  if (!Number.isFinite(albumId.value) || albumId.value <= 0) {
    errorMessage.value = t('album.invalidId')
    return
  }

  loading.value = true
  errorMessage.value = null

  try {
    const [albumPayload, albumPhotoPayload, allPhotoItems, tagsPayload] = await Promise.all([
      getAlbum(albumId.value),
      listPhotos(1, PHOTO_PAGE_SIZE, { albumId: albumId.value }),
      loadAllPhotos(),
      listTags(),
    ])

    album.value = albumPayload
    albumPhotos.value = albumPhotoPayload.items
    allPhotos.value = allPhotoItems
    availableTags.value = tagsPayload.items

    editName.value = albumPayload.name
    editDescription.value = albumPayload.description ?? ''
    selectedCoverPhotoId.value = albumPayload.cover_photo_id ?? 0

    const tagPairs = await Promise.all(
      albumPhotoPayload.items.map(async (photo) => {
        const tagPayload = await listPhotoTags(photo.id)
        return [photo.id, tagPayload.items] as const
      }),
    )

    photoTags.value = Object.fromEntries(tagPairs)
  }
  catch {
    errorMessage.value = t('album.loadFailed')
  }
  finally {
    loading.value = false
  }
}

async function saveAlbum(): Promise<void> {
  if (!album.value || savingAlbum.value) {
    return
  }

  savingAlbum.value = true
  errorMessage.value = null

  try {
    const updated = await updateAlbum(album.value.id, {
      name: editName.value,
      description: editDescription.value.trim() || null,
      cover_photo_id: selectedCoverPhotoId.value || null,
    })

    album.value = updated
    editName.value = updated.name
    editDescription.value = updated.description ?? ''
    selectedCoverPhotoId.value = updated.cover_photo_id ?? 0
  }
  catch {
    errorMessage.value = t('album.saveFailed')
  }
  finally {
    savingAlbum.value = false
  }
}

async function addSelectedPhoto(): Promise<void> {
  if (!album.value || selectedPhotoToAdd.value === 0 || updatingPhotos.value) {
    return
  }

  updatingPhotos.value = true
  errorMessage.value = null

  try {
    await addPhotosToAlbum(album.value.id, [selectedPhotoToAdd.value])
    selectedPhotoToAdd.value = 0
    await loadAlbumData()
  }
  catch {
    errorMessage.value = t('album.addPhotoFailed')
  }
  finally {
    updatingPhotos.value = false
  }
}

async function removePhoto(photoId: number): Promise<void> {
  if (!album.value || updatingPhotos.value) {
    return
  }

  updatingPhotos.value = true
  errorMessage.value = null

  try {
    await removePhotoFromAlbum(album.value.id, photoId)
    albumPhotos.value = albumPhotos.value.filter(photo => photo.id !== photoId)

    const nextMap = { ...photoTags.value }
    delete nextMap[photoId]
    photoTags.value = nextMap

    const refreshed = await getAlbum(album.value.id)
    album.value = refreshed
    selectedCoverPhotoId.value = refreshed.cover_photo_id ?? 0
  }
  catch {
    errorMessage.value = t('album.removePhotoFailed')
  }
  finally {
    updatingPhotos.value = false
  }
}

async function addTagToPhoto(photoId: number, tagId: number): Promise<void> {
  try {
    await addTagsToPhoto(photoId, [tagId])
    await loadPhotoTags(photoId)
  }
  catch {
    errorMessage.value = t('album.addTagFailed')
  }
}

async function removeTagFromPhotoInAlbum(photoId: number, tagId: number): Promise<void> {
  try {
    await removeTagFromPhoto(photoId, tagId)
    await loadPhotoTags(photoId)
  }
  catch {
    errorMessage.value = t('album.removeTagFailed')
  }
}

async function createAndAddTag(photoId: number, tagName: string): Promise<void> {
  const normalizedName = tagName.trim()
  if (!normalizedName) {
    return
  }

  const existingTag = availableTags.value.find(
    tag => tag.name.toLowerCase() === normalizedName.toLowerCase(),
  )
  if (existingTag) {
    await addTagToPhoto(photoId, existingTag.id)
    return
  }

  try {
    const tag = await createTag(normalizedName)
    availableTags.value = [...availableTags.value, tag].sort((a, b) => a.name.localeCompare(b.name))
    await addTagsToPhoto(photoId, [tag.id])
    await loadPhotoTags(photoId)
  }
  catch {
    errorMessage.value = t('album.createTagFailed')
  }
}

function onAlbumPhotoClick(index: number, event: MouseEvent): void {
  const target = event.currentTarget as HTMLElement | null
  if (!target) {
    return
  }

  lightboxIndex.value = index
  lightboxOrigin.value = target.getBoundingClientRect()
  lightboxOpen.value = true
}

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

async function deleteCurrentAlbum(): Promise<void> {
  if (!album.value || deletingAlbum.value) {
    return
  }

  deletingAlbum.value = true
  errorMessage.value = null

  try {
    await deleteAlbum(album.value.id)
    await router.push('/albums')
  }
  catch {
    errorMessage.value = t('album.deleteFailed')
  }
  finally {
    deletingAlbum.value = false
  }
}

onMounted(async () => {
  await loadAlbumData()
})
</script>

<template>
  <section class="album-detail-page">
    <p v-if="errorMessage" class="surface-message danger">
      {{ errorMessage }}
    </p>

    <p v-if="loading" class="loading-copy">
      {{ $t('album.loadingDetails') }}
    </p>

    <template v-else-if="album">
      <nav class="crumb" aria-label="Breadcrumb">
        <RouterLink to="/albums">
          {{ $t('album.title') }}
        </RouterLink>
        <span>/</span>
        <span>{{ album.name }}</span>
      </nav>

      <section class="detail-head">
        <div class="detail-info">
          <div class="h-eyebrow">
            {{ albumDateLabel }}
          </div>
          <h1 class="h-title">
            {{ album.name }}
          </h1>
          <p class="h-sub">
            {{ album.description || $t('album.detailDesc') }}
          </p>

          <div
            data-testid="album-detail-stats"
            class="detail-stats"
          >
            <div class="stat">
              <div class="stat-num num">
                {{ album.photo_count }}
              </div>
              <div class="stat-lbl">
                {{ $t('album.statPhotos') }}
              </div>
            </div>
            <div class="stat">
              <div class="stat-num num">
                {{ albumTotalSizeLabel }}
              </div>
              <div class="stat-lbl">
                {{ $t('album.statOriginals') }}
              </div>
            </div>
            <div class="stat">
              <div class="stat-num num">
                {{ availableTags.length }}
              </div>
              <div class="stat-lbl">
                {{ $t('album.statTags') }}
              </div>
            </div>
          </div>

          <div class="detail-actions">
            <RouterLink
              class="btn btn-primary"
              :to="{ path: `/slideshow/${album.id}` }"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l14 8-14 8V4z" /></svg>
              {{ $t('album.startSlideshow') }}
            </RouterLink>
            <RouterLink
              class="btn"
              :to="{ path: '/draw', query: { album_id: String(album.id) } }"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="3" /></svg>
              {{ $t('album.drawFromAlbum') }}
            </RouterLink>
            <button
              type="button"
              class="btn"
              @click="addSelectedPhoto"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6" /></svg>
              {{ $t('album.addPhotos') }}
            </button>
            <button
              type="button"
              data-testid="album-delete-button"
              class="btn btn-danger"
              :disabled="deletingAlbum"
              @click="deleteCurrentAlbum"
            >
              {{ deletingAlbum ? $t('common.loading') : $t('common.delete') }}
            </button>
          </div>
        </div>

        <button
          type="button"
          data-testid="album-detail-hero"
          class="detail-hero"
          :style="heroStyle"
          :aria-label="heroPhoto ? $t('lightbox.openPhoto', { filename: heroPhoto.filename }) : album.name"
          @click="heroPhoto && onAlbumPhotoClick(Math.max(albumPhotos.findIndex(photo => photo.id === heroPhoto?.id), 0), $event)"
        >
          <span class="detail-hero-cap">
            <span class="date">{{ albumDateLabel }}</span>
            <span class="tag">{{ heroPhoto?.mime_type ?? $t('photo.noCoverPhoto') }}</span>
          </span>
        </button>
      </section>

      <section class="management-grid">
        <form class="control-panel" @submit.prevent="saveAlbum">
          <h2 class="panel-title">
            {{ $t('album.albumSettings') }}
          </h2>
          <div class="form-grid">
            <label class="field">
              <span>{{ $t('album.nameLabel') }}</span>
              <input
                v-model="editName"
                type="text"
                class="album-form-control"
              >
            </label>
            <label class="field">
              <span>{{ $t('album.coverPhoto') }}</span>
              <select
                v-model.number="selectedCoverPhotoId"
                class="album-form-control"
              >
                <option :value="0">{{ $t('common.none') }}</option>
                <option v-for="photo in albumPhotos" :key="photo.id" :value="photo.id">
                  {{ photo.filename }}
                </option>
              </select>
            </label>
          </div>
          <label class="field">
            <span>{{ $t('album.descriptionLabel') }}</span>
            <textarea
              v-model="editDescription"
              rows="2"
              class="album-form-control"
            />
          </label>
          <button
            type="submit"
            :disabled="savingAlbum"
            class="btn btn-primary album-action-button"
          >
            {{ savingAlbum ? $t('common.saving') : $t('common.save') }}
          </button>
        </form>

        <section class="control-panel">
          <h2 class="panel-title">
            {{ $t('album.addPhotos') }}
          </h2>
          <div class="add-row">
            <select
              v-model.number="selectedPhotoToAdd"
              class="album-form-control"
            >
              <option :value="0">
                {{ $t('album.selectPhoto') }}
              </option>
              <option v-for="photo in availablePhotosToAdd" :key="photo.id" :value="photo.id">
                {{ photo.filename }}
              </option>
            </select>
            <button
              type="button"
              :disabled="selectedPhotoToAdd === 0 || updatingPhotos"
              class="btn album-action-button"
              @click="addSelectedPhoto"
            >
              {{ $t('album.addToAlbum') }}
            </button>
          </div>
        </section>
      </section>

      <section class="album-photos">
        <div class="photo-section-head">
          <div class="h-eyebrow">
            {{ $t('album.photosEyebrow', { count: album.photo_count }) }}
          </div>
          <div class="photo-view-chips">
            <span class="chip">{{ $t('album.sortRecent') }}</span>
            <span class="chip accent">{{ $t('album.waterfallView') }}</span>
          </div>
        </div>

        <p
          v-if="albumPhotos.length === 0"
          class="empty-copy"
        >
          {{ $t('album.noPhotos') }}
        </p>

        <div v-else class="photo-grid">
          <article
            v-for="(photo, index) in albumPhotos"
            :key="photo.id"
            class="photo"
            :class="{ tall: index % 7 === 0, wide: index % 5 === 3 }"
          >
            <button
              type="button"
              class="album-photo-open-button"
              :aria-label="$t('lightbox.openPhoto', { filename: photo.filename })"
              @click="onAlbumPhotoClick(index, $event)"
            >
              <img
                :src="buildThumbnailUrl(photo)"
                :alt="photo.filename"
                loading="lazy"
              >
              <span class="photo-meta">{{ photo.filename }}</span>
            </button>

            <div class="album-photo-tools">
              <button
                type="button"
                class="album-photo-remove-button"
                @click="removePhoto(photo.id)"
              >
                {{ $t('common.remove') }}
              </button>
              <TagManager
                class="album-tag-manager"
                :tags="photoTags[photo.id] ?? []"
                :available-tags="availableTags"
                @add-tag="(tagId) => addTagToPhoto(photo.id, Number(tagId))"
                @remove-tag="(tagId) => removeTagFromPhotoInAlbum(photo.id, Number(tagId))"
                @create-tag="(tagName) => createAndAddTag(photo.id, String(tagName))"
              />
            </div>
          </article>
        </div>
      </section>

      <TsLightbox
        v-model:open="lightboxOpen"
        :photos="albumPhotos"
        :initial-index="lightboxIndex"
        :origin-rect="lightboxOrigin"
        origin-kind="grid"
      />
    </template>
  </section>
</template>

<style scoped>
.album-detail-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.crumb {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.crumb a:hover {
  color: var(--ts-accent);
}

.detail-head {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 50px;
  margin-bottom: 8px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--ts-border-soft);
}

.detail-info .h-title {
  font-size: clamp(36px, 4.4vw, 56px);
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 28px;
}

.stat {
  padding: 14px 16px;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius);
  background: var(--ts-surface);
}

.stat-num {
  color: var(--ts-fg);
  font-family: var(--ts-font-display);
  font-size: 22px;
  font-weight: 500;
}

.stat-lbl {
  margin-top: 4px;
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 32px;
}

.detail-actions svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.btn-danger {
  border-color: oklch(40% 0.08 25);
  background: transparent;
  color: oklch(78% 0.14 25);
}

.btn-danger:hover {
  background: oklch(30% 0.08 25 / 40%);
  color: oklch(85% 0.14 25);
}

.detail-hero {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  width: 100%;
  min-height: 260px;
  border: 0;
  border-radius: var(--ts-radius-lg);
  background:
    radial-gradient(circle at 48% 32%, oklch(78% 0.14 72 / 20%), transparent 38%),
    linear-gradient(135deg, oklch(35% 0.04 60), oklch(16% 0.02 48));
  background-position: center;
  background-size: cover;
  box-shadow: inset 0 -80px 120px rgb(0 0 0 / 45%);
}

.detail-hero-cap {
  position: absolute;
  right: 22px;
  bottom: 22px;
  left: 22px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.detail-hero-cap .date {
  color: var(--ts-accent);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.detail-hero-cap .tag {
  border-radius: 4px;
  background: oklch(15% 0.012 45 / 60%);
  color: oklch(85% 0.015 60);
  backdrop-filter: blur(8px);
  padding: 5px 10px;
  font-family: var(--ts-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.08em;
}

.management-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 18px;
}

.control-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 22px;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-lg);
  background: var(--ts-surface);
}

.panel-title {
  color: var(--ts-fg);
  font-family: var(--ts-font-display);
  font-size: 18px;
  font-weight: 500;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--ts-muted);
  font-size: 13px;
}

.album-form-control {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius);
  outline: none;
  background: var(--ts-bg-deep);
  color: var(--ts-fg);
  padding: 8px 12px;
  font-size: 14px;
}

.album-form-control:focus {
  border-color: var(--ts-accent);
}

.add-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.album-photos {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.photo-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}

.photo-view-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.empty-copy,
.surface-message {
  border-radius: var(--ts-radius-lg);
  padding: 18px 20px;
  font-size: 14px;
}

.empty-copy {
  border: 1px solid var(--ts-border-soft);
  background: var(--ts-surface);
  color: var(--ts-muted);
}

.surface-message.danger {
  border: 1px solid oklch(60% 0.18 25 / 55%);
  background: oklch(30% 0.08 25 / 24%);
  color: oklch(85% 0.14 25);
}

.loading-copy {
  color: var(--ts-muted);
  font-size: 14px;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-auto-flow: dense;
  gap: 14px;
}

.photo {
  position: relative;
  overflow: visible;
}

.album-photo-open-button {
  position: relative;
  display: block;
  overflow: hidden;
  aspect-ratio: 3 / 4;
  width: 100%;
  border: 0;
  border-radius: var(--ts-radius);
  background: var(--ts-surface-2);
  cursor: zoom-in;
  padding: 0;
  transition: transform var(--ts-duration-normal) var(--ts-ease);
}

.album-photo-open-button:hover {
  transform: scale(1.02);
}

.photo.tall .album-photo-open-button {
  aspect-ratio: 3 / 6;
}

.photo.wide {
  grid-column: span 2;
}

.photo.tall {
  grid-row: span 2;
}

.photo.wide .album-photo-open-button {
  aspect-ratio: 6 / 4;
}

.album-photo-open-button img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-meta {
  position: absolute;
  right: 12px;
  bottom: 12px;
  left: 12px;
  color: oklch(90% 0.02 70);
  font-family: var(--ts-font-mono);
  font-size: 10px;
  letter-spacing: 0;
  text-align: left;
  text-shadow: 0 1px 4px rgb(0 0 0 / 60%);
  opacity: 0;
  transition: opacity var(--ts-duration-normal) var(--ts-ease);
}

.album-photo-open-button:hover .photo-meta {
  opacity: 1;
}

.album-photo-tools {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.album-photo-remove-button {
  align-self: flex-start;
  border: 1px solid oklch(45% 0.1 25 / 70%);
  border-radius: var(--ts-radius-pill);
  background: transparent;
  color: oklch(78% 0.14 25);
  padding: 5px 10px;
  font-size: 12px;
}

@media (max-width: 880px) {
  .detail-head,
  .management-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .detail-head {
    gap: 28px;
    margin-bottom: 0;
    padding-bottom: 22px;
  }

  .detail-info .h-title {
    font-size: clamp(28px, 7.6vw, 38px);
  }

  .detail-stats {
    gap: 8px;
  }

  .stat {
    padding: 10px 12px;
  }

  .stat-num {
    font-size: 18px;
  }

  .stat-lbl {
    font-size: 9.5px;
    letter-spacing: 0.08em;
  }

  .detail-actions {
    gap: 8px;
    margin-top: 24px;
  }

  .detail-actions .btn {
    padding: 9px 14px;
    font-size: 12.5px;
  }

  .form-grid,
  .add-row {
    grid-template-columns: 1fr;
  }

  .add-row {
    flex-direction: column;
    align-items: stretch;
  }

  .photo-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 8px;
  }

  .photo.wide {
    grid-column: span 2;
  }

  .photo.tall {
    grid-row: span 2;
  }

  .album-form-control,
  .album-action-button,
  .album-photo-open-button,
  .album-photo-remove-button {
    min-height: 44px;
    min-width: 44px;
  }

  .album-form-control {
    font-size: 16px;
  }

  .album-tag-manager :deep(input),
  .album-tag-manager :deep(button) {
    min-height: 44px;
  }

  .album-tag-manager :deep(input) {
    font-size: 16px;
  }

  .album-tag-manager :deep([data-testid='add-tag-button']) {
    min-width: 44px;
  }

  .album-tag-manager :deep([data-testid^='remove-tag-']) {
    min-width: 44px;
    margin-left: 8px;
  }
}

@media (max-width: 380px) {
  .photo-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
