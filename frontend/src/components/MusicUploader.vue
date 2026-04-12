<template>
  <section class="space-y-3">
    <div
      data-testid="music-uploader-dropzone"
      class="rounded-xl border border-dashed border-ts-accent/60 bg-ts-panel p-6 text-center transition"
      :class="{ 'opacity-60': uploading, 'border-ts-accent shadow-glow': isDragging }"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <p class="text-base text-ts-text">Drag music files here</p>
      <p class="mt-1 text-sm text-ts-muted">MP3, WAV, FLAC, OGG, AAC</p>

      <button
        type="button"
        class="mt-4 rounded-md bg-ts-accent px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="uploading"
        @click="openPicker"
      >
        {{ uploading ? "Uploading..." : "Choose Audio Files" }}
      </button>

      <input
        ref="fileInput"
        class="hidden"
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/flac,audio/ogg,audio/aac,audio/x-aac"
        multiple
        :disabled="uploading"
        @change="onFileInputChange"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  uploading: boolean;
}>();

const emit = defineEmits<{
  upload: [files: File[]];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

const emitSelectedFiles = (files: FileList | null): void => {
  if (!files || files.length === 0 || props.uploading) {
    return;
  }

  emit("upload", Array.from(files));
};

const openPicker = (): void => {
  fileInput.value?.click();
};

const onFileInputChange = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  emitSelectedFiles(target.files);

  if (target.value) {
    target.value = "";
  }
};

const onDragOver = (): void => {
  if (!props.uploading) {
    isDragging.value = true;
  }
};

const onDragLeave = (): void => {
  isDragging.value = false;
};

const onDrop = (event: DragEvent): void => {
  isDragging.value = false;
  emitSelectedFiles(event.dataTransfer?.files ?? null);
};
</script>
