<script setup lang="ts">
import type { Album } from '../types/album'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatRelativeTime } from '../utils/formatRelativeTime'

const props = defineProps<{
  album: Album
}>()

const { locale } = useI18n()
const relativeUpdatedTime = computed(() => formatRelativeTime(props.album.updated_at, locale.value))
</script>

<template>
  <article class="overflow-hidden rounded-xl border border-white/10 bg-ts-panelSoft transition hover:border-ts-accent/60">
    <div class="aspect-video bg-black/30">
      <img
        v-if="album.cover_photo"
        :src="album.cover_photo"
        :alt="album.name"
        class="h-full w-full object-cover"
        loading="lazy"
      >
      <div
        v-else
        class="flex h-full w-full items-center justify-center bg-gradient-to-br from-ts-panel to-ts-panelSoft text-sm text-ts-muted"
      >
        {{ $t('photo.noCoverPhoto') }}
      </div>
    </div>

    <div class="space-y-1 px-4 py-3">
      <p class="truncate text-base font-semibold text-ts-text">
        {{ album.name }}
      </p>
      <p
        v-if="album.description"
        class="truncate text-sm text-ts-muted"
      >
        {{ album.description }}
      </p>
      <p class="text-sm text-ts-muted">
        {{ $t('common.photos', { count: album.photo_count }) }} · {{ relativeUpdatedTime }}
      </p>
    </div>
  </article>
</template>
