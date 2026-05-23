<script setup lang="ts">
import { computed, ref } from 'vue'

type UploadStatus = 'queued' | 'uploading' | 'done' | 'failed' | 'canceled'

interface UploadQueueItem {
  id: string
  filename: string
  sizeLabel: string
  status: UploadStatus
  progress: number
}

const props = withDefaults(defineProps<{
  uploading: boolean
  queue?: UploadQueueItem[]
  selectedAlbumName?: string | null
}>(), {
  queue: () => [],
  selectedAlbumName: null,
})

const emit = defineEmits<{
  upload: [files: File[]]
  cancel: []
  retry: [id: string]
  clearDone: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const hasQueue = computed(() => props.queue.length > 0)
const completedCount = computed(() => props.queue.filter(item => item.status === 'done').length)

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

function progressStyle(progress: number): Record<string, string> {
  return { transform: `scaleX(${Math.max(0, Math.min(100, progress)) / 100})` }
}

function statusClass(status: UploadStatus): string {
  if (status === 'done') {
    return 'done'
  }
  if (status === 'failed') {
    return 'fail'
  }
  if (status === 'uploading') {
    return 'live'
  }
  return 'wait'
}

function statusLabel(status: UploadStatus, progress: number): string {
  if (status === 'done') {
    return 'photo.queueDone'
  }
  if (status === 'failed') {
    return 'photo.queueFailed'
  }
  if (status === 'canceled') {
    return 'photo.queueCanceled'
  }
  if (status === 'uploading') {
    return progress > 0 ? 'photo.queueProgress' : 'photo.queueUploading'
  }
  return 'photo.queueQueued'
}
</script>

<template>
  <section class="photo-uploader-surface">
    <div
      data-testid="photo-uploader-dropzone"
      class="drop"
      :class="{ 'is-disabled': uploading, 'is-over': isDragging }"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <div class="motes" aria-hidden="true">
        <span v-for="index in 14" :key="index" class="mote" :style="{ left: `${(index * 17) % 96}%`, animationDelay: `${index * 0.28}s`, animationDuration: `${8 + (index % 5)}s` }" />
      </div>

      <div class="drop-art" aria-hidden="true">
        <div class="ph a" />
        <div class="ph b" />
      </div>

      <p class="drop-h">
        {{ $t('photo.dropHint') }}
      </p>
      <p class="drop-sub">
        {{ $t('photo.formats') }}
      </p>

      <div class="drop-actions">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="uploading"
          @click="openPicker"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 16V4M6 10l6-6 6 6" />
            <path d="M4 18v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          {{ uploading ? $t('common.uploading') : $t('photo.chooseFiles') }}
        </button>
        <button
          v-if="uploading && !hasQueue"
          type="button"
          data-testid="photo-upload-cancel"
          class="btn btn-ghost"
          @click="$emit('cancel')"
        >
          {{ $t('common.cancel') }}
        </button>
      </div>

      <input
        ref="fileInput"
        class="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/tiff,image/heic,image/heif,.heic,.heif,.tif,.tiff"
        multiple
        :disabled="uploading"
        @change="onFileInputChange"
      >
    </div>

    <div
      v-if="hasQueue"
      data-testid="photo-upload-queue"
      class="queue"
    >
      <div class="queue-head">
        <div class="queue-tabs">
          <span class="queue-tab is-on">{{ $t('photo.queueCurrent', { count: queue.length }) }}</span>
          <span class="queue-tab">{{ $t('photo.queueCompleted', { count: completedCount }) }}</span>
        </div>
        <div class="queue-actions">
          <button
            v-if="uploading"
            type="button"
            data-testid="photo-upload-cancel"
            class="btn btn-ghost"
            @click="$emit('cancel')"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            v-if="completedCount > 0"
            type="button"
            class="btn btn-ghost"
            @click="$emit('clearDone')"
          >
            {{ $t('photo.clearDone') }}
          </button>
        </div>
      </div>

      <div
        v-for="item in queue"
        :key="item.id"
        class="queue-row"
      >
        <div class="q-thumb" aria-hidden="true" />
        <div class="min-w-0">
          <p class="q-name truncate">
            {{ item.filename }}
          </p>
          <p class="q-meta num">
            {{ item.sizeLabel }}
          </p>
        </div>
        <p class="q-meta destination">
          {{ selectedAlbumName ?? $t('photo.unfiledAlbum') }}
        </p>
        <div class="q-prog">
          <span :style="progressStyle(item.progress)" />
        </div>
        <div class="q-actions">
          <p class="q-status" :class="statusClass(item.status)">
            {{ $t(statusLabel(item.status, item.progress), { progress: item.progress }) }}
          </p>
          <button
            v-if="item.status === 'failed' || item.status === 'canceled'"
            type="button"
            :data-testid="`photo-upload-retry-${item.id}`"
            class="retry-button"
            @click="$emit('retry', item.id)"
          >
            {{ $t('common.refresh') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.photo-uploader-surface {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.drop {
  position: relative;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 48px 36px;
  border: 1.5px dashed var(--ts-border);
  border-radius: var(--ts-radius-lg);
  background:
    radial-gradient(circle at center, oklch(22% 0.024 55) 0%, oklch(18% 0.02 50) 70%);
  text-align: center;
  transition:
    border-color var(--ts-duration-normal) var(--ts-ease),
    background var(--ts-duration-normal) var(--ts-ease),
    opacity var(--ts-duration-normal) var(--ts-ease);
}

.drop:hover,
.drop.is-over {
  border-color: var(--ts-accent);
  background:
    radial-gradient(circle at center, oklch(78% 0.14 72 / 6%) 0%, oklch(18% 0.02 50) 70%);
}

.drop.is-disabled {
  opacity: 0.72;
}

.motes {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.mote {
  position: absolute;
  bottom: -6px;
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: var(--ts-accent);
  box-shadow: 0 0 8px var(--ts-accent-glow);
  opacity: 0;
  animation: float-up linear infinite;
}

@keyframes float-up {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }

  10% {
    opacity: 0.7;
  }

  90% {
    opacity: 0.5;
  }

  100% {
    transform: translateY(-440px) translateX(20px);
    opacity: 0;
  }
}

.drop-art {
  position: relative;
  z-index: 1;
  width: 84px;
  height: 100px;
  margin-bottom: 22px;
}

.drop-art .ph {
  position: absolute;
  width: 70px;
  height: 90px;
  border-radius: 8px;
  box-shadow: 0 14px 28px -8px rgb(0 0 0 / 55%);
}

.drop-art .a {
  top: 8px;
  left: 0;
  transform: rotate(-8deg);
  background: linear-gradient(135deg, oklch(55% 0.08 60), oklch(30% 0.05 50));
}

.drop-art .b {
  top: 0;
  left: 14px;
  transform: rotate(2deg);
  background: linear-gradient(135deg, oklch(60% 0.10 70), oklch(35% 0.05 55));
}

.drop-h {
  z-index: 1;
  margin-bottom: 8px;
  color: var(--ts-fg);
  font-family: var(--ts-font-display);
  font-size: 28px;
  font-weight: 500;
}

.drop-sub {
  z-index: 1;
  margin-bottom: 26px;
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.drop-actions {
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.btn svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.queue {
  overflow: hidden;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-lg);
  background: var(--ts-surface);
}

.queue-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 22px;
  border-bottom: 1px solid var(--ts-border-soft);
}

.queue-tabs,
.queue-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.queue-tabs {
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.queue-tab.is-on {
  position: relative;
  color: var(--ts-fg);
}

.queue-tab.is-on::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: -17px;
  left: 0;
  height: 2px;
  border-radius: 2px;
  background: var(--ts-accent);
}

.queue-row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1.4fr) minmax(120px, 0.8fr) minmax(90px, 1fr) minmax(90px, auto);
  align-items: center;
  gap: 18px;
  padding: 14px 22px;
  border-bottom: 1px solid var(--ts-border-soft);
  font-size: 13px;
}

.queue-row:last-child {
  border-bottom: 0;
}

.q-thumb {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: linear-gradient(135deg, oklch(60% 0.10 70), oklch(35% 0.05 50));
}

.q-name {
  color: var(--ts-fg);
  font-weight: 500;
}

.q-meta {
  color: var(--ts-muted);
  font-size: 12px;
}

.q-prog {
  position: relative;
  height: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--ts-border);
}

.q-prog > span {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--ts-accent-deep), var(--ts-accent));
  transform-origin: left;
  transition: transform var(--ts-duration-normal) var(--ts-ease);
}

.q-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.q-status {
  color: var(--ts-muted-2);
  font-family: var(--ts-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.q-status.done {
  color: var(--ts-success);
}

.q-status.live {
  color: var(--ts-accent);
}

.q-status.fail {
  color: oklch(78% 0.14 25);
}

.retry-button {
  min-height: 32px;
  padding: 4px 10px;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-pill);
  background: transparent;
  color: var(--ts-fg-soft);
  font-size: 12px;
  transition:
    color var(--ts-duration-normal) var(--ts-ease),
    border-color var(--ts-duration-normal) var(--ts-ease),
    background var(--ts-duration-normal) var(--ts-ease);
}

.retry-button:hover {
  border-color: var(--ts-accent-soft);
  background: var(--ts-accent-soft);
  color: var(--ts-accent);
}

@media (max-width: 1000px) {
  .queue-row {
    grid-template-columns: 50px 1fr 90px;
  }

  .queue-row .destination,
  .queue-row .q-prog {
    display: none;
  }
}

@media (max-width: 720px) {
  .drop {
    min-height: 320px;
    padding: 36px 22px;
  }

  .drop-h {
    font-size: 22px;
  }

  .drop-actions {
    flex-wrap: wrap;
  }

  .queue-head {
    align-items: flex-start;
    padding: 14px 16px;
  }

  .queue-tabs {
    flex-wrap: wrap;
    gap: 10px;
    font-size: 10.5px;
    letter-spacing: 0.08em;
  }

  .queue-row {
    grid-template-columns: 44px minmax(0, 1fr) 76px;
    gap: 12px;
    padding: 12px 16px;
  }

  .q-thumb {
    width: 40px;
    height: 40px;
  }

  .q-status {
    font-size: 9.5px;
    letter-spacing: 0.08em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mote {
    animation: none;
  }
}
</style>
