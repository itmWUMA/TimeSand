<script setup lang="ts">
import { useSlots } from 'vue'

const slots = useSlots()
</script>

<template>
  <div class="overflow-hidden rounded-ts-lg border border-ts-border bg-ts-panel shadow-ts-sm">
    <div v-if="slots.header" data-testid="ts-card-header" class="border-b border-ts-border px-4 py-3">
      <slot name="header" />
    </div>

    <div class="p-4">
      <slot />
    </div>

    <div v-if="slots.footer" data-testid="ts-card-footer" class="border-t border-ts-border px-4 py-3">
      <slot name="footer" />
    </div>
  </div>
</template>
