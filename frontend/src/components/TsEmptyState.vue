<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fadeIn } from '../composables/motion/transitions'

const props = defineProps<{
  title: string
  description?: string
  actionLabel?: string
  actionTo?: RouteLocationRaw
}>()
const emit = defineEmits<{
  action: []
}>()

const router = useRouter()
const containerRef = ref<HTMLElement | null>(null)

function handleAction(): void {
  if (!props.actionTo) {
    emit('action')
    return
  }
  void router.push(props.actionTo)
  emit('action')
}

onMounted(() => {
  if (!containerRef.value) {
    return
  }

  fadeIn(containerRef.value, { distance: 12, duration: 0.4 })
})
</script>

<template>
  <div
    ref="containerRef"
    data-testid="empty-state"
    class="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-ts-panelSoft px-6 py-12 text-center opacity-0"
  >
    <svg
      data-testid="empty-state-icon"
      class="mb-4 h-12 w-12 text-ts-muted"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 3h5v5" />
      <path d="M21 3 12 12" />
      <path d="m8.5 14.5 1.8-1.8a1 1 0 0 1 1.4 0l2.3 2.3a1 1 0 0 0 1.4 0l.6-.6a1 1 0 0 1 1.4 0l1.1 1.1" />
      <circle cx="8.5" cy="8.5" r="1.2" />
    </svg>

    <h3 class="text-xl font-semibold text-ts-text">
      {{ title }}
    </h3>

    <p v-if="description" class="mt-2 max-w-xl text-sm text-ts-muted">
      {{ description }}
    </p>

    <button
      v-if="actionLabel && actionTo"
      type="button"
      class="mt-5 rounded border border-ts-accent/70 px-5 py-2 text-sm font-semibold text-ts-accent transition hover:bg-ts-accent hover:text-black"
      @click="handleAction"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
