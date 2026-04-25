<script setup lang="ts">
import {
  ToastClose,
  ToastDescription,
  ToastRoot,
  ToastTitle,
} from 'radix-vue'
import { nextTick, ref, watch } from 'vue'

import { slideUp } from '../../composables/motion'

type ToastVariant = 'default' | 'success' | 'error'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  description?: string
  variant?: ToastVariant
}>(), {
  title: undefined,
  description: undefined,
  variant: 'default',
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const surfaceRef = ref<HTMLElement | null>(null)

const variantClasses: Record<ToastVariant, string> = {
  default: 'border-ts-border',
  success: 'border-green-500/40',
  error: 'border-red-400/40',
}

watch(() => props.open, async (isOpen) => {
  if (!isOpen)
    return

  await nextTick()
  if (surfaceRef.value)
    slideUp(surfaceRef.value, { distance: 20, duration: 0.3 })
}, { flush: 'post' })

function onUpdateOpen(value: boolean): void {
  emit('update:open', value)
}
</script>

<template>
  <ToastRoot
    :open="props.open"
    class="relative overflow-hidden rounded-ts-md border bg-ts-panel shadow-ts-md"
    :class="variantClasses[props.variant]"
    @update:open="onUpdateOpen"
  >
    <div ref="surfaceRef" class="px-4 py-3">
      <ToastTitle v-if="props.title" class="text-sm font-semibold text-ts-text">
        {{ props.title }}
      </ToastTitle>

      <ToastDescription v-if="props.description" class="mt-1 text-xs text-ts-muted">
        {{ props.description }}
      </ToastDescription>
    </div>

    <ToastClose
      aria-label="Close toast"
      class="absolute right-2 top-2 rounded-ts-sm p-1 text-ts-muted transition duration-fast hover:bg-white/10 hover:text-ts-text"
    >
      x
    </ToastClose>
  </ToastRoot>
</template>
