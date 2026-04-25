<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import MusicPlayer from '../components/MusicPlayer.vue'

const route = useRoute()
const { locale, t } = useI18n()
const mobileOpen = ref(false)
const isFullscreenRoute = computed(() => route.name === 'slideshow')

const navItems = [
  { path: '/', labelKey: 'nav.cardDraw' },
  { path: '/albums', labelKey: 'nav.albums' },
  { path: '/upload', labelKey: 'nav.upload' },
  { path: '/music', labelKey: 'nav.music' },
  { path: '/slideshow', labelKey: 'nav.slideshow' },
  { path: '/settings', labelKey: 'nav.settings' },
] as const

function linkClass(path: string): string {
  const isActive = route.path === path || (path === '/albums' && route.path.startsWith('/albums/'))

  if (isActive) {
    return 'bg-ts-accent text-black shadow-glow'
  }

  return 'text-ts-muted hover:bg-white/10 hover:text-ts-text'
}

function toggleLocale(): void {
  const next = locale.value === 'zh-CN' ? 'en' : 'zh-CN'
  locale.value = next
  localStorage.setItem('ts-locale', next)
  document.documentElement.lang = next
}

onMounted(() => {
  document.documentElement.lang = locale.value
})
</script>

<template>
  <div data-testid="default-layout" class="min-h-screen bg-ts-bg text-ts-text">
    <div class="flex min-h-screen flex-col md:flex-row">
      <aside class="hidden w-72 border-r border-white/10 bg-ts-panel md:flex md:flex-col">
        <div class="px-6 py-5">
          <p class="text-2xl font-semibold tracking-wide text-ts-accent">
            {{ $t('app.name') }}
          </p>
          <p class="mt-2 text-sm text-ts-muted">
            {{ $t('app.tagline') }}
          </p>
        </div>
        <nav class="flex-1 space-y-1 px-3 pb-6">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="block rounded-lg px-4 py-3 text-sm transition"
            :class="linkClass(item.path)"
          >
            {{ t(item.labelKey) }}
          </RouterLink>
        </nav>
        <div class="border-t border-white/10 px-4 py-3">
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ts-muted transition hover:bg-white/10 hover:text-ts-text"
            @click="toggleLocale"
          >
            <span class="text-base">🌐</span>
            <span>{{ locale === 'zh-CN' ? '\u4E2D\u6587 / EN' : 'EN / \u4E2D\u6587' }}</span>
          </button>
        </div>
      </aside>

      <div class="flex min-h-screen flex-1 flex-col">
        <header class="border-b border-white/10 bg-ts-panel px-4 py-4 md:hidden">
          <div class="flex items-center justify-between">
            <p class="text-lg font-semibold text-ts-accent">
              {{ $t('app.name') }}
            </p>
            <button
              type="button"
              class="rounded border border-ts-accent px-3 py-1 text-xs font-medium text-ts-accent"
              @click="mobileOpen = !mobileOpen"
            >
              {{ mobileOpen ? $t('common.close') : $t('common.menu') }}
            </button>
          </div>
          <nav v-if="mobileOpen" class="mt-3 space-y-1">
            <RouterLink
              v-for="item in navItems"
              :key="`mobile-${item.path}`"
              :to="item.path"
              class="block rounded-lg px-3 py-2 text-sm"
              :class="linkClass(item.path)"
              @click="mobileOpen = false"
            >
              {{ t(item.labelKey) }}
            </RouterLink>
            <button
              type="button"
              class="mt-2 flex w-full items-center gap-2 rounded-lg border-t border-white/10 px-3 py-2 pt-3 text-sm text-ts-muted transition hover:bg-white/10 hover:text-ts-text"
              @click="toggleLocale"
            >
              <span class="text-base">🌐</span>
              <span>{{ locale === 'zh-CN' ? '\u4E2D\u6587 / EN' : 'EN / \u4E2D\u6587' }}</span>
            </button>
          </nav>
        </header>

        <main
          class="flex-1 px-4 py-6 md:px-8 md:py-8"
          :class="isFullscreenRoute ? '' : 'pb-32'"
        >
          <slot />
        </main>
      </div>
    </div>

    <MusicPlayer
      v-if="!isFullscreenRoute"
      class="fixed inset-x-0 bottom-0 z-40 md:left-72"
    />
  </div>
</template>
