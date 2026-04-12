<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMusicPlayer } from '../composables/useMusicPlayer'

const {
  currentTrack,
  isPlaying,
  tracks,
  volume,
  togglePlayPause,
  next,
  setVolume,
} = useMusicPlayer()

const lastVolume = ref(1)

const hasTrack = computed(() => tracks.value.length > 0 && currentTrack.value != null)
const volumeLabel = computed(() => (volume.value <= 0 ? 'Muted' : 'Volume'))

function toggleMute(): void {
  if (volume.value <= 0) {
    setVolume(lastVolume.value > 0 ? lastVolume.value : 0.7)
    return
  }

  lastVolume.value = volume.value
  setVolume(0)
}
</script>

<template>
  <div
    data-testid="music-player-mini"
    class="flex w-full max-w-md items-center gap-2 rounded-xl border border-white/20 bg-black/45 px-3 py-2 text-xs text-white/90 backdrop-blur"
  >
    <p class="min-w-0 flex-1 truncate">
      {{ hasTrack ? currentTrack?.title : "No music loaded" }}
    </p>
    <button
      type="button"
      class="rounded border border-white/35 px-2 py-1 transition hover:border-white/70 hover:bg-white/10 disabled:opacity-40"
      :disabled="!hasTrack"
      @click="togglePlayPause"
    >
      {{ isPlaying ? "Pause" : "Play" }}
    </button>
    <button
      type="button"
      class="rounded border border-white/35 px-2 py-1 transition hover:border-white/70 hover:bg-white/10 disabled:opacity-40"
      :disabled="!hasTrack"
      @click="next"
    >
      Next
    </button>
    <button
      type="button"
      class="rounded border border-white/35 px-2 py-1 transition hover:border-white/70 hover:bg-white/10"
      :aria-label="volumeLabel"
      @click="toggleMute"
    >
      {{ volume <= 0 ? "Unmute" : "Mute" }}
    </button>
  </div>
</template>
