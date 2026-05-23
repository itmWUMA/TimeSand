<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  uploading: boolean
}>()

const emit = defineEmits<{
  upload: [files: File[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

function emitSelectedFiles(files: FileList | null): void {
  if (!files || files.length === 0 || props.uploading) {
    return
  }

  emit('upload', Array.from(files))
}

function openPicker(): void {
  fileInput.value?.click()
}

function onFileInputChange(event: Event): void {
  const target = event.target as HTMLInputElement
  emitSelectedFiles(target.files)

  if (target.value) {
    target.value = ''
  }
}

function onDragOver(): void {
  if (!props.uploading) {
    isDragging.value = true
  }
}

function onDragLeave(): void {
  isDragging.value = false
}

function onDrop(event: DragEvent): void {
  isDragging.value = false
  emitSelectedFiles(event.dataTransfer?.files ?? null)
}
</script>

<template>
  <section class="music-uploader">
    <div
      data-testid="music-uploader-dropzone"
      class="music-uploader-dropzone"
      :class="{ 'is-uploading': uploading, 'is-dragging': isDragging }"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <p class="music-uploader-title">
        {{ $t('music.dropHint') }}
      </p>
      <p class="music-uploader-formats">
        {{ $t('music.formats') }}
      </p>

      <button
        type="button"
        class="music-uploader-button"
        :disabled="uploading"
        @click="openPicker"
      >
        {{ uploading ? $t('common.uploading') : $t('music.chooseAudio') }}
      </button>

      <input
        ref="fileInput"
        class="hidden"
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/flac,audio/ogg,audio/aac,audio/x-aac"
        multiple
        :disabled="uploading"
        @change="onFileInputChange"
      >
    </div>
  </section>
</template>

<style scoped>
.music-uploader {
  display: grid;
}

.music-uploader-dropzone {
  border: 1.5px dashed var(--ts-border);
  border-radius: var(--ts-radius);
  background: oklch(17% 0.018 50 / 35%);
  padding: 22px 16px;
  text-align: center;
  transition:
    border-color var(--ts-duration-normal) var(--ts-ease),
    box-shadow var(--ts-duration-normal) var(--ts-ease),
    opacity var(--ts-duration-normal) var(--ts-ease);
}

.music-uploader-dropzone.is-dragging {
  border-color: var(--ts-accent);
  box-shadow: var(--ts-glow-soft);
}

.music-uploader-dropzone.is-uploading {
  opacity: 0.6;
}

.music-uploader-title {
  color: var(--ts-fg-soft);
  font-size: 13.5px;
}

.music-uploader-formats {
  margin-top: 2px;
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 10.5px;
}

.music-uploader-button {
  min-height: 38px;
  margin-top: 14px;
  border: 1px solid transparent;
  border-radius: var(--ts-radius-pill);
  background: var(--ts-accent);
  box-shadow: var(--ts-glow-accent);
  color: var(--ts-bg-deep);
  font-size: 13px;
  font-weight: 600;
  padding: 0 16px;
}

.music-uploader-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
