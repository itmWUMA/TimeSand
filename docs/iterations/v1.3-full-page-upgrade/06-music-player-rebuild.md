---
type: task
iteration: "1.3"
status: pending
branch: "feat/music-player-rebuild"
pr:
completed:
tags:
  - full-page-upgrade
  - music-player
---

# Task 6: Music Player Rebuild

- **Branch**: `feat/music-player-rebuild`
- **Scope**: Rebuild the bottom music player with expand/collapse dual-state, icon buttons, and repeat mode cycling.
- **Dependencies**: Task 1 (cleanup) must be merged first

## Files

### Frontend

- `frontend/src/components/MusicPlayer.vue` (rewrite)
- `frontend/src/stores/player.ts` (modify — expose `cycleRepeatMode` action)
- `frontend/src/composables/useMusicPlayer.ts` (modify — expose `cycleRepeatMode`, `repeatMode`)
- `frontend/src/i18n/locales/zh-CN.ts` (modify — add repeat mode labels)
- `frontend/src/i18n/locales/en.ts` (modify — add repeat mode labels)

## Design

### Collapsed State (~48px height)

```
┌──────────────────────────────────────────────────────┐
│ Track Title          ━━━━━●━━━━━━  ◀◀  ▶  ▶▶  🔁  ▲ │
└──────────────────────────────────────────────────────┘
```

- Track title: truncated, `text-sm`, left-aligned
- Thin progress bar: 4px height, `--ts-accent` fill, clickable for seek
- Icon buttons: prev, play/pause, next — inline SVG, 20px
- Repeat mode icon: cycles all → one → none
- Expand chevron: right-most

### Expanded State (~120px height)

```
┌──────────────────────────────────────────────────────────┐
│ Track Title                                            ▼ │
│ Artist · Playlist Name                                   │
│ ━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━  1:23 / 3:45          │
│          ◀◀    ▶    ▶▶    🔁    🔊 ━━━━●━━━━             │
└──────────────────────────────────────────────────────────┘
```

- Full track info: title (bold), artist, playlist name
- Wide progress bar with seek (input range, styled)
- Time display: `formatTime(currentTime) / formatTime(duration)`
- Controls: prev, play/pause, next, repeat mode, volume slider
- Collapse chevron top-right

### Repeat Mode Cycling

Store action `cycleRepeatMode()`:

```ts
cycleRepeatMode(): void {
  const modes: RepeatMode[] = ['all', 'one', 'none']
  const currentIndex = modes.indexOf(this.repeatMode)
  this.repeatMode = modes[(currentIndex + 1) % modes.length]
}
```

Icon states:

| Mode | Visual | Color |
|------|--------|-------|
| `all` | Loop arrows | `text-ts-accent` |
| `one` | Loop arrows + "1" superscript | `text-ts-accent` |
| `none` | Loop arrows | `text-ts-muted` |

### Icon Buttons

All icons are inline SVG elements, Lucide style:
- `viewBox="0 0 24 24"`, `stroke="currentColor"`, `stroke-width="2"`, `fill="none"`
- Size: 20px in collapsed, 24px in expanded
- Hover: `opacity 0.7 → 1`

Icon SVG paths for each action:

| Icon | SVG Reference |
|------|---------------|
| Play | `<polygon points="5,3 19,12 5,21" />` |
| Pause | Two `<rect>` bars |
| Skip Back | Two left-pointing triangles |
| Skip Forward | Two right-pointing triangles |
| Repeat | Loop arrows path |
| Chevron Up | `<polyline points="6,15 12,9 18,15" />` |
| Chevron Down | `<polyline points="6,9 12,15 18,9" />` |
| Volume | Speaker icon path |

### Expand/Collapse

- State stored in `localStorage` key `ts-player-expanded` (`'true'` | `'false'`)
- Default: collapsed (`'false'`)
- Transition: CSS `transition: max-height 0.3s ease, opacity 0.3s ease` on expanded section
- `main` element padding-bottom adjusts with player height to prevent content overlap

### No Music State

When `tracks.length === 0`:
- Collapsed: show "No music loaded" text, all controls disabled
- No expand button in this state

## Acceptance Criteria

- [ ] Collapsed state shows: track title, thin progress bar, icon buttons (prev/play/next/repeat), expand chevron
- [ ] Expanded state shows: full track info, wide progress bar, time display, volume slider, controls, collapse chevron
- [ ] Repeat mode cycles correctly: all → one → none → all
- [ ] Seek (drag progress bar) works in both states
- [ ] Volume control works in expanded state
- [ ] Expand/collapse state persists across navigations and page reloads
- [ ] Icon buttons render correctly (inline SVG, proper sizing)
- [ ] No music state shows disabled controls
- [ ] `bun run type-check && bun run lint:fix` passes
- [ ] Visual verification via Chrome DevTools MCP in both states

## Tests

### Frontend

- Unit test: `cycleRepeatMode` action cycles through modes correctly
- Unit test: expand/collapse state reads from and writes to localStorage
- Visual verification: both states, seek interaction, repeat mode icon changes
