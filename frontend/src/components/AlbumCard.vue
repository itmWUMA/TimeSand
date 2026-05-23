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
  <article class="album-card">
    <div
      data-testid="album-cover-collage"
      class="album-cover"
    >
      <div class="album-cover-grid">
        <div class="cover-main">
          <img
            v-if="album.cover_photo"
            :src="album.cover_photo"
            :alt="album.name"
            loading="lazy"
          >
          <span v-else>{{ $t('photo.noCoverPhoto') }}</span>
        </div>
        <div class="cover-fallback cover-a" />
        <div class="cover-fallback cover-b" />
      </div>
    </div>

    <div class="album-body">
      <p class="album-name">
        {{ album.name }}
      </p>
      <p
        v-if="album.description"
        class="album-desc"
      >
        {{ album.description }}
      </p>
      <p class="album-meta">
        <span class="num">{{ $t('common.photos', { count: album.photo_count }) }}</span>
        <span class="dot">/</span>
        <span>{{ relativeUpdatedTime }}</span>
      </p>
    </div>
  </article>
</template>

<style scoped>
.album-card {
  overflow: hidden;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-lg);
  background: transparent;
  transition:
    transform var(--ts-duration-normal) var(--ts-ease),
    border-color var(--ts-duration-normal) var(--ts-ease);
}

.album-card:hover {
  transform: translateY(-3px);
  border-color: var(--ts-border);
}

.album-cover {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
}

.album-cover-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2px;
  width: 100%;
  height: 100%;
}

.album-cover-grid > div {
  background: var(--ts-surface-2);
}

.cover-main {
  grid-row: span 2;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: var(--ts-muted);
  font-size: 12px;
  text-align: center;
  background:
    radial-gradient(circle at 32% 20%, oklch(60% 0.10 70 / 18%), transparent 48%),
    linear-gradient(135deg, oklch(35% 0.04 60), oklch(25% 0.03 50));
}

.cover-main img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-a {
  background: linear-gradient(135deg, oklch(45% 0.06 30), oklch(28% 0.04 25));
}

.cover-b {
  background: linear-gradient(135deg, oklch(55% 0.08 200), oklch(32% 0.05 220));
}

.album-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 18px 18px;
}

.album-name {
  overflow: hidden;
  color: var(--ts-fg);
  font-family: var(--ts-font-display);
  font-size: 18px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-desc {
  overflow: hidden;
  color: var(--ts-muted);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
}

.album-meta .dot {
  color: var(--ts-muted-2);
}

@media (max-width: 720px) {
  .album-body {
    padding: 12px 14px 14px;
  }

  .album-name {
    font-size: 16px;
  }

  .album-meta {
    gap: 6px;
    font-size: 10.5px;
  }
}
</style>
