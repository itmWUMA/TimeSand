<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'radix-vue'
import { nextTick, ref, watch } from 'vue'

import { scaleIn } from '../../composables/motion'

const props = defineProps<{
  open: boolean
  title?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const surfaceRef = ref<HTMLElement | null>(null)

watch(() => props.open, async (isOpen) => {
  if (!isOpen)
    return

  await nextTick()
  if (surfaceRef.value)
    scaleIn(surfaceRef.value, { duration: 0.3 })
}, { flush: 'post' })

function onUpdateOpen(value: boolean): void {
  emit('update:open', value)
}
</script>

<template>
  <DialogRoot :open="props.open" @update:open="onUpdateOpen">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-modal bg-black/60 backdrop-blur-ts-sm" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-modal w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-ts-lg border border-ts-border bg-ts-panel shadow-ts-md"
      >
        <div ref="surfaceRef" class="p-6">
          <div class="mb-4 flex items-center justify-between">
            <DialogTitle :class="props.title ? 'text-lg font-semibold text-ts-text' : 'sr-only'">
              {{ props.title ?? 'Dialog' }}
            </DialogTitle>
            <DialogClose
              aria-label="Close dialog"
              class="rounded-ts-sm p-1 text-ts-muted transition duration-fast hover:bg-white/10 hover:text-ts-text"
            >
              x
            </DialogClose>
          </div>

          <DialogDescription class="sr-only">
            Dialog content
          </DialogDescription>

          <slot />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
