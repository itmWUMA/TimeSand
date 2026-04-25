<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  uploading: boolean
  progress: number
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
  <section class="space-y-3">
    <div
      data-testid="photo-uploader-dropzone"
      class="rounded-xl border border-dashed border-ts-accent/60 bg-ts-panel p-6 text-center transition"
      :class="{ 'opacity-60': uploading, 'border-ts-accent shadow-glow': isDragging }"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <p class="text-base text-ts-text">
        {{ $t('photo.dropHint') }}
      </p>
      <p class="mt-1 text-sm text-ts-muted">
        {{ $t('photo.formats') }}
      </p>

      <button
        type="button"
        class="mt-4 rounded-md bg-ts-accent px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="uploading"
        @click="openPicker"
      >
        {{ uploading ? $t('common.uploading') : $t('photo.chooseFiles') }}
      </button>

      <input
        ref="fileInput"
        class="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
        multiple
        :disabled="uploading"
        @change="onFileInputChange"
      >
    </div>

    <div v-if="uploading" class="space-y-2">
      <div class="h-2 w-full overflow-hidden rounded bg-white/10">
        <div class="h-full bg-ts-accent transition-all" :style="{ width: `${progress}%` }" />
      </div>
      <p class="text-sm text-ts-muted">
        {{ $t('photo.uploadProgress', { progress }) }}
      </p>
    </div>
  </section>
</template>
