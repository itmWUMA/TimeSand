---
type: task
iteration: "1.4"
status: pending
branch: "feat/side-drawer-nav"
pr:
completed:
tags:
  - v1.4
  - responsive
  - mobile
  - navigation
---

# Task 1: Side Drawer Navigation

- **Branch**: `feat/side-drawer-nav`
- **Scope**: Replace the mobile dropdown menu with a left-anchored overlay drawer (Sheet/Drawer pattern)
- **Dependencies**: None

## Files

### Frontend

- `frontend/src/layouts/DefaultLayout.vue` (modify) — replace mobile menu dropdown with drawer trigger and drawer component
- `frontend/src/components/MobileDrawer.vue` (create) — drawer overlay component with backdrop, slide animation, and navigation items

## Design Details

### Drawer Behavior

- **Trigger**: tap the existing "菜单" button in the mobile header, OR swipe right from left edge (~20px zone)
- **Open animation**: slide in from left, 250ms ease-out (GSAP), backdrop fades in simultaneously
- **Close triggers**: tap backdrop, swipe left on drawer panel, tap a navigation item
- **Close animation**: slide out to left, 200ms ease-in, backdrop fades out
- **Width**: 75% of viewport width (max 320px)
- **Backdrop**: `rgba(0, 0, 0, 0.5)`, covers full screen behind drawer

### Drawer Content

Same as current mobile dropdown, in order:
1. App logo / "TimeSand" heading
2. Navigation links: 抽卡, 相册, 上传, 音乐, 幻灯片, 设置
3. Active route highlighted with accent background (same style as desktop sidebar)
4. Locale toggle button at bottom

### Responsive Guard

- Drawer only renders on mobile (below `md` breakpoint)
- Desktop sidebar in `DefaultLayout.vue` unchanged
- When viewport resizes above `md`, drawer auto-closes if open

### iOS Safe Area

- Add `padding-bottom: env(safe-area-inset-bottom)` to drawer panel
- Add `padding-top: env(safe-area-inset-top)` if drawer extends to top edge

## Implementation Approach

Build from the project's existing overlay pattern (`TsDialog` as reference). Radix Vue does not include a Sheet component.
- Fixed overlay (`position: fixed; inset: 0; z-index: 50`)
- Backdrop div with click handler
- Panel div with GSAP `x` animation (start at `-100%`, animate to `0`)
- Edge swipe to open (nice-to-have): listen for `touchstart` near left edge (x < 20px), track `touchmove`, commit open if deltaX > 60px

## Acceptance Criteria

- [ ] Tapping "菜单" opens a drawer sliding in from the left with backdrop
- [ ] Tapping backdrop closes the drawer
- [ ] Tapping a navigation item navigates to that page and closes the drawer
- [ ] Active route is visually highlighted in the drawer
- [ ] Locale toggle works inside the drawer
- [ ] Drawer only appears on mobile; desktop sidebar is unchanged
- [ ] Slide-in/out animations are smooth (no frame drops on mid-range phone emulation)
- [ ] All drawer menu items have ≥44px touch target height
- [ ] iOS safe area padding applied to drawer panel

## Tests

### Frontend

- Verify drawer opens/closes via menu button click
- Verify navigation links route correctly and close drawer
- Verify drawer is not rendered when viewport is ≥ `md` breakpoint
- Visual verification in Chrome DevTools mobile emulation (390×844)
