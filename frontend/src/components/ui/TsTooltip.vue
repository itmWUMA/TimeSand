<script setup lang="ts">
import {
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'radix-vue'

const props = withDefaults(defineProps<{
  text: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}>(), {
  side: 'top',
})
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>

      <TooltipPortal>
        <TooltipContent
          :side="props.side"
          :side-offset="6"
          class="z-tooltip rounded-ts-sm bg-ts-panel px-3 py-1.5 text-xs text-ts-text shadow-ts-sm"
        >
          {{ props.text }}
          <TooltipArrow class="fill-ts-panel" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
