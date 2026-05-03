<script setup lang="ts">
import { RouterView } from 'vue-router'

import DefaultLayout from './layouts/DefaultLayout.vue'
</script>

<template>
  <DefaultLayout>
    <RouterView v-slot="{ Component, route }">
      <Transition
        :name="route.name === 'slideshow' ? '' : 'page'"
        mode="out-in"
      >
        <component
          :is="Component"
          :key="route.path"
        />
      </Transition>
    </RouterView>
  </DefaultLayout>
</template>

<style>
.page-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.page-leave-active {
  transition: opacity 0.2s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.page-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
</style>
