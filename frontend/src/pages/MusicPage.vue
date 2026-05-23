<script setup lang="ts">
import type { Music, Playlist } from '../types/music'

import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MusicUploader from '../components/MusicUploader.vue'
import TsEmptyState from '../components/TsEmptyState.vue'
import { useMusicPlayer } from '../composables/useMusicPlayer'
import { deleteMusic, listMusic, uploadMusic } from '../services/music'
import { addTrackToPlaylist, createPlaylist, deletePlaylist, getPlaylist, listPlaylists, removeTrackFromPlaylist, updatePlaylist } from '../services/playlist'

const tracks = ref<Music[]>([])
const playlists = ref<Playlist[]>([])
const selectedPlaylist = ref<Playlist | null>(null)
const selectedPlaylistId = ref<number | null>(null)
const { currentTrack, playlistId, play, setPlaylist } = useMusicPlayer()

const loadingTracks = ref(false)
const uploading = ref(false)
const creatingPlaylist = ref(false)
const errorMessage = ref<string | null>(null)
const newPlaylistName = ref('')
const newPlaylistInput = ref<HTMLInputElement | null>(null)
const dragSourceIndex = ref<number | null>(null)
const { t } = useI18n()

const playlistPalettes = [
  'linear-gradient(135deg, var(--ts-accent), var(--ts-accent-deep))',
  'linear-gradient(135deg, oklch(50% 0.08 200), oklch(28% 0.05 220))',
  'linear-gradient(135deg, oklch(50% 0.08 130), oklch(28% 0.04 150))',
  'linear-gradient(135deg, oklch(45% 0.07 30), oklch(26% 0.04 25))',
  'linear-gradient(135deg, oklch(50% 0.08 290), oklch(28% 0.05 280))',
]

const trackPalettes = [
  'linear-gradient(135deg, oklch(60% 0.08 70), oklch(35% 0.05 50))',
  'linear-gradient(135deg, oklch(50% 0.06 30), oklch(28% 0.04 25))',
  'linear-gradient(135deg, oklch(55% 0.08 200), oklch(32% 0.05 220))',
  'linear-gradient(135deg, oklch(48% 0.07 130), oklch(28% 0.04 150))',
  'linear-gradient(135deg, oklch(50% 0.08 290), oklch(28% 0.05 280))',
]

const selectedTrackIds = computed<Set<number>>(() => {
  const ids = new Set<number>()
  for (const track of selectedPlaylist.value?.tracks ?? []) {
    ids.add(track.id)
  }
  return ids
})
const selectedTracks = computed(() => selectedPlaylist.value?.tracks ?? [])
const selectedPlaylistTrackCount = computed(() => selectedPlaylist.value?.track_count ?? selectedTracks.value.length)
const selectedPlaylistDuration = computed(() => {
  return selectedTracks.value.reduce((total, track) => total + (track.duration ?? 0), 0)
})
const selectedPlaylistUpdated = computed(() => {
  const rawDate = selectedPlaylist.value?.created_at
  if (!rawDate) {
    return t('common.none')
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(rawDate))
  }
  catch {
    return rawDate
  }
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

function formatTotalDuration(value: number): string {
  if (value <= 0) {
    return formatDuration(0)
  }

  const totalMinutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function playlistCoverStyle(index: number) {
  return { background: playlistPalettes[index % playlistPalettes.length] }
}

function trackCoverStyle(index: number) {
  return { background: trackPalettes[index % trackPalettes.length] }
}

function selectPlaylist(nextPlaylistId: number): void {
  selectedPlaylistId.value = nextPlaylistId
}

function focusNewPlaylist(): void {
  newPlaylistInput.value?.focus()
}

function scrollToUploader(): void {
  document.getElementById('music-uploader')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

async function playSelectedPlaylist(): Promise<void> {
  if (selectedPlaylistId.value == null || selectedTracks.value.length === 0) {
    return
  }

  await setPlaylist(selectedPlaylistId.value)
  await play()
}

async function shuffleSelectedPlaylist(): Promise<void> {
  if (!selectedPlaylist.value || selectedTracks.value.length <= 1) {
    return
  }

  const shuffledIds = [...selectedTracks.value]
    .sort(() => Math.random() - 0.5)
    .map(track => track.id)

  await reorderTracks(shuffledIds)
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
    const hasPlayerPlaylist = payload.items.some(item => item.id === playlistId.value)
    selectedPlaylistId.value = hasPlayerPlaylist
      ? playlistId.value
      : payload.items[0].id
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

function onSelectedTrackDragStart(index: number): void {
  dragSourceIndex.value = index
}

function onSelectedTrackDrop(targetIndex: number): void {
  const sourceIndex = dragSourceIndex.value
  dragSourceIndex.value = null

  if (sourceIndex === null || sourceIndex === targetIndex) {
    return
  }

  const reordered = [...selectedTracks.value]
  const [movedTrack] = reordered.splice(sourceIndex, 1)
  reordered.splice(targetIndex, 0, movedTrack)
  void reorderTracks(reordered.map(track => track.id))
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

watch(selectedPlaylistId, async (nextPlaylistId) => {
  errorMessage.value = null
  try {
    await loadSelectedPlaylist()
    await setPlaylist(nextPlaylistId)
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
  <section class="music-surface">
    <header class="page-head">
      <div>
        <div class="h-eyebrow">
          {{ $t('music.eyebrow') }}
        </div>
        <h1 class="h-title">
          {{ $t('music.title') }}
        </h1>
        <p class="h-sub">
          {{ $t('music.description') }}
        </p>
      </div>
      <div class="music-head-actions">
        <button type="button" class="btn" @click="scrollToUploader">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 16V4M6 10l6-6 6 6" />
            <path d="M4 20h16" />
          </svg>
          {{ $t('music.uploadAction') }}
        </button>
        <button type="button" class="btn btn-primary" @click="focusNewPlaylist">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v16M4 12h16" />
          </svg>
          {{ $t('music.newPlaylistAction') }}
        </button>
      </div>
    </header>

    <p v-if="errorMessage" class="rounded border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {{ errorMessage }}
    </p>

    <div data-testid="music-layout" class="music-layout">
      <aside data-testid="playlist-sidebar" class="playlist-side">
        <div class="playlist-side-head">
          <span class="playlist-side-title">{{ $t('music.playlistCount', { count: playlists.length }) }}</span>
          <button type="button" class="playlist-side-new" @click="focusNewPlaylist">
            {{ $t('music.newPlaylistShort') }}
          </button>
        </div>

        <form class="playlist-create" @submit.prevent="handleCreatePlaylist">
          <input
            ref="newPlaylistInput"
            v-model="newPlaylistName"
            type="text"
            :placeholder="$t('music.newPlaylistPlaceholder')"
            class="playlist-create-input"
          >
          <button type="submit" class="playlist-create-button" :disabled="creatingPlaylist">
            {{ creatingPlaylist ? $t('common.creating') : $t('common.create') }}
          </button>
        </form>

        <div class="playlist-list">
          <button
            v-for="(playlist, index) in playlists"
            :key="playlist.id"
            :data-testid="`playlist-item-${playlist.id}`"
            type="button"
            class="playlist-item"
            :class="{ 'is-on': playlist.id === selectedPlaylistId }"
            @click="selectPlaylist(playlist.id)"
          >
            <span class="playlist-cover" :style="playlistCoverStyle(index)" aria-hidden="true" />
            <span class="playlist-copy">
              <span class="playlist-name">{{ playlist.name }}</span>
              <span class="playlist-meta">
                {{ $t('music.playlistMeta', { count: playlist.track_count }) }}
                <template v-if="playlist.is_default">
                  · {{ $t('music.defaultPlaylist') }}
                </template>
              </span>
            </span>
            <span class="playlist-count num">{{ playlist.track_count }}</span>
          </button>
        </div>

        <div id="music-uploader" class="music-side-panel">
          <MusicUploader :uploading="uploading" @upload="handleUpload" />
        </div>
      </aside>

      <section class="playlist-main">
        <div data-testid="playlist-hero" class="playlist-hero">
          <div class="playlist-art" aria-hidden="true" />
          <div class="playlist-hero-info">
            <div class="h-eyebrow">
              {{ selectedPlaylist?.is_default ? $t('music.defaultPlaylist') : $t('music.playlistEyebrow') }}
            </div>
            <h2>{{ selectedPlaylist?.name ?? $t('music.noPlaylistSelected') }}</h2>
            <p class="playlist-hero-desc">
              {{ selectedPlaylist ? $t('music.heroDescription') : $t('music.noPlaylistDescription') }}
            </p>
            <div class="playlist-hero-meta">
              <span><span class="accent">{{ selectedPlaylistTrackCount }}</span> {{ $t('music.trackUnit') }} · {{ formatTotalDuration(selectedPlaylistDuration) }}</span>
              <span>{{ $t('music.updatedAt', { date: selectedPlaylistUpdated }) }}</span>
            </div>
            <div class="playlist-hero-actions">
              <button
                type="button"
                class="btn btn-primary"
                :disabled="selectedTracks.length === 0"
                @click="playSelectedPlaylist"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 4l14 8L6 20V4z" />
                </svg>
                {{ $t('music.playFromStart') }}
              </button>
              <button
                type="button"
                class="btn"
                :disabled="selectedTracks.length <= 1"
                @click="shuffleSelectedPlaylist"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" />
                </svg>
                {{ $t('music.shuffle') }}
              </button>
              <button type="button" class="btn" @click="scrollToUploader">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 16V4M6 10l6-6 6 6" />
                  <path d="M4 20h16" />
                </svg>
                {{ $t('music.addTracks') }}
              </button>
              <button
                type="button"
                class="btn btn-ghost"
                :disabled="!selectedPlaylist || selectedPlaylist.is_default"
                @click="handleDeletePlaylist"
              >
                {{ $t('music.deletePlaylist') }}
              </button>
            </div>
          </div>
        </div>

        <div data-testid="music-track-table" class="track-table">
          <div class="track-head">
            <span>#</span>
            <span>{{ $t('music.trackColumn') }}</span>
            <span>{{ $t('music.sourceColumn') }}</span>
            <span>{{ $t('music.lengthColumn') }}</span>
            <span />
          </div>

          <div v-if="selectedTracks.length === 0" class="empty-hint">
            <strong>{{ $t('music.noPlaylistTracks') }}</strong>
            <span>{{ $t('music.addFromLibraryHint') }}</span>
          </div>

          <div
            v-for="(track, index) in selectedTracks"
            v-else
            :key="track.id"
            class="track-row"
            :class="{ 'is-playing': currentTrack?.id === track.id }"
            draggable="true"
            @dragstart="onSelectedTrackDragStart(index)"
            @dragover.prevent
            @drop.prevent="onSelectedTrackDrop(index)"
            @dragend="dragSourceIndex = null"
          >
            <span class="track-num num">{{ String(index + 1).padStart(2, '0') }}</span>
            <div class="track-name">
              <span class="track-cover" :style="trackCoverStyle(index)" aria-hidden="true" />
              <span class="track-copy">
                <span class="track-title">{{ track.title }}</span>
                <span class="track-artist">{{ track.artist || $t('music.unknownArtist') }}</span>
              </span>
            </div>
            <span class="track-source">{{ track.filename }}</span>
            <span class="track-length num">{{ formatDuration(track.duration) }}</span>
            <button
              type="button"
              class="track-remove"
              :aria-label="$t('music.removeTrackLabel', { title: track.title })"
              @click="removeTrack(track.id)"
            >
              {{ $t('common.remove') }}
            </button>
          </div>
        </div>

        <section data-testid="music-library-panel" class="music-library-panel">
          <header class="music-panel-head">
            <div>
              <div class="h-eyebrow">
                {{ $t('music.libraryEyebrow') }}
              </div>
              <h3>{{ $t('music.allTracks') }}</h3>
            </div>
            <span class="num">{{ $t('music.trackCount', { count: tracks.length }) }}</span>
          </header>

          <p v-if="loadingTracks" class="library-loading">
            {{ $t('music.loadingTracks') }}
          </p>
          <TsEmptyState
            v-else-if="tracks.length === 0"
            :title="$t('empty.music.title')"
            :description="$t('empty.music.description')"
          />
          <div v-else class="library-list">
            <div v-for="(track, index) in tracks" :key="track.id" class="library-row">
              <span class="track-cover" :style="trackCoverStyle(index)" aria-hidden="true" />
              <span class="library-copy">
                <span>{{ track.title }}</span>
                <span>{{ track.artist || $t('music.unknownArtist') }} · {{ formatDuration(track.duration) }}</span>
              </span>
              <button
                type="button"
                class="library-action"
                :disabled="!selectedPlaylistId || selectedTrackIds.has(track.id)"
                @click="addTrack(track.id)"
              >
                {{ selectedTrackIds.has(track.id) ? $t('common.added') : $t('common.add') }}
              </button>
              <button type="button" class="library-delete" @click="removeMusic(track.id)">
                {{ $t('common.delete') }}
              </button>
            </div>
          </div>
        </section>
      </section>
    </div>
  </section>
</template>

<style scoped>
.music-surface {
  padding-bottom: calc(var(--ts-player-main-padding, 5rem) + 1rem);
}

.music-head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.music-head-actions svg,
.playlist-hero-actions svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.playlist-hero-actions .btn-primary svg {
  fill: currentColor;
  stroke: none;
}

.music-layout {
  display: grid;
  grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
  align-items: start;
  gap: 28px;
}

.playlist-side {
  overflow: hidden;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-lg);
  background: var(--ts-surface);
}

.playlist-side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--ts-border-soft);
}

.playlist-side-title,
.playlist-side-new {
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.playlist-side-new {
  border: 0;
  background: transparent;
  color: var(--ts-accent);
}

.playlist-create {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--ts-border-soft);
}

.playlist-create-input,
.playlist-create-button {
  min-height: 38px;
  border-radius: var(--ts-radius-md);
  font-size: 13px;
}

.playlist-create-input {
  min-width: 0;
  border: 1px solid var(--ts-border);
  background: var(--ts-surface-2);
  color: var(--ts-fg);
  outline: none;
  padding: 0 12px;
}

.playlist-create-input:focus {
  border-color: var(--ts-accent);
}

.playlist-create-button {
  border: 1px solid var(--ts-accent-soft);
  background: oklch(78% 0.14 72 / 10%);
  color: var(--ts-accent);
  padding: 0 12px;
}

.playlist-create-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.playlist-list {
  display: grid;
}

.playlist-item {
  position: relative;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 18px;
  border: 0;
  border-bottom: 1px solid var(--ts-border-soft);
  background: transparent;
  color: var(--ts-fg);
  text-align: left;
}

.playlist-item:hover,
.playlist-item.is-on {
  background: var(--ts-surface-2);
}

.playlist-item.is-on::before {
  content: "";
  position: absolute;
  top: 14px;
  bottom: 14px;
  left: 0;
  width: 2px;
  border-radius: 2px;
  background: var(--ts-accent);
}

.playlist-cover,
.track-cover {
  display: block;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 6px;
  box-shadow: 0 8px 20px rgb(0 0 0 / 28%);
}

.playlist-cover {
  width: 44px;
  height: 44px;
}

.playlist-copy,
.track-copy,
.library-copy {
  min-width: 0;
}

.playlist-name,
.track-title,
.library-copy span:first-child {
  display: block;
  overflow: hidden;
  color: var(--ts-fg);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-name {
  font-size: 13.5px;
  line-height: 1.25;
}

.playlist-meta,
.track-artist,
.library-copy span:last-child {
  display: block;
  overflow: hidden;
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 10.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-count {
  color: var(--ts-muted);
  font-size: 11px;
}

.music-side-panel {
  padding: 16px 18px 18px;
}

.playlist-main {
  min-width: 0;
}

.playlist-hero {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  align-items: end;
  gap: 32px;
  margin-bottom: 24px;
  padding: 18px 4px 30px;
  border-bottom: 1px solid var(--ts-border-soft);
}

.playlist-art {
  position: relative;
  width: 220px;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--ts-radius);
  background:
    radial-gradient(circle at 30% 25%, var(--ts-accent-soft), transparent 55%),
    linear-gradient(135deg, oklch(45% 0.06 60), oklch(22% 0.03 50));
  box-shadow: 0 20px 50px -16px rgb(0 0 0 / 60%);
}

.playlist-art::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at center, transparent 0 14px, oklch(78% 0.14 72 / 34%) 15px 16px, transparent 17px 42px, oklch(78% 0.14 72 / 26%) 43px 44px, transparent 45px 70px, oklch(78% 0.14 72 / 20%) 71px 72px, transparent 73px),
    radial-gradient(circle at 100% 0%, oklch(90% 0.08 80 / 18%), transparent 48%);
}

.playlist-hero-info h2 {
  margin: 8px 0 12px;
  font-family: var(--ts-font-display);
  font-size: clamp(36px, 4.4vw, 54px);
  font-weight: 500;
  line-height: 1.05;
}

.playlist-hero-desc {
  max-width: 56ch;
  margin-bottom: 16px;
  color: var(--ts-fg-soft);
  font-size: 14px;
}

.playlist-hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-bottom: 20px;
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
}

.playlist-hero-meta .accent {
  color: var(--ts-accent);
}

.playlist-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.playlist-hero-actions .btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.track-table {
  display: grid;
  gap: 2px;
}

.track-head,
.track-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1.2fr) minmax(0, 1fr) 60px auto;
  align-items: center;
  gap: 18px;
}

.track-head {
  padding: 0 18px 10px;
  color: var(--ts-muted-2);
  font-family: var(--ts-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.track-row {
  min-height: 64px;
  padding: 12px 18px;
  border-radius: var(--ts-radius-md);
}

.track-row:hover,
.track-row.is-playing {
  background: var(--ts-surface);
}

.track-row.is-playing .track-num {
  color: var(--ts-accent);
}

.track-num,
.track-length {
  color: var(--ts-muted);
  font-size: 11px;
}

.track-name {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 14px;
}

.track-cover {
  width: 40px;
  height: 40px;
}

.track-title {
  font-size: 14px;
}

.track-source {
  overflow: hidden;
  color: var(--ts-muted);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-length {
  text-align: right;
}

.track-remove,
.library-action,
.library-delete {
  min-height: 32px;
  border-radius: var(--ts-radius-pill);
  font-size: 12px;
  padding: 0 10px;
}

.track-remove,
.library-delete {
  border: 1px solid oklch(60% 0.18 25 / 45%);
  background: transparent;
  color: oklch(78% 0.14 25);
}

.track-remove:hover,
.library-delete:hover {
  background: oklch(30% 0.08 25 / 40%);
}

.empty-hint {
  display: grid;
  gap: 4px;
  margin-top: 16px;
  padding: 30px;
  border: 1.5px dashed var(--ts-border);
  border-radius: var(--ts-radius);
  color: var(--ts-muted);
  font-size: 13px;
  text-align: center;
}

.empty-hint strong {
  color: var(--ts-fg-soft);
}

.music-library-panel {
  margin-top: 30px;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-lg);
  background: var(--ts-surface);
  padding: 20px;
}

.music-panel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.music-panel-head h3 {
  margin: 4px 0 0;
  font-family: var(--ts-font-display);
  font-size: 20px;
  font-weight: 500;
}

.library-loading {
  border-radius: var(--ts-radius-md);
  background: var(--ts-surface-2);
  color: var(--ts-muted);
  font-size: 13px;
  padding: 14px;
}

.library-list {
  display: grid;
  gap: 8px;
}

.library-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  min-height: 58px;
  border-radius: var(--ts-radius-md);
  background: var(--ts-surface-2);
  padding: 9px 12px;
}

.library-action {
  border: 1px solid var(--ts-accent-soft);
  background: oklch(78% 0.14 72 / 10%);
  color: var(--ts-accent);
}

.library-action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@media (max-width: 880px) {
  .music-layout,
  .playlist-hero {
    grid-template-columns: 1fr;
  }

  .playlist-art {
    width: 160px;
  }

  .track-head,
  .track-row {
    grid-template-columns: 36px minmax(0, 1fr) 60px auto;
  }

  .track-head > :nth-child(3),
  .track-row > :nth-child(3) {
    display: none;
  }
}

@media (max-width: 720px) {
  .music-head-actions,
  .playlist-hero-actions {
    gap: 8px;
  }

  .playlist-side {
    border-radius: var(--ts-radius);
  }

  .playlist-side-head,
  .playlist-create,
  .playlist-item {
    padding-inline: 14px;
  }

  .playlist-item {
    grid-template-columns: 40px minmax(0, 1fr) auto;
    gap: 10px;
  }

  .playlist-cover {
    width: 40px;
    height: 40px;
  }

  .playlist-hero {
    gap: 18px;
    margin-bottom: 18px;
    padding: 4px 4px 22px;
  }

  .playlist-art {
    width: 140px;
  }

  .playlist-hero-info h2 {
    font-size: clamp(28px, 8vw, 40px);
  }

  .playlist-hero-meta {
    gap: 12px;
    font-size: 10px;
  }

  .track-head,
  .track-row {
    grid-template-columns: 30px minmax(0, 1fr) auto;
    gap: 12px;
    padding-inline: 12px;
  }

  .track-head > :nth-child(4),
  .track-row > :nth-child(4) {
    display: none;
  }

  .track-name {
    gap: 10px;
  }

  .track-cover {
    width: 36px;
    height: 36px;
  }

  .track-title {
    font-size: 13px;
  }

  .track-artist {
    font-size: 10.5px;
  }

  .library-row {
    grid-template-columns: 36px minmax(0, 1fr) auto;
  }

  .library-delete {
    grid-column: 2 / -1;
    justify-self: start;
  }
}
</style>
