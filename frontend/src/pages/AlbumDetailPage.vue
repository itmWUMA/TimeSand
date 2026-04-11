<template>
  <section class="space-y-6">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold text-ts-accent">
        {{ album?.name ?? "Album Detail" }}
      </h1>
      <p class="text-ts-muted">Manage album metadata, photos, and tags in one place.</p>
    </header>

    <p v-if="errorMessage" class="rounded border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {{ errorMessage }}
    </p>

    <p v-if="loading" class="text-sm text-ts-muted">Loading album details...</p>

    <template v-else-if="album">
      <section class="space-y-3 rounded-xl border border-white/10 bg-ts-panel p-4">
        <h2 class="text-lg font-semibold text-ts-text">Album Settings</h2>
        <div class="grid gap-3 md:grid-cols-2">
          <label class="space-y-1 text-sm text-ts-muted">
            Name
            <input
              v-model="editName"
              type="text"
              class="w-full rounded border border-white/15 bg-ts-panelSoft px-3 py-2 text-sm text-ts-text outline-none focus:border-ts-accent"
            />
          </label>
          <label class="space-y-1 text-sm text-ts-muted">
            Cover Photo
            <select
              v-model.number="selectedCoverPhotoId"
              class="w-full rounded border border-white/15 bg-ts-panelSoft px-3 py-2 text-sm text-ts-text outline-none focus:border-ts-accent"
            >
              <option :value="0">None</option>
              <option v-for="photo in albumPhotos" :key="photo.id" :value="photo.id">
                {{ photo.filename }}
              </option>
            </select>
          </label>
        </div>

        <label class="space-y-1 text-sm text-ts-muted">
          Description
          <textarea
            v-model="editDescription"
            rows="2"
            class="w-full rounded border border-white/15 bg-ts-panelSoft px-3 py-2 text-sm text-ts-text outline-none focus:border-ts-accent"
          />
        </label>

        <button
          type="button"
          :disabled="savingAlbum"
          class="rounded border border-ts-accent/60 px-4 py-2 text-sm font-semibold text-ts-accent transition hover:bg-ts-accent hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
          @click="saveAlbum"
        >
          {{ savingAlbum ? "Saving..." : "Save Album" }}
        </button>
      </section>

      <section class="space-y-3 rounded-xl border border-white/10 bg-ts-panel p-4">
        <h2 class="text-lg font-semibold text-ts-text">Add Photos</h2>
        <div class="flex flex-col gap-3 md:flex-row md:items-center">
          <select
            v-model.number="selectedPhotoToAdd"
            class="w-full rounded border border-white/15 bg-ts-panelSoft px-3 py-2 text-sm text-ts-text outline-none focus:border-ts-accent md:max-w-md"
          >
            <option :value="0">Select a photo</option>
            <option v-for="photo in availablePhotosToAdd" :key="photo.id" :value="photo.id">
              {{ photo.filename }}
            </option>
          </select>
          <button
            type="button"
            :disabled="selectedPhotoToAdd === 0 || updatingPhotos"
            class="rounded border border-ts-accent/60 px-4 py-2 text-sm font-semibold text-ts-accent transition hover:bg-ts-accent hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            @click="addSelectedPhoto"
          >
            Add To Album
          </button>
        </div>
      </section>

      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-ts-accent">Album Photos</h2>
          <p class="text-sm text-ts-muted">{{ album.photo_count }} items</p>
        </div>

        <p
          v-if="albumPhotos.length === 0"
          class="rounded-lg border border-white/10 bg-ts-panel px-4 py-5 text-sm text-ts-muted"
        >
          No photos in this album yet.
        </p>

        <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          <article
            v-for="photo in albumPhotos"
            :key="photo.id"
            class="space-y-3 rounded-xl border border-white/10 bg-ts-panelSoft p-3"
          >
            <img
              :src="`/api/photos/${photo.id}/thumbnail`"
              :alt="photo.filename"
              class="aspect-video w-full rounded-lg object-cover"
              loading="lazy"
            />

            <div class="flex items-center justify-between gap-2">
              <p class="truncate text-sm text-ts-text">{{ photo.filename }}</p>
              <button
                type="button"
                class="rounded border border-red-400/40 px-2 py-1 text-xs text-red-200 hover:bg-red-500/20"
                @click="removePhoto(photo.id)"
              >
                Remove
              </button>
            </div>

            <TagManager
              :tags="photoTags[photo.id] ?? []"
              :available-tags="availableTags"
              @add-tag="(tagId) => addTagToPhoto(photo.id, Number(tagId))"
              @remove-tag="(tagId) => removeTagFromPhotoInAlbum(photo.id, Number(tagId))"
              @create-tag="(tagName) => createAndAddTag(photo.id, String(tagName))"
            />
          </article>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import TagManager from "../components/TagManager.vue";
import {
  addPhotosToAlbum,
  getAlbum,
  removePhotoFromAlbum,
  updateAlbum
} from "../services/album";
import { listPhotos } from "../services/photo";
import {
  addTagsToPhoto,
  createTag,
  listPhotoTags,
  listTags,
  removeTagFromPhoto
} from "../services/tag";
import type { Album, Tag } from "../types/album";
import type { Photo } from "../types/photo";

const route = useRoute();

const album = ref<Album | null>(null);
const albumPhotos = ref<Photo[]>([]);
const allPhotos = ref<Photo[]>([]);
const availableTags = ref<Tag[]>([]);
const photoTags = ref<Record<number, Tag[]>>({});

const loading = ref(false);
const savingAlbum = ref(false);
const updatingPhotos = ref(false);
const errorMessage = ref<string | null>(null);

const editName = ref("");
const editDescription = ref("");
const selectedCoverPhotoId = ref(0);
const selectedPhotoToAdd = ref(0);

const albumId = computed(() => Number(route.params.id));

const availablePhotosToAdd = computed(() => {
  const albumPhotoIds = new Set(albumPhotos.value.map((photo) => photo.id));
  return allPhotos.value.filter((photo) => !albumPhotoIds.has(photo.id));
});

const loadPhotoTags = async (photoId: number): Promise<void> => {
  const payload = await listPhotoTags(photoId);
  photoTags.value = {
    ...photoTags.value,
    [photoId]: payload.items
  };
};

const loadAlbumData = async (): Promise<void> => {
  if (!Number.isFinite(albumId.value) || albumId.value <= 0) {
    errorMessage.value = "Invalid album id.";
    return;
  }

  loading.value = true;
  errorMessage.value = null;

  try {
    const [albumPayload, albumPhotoPayload, allPhotoPayload, tagsPayload] = await Promise.all([
      getAlbum(albumId.value),
      listPhotos(1, 100, { albumId: albumId.value }),
      listPhotos(1, 100),
      listTags()
    ]);

    album.value = albumPayload;
    albumPhotos.value = albumPhotoPayload.items;
    allPhotos.value = allPhotoPayload.items;
    availableTags.value = tagsPayload.items;

    editName.value = albumPayload.name;
    editDescription.value = albumPayload.description ?? "";
    selectedCoverPhotoId.value = albumPayload.cover_photo_id ?? 0;

    const tagPairs = await Promise.all(
      albumPhotoPayload.items.map(async (photo) => {
        const tagPayload = await listPhotoTags(photo.id);
        return [photo.id, tagPayload.items] as const;
      })
    );

    photoTags.value = Object.fromEntries(tagPairs);
  } catch {
    errorMessage.value = "Failed to load album detail.";
  } finally {
    loading.value = false;
  }
};

const saveAlbum = async (): Promise<void> => {
  if (!album.value || savingAlbum.value) {
    return;
  }

  savingAlbum.value = true;
  errorMessage.value = null;

  try {
    const updated = await updateAlbum(album.value.id, {
      name: editName.value,
      description: editDescription.value.trim() || null,
      cover_photo_id: selectedCoverPhotoId.value || null
    });

    album.value = updated;
    editName.value = updated.name;
    editDescription.value = updated.description ?? "";
    selectedCoverPhotoId.value = updated.cover_photo_id ?? 0;
  } catch {
    errorMessage.value = "Failed to save album.";
  } finally {
    savingAlbum.value = false;
  }
};

const addSelectedPhoto = async (): Promise<void> => {
  if (!album.value || selectedPhotoToAdd.value === 0 || updatingPhotos.value) {
    return;
  }

  updatingPhotos.value = true;
  errorMessage.value = null;

  try {
    await addPhotosToAlbum(album.value.id, [selectedPhotoToAdd.value]);
    selectedPhotoToAdd.value = 0;
    await loadAlbumData();
  } catch {
    errorMessage.value = "Failed to add photo to album.";
  } finally {
    updatingPhotos.value = false;
  }
};

const removePhoto = async (photoId: number): Promise<void> => {
  if (!album.value || updatingPhotos.value) {
    return;
  }

  updatingPhotos.value = true;
  errorMessage.value = null;

  try {
    await removePhotoFromAlbum(album.value.id, photoId);
    albumPhotos.value = albumPhotos.value.filter((photo) => photo.id !== photoId);

    const nextMap = { ...photoTags.value };
    delete nextMap[photoId];
    photoTags.value = nextMap;

    const refreshed = await getAlbum(album.value.id);
    album.value = refreshed;
    selectedCoverPhotoId.value = refreshed.cover_photo_id ?? 0;
  } catch {
    errorMessage.value = "Failed to remove photo from album.";
  } finally {
    updatingPhotos.value = false;
  }
};

const addTagToPhoto = async (photoId: number, tagId: number): Promise<void> => {
  try {
    await addTagsToPhoto(photoId, [tagId]);
    await loadPhotoTags(photoId);
  } catch {
    errorMessage.value = "Failed to add tag.";
  }
};

const removeTagFromPhotoInAlbum = async (photoId: number, tagId: number): Promise<void> => {
  try {
    await removeTagFromPhoto(photoId, tagId);
    await loadPhotoTags(photoId);
  } catch {
    errorMessage.value = "Failed to remove tag.";
  }
};

const createAndAddTag = async (photoId: number, tagName: string): Promise<void> => {
  const normalizedName = tagName.trim();
  if (!normalizedName) {
    return;
  }

  const existingTag = availableTags.value.find(
    (tag) => tag.name.toLowerCase() === normalizedName.toLowerCase()
  );
  if (existingTag) {
    await addTagToPhoto(photoId, existingTag.id);
    return;
  }

  try {
    const tag = await createTag(normalizedName);
    availableTags.value = [...availableTags.value, tag].sort((a, b) => a.name.localeCompare(b.name));
    await addTagsToPhoto(photoId, [tag.id]);
    await loadPhotoTags(photoId);
  } catch {
    errorMessage.value = "Failed to create tag.";
  }
};

onMounted(async () => {
  await loadAlbumData();
});
</script>
