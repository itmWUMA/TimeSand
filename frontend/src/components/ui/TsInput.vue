<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
  error?: string
  type?: string
  disabled?: boolean
}>(), {
  modelValue: '',
  label: undefined,
  placeholder: undefined,
  error: undefined,
  type: 'text',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="space-y-1">
    <label v-if="props.label" class="block text-sm text-ts-muted">
      {{ props.label }}
    </label>

    <input
      :type="props.type"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      class="w-full rounded-ts-sm border bg-ts-panelSoft px-3 py-2 text-sm text-ts-text outline-none transition duration-fast placeholder:text-ts-muted/60"
      :class="[
        props.error
          ? 'border-red-400/60 focus:border-red-400'
          : 'border-ts-border focus:border-ts-accent',
        props.disabled ? 'cursor-not-allowed opacity-50' : '',
      ]"
      @input="onInput"
    >

    <p v-if="props.error" class="text-xs text-red-300">
      {{ props.error }}
    </p>
  </div>
</template>
