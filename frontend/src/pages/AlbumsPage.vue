<script setup lang="ts">
import type { Album } from '../types/album'

import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AlbumCard from '../components/AlbumCard.vue'
import TsEmptyState from '../components/TsEmptyState.vue'
import { createAlbum, listAlbums } from '../services/album'
import { ALBUM_NAME_MAX_LENGTH } from '../utils/albumValidation'

type SortMode = 'recent' | 'name' | 'count'

const { t } = useI18n()
const albums = ref<Album[]>([])
const loading = ref(false)
const creating = ref(false)
const errorMessage = ref<string | null>(null)
const nameValidationMessage = ref<string | null>(null)
const searchQuery = ref('')
const sortMode = ref<SortMode>('recent')

const newName = ref('')
const newDescription = ref('')
const newNameLength = computed(() => newName.value.length)

const filteredAlbums = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const source = query
    ? albums.value.filter(album =>
        album.name.toLowerCase().includes(query)
        || (album.description ?? '').toLowerCase().includes(query),
      )
    : albums.value

  return [...source].sort((a, b) => {
    if (sortMode.value === 'name') {
      return a.name.localeCompare(b.name)
    }
    if (sortMode.value === 'count') {
      return b.photo_count - a.photo_count
    }

    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })
})

async function loadAlbums(): Promise<void> {
  loading.value = true
  errorMessage.value = null

  try {
    const payload = await listAlbums()
    albums.value = payload.items
  }
  catch {
    errorMessage.value = t('album.loadFailed')
  }
  finally {
    loading.value = false
  }
}

async function handleCreateAlbum(): Promise<void> {
  const name = newName.value.trim()
  if (creating.value) {
    return
  }

  if (!name) {
    nameValidationMessage.value = t('album.nameRequired')
    return
  }

  if (name.length > ALBUM_NAME_MAX_LENGTH) {
    nameValidationMessage.value = t('album.nameTooLong', { max: ALBUM_NAME_MAX_LENGTH })
    return
  }

  nameValidationMessage.value = null
  creating.value = true
  errorMessage.value = null

  try {
    const album = await createAlbum({
      name,
      description: newDescription.value.trim() || null,
    })
    albums.value = [album, ...albums.value]
    newName.value = ''
    newDescription.value = ''
  }
  catch {
    errorMessage.value = t('album.createFailed')
  }
  finally {
    creating.value = false
  }
}

function onNameInput(): void {
  const name = newName.value.trim()
  if (!name) {
    nameValidationMessage.value = null
    return
  }

  if (name.length > ALBUM_NAME_MAX_LENGTH) {
    nameValidationMessage.value = t('album.nameTooLong', { max: ALBUM_NAME_MAX_LENGTH })
    return
  }

  if (name) {
    nameValidationMessage.value = null
  }
}

onMounted(async () => {
  await loadAlbums()
})
</script>

<template>
  <section class="albums-page">
    <header class="page-head">
      <div>
        <div class="h-eyebrow">
          {{ $t('album.eyebrow') }}
        </div>
        <h1 class="h-title">
          {{ $t('album.title') }}
        </h1>
        <p class="h-sub">
          {{ $t('album.description') }}
        </p>
      </div>
      <a class="btn btn-primary" href="#album-create-form">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v16M4 12h16" />
        </svg>
        {{ $t('album.newAlbum') }}
      </a>
    </header>

    <div
      data-testid="albums-toolbar"
      class="toolbar"
    >
      <label class="toolbar-search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          v-model="searchQuery"
          type="search"
          :placeholder="$t('album.searchPlaceholder')"
        >
      </label>
      <div class="toolbar-sort" :aria-label="$t('album.sortLabel')">
        <button
          type="button"
          class="sort-pill"
          :class="{ 'is-on': sortMode === 'recent' }"
          @click="sortMode = 'recent'"
        >
          {{ $t('album.sortRecent') }}
        </button>
        <button
          type="button"
          class="sort-pill"
          :class="{ 'is-on': sortMode === 'name' }"
          @click="sortMode = 'name'"
        >
          {{ $t('album.sortName') }}
        </button>
        <button
          type="button"
          class="sort-pill"
          :class="{ 'is-on': sortMode === 'count' }"
          @click="sortMode = 'count'"
        >
          {{ $t('album.sortCount') }}
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="surface-message danger">
      {{ errorMessage }}
    </p>

    <p v-if="loading" class="loading-copy">
      {{ $t('album.loadingAlbums') }}
    </p>
    <TsEmptyState
      v-else-if="albums.length === 0"
      :title="$t('empty.albums.title')"
      :description="$t('empty.albums.description')"
    />

    <div v-else class="albums-grid">
      <RouterLink
        v-for="album in filteredAlbums"
        :key="album.id"
        :to="`/albums/${album.id}`"
        class="album-card-link"
      >
        <AlbumCard :album="album" />
      </RouterLink>
    </div>

    <form
      v-if="!loading"
      id="album-create-form"
      data-testid="album-add-card"
      class="album-card add"
      @submit.prevent="handleCreateAlbum"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <p class="add-title">
        {{ $t('album.newAlbum') }}
      </p>
      <input
        v-model="newName"
        data-testid="album-name-input"
        type="text"
        :maxlength="ALBUM_NAME_MAX_LENGTH + 20"
        :placeholder="$t('album.namePlaceholder')"
        class="album-create-input"
        :class="{ 'is-invalid': nameValidationMessage }"
        @input="onNameInput"
      >
      <div class="field-feedback" :class="{ danger: nameValidationMessage }">
        <span>{{ nameValidationMessage ?? $t('album.nameLimitHint', { max: ALBUM_NAME_MAX_LENGTH }) }}</span>
        <span>{{ newNameLength }} / {{ ALBUM_NAME_MAX_LENGTH }}</span>
      </div>
      <input
        v-model="newDescription"
        type="text"
        :placeholder="$t('album.descPlaceholder')"
        class="album-create-input"
      >
      <button
        type="submit"
        :disabled="creating"
        class="btn btn-primary album-create-button"
      >
        {{ creating ? $t('common.creating') : $t('common.create') }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.albums-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.page-head .btn svg,
.album-card.add svg,
.toolbar-search svg {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.page-head .btn svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.8;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-pill);
  background: var(--ts-surface);
}

.toolbar-search {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 10px;
  color: var(--ts-muted);
}

.toolbar-search svg {
  width: 16px;
  height: 16px;
  stroke-width: 1.6;
}

.toolbar-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ts-fg);
  font-size: 14px;
}

.toolbar-search input::placeholder {
  color: var(--ts-muted-2);
}

.toolbar-sort {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
}

.sort-pill {
  border: 0;
  border-radius: var(--ts-radius-pill);
  background: transparent;
  color: inherit;
  padding: 4px 10px;
}

.sort-pill.is-on {
  background: var(--ts-surface-2);
  color: var(--ts-fg);
}

.albums-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 22px;
}

.album-card-link {
  display: block;
  min-height: 100%;
}

.album-card.add {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 10px;
  max-width: 420px;
  min-height: 280px;
  padding: 22px;
  border: 1px dashed var(--ts-border-soft);
  border-radius: var(--ts-radius-lg);
  background: transparent;
  color: var(--ts-muted);
  transition:
    color var(--ts-duration-normal) var(--ts-ease),
    border-color var(--ts-duration-normal) var(--ts-ease);
}

.album-card.add:hover,
.album-card.add:focus-within {
  border-color: var(--ts-accent-soft);
  color: var(--ts-accent);
}

.album-card.add svg {
  width: 22px;
  height: 22px;
  stroke-width: 1.6;
}

.add-title {
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.album-create-input {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-pill);
  outline: none;
  background: var(--ts-bg-deep);
  color: var(--ts-fg);
  padding: 8px 14px;
  font-size: 14px;
}

.album-create-input:focus {
  border-color: var(--ts-accent);
}

.album-create-input.is-invalid {
  border-color: oklch(65% 0.16 25);
}

.field-feedback {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  color: var(--ts-muted);
  font-size: 11px;
}

.field-feedback.danger {
  color: oklch(85% 0.14 25);
}

.album-create-button {
  justify-content: center;
  width: 100%;
}

.surface-message {
  border-radius: var(--ts-radius);
  padding: 14px 16px;
  font-size: 14px;
}

.surface-message.danger {
  border: 1px solid oklch(60% 0.18 25 / 55%);
  background: oklch(30% 0.08 25 / 24%);
  color: oklch(85% 0.14 25);
}

.loading-copy {
  color: var(--ts-muted);
  font-size: 14px;
}

@media (max-width: 720px) {
  .albums-page {
    gap: 22px;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 14px 16px;
    border-radius: var(--ts-radius-lg);
  }

  .toolbar-search {
    border: 1px solid var(--ts-border-soft);
    border-radius: var(--ts-radius-pill);
    background: var(--ts-bg-deep);
    padding: 8px 14px;
  }

  .toolbar-search input {
    font-size: 16px;
  }

  .toolbar-sort {
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .sort-pill {
    flex-shrink: 0;
    padding: 6px 12px;
  }

  .albums-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 14px;
  }

  .album-create-input,
  .album-create-button,
  .album-card-link {
    min-height: 44px;
  }

  .album-create-input {
    font-size: 16px;
  }
}

@media (max-width: 380px) {
  .albums-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
