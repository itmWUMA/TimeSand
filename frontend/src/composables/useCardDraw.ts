import { isAxiosError } from "axios";
import { gsap } from "gsap";
import { computed, nextTick, ref } from "vue";

import { drawPhoto, resetDrawSession } from "../services/draw";
import { useDrawStore } from "../stores/draw";

const DECK_SELECTOR = "[data-draw-deck]";
const CENTER_CARD_SELECTOR = "[data-draw-center-card]";
const PILE_SELECTOR = "[data-draw-pile]";
const SCATTER_SELECTOR = "[data-draw-scatter]";

const queryElement = (selector: string): HTMLElement | null =>
  typeof document === "undefined" ? null : document.querySelector<HTMLElement>(selector);

const animateTo = (target: Element | null, vars: Record<string, unknown>): Promise<void> =>
  new Promise((resolve) => {
    if (!target) {
      resolve();
      return;
    }

    const originalOnComplete = vars.onComplete;
    gsap.to(target, {
      ...vars,
      onComplete: () => {
        if (typeof originalOnComplete === "function") {
          originalOnComplete();
        }
        resolve();
      }
    } as object);
  });

const animateFromTo = (
  target: Element | null,
  fromVars: Record<string, unknown>,
  toVars: Record<string, unknown>
): Promise<void> =>
  new Promise((resolve) => {
    if (!target) {
      resolve();
      return;
    }

    const originalOnComplete = toVars.onComplete;
    gsap.fromTo(target, fromVars, {
      ...toVars,
      onComplete: () => {
        if (typeof originalOnComplete === "function") {
          originalOnComplete();
        }
        resolve();
      }
    } as object);
  });

export const useCardDraw = () => {
  const drawStore = useDrawStore();

  const isDrawing = ref(false);
  const isScatterOpen = ref(false);
  const errorMessage = ref<string | null>(null);
  const lastWeightReason = ref<string | null>(null);

  const activeCard = computed(() => drawStore.activeCard);
  const pileCards = computed(() => drawStore.pileCards);
  const drawnCards = computed(() => drawStore.drawnCards);
  const hasDrawnCards = computed(() => drawStore.drawnCards.length > 0);

  const animateDeckTap = async (): Promise<void> => {
    await animateFromTo(
      queryElement(DECK_SELECTOR),
      { scale: 1, y: 0 },
      {
        scale: 0.94,
        y: -4,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power1.out"
      }
    );
  };

  const animatePreviousCardToPile = async (): Promise<void> => {
    const centerCard = queryElement(CENTER_CARD_SELECTOR);
    const pile = queryElement(PILE_SELECTOR);
    if (!centerCard || !pile) {
      return;
    }

    const centerRect = centerCard.getBoundingClientRect();
    const pileRect = pile.getBoundingClientRect();
    const centerX = centerRect.left + centerRect.width / 2;
    const centerY = centerRect.top + centerRect.height / 2;
    const pileX = pileRect.left + pileRect.width / 2;
    const pileY = pileRect.top + pileRect.height / 2;

    await animateTo(centerCard, {
      x: (pileX - centerX) * 0.7,
      y: (pileY - centerY) * 0.85,
      scale: 0.54,
      rotate: 9,
      opacity: 0.72,
      duration: 0.34,
      ease: "power2.inOut"
    });
  };

  const animateCenterReveal = async (): Promise<void> => {
    await animateFromTo(
      queryElement(CENTER_CARD_SELECTOR),
      {
        y: 52,
        rotateY: 100,
        opacity: 0,
        scale: 0.78
      },
      {
        y: 0,
        rotateY: 0,
        opacity: 1,
        scale: 1,
        duration: 0.55,
        ease: "power3.out"
      }
    );
  };

  const animateScatterIn = async (): Promise<void> => {
    await animateFromTo(
      queryElement(SCATTER_SELECTOR),
      { opacity: 0 },
      { opacity: 1, duration: 0.25, ease: "power2.out" }
    );
  };

  const animateScatterOut = async (): Promise<void> => {
    await animateTo(queryElement(SCATTER_SELECTOR), {
      opacity: 0,
      duration: 0.2,
      ease: "power2.in"
    });
  };

  const drawNextCard = async (): Promise<void> => {
    if (isDrawing.value) {
      return;
    }

    isDrawing.value = true;
    errorMessage.value = null;

    try {
      await animateDeckTap();

      const payload = await drawPhoto({
        album_id: drawStore.albumId,
        exclude_ids: [...drawStore.excludeIds]
      });

      if (activeCard.value) {
        await animatePreviousCardToPile();
      }

      drawStore.addDrawnCard({
        photo: payload.photo,
        weightReason: payload.weight_reason
      });
      lastWeightReason.value = payload.weight_reason;

      await nextTick();
      await animateCenterReveal();
    } catch (error) {
      if (isAxiosError<{ detail?: string }>(error)) {
        errorMessage.value = error.response?.data?.detail ?? "Draw failed";
      } else {
        errorMessage.value = "Draw failed";
      }
    } finally {
      isDrawing.value = false;
    }
  };

  const openScatter = async (): Promise<void> => {
    if (!hasDrawnCards.value) {
      return;
    }

    isScatterOpen.value = true;
    await nextTick();
    await animateScatterIn();
  };

  const collectScatter = async (): Promise<void> => {
    await animateScatterOut();
    isScatterOpen.value = false;
  };

  const reshuffle = async (): Promise<void> => {
    if (isDrawing.value) {
      return;
    }

    try {
      await resetDrawSession();
    } catch {
      // Draw session state lives in frontend, backend reset endpoint is best-effort only.
    }

    drawStore.resetSession();
    isScatterOpen.value = false;
    errorMessage.value = null;
    lastWeightReason.value = null;
  };

  const undoLastCard = async (): Promise<void> => {
    if (isDrawing.value) {
      return;
    }

    const removed = drawStore.undoLastDraw();
    if (!removed) {
      return;
    }

    await nextTick();
    await animateCenterReveal();
    lastWeightReason.value = drawStore.activeCard?.weightReason ?? null;
  };

  return {
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
    undoLastCard
  };
};
