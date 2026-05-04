<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import MobileDrawer from '../components/MobileDrawer.vue'
import MusicPlayer from '../components/MusicPlayer.vue'

const route = useRoute()
const { locale, t } = useI18n()
const mobileOpen = ref(false)
const isMobileViewport = ref(true)
const isFullscreenRoute = computed(() => route.name === 'slideshow')
let mobileViewportQuery: MediaQueryList | null = null

const navItems = [
  { path: '/', labelKey: 'nav.cardDraw' },
  { path: '/albums', labelKey: 'nav.albums' },
  { path: '/upload', labelKey: 'nav.upload' },
  { path: '/music', labelKey: 'nav.music' },
  { path: '/slideshow', labelKey: 'nav.slideshow' },
  { path: '/settings', labelKey: 'nav.settings' },
] as const

const TRAILING_SLASHES_REGEX = /\/+$/

function normalizePath(path: string): string {
  if (path === '/')
    return path

  return path.replace(TRAILING_SLASHES_REGEX, '')
}

function linkClass(path: string): string {
  const normalizedCurrentPath = normalizePath(route.path)
  const normalizedTargetPath = normalizePath(path)
  const isActive = normalizedTargetPath === '/'
    ? normalizedCurrentPath === '/'
    : normalizedCurrentPath === normalizedTargetPath
      || normalizedCurrentPath.startsWith(`${normalizedTargetPath}/`)

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

function handleMobileViewportChange(event: MediaQueryListEvent): void {
  isMobileViewport.value = !event.matches
  if (event.matches)
    mobileOpen.value = false
}

onMounted(() => {
  document.documentElement.lang = locale.value

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
    return

  mobileViewportQuery = window.matchMedia('(min-width: 768px)')
  handleMobileViewportChange({ matches: mobileViewportQuery.matches } as MediaQueryListEvent)

  if (typeof mobileViewportQuery.addEventListener === 'function')
    mobileViewportQuery.addEventListener('change', handleMobileViewportChange)
  else
    mobileViewportQuery.addListener(handleMobileViewportChange)
})

onBeforeUnmount(() => {
  if (!mobileViewportQuery)
    return

  if (typeof mobileViewportQuery.removeEventListener === 'function')
    mobileViewportQuery.removeEventListener('change', handleMobileViewportChange)
  else
    mobileViewportQuery.removeListener(handleMobileViewportChange)
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
        </header>
        <MobileDrawer
          v-if="isMobileViewport"
          v-model:open="mobileOpen"
          :nav-items="navItems"
          :link-class="linkClass"
          @toggle-locale="toggleLocale"
        />

        <main
          class="flex-1 px-4 py-6 md:px-8 md:py-8"
          :style="isFullscreenRoute ? undefined : { paddingBottom: 'var(--ts-player-main-padding, 5rem)' }"
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
