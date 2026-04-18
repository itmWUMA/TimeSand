---
type: task
iteration: "0.0"
status: done
branch: "feat/music-player"
pr: 9
completed: 2026-04-12
tags:
  - mvp
---

# Task 7: Music Player

- **Branch**: `feat/music-player`
- **Scope**: Persistent background music player component visible at the bottom of the layout. Plays from playlists with standard controls (play/pause, next/previous, volume, progress bar, seek). Integrates with card draw and slideshow page contexts — auto-selects album's associated playlist or the global default playlist. Player state persists across page navigation.
- **Dependencies**: Task 1 (project-foundation), Task 2 (photo-management), and Task 4 (music-playlist) must be merged into `dev` first

## Files

### Frontend Only

- `frontend/src/stores/player.ts` (create) — Pinia store: currentTrack, playlist tracks, playback state (playing/paused), volume, currentTime, duration, repeat mode
- `frontend/src/composables/useMusicPlayer.ts` (create) — HTML5 Audio element management, playlist navigation logic, context switching (album playlist vs default playlist)
- `frontend/src/components/MusicPlayer.vue` (create) — Persistent player bar: track title/artist, play/pause, prev/next, progress bar (click to seek), volume slider
- `frontend/src/components/MusicPlayerMini.vue` (create) — Compact inline player for fullscreen modes (slideshow)
- `frontend/src/layouts/DefaultLayout.vue` (modify) — Add MusicPlayer at bottom of layout, adjust main content bottom padding
- `frontend/src/pages/HomePage.vue` (modify) — On mount, set player context to default playlist (or album playlist if album filter is active)
- `frontend/src/pages/SlideshowPage.vue` (modify) — On mount, set player context based on album_id query param

## API Contracts

None — uses existing APIs from Task 4:
- `GET /api/playlists` — list playlists (find default)
- `GET /api/playlists/{id}` — get playlist with ordered tracks
- `GET /api/music/{id}/file` — stream audio file
- `GET /api/albums/{id}` — get album detail (includes `playlist_id`)

## Player Architecture

### Audio Management

- Single HTML5 `Audio` element managed by `useMusicPlayer` composable
- Audio element created once and persists across page navigation (not re-created on route change)
- Composable exposes reactive state: `isPlaying`, `currentTime`, `duration`, `volume`, `currentTrack`

### Playlist Context

The player's playlist can come from different sources depending on page context:

| Page | Playlist Source |
|------|----------------|
| Card Draw (/) | Album's playlist (if album filter active) → fallback to default playlist |
| Slideshow | Album's playlist (if album_id in query) → fallback to default playlist |
| Music page | Manually selected playlist |
| Other pages | Continue playing current playlist |

### State (Pinia Store)

```typescript
interface PlayerState {
  currentTrack: Music | null
  tracks: Music[]           // ordered playlist tracks
  trackIndex: number        // current position in tracks
  isPlaying: boolean
  volume: number            // 0-1
  currentTime: number       // seconds
  duration: number          // seconds
  playlistId: number | null // current playlist ID
  playlistName: string
}
```

## Component Details

### MusicPlayer.vue (full bar)

- Fixed position at bottom of DefaultLayout
- Layout: `[Track Info] [Prev] [Play/Pause] [Next] [Progress Bar] [Volume]`
- Track info: title and artist text
- Progress bar: clickable to seek, shows elapsed / total time
- Volume: slider control (0-100%)
- When no tracks loaded: show "No music — upload tracks to get started"

### MusicPlayerMini.vue (compact)

- For use inside fullscreen modes (slideshow)
- Minimal: track title + play/pause + next + volume icon
- Semi-transparent overlay style

## Acceptance Criteria

- [ ] Player bar visible at bottom of all non-fullscreen pages
- [ ] Play/pause button toggles audio playback
- [ ] Next/previous track controls navigate within playlist
- [ ] Progress bar shows playback position, click to seek
- [ ] Volume slider adjusts audio volume
- [ ] Track auto-advances to next in playlist when current track ends
- [ ] Loops back to first track when playlist ends
- [ ] Entering card draw page → player loads default playlist (or album playlist if filter active)
- [ ] Entering slideshow → player loads album playlist or default
- [ ] Player state persists across page navigation (audio continues playing when navigating between pages)
- [ ] Mini player variant renders in slideshow mode
- [ ] When no tracks exist, shows helpful empty state message
- [ ] `bun run type-check` passes

## Tests

### Frontend

- Test player store: `loadPlaylist` sets tracks and resets index; `play`/`pause` toggle `isPlaying`; `next` increments index (wraps); `prev` decrements (wraps)
- Test useMusicPlayer composable: `setContext('album', albumId)` loads correct playlist; `setContext('default')` loads default playlist
- Test MusicPlayer component: renders track title, renders control buttons, shows empty state when no tracks
