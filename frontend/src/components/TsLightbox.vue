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
const imageRef = ref<HTMLImageElement | null>(null)
const isRendered = ref(false)
const contentVisible = ref(false)
const isAnimating = ref(false)
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
const formatLabel = computed(() => currentPhoto.value?.mime_type || t('lightbox.unknown'))

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

function computeImageTargetRect(photo: Photo, containerRect: DOMRect): DOMRect {
  const pw = photo.width
  const ph = photo.height
  if (pw <= 0 || ph <= 0) {
    return containerRect
  }

  const vh = window.innerHeight
  const vw = window.innerWidth
  const sidebarOffset = vw >= 1024 ? 416 : 0
  const maxW = Math.max(Math.min(containerRect.width, vw * 0.85, vw - sidebarOffset), 1)
  const maxH = Math.max(Math.min(containerRect.height, vh * 0.85), 1)
  const scale = Math.min(maxW / pw, maxH / ph, 1)
  const w = pw * scale
  const h = ph * scale
  const x = containerRect.left + (containerRect.width - w) / 2
  const y = containerRect.top + (containerRect.height - h) / 2
  return new DOMRect(x, y, w, h)
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
    willChange: 'transform, border-radius, filter',
    transformOrigin: '0 0',
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
  isAnimating.value = false
}

function runOpenAnimation(): void {
  isAnimating.value = true
  const backdrop = backdropRef.value
  const surface = imageSurfaceRef.value
  const photo = currentPhoto.value
  const originRect = activeOriginRect

  if (!backdrop || !surface || !photo || !originRect || prefersReducedMotion.value) {
    showInstantly()
    return
  }

  const containerRect = surface.getBoundingClientRect()
  if (containerRect.width <= 0 || containerRect.height <= 0) {
    showInstantly()
    return
  }

  const targetRect = computeImageTargetRect(photo, containerRect)

  const clone = createClone(targetRect, buildThumbnailUrl(photo), '4px')
  clone.style.filter = 'blur(2px)'

  const scaleX = originRect.width / targetRect.width
  const scaleY = originRect.height / targetRect.height
  const dx = originRect.left - targetRect.left
  const dy = originRect.top - targetRect.top

  gsapApi.set(clone, {
    transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
    borderRadius: getOriginRadius(activeOriginKind),
  })

  const fullSrc = buildFileUrl(photo)
  const preloader = new Image()
  let preloaded = false
  preloader.onload = () => {
    preloaded = true
    if (cloneElement === clone) {
      clone.style.backgroundImage = `url("${fullSrc}")`
      gsapApi.to(clone, { filter: 'blur(0px)', duration: 0.18, ease: 'power1.out' })
    }
  }
  preloader.src = fullSrc

  gsapApi.set(backdrop, { opacity: 0 })
  contentVisible.value = false

  const duration = activeOriginKind === 'card' ? 0.4 : 0.35
  openTimeline = gsapApi.timeline({
    defaults: { ease: 'power2.out' },
    onComplete: () => {
      contentVisible.value = true
      nextTick(() => {
        cleanupClone()
      })
      isAnimating.value = false
    },
  })

  openTimeline.to(backdrop, { opacity: 1, duration: 0.24 }, 0)
  openTimeline.to(clone, {
    transform: 'translate(0px, 0px) scale(1, 1)',
    borderRadius: '4px',
    duration,
  }, 0)

  if (!preloaded) {
    openTimeline.to(clone, { filter: 'blur(0px)', duration: 0.15, ease: 'power1.out' })
  }

  if (activeOriginKind === 'card') {
    openTimeline.to(clone, {
      transformOrigin: 'center',
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
  isAnimating.value = false
  contentVisible.value = false
  isRendered.value = false
  unlockBodyScroll()
  if (emitModelUpdate) {
    emit('update:open', false)
  }
}

function runCloseAnimation(emitModelUpdate: boolean): void {
  killTimelines()
  cleanupClone()
  isAnimating.value = true

  if (!contentVisible.value) {
    finalizeClose(emitModelUpdate)
    return
  }

  const backdrop = backdropRef.value
  const image = imageRef.value
  const photo = currentPhoto.value
  const originRect = activeOriginRect

  if (!backdrop || !image || !photo || !originRect || prefersReducedMotion.value) {
    finalizeClose(emitModelUpdate)
    return
  }

  const startRect = image.getBoundingClientRect()
  if (startRect.width <= 0 || startRect.height <= 0) {
    finalizeClose(emitModelUpdate)
    return
  }

  const clone = createClone(startRect, buildFileUrl(photo), '4px')
  contentVisible.value = false

  const scaleX = originRect.width / startRect.width
  const scaleY = originRect.height / startRect.height
  const dx = originRect.left - startRect.left
  const dy = originRect.top - startRect.top

  const duration = activeOriginKind === 'card' ? 0.4 : 0.35
  closeTimeline = gsapApi.timeline({
    defaults: { ease: 'power2.inOut' },
    onComplete: () => finalizeClose(emitModelUpdate),
  })

  closeTimeline.to(clone, {
    transform: `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
    borderRadius: getOriginRadius(activeOriginKind),
    duration,
  }, 0)
  closeTimeline.to(backdrop, { opacity: 0, duration: 0.24 }, 0)
}

function openLightbox(): void {
  killTimelines()
  cleanupClone()

  if (props.photos.length === 0) {
    emit('update:open', false)
    return
  }

  currentIndex.value = clampIndex(props.initialIndex)
  activeOriginRect = props.originRect ? copyRect(props.originRect) : null
  activeOriginKind = props.originKind
  isRendered.value = true
  contentVisible.value = false
  isAnimating.value = true
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
    if (canPrev.value) {
      event.preventDefault()
      showPrev()
    }
    return
  }

  if (event.key === 'ArrowRight') {
    if (canNext.value) {
      event.preventDefault()
      showNext()
    }
  }
}

function applyReducedMotion(matches: boolean): void {
  prefersReducedMotion.value = matches
}

function handleMotionChange(event: MediaQueryListEvent): void {
  applyReducedMotion(event.matches)
}

watch(() => props.open, (open) => {
  if (open) {
    openLightbox()
    return
  }

  if (isRendered.value || isAnimating.value) {
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
      :aria-label="$t('lightbox.metadata')"
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
        class="lightbox-control-button lightbox-close-button absolute right-3 top-3 z-20 rounded-full border border-white/25 bg-black/35 px-3 py-1.5 text-sm text-white/70 transition hover:text-white sm:right-5 sm:top-5"
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
            class="lightbox-control-button lightbox-nav-button lightbox-nav-prev absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/35 px-2.5 py-2 text-lg text-white/50 transition hover:text-white sm:left-4"
            :aria-label="$t('lightbox.prev')"
            @click="showPrev"
          >
            ◀
          </button>

          <div ref="imageSurfaceRef" class="flex h-full w-full items-center justify-center">
            <img
              v-if="currentPhoto"
              ref="imageRef"
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
            class="lightbox-control-button lightbox-nav-button lightbox-nav-next absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/35 px-2.5 py-2 text-lg text-white/50 transition hover:text-white sm:right-4"
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

<style scoped>
@media (max-width: 767px) {
  .lightbox-control-button {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
  }

  .lightbox-close-button {
    top: 12px;
    right: 12px;
  }

  .lightbox-nav-prev {
    left: 12px;
  }

  .lightbox-nav-next {
    right: 12px;
  }
}
</style>
