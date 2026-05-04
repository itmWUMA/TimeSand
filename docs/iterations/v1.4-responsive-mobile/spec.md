---
type: spec
iteration: "1.4"
created: 2026-05-04
tags:
  - v1.4
  - responsive
  - mobile
---

# Design Spec: Responsive & Mobile

## Overview

TimeSand's desktop experience is nearing production quality through iterations 1.1–1.3. This iteration adapts the UI for mobile phone users (portrait < 640px), ensuring core workflows — card draw, album browsing, photo viewing, music playback, and slideshow — feel natural on touch devices.

The current codebase already has a basic responsive foundation: the sidebar collapses at the `md` breakpoint, photo grids adapt column counts, and basic touch swipe exists on the card draw page. This iteration builds on that foundation rather than starting from scratch.

## Requirements

### Functional Requirements

- **Side-drawer navigation**: Replace the current dropdown mobile menu with an overlay sheet/drawer that slides in from the left edge, with backdrop dimming and swipe-to-close.
- **Card draw gesture feedback**: Enhance the existing left-swipe-to-draw / right-swipe-to-undo with visual "follow-the-finger" feedback — the card element tracks the user's finger position during the swipe, with directional indicators showing the pending action.
- **Mini music player**: On mobile, the bottom music player defaults to a single-line mini bar (song title + play/pause). Tapping expands it into a full control panel with progress bar, prev/next, and repeat mode.
- **Touch target compliance**: All interactive elements on the critical path (card draw, album browsing, photo lightbox, music player, navigation, slideshow) meet the 44×44px minimum touch target size, with adequate spacing between adjacent actions.

### Non-Functional Requirements

- **No new dependencies**: Use native Touch Events API and existing libraries (GSAP, Radix Vue). No gesture library additions.
- **Desktop preservation**: All changes must be mobile-only or gracefully degrade. Desktop experience must remain unchanged.
- **Performance**: No perceptible lag on mid-range phones. Touch feedback must feel immediate (< 16ms frame time for gesture tracking).

## Design

### Navigation: Side Drawer

**Current state**: Mobile header with a "菜单" button that toggles a dropdown list, pushing page content down. The dropdown occupies significant vertical space when open.

**Target state**: Tapping the menu button (or swiping right from the left edge) opens a sheet/drawer overlay from the left side, covering ~75% of screen width. The remaining area shows a semi-transparent backdrop. Tapping the backdrop or swiping left closes the drawer.

**Implementation**: Build from the project's existing overlay pattern (`TsDialog` as reference) with GSAP slide animation. Radix Vue does not include a Sheet component, so the drawer is a custom implementation using a fixed overlay + GSAP `x` animation. The drawer contains the same navigation items as the current dropdown: 抽卡, 相册, 上传, 音乐, 幻灯片, 设置, and the locale toggle.

**Behavior**:
- Open: slide-in animation from left (200–300ms ease-out)
- Close: slide-out to left + backdrop fade (200ms)
- Close triggers: backdrop tap, left swipe on drawer, navigation item click
- Active route highlighted with accent styling (same as current desktop sidebar)
- Only visible on mobile (`md:hidden`); desktop sidebar unchanged

### Card Draw: Gesture Feedback

**Current state**: `HomePage.vue` handles `touchstart`/`touchend` events. A 42px horizontal threshold determines swipe direction. No visual feedback during the swipe — the card stays static until the swipe completes.

**Target state**: During a horizontal swipe, the card element translates along the X axis following the finger position. A subtle directional hint appears:
- Swiping left: card tilts slightly left, a "draw" indicator fades in
- Swiping right: card tilts slightly right, an "undo" indicator fades in
- If released before threshold: card springs back to center (GSAP elastic ease)
- If released past threshold: existing draw/undo action fires, card animates away

**Implementation**: Track `touchmove` events to compute delta-X. Apply `transform: translateX(deltaX) rotate(deltaX * 0.05deg)` to the card deck element in real-time. Use GSAP for the spring-back and completion animations. Keep the existing 42px threshold for action commitment.

**Scope limitation**: This is "basic gesture + visual feedback", not a full Tinder-style card physics system. No velocity-based flick detection, no momentum, no multi-touch.

### Music Player: Mini Mode

**Current state**: Fixed bottom bar showing song name, progress slider, and 4 small control buttons (prev, play, next, repeat). Buttons are ~28px, below the 44px touch target minimum.

**Target state (mobile only)**:

**Mini mode** (default, ~48px height):
- Single row: album art thumbnail (32px) | song title + artist | play/pause button (44px)
- Tap anywhere except play/pause to expand
- Thin progress bar at the top edge of the mini bar

**Expanded mode** (~200px height):
- Album art + song info row
- Full progress bar with time stamps
- Control buttons at 44px with proper spacing: prev, play/pause (52px, accent border), next
- Repeat mode toggle
- Tap collapse button or swipe down to return to mini mode

**Implementation**: Add a `miniMode` ref to the music player component. Conditionally render mini vs expanded layout based on this ref and the viewport width. Use GSAP for expand/collapse animation. Desktop layout unchanged.

### Touch Target Optimization

**Scope**: Critical user path — card draw, album browsing, photo lightbox, music player, navigation drawer, slideshow controls.

**Standard**: All interactive elements must have a minimum touch target of 44×44px. Adjacent destructive actions (e.g., delete buttons) must have ≥12px spacing.

**Method**: This is not a separate feature but a cross-cutting concern applied during the implementation of each task above, plus a dedicated pass over the remaining critical-path pages (albums, album detail, lightbox, slideshow).

**Specific elements to audit**:
- Card draw page: "抽下一张" / "重新洗牌" buttons, album selector
- Albums page: album card tap areas, "创建" button, form inputs
- Album detail page: photo grid items, tag management buttons
- Photo lightbox: close button, navigation arrows
- Slideshow: play/pause, prev/next, exit button
- Navigation drawer: menu items, locale toggle

**Technique**: Increase `padding` or use `::before` pseudo-element hit areas rather than enlarging visual button sizes. This preserves the current visual design while making touch targets larger.

## Technical Notes

- **Radix Vue Sheet**: Check if `Sheet` component is available in the project's Radix Vue version. If not, build the drawer from the existing overlay pattern (`TsDialog` as reference) + GSAP slide animation.
- **Touch event passive listeners**: Use `{ passive: true }` for `touchmove` handlers that don't call `preventDefault()` to avoid scroll jank.
- **iOS safe areas**: Add `env(safe-area-inset-bottom)` padding to the music player mini bar and navigation drawer to avoid the iPhone home indicator.
- **Input font size**: Ensure form inputs are ≥16px font size to prevent iOS Safari auto-zoom on focus.
- **Viewport meta**: Verify `<meta name="viewport" content="width=device-width, initial-scale=1">` is present (should already exist).

## Out of Scope

- Upload page mobile adaptation (file picker vs drag-drop)
- Music management page touch optimization
- Settings page touch optimization
- Tablet-specific layouts or landscape optimizations
- Gesture library (Hammer.js, @vueuse/gesture) introduction
- PWA / Service Worker / offline support
- Native app considerations
- Photo grid layout changes (already responsive)
