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

function onDragStart(index: number, event: DragEvent): void {
  dragSourceIndex.value = index

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(localTracks.value[index]?.id ?? ''))
  }
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
        {{ $t('music.playlistTracks') }}
      </h2>
      <span class="text-xs text-ts-muted">{{ $t('music.trackCount', { count: localTracks.length }) }}</span>
    </header>

    <p
      v-if="localTracks.length === 0"
      class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3 text-sm text-ts-muted"
    >
      {{ $t('music.noPlaylistTracks') }}
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="(track, index) in localTracks"
        :key="track.id"
        :data-testid="`playlist-track-${track.id}`"
        class="flex items-center gap-3 rounded border border-white/10 bg-ts-panelSoft px-3 py-2 transition"
        :class="dragSourceIndex === index ? 'border-ts-accent/60 bg-ts-accent/10' : ''"
        @dragover.prevent
        @drop.prevent="onDrop(index)"
        @dragend="dragSourceIndex = null"
      >
        <button
          :data-testid="`playlist-track-drag-handle-${track.id}`"
          type="button"
          draggable="true"
          class="grid h-8 w-8 shrink-0 cursor-grab place-items-center rounded border-0 bg-transparent p-0 text-ts-muted transition hover:bg-white/10 hover:text-ts-text active:cursor-grabbing"
          :aria-label="`Drag ${track.title}`"
          @dragstart="onDragStart(index, $event)"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="9" cy="5" r="1" />
            <circle cx="9" cy="12" r="1" />
            <circle cx="9" cy="19" r="1" />
            <circle cx="15" cy="5" r="1" />
            <circle cx="15" cy="12" r="1" />
            <circle cx="15" cy="19" r="1" />
          </svg>
        </button>
        <span class="w-6 text-center text-xs text-ts-muted">{{ index + 1 }}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-ts-text">
            {{ track.title }}
          </p>
          <p class="truncate text-xs text-ts-muted">
            {{ track.artist || $t('music.unknownArtist') }}
          </p>
        </div>
        <button
          type="button"
          :data-testid="`remove-track-${track.id}`"
          class="rounded border border-red-400/50 px-2 py-1 text-xs text-red-200 hover:bg-red-500/10"
          @click="$emit('removeTrack', track.id)"
        >
          {{ $t('common.remove') }}
        </button>
      </li>
    </ul>
  </section>
</template>
