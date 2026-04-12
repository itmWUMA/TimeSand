<script setup lang="ts">
import type { StorageInfo } from '../services/settings'
import { computed, onMounted, ref } from 'vue'
import { getStorageInfo } from '../services/settings'
import { SLIDESHOW_INTERVAL_OPTIONS, useSettingsStore } from '../stores/settings'

const settingsStore = useSettingsStore()

const loadingStorage = ref(false)
const storageInfo = ref<StorageInfo | null>(null)
const errorMessage = ref<string | null>(null)

const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.1.0'

const slideshowInterval = computed({
  get: () => settingsStore.getInterval(),
  set: (value: number) => settingsStore.setInterval(value),
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

async function loadStorageInfo(): Promise<void> {
  loadingStorage.value = true
  errorMessage.value = null

  try {
    storageInfo.value = await getStorageInfo()
  }
  catch {
    errorMessage.value = 'Failed to load storage information.'
  }
  finally {
    loadingStorage.value = false
  }
}

onMounted(async () => {
  await loadStorageInfo()
})
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold text-ts-accent">
        Settings
      </h1>
      <p class="text-ts-muted">
        Manage storage overview, slideshow defaults, and app information.
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
          Storage Info
        </h2>
        <button
          type="button"
          class="rounded border border-white/25 px-3 py-1 text-xs text-ts-muted transition hover:border-white/40 hover:text-ts-text"
          @click="loadStorageInfo"
        >
          Refresh
        </button>
      </div>

      <p
        v-if="loadingStorage"
        class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3 text-sm text-ts-muted"
      >
        Loading storage info...
      </p>

      <div v-else-if="storageInfo" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3">
          <p class="text-xs uppercase tracking-wide text-ts-muted">
            Photos
          </p>
          <p class="mt-1 text-lg font-semibold text-ts-text">
            {{ storageInfo.photo_count }}
          </p>
        </article>
        <article class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3">
          <p class="text-xs uppercase tracking-wide text-ts-muted">
            Music Tracks
          </p>
          <p class="mt-1 text-lg font-semibold text-ts-text">
            {{ storageInfo.music_count }}
          </p>
        </article>
        <article class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3">
          <p class="text-xs uppercase tracking-wide text-ts-muted">
            Thumbnails
          </p>
          <p class="mt-1 text-lg font-semibold text-ts-text">
            {{ storageInfo.thumbnail_count }}
          </p>
        </article>
        <article class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3">
          <p class="text-xs uppercase tracking-wide text-ts-muted">
            Photo Storage
          </p>
          <p class="mt-1 text-sm font-semibold text-ts-text">
            {{ formatBytes(storageInfo.photo_storage_bytes) }}
          </p>
        </article>
        <article class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3">
          <p class="text-xs uppercase tracking-wide text-ts-muted">
            Music Storage
          </p>
          <p class="mt-1 text-sm font-semibold text-ts-text">
            {{ formatBytes(storageInfo.music_storage_bytes) }}
          </p>
        </article>
        <article class="rounded border border-ts-accent/45 bg-ts-panelSoft px-3 py-3">
          <p class="text-xs uppercase tracking-wide text-ts-muted">
            Total Storage
          </p>
          <p class="mt-1 text-sm font-semibold text-ts-accent">
            {{ formatBytes(storageInfo.total_storage_bytes) }}
          </p>
        </article>
      </div>
    </section>

    <section class="space-y-3 rounded-xl border border-white/10 bg-ts-panel p-4">
      <h2 class="text-xl font-semibold text-ts-accent">
        Slideshow Defaults
      </h2>
      <p class="text-sm text-ts-muted">
        Applied when slideshow starts without explicit interval override.
      </p>
      <label class="flex max-w-xs items-center justify-between gap-3 text-sm text-ts-text">
        <span>Default interval</span>
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

    <section class="space-y-2 rounded-xl border border-white/10 bg-ts-panel p-4">
      <h2 class="text-xl font-semibold text-ts-accent">
        About
      </h2>
      <p class="text-sm text-ts-text">
        TimeSand
      </p>
      <p class="text-sm text-ts-muted">
        Version {{ appVersion }}
      </p>
      <a
        href="https://github.com/itmWUMA/TimeSand"
        target="_blank"
        rel="noreferrer"
        class="inline-flex w-fit rounded border border-ts-accent/60 px-3 py-1.5 text-sm font-medium text-ts-accent transition hover:bg-ts-accent hover:text-black"
      >
        GitHub Repository
      </a>
    </section>
  </section>
</template>
