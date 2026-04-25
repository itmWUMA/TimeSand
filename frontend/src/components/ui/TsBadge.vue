<script setup lang="ts">
type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'error'

const props = withDefaults(defineProps<{
  variant?: BadgeVariant
}>(), {
  variant: 'default',
})

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-ts-text',
  accent: 'bg-ts-accent/20 text-ts-accent',
  success: 'bg-green-500/20 text-green-300',
  warning: 'bg-yellow-500/20 text-yellow-300',
  error: 'bg-red-500/20 text-red-300',
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-ts-full px-2.5 py-0.5 text-xs font-medium"
    :class="variantClasses[props.variant]"
  >
    <slot />
  </span>
</template>
