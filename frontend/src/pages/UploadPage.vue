<script setup lang="ts">
import type { Photo } from '../types/photo'

import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PhotoGrid from '../components/PhotoGrid.vue'
import PhotoUploader from '../components/PhotoUploader.vue'
import TsLightbox from '../components/TsLightbox.vue'
import { listPhotos, uploadPhotos } from '../services/photo'

const { t } = useI18n()
const photos = ref<Photo[]>([])
const uploading = ref(false)
const progress = ref(0)
const errorMessage = ref<string | null>(null)
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)
const lightboxOrigin = ref<DOMRect | null>(null)

async function loadPhotos(): Promise<void> {
  const payload = await listPhotos(1, 60)
  photos.value = payload.items
}

async function handleUpload(files: File[]): Promise<void> {
  if (files.length === 0) {
    return
  }

  uploading.value = true
  progress.value = 0
  errorMessage.value = null

  try {
    const uploaded = await uploadPhotos(files, (value) => {
      progress.value = value
    })

    photos.value = [...uploaded, ...photos.value]
  }
  catch {
    errorMessage.value = t('photo.uploadFailed')
  }
  finally {
    uploading.value = false
  }
}

function onPhotoClick(payload: { index: number, rect: DOMRect }): void {
  lightboxIndex.value = payload.index
  lightboxOrigin.value = payload.rect
  lightboxOpen.value = true
}

onMounted(async () => {
  try {
    await loadPhotos()
  }
  catch {
    errorMessage.value = t('photo.loadFailed')
  }
})
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold text-ts-accent">
        {{ $t('photo.uploadTitle') }}
      </h1>
      <p class="text-ts-muted">
        {{ $t('photo.uploadDesc') }}
      </p>
    </header>

    <PhotoUploader :uploading="uploading" :progress="progress" @upload="handleUpload" />

    <p v-if="errorMessage" class="rounded-lg border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
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
