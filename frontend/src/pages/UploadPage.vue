<template>
  <section class="space-y-6">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold text-ts-accent">Upload</h1>
      <p class="text-ts-muted">Batch upload your memories and review them instantly.</p>
    </header>

    <PhotoUploader :uploading="uploading" :progress="progress" @upload="handleUpload" />

    <p v-if="errorMessage" class="rounded-lg border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {{ errorMessage }}
    </p>

    <PhotoGrid :photos="photos" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import PhotoGrid from "../components/PhotoGrid.vue";
import PhotoUploader from "../components/PhotoUploader.vue";
import { listPhotos, uploadPhotos } from "../services/photo";
import type { Photo } from "../types/photo";

const photos = ref<Photo[]>([]);
const uploading = ref(false);
const progress = ref(0);
const errorMessage = ref<string | null>(null);

const loadPhotos = async (): Promise<void> => {
  const payload = await listPhotos(1, 60);
  photos.value = payload.items;
};

const handleUpload = async (files: File[]): Promise<void> => {
  if (files.length === 0) {
    return;
  }

  uploading.value = true;
  progress.value = 0;
  errorMessage.value = null;

  try {
    const uploaded = await uploadPhotos(files, (value) => {
      progress.value = value;
    });

    photos.value = [...uploaded, ...photos.value];
  } catch {
    errorMessage.value = "Upload failed. Please try again.";
  } finally {
    uploading.value = false;
  }
};

onMounted(async () => {
  try {
    await loadPhotos();
  } catch {
    errorMessage.value = "Failed to load existing photos.";
  }
});
</script>
