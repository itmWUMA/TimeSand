<script setup lang="ts">
import type { gsap } from 'gsap'
import type { Photo } from '../types/photo'

import { gsap as gsapApi } from 'gsap'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { buildFileUrl, buildThumbnailUrl } from '../utils/photoUrl'

type OriginKind = 'grid' | 'card'

const props = withDefaults(defineProps<{
  open: boolean
  photos: Photo[]
  initialIndex: number
  originRect?: DOMRect | null
  originKind?: OriginKind
}>(), {
  originRect: null,
  originKind: 'grid',
})

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
}>()

const { t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)
const backdropRef = ref<HTMLElement | null>(null)
const imageSurfaceRef = ref<HTMLElement | null>(null)
const isRendered = ref(false)
const contentVisible = ref(false)
const currentIndex = ref(0)
const prefersReducedMotion = ref(false)

let openTimeline: gsap.core.Timeline | null = null
let closeTimeline: gsap.core.Timeline | null = null
let cloneElement: HTMLDivElement | null = null
let motionQuery: MediaQueryList | null = null
let savedBodyOverflow = ''
let activeOriginRect: DOMRect | null = null
let activeOriginKind: OriginKind = 'grid'

const currentPhoto = computed(() => props.photos[currentIndex.value] ?? null)
const canPrev = computed(() => currentIndex.value > 0)
const canNext = computed(() => currentIndex.value < props.photos.length - 1)

const filenameLabel = computed(() => currentPhoto.value?.filename ?? t('lightbox.unknown'))
const dimensionsLabel = computed(() => {
  const width = currentPhoto.value?.width ?? 0
  const height = currentPhoto.value?.height ?? 0
  if (width <= 0 || height <= 0) {
    return t('lightbox.unknown')
  }

  return `${width} × ${height}`
})
const fileSizeLabel = computed(() => {
  const size = currentPhoto.value?.file_size
  if (typeof size !== 'number' || size < 0) {
    return t('lightbox.unknown')
  }

  return formatBytes(size)
})
const takenAtLabel = computed(() => {
  const value = currentPhoto.value?.taken_at
  if (!value) {
    return t('lightbox.unknown')
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return t('lightbox.unknown')
  }

  return date.toLocaleString()
})
const locationLabel = computed(() => {
  const latitude = currentPhoto.value?.latitude
  const longitude = currentPhoto.value?.longitude
  if (latitude == null || longitude == null) {
    return t('lightbox.unknown')
  }

  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
})
const formatLabel = computed(() => currentPhoto.value?.mime_type ?? t('lightbox.unknown'))

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function clampIndex(index: number): number {
  if (props.photos.length === 0) {
    return 0
  }

  return Math.min(Math.max(index, 0), props.photos.length - 1)
}

function copyRect(rect: DOMRect): DOMRect {
  return new DOMRect(rect.x, rect.y, rect.width, rect.height)
}

function killTimelines(): void {
  openTimeline?.kill()
  closeTimeline?.kill()
  openTimeline = null
  closeTimeline = null
}

function cleanupClone(): void {
  cloneElement?.remove()
  cloneElement = null
}

function lockBodyScroll(): void {
  if (typeof document === 'undefined') {
    return
  }

  savedBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

function unlockBodyScroll(): void {
  if (typeof document === 'undefined') {
    return
  }

  document.body.style.overflow = savedBodyOverflow
}

function getOriginRadius(kind: OriginKind): string {
  return kind === 'card' ? '24px' : 'var(--ts-radius-lg)'
}

function createClone(rect: DOMRect, imageUrl: string, radius: string): HTMLDivElement {
  const clone = document.createElement('div')
  clone.setAttribute('data-lightbox-clone', 'true')
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    borderRadius: radius,
    backgroundImage: `url("${imageUrl}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)',
    zIndex: '61',
    pointerEvents: 'none',
  })
  document.body.appendChild(clone)
  cloneElement = clone
  return clone
}

function showInstantly(): void {
  const backdrop = backdropRef.value
  if (backdrop) {
    gsapApi.set(backdrop, { opacity: 1 })
  }
  contentVisible.value = true
}

function runOpenAnimation(): void {
  const backdrop = backdropRef.value
  const surface = imageSurfaceRef.value
  const photo = currentPhoto.value
  const originRect = activeOriginRect

  if (!backdrop || !surface || !photo || !originRect || prefersReducedMotion.value) {
    showInstantly()
    return
  }

  const targetRect = surface.getBoundingClientRect()
  if (targetRect.width <= 0 || targetRect.height <= 0) {
    showInstantly()
    return
  }

  const clone = createClone(originRect, buildThumbnailUrl(photo), getOriginRadius(activeOriginKind))

  gsapApi.set(backdrop, { opacity: 0 })
  contentVisible.value = false

  const duration = activeOriginKind === 'card' ? 0.4 : 0.35
  openTimeline = gsapApi.timeline({
    defaults: { ease: 'power2.out' },
    onComplete: () => {
      contentVisible.value = true
      cleanupClone()
    },
  })

  openTimeline.to(backdrop, { opacity: 1, duration: 0.24 }, 0)
  openTimeline.to(clone, {
    left: targetRect.left,
    top: targetRect.top,
    width: targetRect.width,
    height: targetRect.height,
    borderRadius: 4,
    duration,
  }, 0)

  if (activeOriginKind === 'card') {
    openTimeline.to(clone, {
      keyframes: [
        { scale: 1.02, duration: 0.08, ease: 'power1.out' },
        { scale: 1, duration: 0.08, ease: 'power1.inOut' },
      ],
    })
  }
}

function finalizeClose(emitModelUpdate: boolean): void {
  cleanupClone()
  killTimelines()
  contentVisible.value = false
  isRendered.value = false
  unlockBodyScroll()
  if (emitModelUpdate) {
    emit('update:open', false)
  }
}

function runCloseAnimation(emitModelUpdate: boolean): void {
  const backdrop = backdropRef.value
  const surface = imageSurfaceRef.value
  const photo = currentPhoto.value
  const originRect = activeOriginRect

  if (!backdrop || !surface || !photo || !originRect || prefersReducedMotion.value) {
    finalizeClose(emitModelUpdate)
    return
  }

  const startRect = surface.getBoundingClientRect()
  if (startRect.width <= 0 || startRect.height <= 0) {
    finalizeClose(emitModelUpdate)
    return
  }

  const clone = createClone(startRect, buildFileUrl(photo), '4px')
  contentVisible.value = false

  const duration = activeOriginKind === 'card' ? 0.4 : 0.35
  closeTimeline = gsapApi.timeline({
    defaults: { ease: 'power2.inOut' },
    onComplete: () => finalizeClose(emitModelUpdate),
  })

  closeTimeline.to(clone, {
    left: originRect.left,
    top: originRect.top,
    width: originRect.width,
    height: originRect.height,
    borderRadius: getOriginRadius(activeOriginKind),
    duration,
  }, 0)
  closeTimeline.to(backdrop, { opacity: 0, duration: 0.24 }, 0)
}

function openLightbox(): void {
  if (props.photos.length === 0) {
    emit('update:open', false)
    return
  }

  currentIndex.value = clampIndex(props.initialIndex)
  activeOriginRect = props.originRect ? copyRect(props.originRect) : null
  activeOriginKind = props.originKind
  isRendered.value = true
  lockBodyScroll()

  nextTick(() => {
    runOpenAnimation()
  })
}

function requestClose(): void {
  if (!isRendered.value) {
    emit('update:open', false)
    return
  }

  runCloseAnimation(true)
}

function showPrev(): void {
  if (!canPrev.value) {
    return
  }

  currentIndex.value -= 1
}

function showNext(): void {
  if (!canNext.value) {
    return
  }

  currentIndex.value += 1
}

function onKeydown(event: KeyboardEvent): void {
  if (!isRendered.value) {
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    requestClose()
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    showPrev()
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    showNext()
  }
}

function applyReducedMotion(matches: boolean): void {
  prefersReducedMotion.value = matches
}

function handleMotionChange(event: MediaQueryListEvent): void {
  applyReducedMotion(event.matches)
}

watch(() => props.open, (open) => {
  killTimelines()
  cleanupClone()

  if (open) {
    openLightbox()
    return
  }

  if (isRendered.value) {
    runCloseAnimation(false)
  }
}, { immediate: true })

watch(() => props.initialIndex, (nextIndex) => {
  if (!isRendered.value) {
    return
  }

  currentIndex.value = clampIndex(nextIndex)
})

watch(() => props.photos.length, () => {
  if (!isRendered.value) {
    return
  }

  currentIndex.value = clampIndex(currentIndex.value)
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)

  if (typeof window.matchMedia === 'function') {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    applyReducedMotion(motionQuery.matches)
    motionQuery.addEventListener('change', handleMotionChange)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  motionQuery?.removeEventListener('change', handleMotionChange)
  killTimelines()
  cleanupClone()
  unlockBodyScroll()
})
</script>

<template>
  <Teleport to="body">
    <section
      v-if="isRendered"
      ref="rootRef"
      data-testid="lightbox-root"
      class="fixed inset-0 z-[60]"
      aria-modal="true"
      role="dialog"
    >
      <div
        ref="backdropRef"
        data-testid="lightbox-backdrop"
        class="absolute inset-0 bg-black/85"
        @click="requestClose"
      />

      <button
        type="button"
        data-testid="lightbox-close"
        class="absolute right-3 top-3 z-20 rounded-full border border-white/25 bg-black/35 px-3 py-1.5 text-sm text-white/70 transition hover:text-white sm:right-5 sm:top-5"
        :aria-label="$t('lightbox.close')"
        @click="requestClose"
      >
        ✕
      </button>

      <div
        class="relative flex h-full w-full flex-col lg:flex-row"
        :class="contentVisible ? 'opacity-100' : 'pointer-events-none opacity-0'"
      >
        <div class="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-3 pt-14 sm:px-6 sm:pb-4 sm:pt-16 lg:px-8 lg:py-8">
          <button
            v-if="props.photos.length > 1 && canPrev"
            type="button"
            data-testid="lightbox-prev"
            class="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/35 px-2.5 py-2 text-lg text-white/50 transition hover:text-white sm:left-4"
            :aria-label="$t('lightbox.prev')"
            @click="showPrev"
          >
            ◀
          </button>

          <div ref="imageSurfaceRef" class="flex h-full w-full items-center justify-center">
            <img
              v-if="currentPhoto"
              data-testid="lightbox-image"
              :src="buildFileUrl(currentPhoto)"
              :alt="currentPhoto.filename"
              class="max-h-[85vh] max-w-[85vw] rounded-[4px] object-contain shadow-2xl lg:max-w-[calc(100vw-26rem)]"
              draggable="false"
            >
          </div>

          <button
            v-if="props.photos.length > 1 && canNext"
            type="button"
            data-testid="lightbox-next"
            class="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/35 px-2.5 py-2 text-lg text-white/50 transition hover:text-white sm:right-4"
            :aria-label="$t('lightbox.next')"
            @click="showNext"
          >
            ▶
          </button>
        </div>

        <aside
          data-testid="lightbox-exif"
          class="max-h-[40vh] w-full overflow-y-auto border-t border-white/10 bg-black/55 px-4 pb-4 pt-3 text-sm backdrop-blur lg:h-full lg:max-h-none lg:w-72 lg:border-l lg:border-t-0 lg:px-5 lg:py-6"
        >
          <h2 class="text-base font-semibold text-ts-accent">
            {{ $t('lightbox.metadata') }}
          </h2>

          <dl class="mt-4 space-y-3">
            <div>
              <dt class="text-xs uppercase tracking-wide text-ts-muted">
                {{ $t('lightbox.filename') }}
              </dt>
              <dd class="mt-1 break-words text-ts-text">
                {{ filenameLabel }}
              </dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-ts-muted">
                {{ $t('lightbox.dimensions') }}
              </dt>
              <dd class="mt-1 text-ts-text">
                {{ dimensionsLabel }}
              </dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-ts-muted">
                {{ $t('lightbox.fileSize') }}
              </dt>
              <dd class="mt-1 text-ts-text">
                {{ fileSizeLabel }}
              </dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-ts-muted">
                {{ $t('lightbox.takenAt') }}
              </dt>
              <dd class="mt-1 text-ts-text">
                {{ takenAtLabel }}
              </dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-ts-muted">
                {{ $t('lightbox.location') }}
              </dt>
              <dd class="mt-1 text-ts-text">
                {{ locationLabel }}
              </dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-ts-muted">
                {{ $t('lightbox.format') }}
              </dt>
              <dd class="mt-1 text-ts-text">
                {{ formatLabel }}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  </Teleport>
</template>
