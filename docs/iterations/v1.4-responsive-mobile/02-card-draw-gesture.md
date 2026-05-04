---
type: task
iteration: "1.4"
status: done
branch: "feat/card-draw-gesture"
pr:
completed: 2026-05-04
tags:
  - v1.4
  - responsive
  - mobile
  - card-draw
  - gesture
---

# Task 2: Card Draw Gesture Feedback

- **Branch**: `feat/card-draw-gesture`
- **Scope**: Add visual follow-the-finger feedback to the existing swipe-to-draw/undo gesture on the card draw page
- **Dependencies**: None

## Files

### Frontend

- `frontend/src/pages/HomePage.vue` (modify) — enhance touch handlers with `touchmove` tracking, apply real-time card transforms, add directional indicators
- `frontend/src/components/draw/CardDeck.vue` (modify) — expose ref or accept transform props for gesture-driven positioning

## Design Details

### Gesture Flow

1. **touchstart**: Record start X position (existing logic)
2. **touchmove** (NEW): Compute `deltaX = currentX - startX`. Apply real-time transform to card deck element:
   - `translateX(deltaX)` — card follows finger horizontally
   - `rotate(deltaX * 0.05deg)` — subtle tilt in swipe direction
   - Opacity of directional indicator scales with `|deltaX| / threshold`
3. **touchend**: 
   - If `|deltaX| >= 42px` (existing threshold): execute draw (left) or undo (right), animate card away
   - If `|deltaX| < 42px`: spring card back to center with GSAP elastic ease

### Directional Indicators

- **Swiping left** (draw): show a subtle "抽卡 →" indicator fading in as the card moves left
- **Swiping right** (undo): show "← 撤销" indicator fading in as the card moves right
- Indicators use accent color with opacity tied to swipe progress: `opacity = Math.min(1, |deltaX| / threshold)`
- Indicators disappear on release (spring-back or action commit)

### Spring-back Animation

When swipe doesn't reach threshold:
- GSAP `to` with `{ x: 0, rotation: 0, duration: 0.4, ease: 'back.out(1.7)' }`
- Indicators fade out simultaneously

### Performance

- Use `{ passive: true }` on `touchmove` listener (no `preventDefault` needed — horizontal swipe on page content doesn't conflict with scroll)
- Apply transforms via GSAP's direct property setting (hardware-accelerated) or inline `style.transform`
- Keep frame time < 16ms — avoid layout-triggering properties

### Scope Limitation

- No velocity-based flick detection
- No multi-touch handling
- No vertical swipe handling
- Desktop mouse drag NOT included (touch-only enhancement)

## Acceptance Criteria

- [ ] During horizontal swipe, card visually follows finger position with subtle tilt
- [ ] Directional indicator ("抽卡" / "撤销") fades in proportionally to swipe distance
- [ ] Releasing before threshold: card springs back to center with elastic animation
- [ ] Releasing past threshold: existing draw/undo action fires correctly
- [ ] Existing button-based draw ("抽下一张") still works unchanged
- [ ] No visual changes on desktop (touch-only behavior)
- [ ] No perceptible lag during swipe tracking on mobile emulation

## Tests

### Frontend

- Verify touch swipe left triggers card draw (existing behavior preserved)
- Verify touch swipe right triggers undo (existing behavior preserved)
- Verify card returns to center on short swipes
- Visual verification of gesture feedback in Chrome DevTools mobile emulation (390×844)
