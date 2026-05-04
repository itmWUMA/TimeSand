import { isAxiosError } from 'axios'
import { gsap } from 'gsap'
import { computed, nextTick, ref } from 'vue'

import i18n from '../i18n'
import { drawPhoto, resetDrawSession } from '../services/draw'
import { useDrawStore } from '../stores/draw'
import { useSettingsStore } from '../stores/settings'
import { EASING } from './motion/presets'
import { useSoundEffects } from './useSoundEffects'

type CeremonyState = 'IDLE' | 'DRAWING' | 'EMERGING' | 'REVEALING' | 'DISPLAYING'

export interface GestureExitInfo {
  exitX: number
  exitRotation: number
}

const DECK_SELECTOR = '[data-draw-deck]'
const CENTER_CARD_SELECTOR = '[data-draw-center-card]'
const CARD_INNER_SELECTOR = '[data-card-inner]'
const PILE_SELECTOR = '[data-draw-pile]'
const GESTURE_WRAPPER_SELECTOR = '[data-gesture-wrapper]'

const MEMORY_TEXT_SELECTOR = '[data-memory-text]'
const DEFAULT_DRAW_ANIMATION_SPEED = 1

function queryElement(selector: string): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null
  }

  return document.querySelector<HTMLElement>(selector)
}

function normalizeDrawAnimationSpeed(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_DRAW_ANIMATION_SPEED
  }

  return parsed
}

export function scaleCeremonyDuration(baseDuration: number, speedMultiplier: number): number {
  const speed = normalizeDrawAnimationSpeed(speedMultiplier)
  return baseDuration * speed
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function computeDelta(source: HTMLElement, target: HTMLElement): { x: number, y: number } {
  const sourceRect = source.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()

  const sourceCenterX = sourceRect.left + sourceRect.width / 2
  const sourceCenterY = sourceRect.top + sourceRect.height / 2
  const targetCenterX = targetRect.left + targetRect.width / 2
  const targetCenterY = targetRect.top + targetRect.height / 2

  return {
    x: targetCenterX - sourceCenterX,
    y: targetCenterY - sourceCenterY,
  }
}

function removeGhost(ghost: HTMLElement | null): void {
  if (!ghost) {
    return
  }

  ghost.remove()
}

function applyGestureExitToGhost(ghost: HTMLElement, gestureExit: GestureExitInfo): void {
  const currentLeft = Number.parseFloat(ghost.style.left) || 0
  ghost.style.left = `${currentLeft + gestureExit.exitX}px`
  ghost.style.transform = `rotate(${gestureExit.exitRotation}deg)`
  ghost.style.opacity = '0.7'
}

function restoreGestureWrapper(): void {
  const wrapper = queryElement(GESTURE_WRAPPER_SELECTOR)
  if (wrapper) {
    gsap.set(wrapper, { opacity: 1 })
  }
}

function cloneCenterCardAsGhost(source: HTMLElement | null): HTMLElement | null {
  if (!source || typeof document === 'undefined') {
    return null
  }

  const rect = source.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    return null
  }

  const ghost = source.cloneNode(true) as HTMLElement
  ghost.removeAttribute('data-draw-center-card')
  ghost.setAttribute('data-draw-card-ghost', 'true')
  ghost.style.position = 'fixed'
  ghost.style.left = `${rect.left}px`
  ghost.style.top = `${rect.top}px`
  ghost.style.width = `${rect.width}px`
  ghost.style.height = `${rect.height}px`
  ghost.style.margin = '0'
  ghost.style.pointerEvents = 'none'
  ghost.style.zIndex = '70'
  ghost.style.transformOrigin = 'center center'

  document.body.append(ghost)
  return ghost
}

export function useCardDraw() {
  const drawStore = useDrawStore()
  const settingsStore = useSettingsStore()
  const sfx = useSoundEffects()

  const ceremonyState = ref<CeremonyState>('IDLE')
  const isDrawing = ref(false)
  const isScatterOpen = ref(false)
  const errorMessage = ref<string | null>(null)
  const lastWeightReason = ref<string | null>(null)
  const hiddenPileCardId = ref<number | null>(null)

  const activeCard = computed(() => drawStore.activeCard)
  const pileCards = computed(() =>
    hiddenPileCardId.value === null
      ? drawStore.pileCards
      : drawStore.pileCards.filter(c => c.photo.id !== hiddenPileCardId.value),
  )
  const drawnCards = computed(() => drawStore.drawnCards)
  const hasDrawnCards = computed(() => drawStore.drawnCards.length > 0)

  let ceremonyTimeline: gsap.core.Timeline | null = null
  let ceremonyGhost: HTMLElement | null = null

  function clearGhost(): void {
    removeGhost(ceremonyGhost)
    ceremonyGhost = null
    hiddenPileCardId.value = null
  }

  function killCeremony(): void {
    if (ceremonyTimeline) {
      ceremonyTimeline.kill()
      ceremonyTimeline = null
    }

    clearGhost()
  }

  async function drawNextCard(gestureExit?: GestureExitInfo): Promise<void> {
    if (isDrawing.value) {
      return
    }

    isDrawing.value = true
    errorMessage.value = null
    killCeremony()

    const reducedMotion = prefersReducedMotion()
    ceremonyState.value = 'DRAWING'

    try {
      const payload = await drawPhoto({
        album_id: drawStore.albumId,
        exclude_ids: [...drawStore.excludeIds],
        weight_mode: settingsStore.drawWeightMode,
        nearby_days: settingsStore.drawNearbyDays,
      })

      const hadPreviousCard = !!drawStore.activeCard
      const previousCardId = drawStore.activeCard?.photo.id ?? null
      if (!reducedMotion && hadPreviousCard) {
        ceremonyGhost = cloneCenterCardAsGhost(queryElement(CENTER_CARD_SELECTOR))
        hiddenPileCardId.value = previousCardId
        if (ceremonyGhost && gestureExit) {
          applyGestureExitToGhost(ceremonyGhost, gestureExit)
        }
      }

      drawStore.addDrawnCard({
        photo: payload.photo,
        weightReason: payload.weight_reason,
      })
      lastWeightReason.value = payload.weight_reason

      await nextTick()

      if (reducedMotion) {
        ceremonyState.value = 'DISPLAYING'
        isDrawing.value = false
        clearGhost()
        return
      }

      const deck = queryElement(DECK_SELECTOR)
      const pile = queryElement(PILE_SELECTOR)
      const centerCard = queryElement(CENTER_CARD_SELECTOR)
      const cardInner = queryElement(CARD_INNER_SELECTOR)
      const memoryText = queryElement(MEMORY_TEXT_SELECTOR)
      const settleMarker = { progress: 0 }
      const speed = normalizeDrawAnimationSpeed(settingsStore.drawAnimSpeed)
      const dur = (baseDuration: number): number => scaleCeremonyDuration(baseDuration, speed)
      const at = (position: number): number => dur(position)

      if (centerCard) {
        gsap.set(centerCard, { y: 80, opacity: 0, scale: 0.7 })
      }

      if (gestureExit) {
        restoreGestureWrapper()
      }

      if (cardInner) {
        gsap.set(cardInner, { rotateY: 0, transformPerspective: 1000, transformOrigin: '50% 50%' })
      }

      if (memoryText) {
        gsap.set(memoryText, { opacity: 0, y: 12 })
      }

      sfx.play('shuffle')

      ceremonyTimeline = gsap.timeline({
        onComplete: () => {
          ceremonyState.value = 'IDLE'
          isDrawing.value = false
          clearGhost()
          ceremonyTimeline = null
        },
      })

      if (deck) {
        ceremonyTimeline.to(deck, {
          scale: 0.94,
          y: -4,
          duration: dur(0.1),
          yoyo: true,
          repeat: 1,
          ease: 'power1.out',
        }, at(0))
      }

      ceremonyTimeline.call(() => {
        ceremonyState.value = 'EMERGING'
        sfx.play('whoosh')
      }, [], at(0.3))

      if (ceremonyGhost && pile) {
        const delta = computeDelta(ceremonyGhost, pile)
        if (gestureExit) {
          const ghostStartTime = at(0.05)
          ceremonyTimeline.to(ceremonyGhost, {
            x: delta.x * 0.72,
            scale: 0.55,
            rotate: 8,
            duration: dur(0.35),
            ease: 'power1.out',
          }, ghostStartTime)
          ceremonyTimeline.to(ceremonyGhost, {
            y: delta.y * 0.85,
            duration: dur(0.35),
            ease: 'power2.in',
          }, ghostStartTime)
          ceremonyTimeline.to(ceremonyGhost, {
            opacity: 0,
            duration: dur(0.2),
            ease: 'power2.in',
            onComplete: () => clearGhost(),
          }, at(0.3))
        }
        else {
          ceremonyTimeline.to(ceremonyGhost, {
            x: delta.x * 0.72,
            y: delta.y * 0.85,
            scale: 0.55,
            rotate: 8,
            opacity: 0.72,
            duration: dur(0.35),
            ease: 'power2.inOut',
          }, at(0.3))
          ceremonyTimeline.to(ceremonyGhost, {
            opacity: 0,
            duration: dur(0.25),
            ease: 'power2.in',
            onComplete: () => clearGhost(),
          }, at(0.65))
        }
      }

      if (centerCard) {
        ceremonyTimeline.to(centerCard, {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: dur(0.5),
          ease: EASING.enter,
        }, at(0.3))
      }

      ceremonyTimeline.call(() => {
        ceremonyState.value = 'REVEALING'
      }, [], at(0.8))

      if (cardInner) {
        ceremonyTimeline.to(cardInner, {
          rotateY: 180,
          duration: dur(0.6),
          ease: 'power2.inOut',
        }, at(0.8))
      }

      ceremonyTimeline.call(() => {
        sfx.play('flip')
      }, [], at(1.05))

      if (centerCard) {
        ceremonyTimeline.fromTo(centerCard, {
          scale: 1,
        }, {
          scale: 1.15,
          duration: dur(0.15),
          yoyo: true,
          repeat: 1,
          ease: 'power2.out',
        }, at(1.4))
      }

      ceremonyTimeline.call(() => {
        ceremonyState.value = 'DISPLAYING'
        sfx.play('reveal')
        if (payload.weight_reason) {
          sfx.play('memory')
        }
      }, [], at(1.4))

      if (memoryText && payload.weight_reason) {
        ceremonyTimeline.to(memoryText, {
          opacity: 1,
          y: 0,
          duration: dur(0.4),
          ease: EASING.enter,
        }, at(1.8))
      }

      ceremonyTimeline.to(settleMarker, {
        progress: 1,
        duration: dur(0.4),
        ease: 'none',
      }, at(1.8))
    }
    catch (error) {
      ceremonyState.value = 'IDLE'
      clearGhost()

      if (isAxiosError<{ detail?: string }>(error)) {
        errorMessage.value = error.response?.data?.detail ?? i18n.global.t('draw.drawFailed')
      }
      else {
        errorMessage.value = i18n.global.t('draw.drawFailed')
      }

      isDrawing.value = false
    }
  }

  async function openScatter(): Promise<void> {
    if (!hasDrawnCards.value) {
      return
    }

    isScatterOpen.value = true
    await nextTick()
  }

  async function collectScatter(): Promise<void> {
    isScatterOpen.value = false
  }

  async function reshuffle(): Promise<void> {
    if (isDrawing.value) {
      return
    }

    killCeremony()

    try {
      await resetDrawSession()
    }
    catch {
      // Draw session state lives in frontend, backend reset endpoint is best-effort only.
    }

    drawStore.resetSession()
    ceremonyState.value = 'IDLE'
    isScatterOpen.value = false
    errorMessage.value = null
    lastWeightReason.value = null
  }

  async function undoLastCard(gestureExit?: GestureExitInfo): Promise<void> {
    if (isDrawing.value) {
      return
    }

    killCeremony()
    const outgoingGhost = cloneCenterCardAsGhost(queryElement(CENTER_CARD_SELECTOR))
    if (outgoingGhost && gestureExit) {
      applyGestureExitToGhost(outgoingGhost, gestureExit)
    }

    const removed = drawStore.undoLastDraw()
    if (!removed) {
      removeGhost(outgoingGhost)
      return
    }

    ceremonyGhost = outgoingGhost
    isDrawing.value = true

    await nextTick()

    if (gestureExit) {
      restoreGestureWrapper()
    }

    const reducedMotion = prefersReducedMotion()
    const centerCard = queryElement(CENTER_CARD_SELECTOR)
    const speed = normalizeDrawAnimationSpeed(settingsStore.drawAnimSpeed)
    const dur = (baseDuration: number): number => scaleCeremonyDuration(baseDuration, speed)

    if (reducedMotion) {
      clearGhost()
      isDrawing.value = false
      ceremonyState.value = 'IDLE'
      lastWeightReason.value = drawStore.activeCard?.weightReason ?? null
      return
    }

    if (!ceremonyGhost && !centerCard) {
      isDrawing.value = false
      lastWeightReason.value = drawStore.activeCard?.weightReason ?? null
      return
    }

    ceremonyTimeline = gsap.timeline({
      onComplete: () => {
        clearGhost()
        isDrawing.value = false
        ceremonyTimeline = null
      },
    })

    let hasUndoAnimation = false

    if (centerCard) {
      gsap.set(centerCard, {
        y: 20,
        opacity: 0.45,
        scale: 0.92,
      })

      ceremonyTimeline.to(centerCard, {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: dur(0.4),
        ease: 'power2.out',
      }, 0)
      hasUndoAnimation = true
    }

    if (ceremonyGhost) {
      if (gestureExit) {
        ceremonyTimeline.to(ceremonyGhost, {
          x: gestureExit.exitX * 2,
          rotation: gestureExit.exitRotation * 1.5,
          opacity: 0,
          scale: 0.85,
          duration: dur(0.35),
          ease: 'power2.in',
          onComplete: () => clearGhost(),
        }, 0)
      }
      else {
        ceremonyTimeline.to(ceremonyGhost, {
          opacity: 0,
          scale: 0.9,
          duration: dur(0.3),
          ease: 'power2.in',
          onComplete: () => clearGhost(),
        }, 0)
      }
      hasUndoAnimation = true
    }

    if (!hasUndoAnimation) {
      isDrawing.value = false
      clearGhost()
      ceremonyTimeline = null
    }

    lastWeightReason.value = drawStore.activeCard?.weightReason ?? null
  }

  return {
    ceremonyState,
    activeCard,
    pileCards,
    drawnCards,
    hasDrawnCards,
    isDrawing,
    isScatterOpen,
    errorMessage,
    lastWeightReason,
    drawNextCard,
    openScatter,
    collectScatter,
    reshuffle,
    undoLastCard,
    killCeremony,
  }
}
