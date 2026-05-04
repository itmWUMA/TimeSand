---
type: task
iteration: "1.4"
status: pending
branch: "feat/mini-music-player"
pr:
completed:
tags:
  - v1.4
  - responsive
  - mobile
  - music-player
---

# Task 3: Mini Music Player

- **Branch**: `feat/mini-music-player`
- **Scope**: Add a collapsed mini mode for the bottom music player on mobile, with expand/collapse toggle
- **Dependencies**: None

## Files

### Frontend

- `frontend/src/components/MusicPlayer.vue` (modify) — add mini/expanded state, conditional rendering for mobile layout, expand/collapse animation

Note: `MusicPlayerMini.vue` already exists for the slideshow page overlay. That component is separate and unrelated — this task modifies the main `MusicPlayer.vue` bottom bar, adding inline mini/expanded modes rather than creating a new component.

## Design Details

### Mini Mode (default on mobile, ~48px height)

Layout (single row, left to right):
1. **Album art thumbnail** (32×32px, rounded corners) — or music note icon if no art
2. **Song info** (flex: 1): song title (single line, ellipsis overflow), artist/playlist name below in smaller text
3. **Play/pause button** (44×44px touch target) — accent-colored when playing
4. **Thin progress bar** at the very top edge of the mini bar (2px height, accent color, shows playback position)

Tap anywhere on the mini bar (except the play/pause button) to expand.

### Expanded Mode (~200px height)

Layout (vertical stack):
1. **Header row**: album art (40×40px) + song title & artist + collapse button (chevron down)
2. **Progress bar**: full-width slider with current time / total time labels
3. **Controls row**: centered, evenly spaced:
   - Previous (44×44px)
   - Play/Pause (52×52px, accent border, visually larger)
   - Next (44×44px)
4. **Secondary controls row**: repeat mode toggle

### Animations

- **Expand**: GSAP `fromTo` height animation, 250ms ease-out. Content fades in with slight delay (stagger)
- **Collapse**: reverse animation, 200ms ease-in

### Responsive Guard

- Mini/expanded mode only active below `md` breakpoint
- Desktop layout unchanged — current full player bar remains as-is
- Use `useMediaQuery('(max-width: 767px)')` or Tailwind `md:` classes

### iOS Safe Area

- Add `padding-bottom: env(safe-area-inset-bottom)` to the mini bar and expanded panel
- This prevents the iPhone home indicator from overlapping the controls

### State Persistence

- `miniMode` state is local to the component (no store needed)
- When navigating between pages, mini mode state resets to collapsed (mini)
- Playback state is unaffected — music continues playing through navigation

## Acceptance Criteria

- [ ] On mobile, music player shows as a compact mini bar by default
- [ ] Mini bar displays: song title, play/pause button, thin progress indicator
- [ ] Tapping mini bar (outside play/pause) expands to full control panel
- [ ] Expanded panel shows: progress bar with timestamps, prev/play/next buttons (44px+), repeat toggle
- [ ] Collapse button returns to mini mode
- [ ] Play/pause works correctly in both mini and expanded modes
- [ ] Desktop player layout unchanged
- [ ] Expand/collapse animations are smooth
- [ ] iOS safe area bottom padding applied
- [ ] All control buttons meet 44×44px minimum touch target

## Tests

### Frontend

- Verify mini bar renders on mobile viewport
- Verify expand/collapse toggle works
- Verify playback controls function in both modes
- Verify desktop layout is unaffected
- Visual verification in Chrome DevTools mobile emulation (390×844)
