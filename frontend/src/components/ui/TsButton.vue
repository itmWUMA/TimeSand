<script setup lang="ts">
type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
}>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-ts-accent text-black hover:brightness-110 shadow-glow-soft',
  secondary: 'border border-ts-accent text-ts-accent bg-transparent hover:bg-ts-accent/10',
  ghost: 'text-ts-text bg-transparent hover:bg-white/10',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-ts-sm',
  md: 'px-4 py-2 text-sm rounded-ts-md',
  lg: 'px-6 py-3 text-base rounded-ts-md',
}

function onClick(event: MouseEvent): void {
  emit('click', event)
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center font-semibold transition duration-fast disabled:cursor-not-allowed disabled:opacity-50"
    :class="[variantClasses[props.variant], sizeClasses[props.size]]"
    :disabled="props.disabled"
    @click="onClick"
  >
    <slot />
  </button>
</template>
