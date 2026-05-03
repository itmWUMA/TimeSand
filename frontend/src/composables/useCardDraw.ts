import { isAxiosError } from 'axios'
import { gsap } from 'gsap'
import { computed, nextTick, ref } from 'vue'

import { drawPhoto, resetDrawSession } from '../services/draw'
import { useDrawStore } from '../stores/draw'
import { EASING } from './motion/presets'
import { useSoundEffects } from './useSoundEffects'

type CeremonyState = 'IDLE' | 'DRAWING' | 'EMERGING' | 'REVEALING' | 'DISPLAYING'

const DECK_SELECTOR = '[data-draw-deck]'
const CENTER_CARD_SELECTOR = '[data-draw-center-card]'
const CARD_INNER_SELECTOR = '[data-card-inner]'
const PILE_SELECTOR = '[data-draw-pile]'

const MEMORY_TEXT_SELECTOR = '[data-memory-text]'

function queryElement(selector: string): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null
  }

  return document.querySelector<HTMLElement>(selector)
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

  async function drawNextCard(): Promise<void> {
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
      })

      const hadPreviousCard = !!drawStore.activeCard
      const previousCardId = drawStore.activeCard?.photo.id ?? null
      if (!reducedMotion && hadPreviousCard) {
        ceremonyGhost = cloneCenterCardAsGhost(queryElement(CENTER_CARD_SELECTOR))
        hiddenPileCardId.value = previousCardId
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

      if (centerCard) {
        gsap.set(centerCard, { y: 80, opacity: 0, scale: 0.7 })
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
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          ease: 'power1.out',
        }, 0)
      }

      ceremonyTimeline.call(() => {
        ceremonyState.value = 'EMERGING'
        sfx.play('whoosh')
      }, [], 0.3)

      if (ceremonyGhost && pile) {
        const delta = computeDelta(ceremonyGhost, pile)
        ceremonyTimeline.to(ceremonyGhost, {
          x: delta.x * 0.72,
          y: delta.y * 0.85,
          scale: 0.55,
          rotate: 8,
          opacity: 0.72,
          duration: 0.35,
          ease: 'power2.inOut',
        }, 0.3)
        ceremonyTimeline.to(ceremonyGhost, {
          opacity: 0,
          duration: 0.25,
          ease: 'power2.in',
          onComplete: () => clearGhost(),
        }, 0.65)
      }

      if (centerCard) {
        ceremonyTimeline.to(centerCard, {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: EASING.enter,
        }, 0.3)
      }

      ceremonyTimeline.call(() => {
        ceremonyState.value = 'REVEALING'
      }, [], 0.8)

      if (cardInner) {
        ceremonyTimeline.to(cardInner, {
          rotateY: 180,
          duration: 0.6,
          ease: 'power2.inOut',
        }, 0.8)
      }

      ceremonyTimeline.call(() => {
        sfx.play('flip')
      }, [], 1.05)

      if (centerCard) {
        ceremonyTimeline.fromTo(centerCard, {
          scale: 1,
        }, {
          scale: 1.15,
          duration: 0.15,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out',
        }, 1.4)
      }

      ceremonyTimeline.call(() => {
        ceremonyState.value = 'DISPLAYING'
        sfx.play('reveal')
        if (payload.weight_reason) {
          sfx.play('memory')
        }
      }, [], 1.4)

      if (memoryText && payload.weight_reason) {
        ceremonyTimeline.to(memoryText, {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: EASING.enter,
        }, 1.8)
      }

      ceremonyTimeline.to(settleMarker, {
        progress: 1,
        duration: 0.4,
        ease: 'none',
      }, 1.8)
    }
    catch (error) {
      ceremonyState.value = 'IDLE'
      clearGhost()

      if (isAxiosError<{ detail?: string }>(error)) {
        errorMessage.value = error.response?.data?.detail ?? 'Draw failed'
      }
      else {
        errorMessage.value = 'Draw failed'
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

  async function undoLastCard(): Promise<void> {
    if (isDrawing.value) {
      return
    }

    killCeremony()
    const outgoingGhost = cloneCenterCardAsGhost(queryElement(CENTER_CARD_SELECTOR))

    const removed = drawStore.undoLastDraw()
    if (!removed) {
      removeGhost(outgoingGhost)
      return
    }

    ceremonyGhost = outgoingGhost
    isDrawing.value = true

    await nextTick()

    const reducedMotion = prefersReducedMotion()
    const centerCard = queryElement(CENTER_CARD_SELECTOR)
    const pile = queryElement(PILE_SELECTOR)

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
        duration: 0.4,
        ease: 'power2.out',
      }, 0)
      hasUndoAnimation = true
    }

    if (ceremonyGhost && pile) {
      const delta = computeDelta(ceremonyGhost, pile)
      ceremonyTimeline.to(ceremonyGhost, {
        x: delta.x * 0.72,
        y: delta.y * 0.85,
        scale: 0.55,
        rotate: 8,
        opacity: 0.5,
        duration: 0.4,
        ease: 'power2.inOut',
      }, 0)
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
