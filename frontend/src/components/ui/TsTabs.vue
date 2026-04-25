<script setup lang="ts">
import {
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from 'radix-vue'

const props = defineProps<{
  modelValue?: string
  tabs: Array<{ value: string, label: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onUpdateModelValue(value: string): void {
  emit('update:modelValue', value)
}
</script>

<template>
  <TabsRoot
    :model-value="props.modelValue"
    activation-mode="manual"
    @update:model-value="onUpdateModelValue"
  >
    <TabsList class="relative flex border-b border-ts-border">
      <TabsTrigger
        v-for="tab in props.tabs"
        :key="tab.value"
        data-testid="ts-tabs-trigger"
        :value="tab.value"
        class="relative px-4 py-2.5 text-sm text-ts-muted outline-none transition duration-fast hover:text-ts-text data-[state=active]:text-ts-accent"
      >
        {{ tab.label }}
      </TabsTrigger>

      <TabsIndicator
        class="absolute bottom-0 left-0 h-0.5 bg-ts-accent transition-all duration-normal"
      />
    </TabsList>

    <div class="pt-4">
      <TabsContent
        v-for="tab in props.tabs"
        :key="`content-${tab.value}`"
        :value="tab.value"
      >
        <slot :name="tab.value" />
      </TabsContent>
    </div>
  </TabsRoot>
</template>
