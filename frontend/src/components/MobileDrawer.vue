<script setup lang="ts">
import { gsap } from 'gsap'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface NavItem {
  path: string
  labelKey: string
}

const props = defineProps<{
  open: boolean
  navItems: readonly NavItem[]
  linkClass: (path: string) => string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'toggleLocale': []
}>()

const { locale, t } = useI18n()

const shouldRender = ref(props.open)
const backdropRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

let activeAnimation: gsap.core.Timeline | null = null
let edgeSwipeStartX: number | null = null
let panelSwipeStartX: number | null = null

function emitOpen(value: boolean): void {
  emit('update:open', value)
}

function stopAnimation(): void {
  activeAnimation?.kill()
  activeAnimation = null
}

async function playOpenAnimation(): Promise<void> {
  await nextTick()

  if (!backdropRef.value || !panelRef.value)
    return

  stopAnimation()
  gsap.set(backdropRef.value, { opacity: 0 })
  gsap.set(panelRef.value, { x: '-100%' })

  activeAnimation = gsap.timeline()
  activeAnimation.to(backdropRef.value, {
    opacity: 1,
    duration: 0.25,
    ease: 'power2.out',
  }, 0)
  activeAnimation.to(panelRef.value, {
    x: '0%',
    duration: 0.25,
    ease: 'power2.out',
  }, 0)
}

function playCloseAnimation(): Promise<void> {
  return new Promise((resolve) => {
    if (!backdropRef.value || !panelRef.value) {
      shouldRender.value = false
      resolve()
      return
    }

    stopAnimation()
    activeAnimation = gsap.timeline({
      onComplete: () => {
        shouldRender.value = false
        stopAnimation()
        resolve()
      },
    })

    activeAnimation.to(panelRef.value, {
      x: '-100%',
      duration: 0.2,
      ease: 'power2.in',
    }, 0)
    activeAnimation.to(backdropRef.value, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
    }, 0)
  })
}

function closeDrawer(): void {
  emitOpen(false)
}

function handleBackdropClick(): void {
  closeDrawer()
}

function handleNavItemClick(): void {
  closeDrawer()
}

function handleLocaleToggle(): void {
  emit('toggleLocale')
}

function handleWindowTouchStart(event: TouchEvent): void {
  if (props.open)
    return

  const touch = event.touches[0]
  if (!touch)
    return

  edgeSwipeStartX = touch.clientX <= 20 ? touch.clientX : null
}

function handleWindowTouchMove(event: TouchEvent): void {
  if (props.open || edgeSwipeStartX === null)
    return

  const touch = event.touches[0]
  if (!touch)
    return

  if (touch.clientX - edgeSwipeStartX > 60) {
    edgeSwipeStartX = null
    emitOpen(true)
  }
}

function handleWindowTouchEnd(): void {
  edgeSwipeStartX = null
}

function handlePanelTouchStart(event: TouchEvent): void {
  const touch = event.touches[0]
  panelSwipeStartX = touch?.clientX ?? null
}

function handlePanelTouchMove(event: TouchEvent): void {
  if (panelSwipeStartX === null)
    return

  const touch = event.touches[0]
  if (!touch)
    return

  if (touch.clientX - panelSwipeStartX < -60) {
    panelSwipeStartX = null
    closeDrawer()
  }
}

function handlePanelTouchEnd(): void {
  panelSwipeStartX = null
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    shouldRender.value = true
    await playOpenAnimation()
    return
  }

  if (!shouldRender.value)
    return

  await playCloseAnimation()
}, { immediate: true })

onMounted(() => {
  window.addEventListener('touchstart', handleWindowTouchStart, { passive: true })
  window.addEventListener('touchmove', handleWindowTouchMove, { passive: true })
  window.addEventListener('touchend', handleWindowTouchEnd, { passive: true })
  window.addEventListener('touchcancel', handleWindowTouchEnd, { passive: true })
})

onBeforeUnmount(() => {
  stopAnimation()
  window.removeEventListener('touchstart', handleWindowTouchStart)
  window.removeEventListener('touchmove', handleWindowTouchMove)
  window.removeEventListener('touchend', handleWindowTouchEnd)
  window.removeEventListener('touchcancel', handleWindowTouchEnd)
})
</script>

<template>
  <div
    v-if="shouldRender"
    data-testid="mobile-drawer-overlay"
    class="fixed inset-0 z-modal md:hidden"
  >
    <div
      ref="backdropRef"
      data-testid="mobile-drawer-backdrop"
      class="absolute inset-0"
      style="background-color: rgba(0, 0, 0, 0.5);"
      @click="handleBackdropClick"
    />

    <aside
      ref="panelRef"
      data-testid="mobile-drawer-root"
      class="absolute inset-y-0 left-0 flex w-[75vw] max-w-[320px] flex-col border-r border-white/10 bg-ts-panel shadow-ts-md"
      style="padding-top: calc(env(safe-area-inset-top) + 1rem); padding-bottom: calc(env(safe-area-inset-bottom) + 1rem);"
      @touchstart="handlePanelTouchStart"
      @touchmove="handlePanelTouchMove"
      @touchend="handlePanelTouchEnd"
      @touchcancel="handlePanelTouchEnd"
    >
      <div class="px-6 pb-4">
        <p class="text-2xl font-semibold tracking-wide text-ts-accent">
          {{ t('app.name') }}
        </p>
      </div>

      <nav data-testid="mobile-drawer-nav" class="flex-1 space-y-1 px-3">
        <RouterLink
          v-for="item in props.navItems"
          :key="`mobile-drawer-${item.path}`"
          :to="item.path"
          class="flex min-h-11 items-center rounded-lg px-4 py-2 text-sm transition"
          :class="props.linkClass(item.path)"
          @click="handleNavItemClick"
        >
          {{ t(item.labelKey) }}
        </RouterLink>
      </nav>

      <div class="mt-2 border-t border-white/10 px-4 pt-3">
        <button
          data-testid="mobile-drawer-locale-toggle"
          type="button"
          class="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ts-muted transition hover:bg-white/10 hover:text-ts-text"
          @click="handleLocaleToggle"
        >
          <span class="text-base">🌐</span>
          <span>{{ locale === 'zh-CN' ? '\u4E2D\u6587 / EN' : 'EN / \u4E2D\u6587' }}</span>
        </button>
      </div>
    </aside>
  </div>
</template>
