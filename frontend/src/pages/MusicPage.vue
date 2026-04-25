<script setup lang="ts">
import type { Music, Playlist } from '../types/music'

import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MusicUploader from '../components/MusicUploader.vue'
import PlaylistEditor from '../components/PlaylistEditor.vue'
import { deleteMusic, listMusic, uploadMusic } from '../services/music'
import { addTrackToPlaylist, createPlaylist, deletePlaylist, getPlaylist, listPlaylists, removeTrackFromPlaylist, updatePlaylist } from '../services/playlist'

const tracks = ref<Music[]>([])
const playlists = ref<Playlist[]>([])
const selectedPlaylist = ref<Playlist | null>(null)
const selectedPlaylistId = ref<number | null>(null)

const loadingTracks = ref(false)
const uploading = ref(false)
const creatingPlaylist = ref(false)
const errorMessage = ref<string | null>(null)
const newPlaylistName = ref('')
const { t } = useI18n()

const selectedTrackIds = computed<Set<number>>(() => {
  const ids = new Set<number>()
  for (const track of selectedPlaylist.value?.tracks ?? []) {
    ids.add(track.id)
  }
  return ids
})

function formatDuration(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return '--:--'
  }

  const totalSeconds = Math.max(0, Math.floor(value))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

async function loadTracks(): Promise<void> {
  loadingTracks.value = true
  try {
    const payload = await listMusic(1, 100)
    tracks.value = payload.items
  }
  finally {
    loadingTracks.value = false
  }
}

async function loadPlaylists(): Promise<void> {
  const payload = await listPlaylists()
  playlists.value = payload.items

  if (payload.items.length === 0) {
    selectedPlaylistId.value = null
    selectedPlaylist.value = null
    return
  }

  const hasSelected = payload.items.some(item => item.id === selectedPlaylistId.value)
  if (!hasSelected) {
    selectedPlaylistId.value = payload.items[0].id
  }
}

async function loadSelectedPlaylist(): Promise<void> {
  if (selectedPlaylistId.value == null) {
    selectedPlaylist.value = null
    return
  }
  selectedPlaylist.value = await getPlaylist(selectedPlaylistId.value)
}

async function handleUpload(files: File[]): Promise<void> {
  if (uploading.value) {
    return
  }

  uploading.value = true
  errorMessage.value = null

  try {
    await uploadMusic(files)
    await loadTracks()
  }
  catch {
    errorMessage.value = t('music.uploadFailed')
  }
  finally {
    uploading.value = false
  }
}

async function handleCreatePlaylist(): Promise<void> {
  const name = newPlaylistName.value.trim()
  if (!name || creatingPlaylist.value) {
    return
  }

  creatingPlaylist.value = true
  errorMessage.value = null

  try {
    const created = await createPlaylist(name)
    await loadPlaylists()
    selectedPlaylistId.value = created.id
    await loadSelectedPlaylist()
    newPlaylistName.value = ''
  }
  catch {
    errorMessage.value = t('music.createFailed')
  }
  finally {
    creatingPlaylist.value = false
  }
}

async function handleDeletePlaylist(): Promise<void> {
  if (!selectedPlaylist.value || selectedPlaylist.value.is_default) {
    return
  }

  errorMessage.value = null
  try {
    await deletePlaylist(selectedPlaylist.value.id)
    await loadPlaylists()
    await loadSelectedPlaylist()
  }
  catch {
    errorMessage.value = t('music.deletePlaylistFailed')
  }
}

async function addTrack(musicId: number): Promise<void> {
  if (selectedPlaylistId.value == null) {
    return
  }

  errorMessage.value = null
  try {
    await addTrackToPlaylist(selectedPlaylistId.value, musicId)
    await loadPlaylists()
    await loadSelectedPlaylist()
  }
  catch {
    errorMessage.value = t('music.addTrackFailed')
  }
}

async function removeTrack(musicId: number): Promise<void> {
  if (selectedPlaylistId.value == null) {
    return
  }

  errorMessage.value = null
  try {
    await removeTrackFromPlaylist(selectedPlaylistId.value, musicId)
    await loadPlaylists()
    await loadSelectedPlaylist()
  }
  catch {
    errorMessage.value = t('music.removeTrackFailed')
  }
}

async function reorderTracks(trackIds: number[]): Promise<void> {
  if (selectedPlaylist.value == null) {
    return
  }

  errorMessage.value = null
  try {
    selectedPlaylist.value = await updatePlaylist(selectedPlaylist.value.id, {
      name: selectedPlaylist.value.name,
      track_ids: trackIds,
    })
    await loadPlaylists()
  }
  catch {
    errorMessage.value = t('music.reorderFailed')
  }
}

async function removeMusic(musicId: number): Promise<void> {
  errorMessage.value = null
  try {
    await deleteMusic(musicId)
    await loadTracks()
    await loadPlaylists()
    await loadSelectedPlaylist()
  }
  catch {
    errorMessage.value = t('music.deleteTrackFailed')
  }
}

watch(selectedPlaylistId, async () => {
  errorMessage.value = null
  try {
    await loadSelectedPlaylist()
  }
  catch {
    selectedPlaylist.value = null
    errorMessage.value = t('music.loadPlaylistFailed')
  }
})

onMounted(async () => {
  try {
    await loadTracks()
    await loadPlaylists()
    await loadSelectedPlaylist()
  }
  catch {
    errorMessage.value = t('music.loadFailed')
  }
})
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold text-ts-accent">
        {{ $t('music.title') }}
      </h1>
      <p class="text-ts-muted">
        {{ $t('music.description') }}
      </p>
    </header>

    <MusicUploader :uploading="uploading" @upload="handleUpload" />

    <p v-if="errorMessage" class="rounded border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {{ errorMessage }}
    </p>

    <div class="grid gap-6 xl:grid-cols-[1.2fr,1fr]">
      <section class="space-y-3 rounded-xl border border-white/10 bg-ts-panel p-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-ts-accent">
            {{ $t('music.allTracks') }}
          </h2>
          <span class="text-xs text-ts-muted">{{ $t('music.trackCount', { count: tracks.length }) }}</span>
        </div>

        <p
          v-if="loadingTracks"
          class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3 text-sm text-ts-muted"
        >
          {{ $t('music.loadingTracks') }}
        </p>
        <p
          v-else-if="tracks.length === 0"
          class="rounded border border-white/10 bg-ts-panelSoft px-3 py-3 text-sm text-ts-muted"
        >
          {{ $t('music.emptyState') }}
        </p>

        <ul v-else class="space-y-2">
          <li
            v-for="track in tracks"
            :key="track.id"
            class="flex items-center gap-3 rounded border border-white/10 bg-ts-panelSoft px-3 py-2"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-ts-text">
                {{ track.title }}
              </p>
              <p class="truncate text-xs text-ts-muted">
                {{ track.artist || $t('music.unknownArtist') }} · {{ formatDuration(track.duration) }}
              </p>
            </div>
            <button
              type="button"
              class="rounded border border-ts-accent/50 px-2 py-1 text-xs text-ts-accent disabled:opacity-40"
              :disabled="!selectedPlaylistId || selectedTrackIds.has(track.id)"
              @click="addTrack(track.id)"
            >
              {{ selectedTrackIds.has(track.id) ? $t('common.added') : $t('common.add') }}
            </button>
            <button
              type="button"
              class="rounded border border-red-400/50 px-2 py-1 text-xs text-red-200 hover:bg-red-500/10"
              @click="removeMusic(track.id)"
            >
              {{ $t('common.delete') }}
            </button>
          </li>
        </ul>
      </section>

      <section class="space-y-4">
        <div class="space-y-3 rounded-xl border border-white/10 bg-ts-panel p-4">
          <h2 class="text-xl font-semibold text-ts-accent">
            {{ $t('music.playlists') }}
          </h2>

          <form class="flex gap-2" @submit.prevent="handleCreatePlaylist">
            <input
              v-model="newPlaylistName"
              type="text"
              :placeholder="$t('music.newPlaylistPlaceholder')"
              class="flex-1 rounded border border-white/15 bg-ts-panelSoft px-3 py-2 text-sm text-ts-text outline-none focus:border-ts-accent"
            >
            <button
              type="submit"
              :disabled="creatingPlaylist"
              class="rounded border border-ts-accent/60 px-3 py-2 text-sm font-semibold text-ts-accent hover:bg-ts-accent hover:text-black disabled:opacity-50"
            >
              {{ creatingPlaylist ? $t('common.creating') : $t('common.create') }}
            </button>
          </form>

          <div class="space-y-2">
            <label class="text-xs uppercase tracking-wide text-ts-muted">{{ $t('music.selectedPlaylist') }}</label>
            <select
              v-model.number="selectedPlaylistId"
              class="w-full rounded border border-white/15 bg-ts-panelSoft px-3 py-2 text-sm text-ts-text outline-none focus:border-ts-accent"
            >
              <option v-for="playlist in playlists" :key="playlist.id" :value="playlist.id">
                {{ playlist.name }} ({{ playlist.track_count }})
              </option>
            </select>
          </div>

          <button
            type="button"
            class="rounded border border-red-400/50 px-3 py-2 text-sm text-red-200 disabled:opacity-40"
            :disabled="!selectedPlaylist || selectedPlaylist.is_default"
            @click="handleDeletePlaylist"
          >
            {{ $t('music.deletePlaylist') }}
          </button>
        </div>

        <PlaylistEditor
          :tracks="selectedPlaylist?.tracks ?? []"
          @remove-track="removeTrack"
          @reorder="reorderTracks"
        />
      </section>
    </div>
  </section>
</template>
