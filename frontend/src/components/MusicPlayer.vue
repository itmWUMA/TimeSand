<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMusicPlayer } from '../composables/useMusicPlayer'

const { t } = useI18n()

const {
  currentTrack,
  isPlaying,
  tracks,
  currentTime,
  duration,
  playlistName,
  progressPercent,
  volume,
  togglePlayPause,
  next,
  prev,
  seekTo,
  setVolume,
  formatTime,
} = useMusicPlayer()

const volumePercent = computed(() => Math.round(volume.value * 100))

const canControl = computed(() => tracks.value.length > 0 && currentTrack.value != null)

function onSeek(event: Event): void {
  const target = event.target as HTMLInputElement
  seekTo(Number(target.value))
}

function onVolumeChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const nextValue = Number(target.value)
  setVolume(nextValue / 100)
}
</script>

<template>
  <section
    data-testid="music-player"
    class="border-t border-white/10 bg-ts-panel/95 px-4 py-3 text-ts-text shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur md:px-6"
  >
    <p
      v-if="tracks.length === 0"
      class="text-sm text-ts-muted"
    >
      {{ $t('player.noMusic') }}
    </p>

    <div v-else class="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1.2fr)_minmax(8rem,0.4fr)] md:items-center">
      <div class="min-w-0">
        <p data-testid="music-player-track-title" class="truncate text-sm font-semibold text-ts-accent">
          {{ currentTrack?.title ?? $t('player.noTrack') }}
        </p>
        <p class="truncate text-xs text-ts-muted">
          {{ currentTrack?.artist || $t('player.unknownArtist') }}
          <span v-if="playlistName" class="ml-2 text-[11px] uppercase tracking-wider text-ts-muted/80">
            {{ playlistName }}
          </span>
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          data-testid="music-player-prev"
          type="button"
          class="rounded border border-white/20 px-3 py-1.5 text-xs text-ts-text transition hover:border-white/40 hover:bg-white/10 disabled:opacity-40"
          :disabled="!canControl"
          @click="prev"
        >
          {{ $t('player.prev') }}
        </button>
        <button
          data-testid="music-player-play-pause"
          type="button"
          class="rounded border border-ts-accent/70 px-4 py-1.5 text-xs font-semibold text-ts-accent transition hover:bg-ts-accent hover:text-black disabled:opacity-40"
          :disabled="!canControl"
          @click="togglePlayPause"
        >
          {{ isPlaying ? $t('player.pause') : $t('player.play') }}
        </button>
        <button
          data-testid="music-player-next"
          type="button"
          class="rounded border border-white/20 px-3 py-1.5 text-xs text-ts-text transition hover:border-white/40 hover:bg-white/10 disabled:opacity-40"
          :disabled="!canControl"
          @click="next"
        >
          {{ $t('player.next') }}
        </button>
      </div>

      <div class="space-y-1.5">
        <input
          data-testid="music-player-progress"
          type="range"
          min="0"
          :max="duration > 0 ? duration : 0"
          step="0.1"
          :value="currentTime"
          class="h-1.5 w-full cursor-pointer accent-ts-accent"
          :style="{ backgroundSize: `${progressPercent}% 100%` }"
          :disabled="!canControl"
          @input="onSeek"
        >
        <p class="text-right text-[11px] text-ts-muted">
          {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
        </p>
      </div>

      <label class="flex items-center gap-2 text-xs text-ts-muted">
        <span>{{ t('player.volume') }}</span>
        <input
          data-testid="music-player-volume"
          type="range"
          min="0"
          max="100"
          step="1"
          :value="volumePercent"
          class="h-1.5 w-full cursor-pointer accent-ts-accent"
          @input="onVolumeChange"
        >
      </label>
    </div>
  </section>
</template>
