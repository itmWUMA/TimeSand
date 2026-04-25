<script setup lang="ts">
import {
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'radix-vue'
import { useId } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  options: Array<{ value: string, label: string }>
  label?: string
  disabled?: boolean
}>(), {
  modelValue: '',
  placeholder: undefined,
  label: undefined,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const labelId = useId()

function onUpdateModelValue(value: string): void {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="space-y-1">
    <label v-if="props.label" :id="labelId" class="block text-sm text-ts-muted">
      {{ props.label }}
    </label>

    <SelectRoot
      :model-value="props.modelValue"
      :disabled="props.disabled"
      @update:model-value="onUpdateModelValue"
    >
      <SelectTrigger
        data-testid="ts-select-trigger"
        :aria-labelledby="props.label ? labelId : undefined"
        class="inline-flex w-full items-center justify-between rounded-ts-sm border border-ts-border bg-ts-panelSoft px-3 py-2 text-sm text-ts-text outline-none transition duration-fast focus:border-ts-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SelectValue :placeholder="props.placeholder ?? ''" />
        <span class="ml-2 text-ts-muted" aria-hidden="true">v</span>
      </SelectTrigger>

      <SelectPortal>
        <SelectContent
          class="z-dropdown overflow-hidden rounded-ts-md border border-ts-border bg-ts-panel shadow-ts-md"
          position="popper"
          :side-offset="4"
        >
          <SelectViewport class="p-1">
            <SelectItem
              v-for="option in props.options"
              :key="option.value"
              :value="option.value"
              class="cursor-pointer rounded-ts-sm px-3 py-2 text-sm text-ts-text outline-none transition duration-fast hover:bg-ts-accent/10 data-[highlighted]:bg-ts-accent/10 data-[state=checked]:text-ts-accent"
            >
              <SelectItemText>{{ option.label }}</SelectItemText>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
  </div>
</template>
