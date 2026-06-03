<script setup lang="ts">
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'

import TsToast from './components/ui/TsToast.vue'
import TsToastProvider from './components/ui/TsToastProvider.vue'
import { useToast } from './composables/useToast'
import DefaultLayout from './layouts/DefaultLayout.vue'
import { useAuthStore } from './stores/auth'
import { useSettingsStore } from './stores/settings'

const { toasts, dismissToast } = useToast()
const auth = useAuthStore()
const settingsStore = useSettingsStore()

onMounted(async () => {
  await auth.fetchMe()
  if (auth.isAuthenticated) {
    await settingsStore.loadFromBackend()
  }
})

function routeUsesShell(route: RouteLocationNormalizedLoaded): boolean {
  return route.meta.shell !== false
}

function transitionName(route: RouteLocationNormalizedLoaded): string {
  return route.name === 'slideshow' ? '' : 'page'
}

function handleToastOpenChange(toastId: string, isOpen: boolean): void {
  if (!isOpen)
    dismissToast(toastId)
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

  <TsToastProvider>
    <TsToast
      v-for="toast in toasts"
      :key="toast.id"
      :open="true"
      :title="toast.title"
      :description="toast.description"
      :variant="toast.variant"
      :duration="toast.durationMs"
      @update:open="(open) => handleToastOpenChange(toast.id, open)"
    />
  </TsToastProvider>
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
