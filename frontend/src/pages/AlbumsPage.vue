<script setup lang="ts">
import type { Album } from '../types/album'

import { onMounted, ref } from 'vue'
import AlbumCard from '../components/AlbumCard.vue'
import { createAlbum, listAlbums } from '../services/album'

const albums = ref<Album[]>([])
const loading = ref(false)
const creating = ref(false)
const errorMessage = ref<string | null>(null)

const newName = ref('')
const newDescription = ref('')

async function loadAlbums(): Promise<void> {
  loading.value = true
  errorMessage.value = null

  try {
    const payload = await listAlbums()
    albums.value = payload.items
  }
  catch {
    errorMessage.value = 'Failed to load albums.'
  }
  finally {
    loading.value = false
  }
}

async function handleCreateAlbum(): Promise<void> {
  const name = newName.value.trim()
  if (!name || creating.value) {
    return
  }

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
    errorMessage.value = 'Failed to create album.'
  }
  finally {
    creating.value = false
  }
}

onMounted(async () => {
  await loadAlbums()
})
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold text-ts-accent">
        Albums
      </h1>
      <p class="text-ts-muted">
        Create and browse albums with cover photos and quick counts.
      </p>
    </header>

    <form
      class="grid gap-3 rounded-xl border border-white/10 bg-ts-panel p-4 md:grid-cols-[1fr,2fr,auto]"
      @submit.prevent="handleCreateAlbum"
    >
      <input
        v-model="newName"
        type="text"
        placeholder="Album name"
        class="rounded border border-white/15 bg-ts-panelSoft px-3 py-2 text-sm text-ts-text outline-none focus:border-ts-accent"
      >
      <input
        v-model="newDescription"
        type="text"
        placeholder="Description (optional)"
        class="rounded border border-white/15 bg-ts-panelSoft px-3 py-2 text-sm text-ts-text outline-none focus:border-ts-accent"
      >
      <button
        type="submit"
        :disabled="creating"
        class="rounded border border-ts-accent/60 px-4 py-2 text-sm font-semibold text-ts-accent transition hover:bg-ts-accent hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ creating ? "Creating..." : "Create Album" }}
      </button>
    </form>

    <p v-if="errorMessage" class="rounded border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {{ errorMessage }}
    </p>

    <p v-if="loading" class="text-sm text-ts-muted">
      Loading albums...
    </p>
    <p
      v-else-if="albums.length === 0"
      class="rounded-lg border border-white/10 bg-ts-panel px-4 py-5 text-sm text-ts-muted"
    >
      No albums yet. Create your first album above.
    </p>

    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <RouterLink
        v-for="album in albums"
        :key="album.id"
        :to="`/albums/${album.id}`"
        class="block"
      >
        <AlbumCard :album="album" />
      </RouterLink>
    </div>
  </section>
</template>
