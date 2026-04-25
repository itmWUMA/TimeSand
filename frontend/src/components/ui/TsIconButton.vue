<script setup lang="ts">
type IconButtonVariant = 'primary' | 'secondary' | 'ghost'
type IconButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  variant?: IconButtonVariant
  size?: IconButtonSize
  disabled?: boolean
  label: string
}>(), {
  variant: 'ghost',
  size: 'md',
  disabled: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const variantClasses: Record<IconButtonVariant, string> = {
  primary: 'bg-ts-accent text-black hover:brightness-110',
  secondary: 'border border-ts-accent text-ts-accent bg-transparent hover:bg-ts-accent/10',
  ghost: 'text-ts-muted bg-transparent hover:bg-white/10 hover:text-ts-text',
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'h-7 w-7 text-xs rounded-ts-sm',
  md: 'h-9 w-9 text-sm rounded-ts-sm',
  lg: 'h-11 w-11 text-base rounded-ts-md',
}

function onClick(event: MouseEvent): void {
  emit('click', event)
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center transition duration-fast disabled:cursor-not-allowed disabled:opacity-50"
    :class="[variantClasses[props.variant], sizeClasses[props.size]]"
    :disabled="props.disabled"
    :aria-label="props.label"
    :title="props.label"
    @click="onClick"
  >
    <slot />
  </button>
</template>
