<script setup lang="ts">
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { RouterView } from 'vue-router'

import DefaultLayout from './layouts/DefaultLayout.vue'

function routeUsesShell(route: RouteLocationNormalizedLoaded): boolean {
  return route.meta.shell !== false
}

function transitionName(route: RouteLocationNormalizedLoaded): string {
  return route.name === 'slideshow' ? '' : 'page'
}
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <DefaultLayout v-if="routeUsesShell(route)">
      <Transition
        :name="transitionName(route)"
        mode="out-in"
      >
        <component
          :is="Component"
          :key="route.path"
        />
      </Transition>
    </DefaultLayout>

    <Transition
      v-else
      :name="transitionName(route)"
      mode="out-in"
    >
      <component
        :is="Component"
        :key="route.path"
      />
    </Transition>
  </RouterView>
</template>

<style>
.page-enter-active {
  transition: opacity 0.3s var(--ts-ease), transform 0.3s var(--ts-ease);
}

.page-leave-active {
  transition: opacity 0.2s var(--ts-ease);
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
