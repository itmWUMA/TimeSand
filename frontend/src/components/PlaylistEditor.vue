<script setup lang="ts">
import type { Music } from '../types/music'

import { ref, watch } from 'vue'

const props = defineProps<{
  tracks: Music[]
}>()

const emit = defineEmits<{
  removeTrack: [musicId: number]
  reorder: [trackIds: number[]]
}>()

const localTracks = ref<Music[]>([])
const dragSourceIndex = ref<number | null>(null)

watch(
  () => props.tracks,
  (tracks) => {
    localTracks.value = [...tracks]
  },
  { immediate: true },
)

function onDragStart(index: number): void {
  dragSourceIndex.value = index
}

function onDrop(targetIndex: number): void {
  const sourceIndex = dragSourceIndex.value
  dragSourceIndex.value = null

  if (sourceIndex === null || sourceIndex === targetIndex) {
    return
  }

  const reordered = [...localTracks.value]
  const [movedTrack] = reordered.splice(sourceIndex, 1)
  reordered.splice(targetIndex, 0, movedTrack)

  localTracks.value = reordered
  emit(
    'reorder',
    reordered.map(track => track.id),
  )
}
</script>

<template>
  <section class="space-y-3 rounded-xl border border-white/10 bg-ts-panel p-4">
    <header class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-ts-accent">
        Playlist Tracks
      </h2>
      <span class="text-xs text-ts-muted">{{ localTracks.length }} tracks</span>
    </header>

    <p
      v-if="localTracks.length === 0"
      class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3 text-sm text-ts-muted"
    >
      No tracks in this playlist yet.
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="(track, index) in localTracks"
        :key="track.id"
        :data-testid="`playlist-track-${track.id}`"
        draggable="true"
        class="flex items-center gap-3 rounded border border-white/10 bg-ts-panelSoft px-3 py-2"
        @dragstart="onDragStart(index)"
        @dragover.prevent
        @drop.prevent="onDrop(index)"
        @dragend="dragSourceIndex = null"
      >
        <span class="w-6 text-center text-xs text-ts-muted">{{ index + 1 }}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-ts-text">
            {{ track.title }}
          </p>
          <p class="truncate text-xs text-ts-muted">
            {{ track.artist || "Unknown Artist" }}
          </p>
        </div>
        <button
          type="button"
          :data-testid="`remove-track-${track.id}`"
          class="rounded border border-red-400/50 px-2 py-1 text-xs text-red-200 hover:bg-red-500/10"
          @click="$emit('removeTrack', track.id)"
        >
          Remove
        </button>
      </li>
    </ul>
  </section>
</template>
