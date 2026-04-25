<script setup lang="ts">
import { ToastProvider, ToastViewport } from 'radix-vue'
</script>

<template>
  <ToastProvider :duration="5000">
    <slot />
    <ToastViewport class="fixed bottom-4 right-4 z-toast flex flex-col gap-2" />
  </ToastProvider>
</template>
