---
type: task
iteration: "1.4"
status: done
branch: "feat/touch-target-audit"
pr:
completed: 2026-05-04
tags:
  - v1.4
  - responsive
  - mobile
  - touch
  - accessibility
---

# Task 4: Touch Target Audit

- **Branch**: `feat/touch-target-audit`
- **Scope**: Audit and fix touch target sizes across critical-path pages NOT already handled by Tasks 1–3. Tasks 1 (drawer), 2 (card draw), and 3 (music player) are responsible for touch targets in their own components. This task covers the remaining pages: albums, album detail, lightbox, slideshow, and shared UI base components.
- **Dependencies**: Tasks 1, 2, 3 must be merged first

## Files

### Frontend

- `frontend/src/pages/AlbumsPage.vue` (modify) — album card touch targets, create form button
- `frontend/src/pages/AlbumDetailPage.vue` (modify) — photo grid items, tag buttons, action buttons spacing
- `frontend/src/components/TsLightbox.vue` (modify) — close button, navigation arrows touch targets
- `frontend/src/pages/SlideshowPage.vue` (modify) — playback controls, exit button touch targets
- `frontend/src/components/SlideshowPlayer.vue` (modify) — control button sizing and spacing
- `frontend/src/components/ui/TsButton.vue` (modify) — ensure minimum touch target size on mobile via CSS
- `frontend/src/components/ui/TsIconButton.vue` (modify) — ensure 44px minimum on mobile

## Design Details

### Touch Target Standard

- **Minimum size**: 44×44px for all interactive elements on mobile
- **Minimum spacing**: 8px between adjacent interactive elements; 12px when one is a destructive action
- **Technique**: prefer increasing `padding` or adding `::before` pseudo-element hit areas over enlarging visual button size
- **Guard**: all changes scoped to mobile via `@media (max-width: 767px)` or Tailwind responsive classes

### Page-by-Page Audit

#### Albums Page (`AlbumsPage.vue`)
- "创建" button: ensure 44px height with adequate padding
- Album cards: entire card should be tappable (already likely fine, verify)
- Form inputs (相册名称, 描述): minimum 44px height, 16px font size (iOS auto-zoom prevention)

#### Album Detail Page (`AlbumDetailPage.vue`)
- Photo grid items: verify tap target covers full grid cell
- Tag management buttons (add/remove tags): 44px targets, 12px spacing from delete actions
- "Edit" / "Delete" album action buttons: adequate spacing between non-destructive and destructive

#### Photo Lightbox (`TsLightbox.vue`)
- Close button (top-right): 44×44px touch target
- Previous/Next navigation: if arrow buttons exist, ensure 44px; if swipe-based, verify swipe zone is large enough
- Any info/action buttons within the lightbox overlay

#### Slideshow (`SlideshowPage.vue` + `SlideshowPlayer.vue`)
- Play/pause toggle: 44px minimum
- Previous/Next photo buttons: 44px minimum
- Exit/close button: 44px minimum, positioned away from other controls
- Settings controls (if any): adequate sizing

#### Shared UI Components
- `TsButton`: add a mobile CSS rule ensuring `min-height: 44px` and `min-width: 44px` for `size="sm"` and `size="md"` variants on mobile
- `TsIconButton`: ensure the button's clickable area is at least 44×44px on mobile, even if the icon is visually smaller

### iOS Input Auto-Zoom Prevention

Check all `<input>` and `<select>` elements on audited pages. If `font-size` < 16px, iOS Safari will auto-zoom on focus. Fix by setting `font-size: 16px` on mobile inputs (preferred over adding `maximum-scale=1` to viewport meta, which harms accessibility).

## Acceptance Criteria

- [x] All interactive elements on albums page meet 44×44px touch target on mobile
- [x] All interactive elements on album detail page meet 44×44px touch target on mobile
- [x] Lightbox close and navigation controls meet 44×44px touch target
- [x] Slideshow controls meet 44×44px touch target
- [x] Adjacent destructive actions have ≥12px spacing
- [x] Form inputs are ≥44px height and ≥16px font size on mobile
- [x] TsButton and TsIconButton base components enforce minimum touch targets on mobile
- [x] Desktop styling unchanged — all modifications are mobile-scoped
- [x] Visual audit pass in Chrome DevTools mobile emulation (390×844) confirms no cramped/overlapping controls

## Tests

### Frontend

- Visual audit of each critical-path page in mobile emulation
- Verify TsButton and TsIconButton render at minimum 44px on mobile viewport
- Verify form inputs don't trigger iOS auto-zoom (font-size ≥ 16px)
- Verify desktop layout unchanged (snapshot or visual check at 1280px+)
