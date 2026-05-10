<script setup lang="ts">
import type { gsap } from 'gsap'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { fadeIn, fadeOut, scaleIn } from '../composables/motion/transitions'

interface OnboardingStep {
  titleKey: string
  contentKey: string
  targetSelector?: string
}

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

interface CompletionParticle {
  id: number
  dx: number
  dy: number
  delay: number
}

const STORAGE_KEY = 'ts-onboarding-complete'
const STEP_TRANSITION_SECONDS = 0.3
const DONE_ANIMATION_MS = 480
const steps: OnboardingStep[] = [
  {
    titleKey: 'onboarding.step1Title',
    contentKey: 'onboarding.step1Content',
  },
  {
    titleKey: 'onboarding.step2Title',
    contentKey: 'onboarding.step2Content',
    targetSelector: '[data-draw-deck]',
  },
  {
    titleKey: 'onboarding.step3Title',
    contentKey: 'onboarding.step3Content',
    targetSelector: 'a[href="/slideshow"]',
  },
  {
    titleKey: 'onboarding.step4Title',
    contentKey: 'onboarding.step4Content',
  },
]

const { t } = useI18n()
const visible = ref(false)
const currentStep = ref(0)
const transitioning = ref(false)
const spotlightRect = ref<SpotlightRect | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const logoRef = ref<HTMLElement | null>(null)
const completionParticles = ref<CompletionParticle[]>([])
const completionActive = ref(false)
let particleSeed = 0
let doneTimer: number | null = null

const currentStepConfig = computed(() => steps[currentStep.value] ?? steps[0])
const isLastStep = computed(() => currentStep.value === steps.length - 1)

const spotlightStyle = computed(() => {
  if (!spotlightRect.value) {
    return {}
  }

  return {
    top: `${spotlightRect.value.top}px`,
    left: `${spotlightRect.value.left}px`,
    width: `${spotlightRect.value.width}px`,
    height: `${spotlightRect.value.height}px`,
  }
})

function clearDoneTimer(): void {
  if (doneTimer !== null) {
    window.clearTimeout(doneTimer)
    doneTimer = null
  }
}

function waitForTweenCompletion(
  tween: gsap.core.Tween | null | undefined,
): Promise<void> {
  if (!tween) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    tween.eventCallback('onComplete', () => resolve())
  })
}

function markCompleted(): void {
  localStorage.setItem(STORAGE_KEY, 'true')
}

function selectVisibleTarget(selector: string): HTMLElement | null {
  const targets = Array.from(document.querySelectorAll<HTMLElement>(selector))
  for (const target of targets) {
    const style = window.getComputedStyle(target)
    const rect = target.getBoundingClientRect()
    const isVisible = style.display !== 'none' && style.visibility !== 'hidden'
    if (isVisible && rect.width > 0 && rect.height > 0) {
      return target
    }
  }

  return null
}

function refreshSpotlight(): void {
  if (!visible.value) {
    spotlightRect.value = null
    return
  }

  const selector = currentStepConfig.value?.targetSelector
  if (!selector) {
    spotlightRect.value = null
    return
  }

  const target = selectVisibleTarget(selector)
  if (!target) {
    spotlightRect.value = null
    return
  }

  const rect = target.getBoundingClientRect()
  const padding = 10
  spotlightRect.value = {
    top: Math.max(8, rect.top - padding),
    left: Math.max(8, rect.left - padding),
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }
}

function runStepEnterAnimations(): void {
  if (panelRef.value) {
    fadeIn(panelRef.value, { duration: STEP_TRANSITION_SECONDS, distance: 10 })
  }

  if (currentStep.value === 0 && logoRef.value) {
    scaleIn(logoRef.value, { duration: 0.35 })
  }
}

async function transitionToStep(nextStep: number): Promise<void> {
  if (transitioning.value) {
    return
  }

  if (nextStep < 0 || nextStep >= steps.length || nextStep === currentStep.value) {
    return
  }

  transitioning.value = true
  await waitForTweenCompletion(
    panelRef.value
      ? fadeOut(panelRef.value, { duration: STEP_TRANSITION_SECONDS, distance: 10 })
      : null,
  )

  currentStep.value = nextStep
  await nextTick()
  runStepEnterAnimations()
  refreshSpotlight()
  transitioning.value = false
}

async function onNext(): Promise<void> {
  if (isLastStep.value) {
    return
  }

  await transitionToStep(currentStep.value + 1)
}

async function onDotClick(index: number): Promise<void> {
  await transitionToStep(index)
}

function closeOverlay(): void {
  visible.value = false
  spotlightRect.value = null
}

function onSkip(): void {
  markCompleted()
  closeOverlay()
}

function buildCompletionParticles(): void {
  completionParticles.value = Array.from({ length: 12 }, (_value, index) => {
    const angle = (Math.PI * 2 * index) / 12
    const distance = 64 + (index % 4) * 14
    return {
      id: particleSeed++,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance - 30,
      delay: (index % 3) * 30,
    }
  })
}

function onDone(): void {
  markCompleted()
  buildCompletionParticles()
  completionActive.value = true

  clearDoneTimer()
  doneTimer = window.setTimeout(() => {
    completionActive.value = false
    completionParticles.value = []
    closeOverlay()
  }, DONE_ANIMATION_MS)
}

function handleWindowChange(): void {
  refreshSpotlight()
}

onMounted(async () => {
  if (localStorage.getItem(STORAGE_KEY) === 'true') {
    return
  }

  visible.value = true
  await nextTick()
  runStepEnterAnimations()
  refreshSpotlight()

  window.addEventListener('resize', handleWindowChange)
  window.addEventListener('scroll', handleWindowChange, true)
})

watch(
  () => currentStep.value,
  async () => {
    await nextTick()
    refreshSpotlight()
  },
)

onBeforeUnmount(() => {
  clearDoneTimer()
  window.removeEventListener('resize', handleWindowChange)
  window.removeEventListener('scroll', handleWindowChange, true)
})
</script>

<template>
  <div
    v-if="visible"
    data-testid="onboarding-overlay"
    class="fixed inset-0 z-modal"
  >
    <div class="absolute inset-0 bg-black/70" />

    <div
      v-if="spotlightRect"
      data-testid="onboarding-spotlight"
      class="pointer-events-none absolute rounded-2xl border border-ts-accent/70 transition-all duration-300"
      :style="spotlightStyle"
    />

    <div
      class="relative flex min-h-full items-start justify-center overflow-y-auto px-4 py-6"
      :style="{ paddingBottom: 'calc(var(--ts-player-main-padding, 5rem) + 1rem)' }"
    >
      <section
        ref="panelRef"
        class="relative w-full max-w-lg overflow-hidden rounded-ts-lg border border-ts-border bg-ts-panel px-6 py-6 shadow-ts-md md:px-8 md:py-8"
      >
        <div class="flex items-start justify-between gap-4">
          <p class="text-xs uppercase tracking-[0.14em] text-ts-muted/80">
            {{ currentStep + 1 }} / {{ steps.length }}
          </p>
          <button
            data-testid="onboarding-skip"
            type="button"
            class="text-sm text-ts-muted transition hover:text-ts-text"
            @click="onSkip"
          >
            {{ t('onboarding.skip') }}
          </button>
        </div>

        <div
          v-if="currentStep === 0"
          ref="logoRef"
          class="mt-6 flex h-16 w-16 items-center justify-center rounded-full border border-ts-accent/70 bg-ts-accent/15 text-lg font-semibold text-ts-accent"
        >
          TS
        </div>

        <h2 class="mt-5 text-2xl font-semibold text-ts-text">
          {{ t(currentStepConfig.titleKey) }}
        </h2>

        <p class="mt-3 text-sm leading-relaxed text-ts-muted">
          {{ t(currentStepConfig.contentKey) }}
        </p>

        <div class="mt-6 flex items-center justify-center gap-2">
          <button
            v-for="(_step, index) in steps"
            :key="index"
            :data-testid="`onboarding-dot-${index}`"
            type="button"
            class="h-2.5 w-2.5 rounded-full transition-all"
            :class="index === currentStep ? 'bg-ts-accent' : 'bg-white/25 hover:bg-white/40'"
            :disabled="transitioning || index === currentStep"
            @click="onDotClick(index)"
          />
        </div>

        <div class="mt-6 flex justify-end">
          <button
            v-if="!isLastStep"
            data-testid="onboarding-next"
            type="button"
            class="rounded-ts-md border border-ts-accent/70 px-5 py-2 text-sm font-semibold text-ts-accent transition hover:bg-ts-accent hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="transitioning"
            @click="onNext"
          >
            {{ t('onboarding.next') }}
          </button>

          <button
            v-else
            data-testid="onboarding-done"
            type="button"
            class="rounded-ts-md border border-ts-accent/70 px-5 py-2 text-sm font-semibold text-ts-accent transition hover:bg-ts-accent hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="transitioning"
            @click="onDone"
          >
            {{ t('onboarding.done') }}
          </button>
        </div>

        <div class="pointer-events-none absolute inset-0 overflow-hidden">
          <span
            v-for="particle in completionParticles"
            :key="particle.id"
            class="onboarding-particle"
            :class="{ 'onboarding-particle-active': completionActive }"
            :style="{
              '--particle-dx': `${particle.dx}px`,
              '--particle-dy': `${particle.dy}px`,
              '--particle-delay': `${particle.delay}ms`,
            }"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
[data-testid="onboarding-spotlight"] {
  box-shadow:
    0 0 0 9999px rgb(6 8 12 / 72%),
    0 0 32px rgb(212 168 67 / 40%),
    inset 0 0 0 1px rgb(212 168 67 / 35%);
}

.onboarding-particle {
  position: absolute;
  left: 50%;
  top: 78%;
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: rgb(212 168 67 / 90%);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.5);
}

.onboarding-particle-active {
  animation: onboarding-burst 480ms ease-out forwards;
  animation-delay: var(--particle-delay);
}

@keyframes onboarding-burst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }

  15% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translate(
      calc(-50% + var(--particle-dx)),
      calc(-50% + var(--particle-dy))
    ) scale(1.2);
  }
}
</style>
