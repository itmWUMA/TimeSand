---
type: task
iteration: "1.1"
status: pending
branch: "feat/i18n-extraction"
pr:
completed:
tags:
  - i18n
  - phase-1
---

# Task 5: i18n String Extraction

- **Branch**: `feat/i18n-extraction`
- **Scope**: Replace all hardcoded user-facing strings in pages, components, and layout with `$t()` / `t()` calls referencing the locale keys defined in Task 4.
- **Dependencies**: Task 4 (i18n Infrastructure) must be merged first

## Files

### Frontend — Pages (modify)

- `frontend/src/pages/HomePage.vue`
- `frontend/src/pages/AlbumsPage.vue`
- `frontend/src/pages/AlbumDetailPage.vue`
- `frontend/src/pages/UploadPage.vue`
- `frontend/src/pages/MusicPage.vue`
- `frontend/src/pages/SlideshowPage.vue`
- `frontend/src/pages/SettingsPage.vue`

### Frontend — Components (modify)

- `frontend/src/components/AlbumCard.vue`
- `frontend/src/components/MusicPlayer.vue`
- `frontend/src/components/MusicPlayerMini.vue`
- `frontend/src/components/MusicUploader.vue`
- `frontend/src/components/PhotoUploader.vue`
- `frontend/src/components/PhotoGrid.vue`
- `frontend/src/components/PlaylistEditor.vue`
- `frontend/src/components/TagManager.vue`
- `frontend/src/components/SlideshowPlayer.vue`

### Frontend — Draw Components (modify)

- `frontend/src/components/draw/CardDeck.vue`
- `frontend/src/components/draw/CardPile.vue`
- `frontend/src/components/draw/CardScatter.vue`
- `frontend/src/components/draw/DrawnCard.vue`

### Frontend — Layout (modify)

- `frontend/src/layouts/DefaultLayout.vue`

### Frontend — Tests (modify)

- Multiple test files need i18n plugin in mount options

## Acceptance Criteria

- [ ] All ~134 hardcoded user-facing strings replaced with `$t()` or `t()` calls
- [ ] No hardcoded English or Chinese user-facing text remains in any template or script
- [ ] All existing component tests pass (with i18n plugin provided in mount options)
- [ ] `bun run type-check` passes
- [ ] `bun run build` succeeds

## Implementation Steps

### Strategy

Each Vue SFC needs two changes:
1. **`<script setup>`**: Add `const { t } = useI18n()` import (for script-level strings like error messages)
2. **`<template>`**: Replace hardcoded strings with `$t('key')` (template-level) or `t('key')` (script-level)

For components that only have template strings, just use `$t()` directly — no import needed.
For components that set error messages in script (e.g., `errorMessage.value = 'Failed...'`), import `useI18n`.

- [ ] **Step 1: Update test helper to provide i18n plugin**

Create `frontend/src/test-utils.ts`:

```ts
import type { Component } from 'vue'
import type { ComponentMountingOptions } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

import type { MessageSchema } from './i18n/types'
import en from './i18n/locales/en'
import zhCN from './i18n/locales/zh-CN'

export function createTestI18n() {
  return createI18n<[MessageSchema], 'zh-CN' | 'en'>({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: { 'zh-CN': zhCN, en },
  })
}

export function mountWithI18n<T extends Component>(
  component: T,
  options?: ComponentMountingOptions<T>,
) {
  const i18n = createTestI18n()
  return mount(component, {
    ...options,
    global: {
      ...options?.global,
      plugins: [...(options?.global?.plugins ?? []), i18n],
    },
  })
}
```

- [ ] **Step 2: Extract DefaultLayout.vue strings**

In `frontend/src/layouts/DefaultLayout.vue`:

In `<script setup>`, change the `navItems` array to use locale keys:

```ts
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const navItems = [
  { path: '/', labelKey: 'nav.cardDraw' },
  { path: '/albums', labelKey: 'nav.albums' },
  { path: '/upload', labelKey: 'nav.upload' },
  { path: '/music', labelKey: 'nav.music' },
  { path: '/slideshow', labelKey: 'nav.slideshow' },
  { path: '/settings', labelKey: 'nav.settings' },
]
```

In `<template>`, replace hardcoded strings:

| Original | Replacement |
|----------|-------------|
| `TimeSand` (sidebar heading) | `{{ $t('app.name') }}` |
| `Smart photo wall and music box` | `{{ $t('app.tagline') }}` |
| `{{ item.label }}` | `{{ $t(item.labelKey) }}` |
| `TimeSand` (mobile header) | `{{ $t('app.name') }}` |
| `{{ mobileOpen ? "Close" : "Menu" }}` | `{{ mobileOpen ? $t('common.close') : $t('common.menu') }}` |

Update the mobile nav loop to use `labelKey` the same way.

- [ ] **Step 3: Extract HomePage.vue strings**

In `<script setup>`, add `useI18n` import:

```ts
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
```

Replace in `<template>`:

| Original | Replacement |
|----------|-------------|
| `Card Draw` (heading) | `{{ $t('draw.title') }}` |
| `Deck -> flip reveal -> ...` | `{{ $t('draw.description') }}` |
| `Album` (label) | `{{ $t('draw.albumLabel') }}` |
| `All photos` (option) | `{{ $t('draw.allPhotos') }}` |
| `{{ isDrawing ? "Drawing..." : "Draw Next" }}` | `{{ isDrawing ? $t('draw.drawing') : $t('draw.drawNext') }}` |
| `Reshuffle` | `{{ $t('draw.reshuffle') }}` |
| `Mobile: swipe left to draw, swipe right to undo.` | `{{ $t('draw.swipeHint') }}` |

- [ ] **Step 4: Extract AlbumsPage.vue strings**

Add `useI18n` import. Replace in template and script:

| Original | Replacement |
|----------|-------------|
| `Albums` (heading) | `{{ $t('album.title') }}` |
| `Create and browse albums...` | `{{ $t('album.description') }}` |
| `Album name` (placeholder) | `$t('album.namePlaceholder')` |
| `Description (optional)` (placeholder) | `$t('album.descPlaceholder')` |
| `{{ creating ? "Creating..." : "Create Album" }}` | `{{ creating ? $t('common.creating') : $t('album.title') + ' ' + $t('common.create') }}` |
| `'Failed to load albums.'` (script) | `t('album.loadFailed')` |
| `'Failed to create album.'` (script) | `t('album.createFailed')` |
| `Loading albums...` | `{{ $t('album.loadingAlbums') }}` |
| `No albums yet. Create your first album above.` | `{{ $t('album.emptyState') }}` |

Note: For the create button, use `{{ creating ? $t('common.creating') : $t('common.create') }}` (simpler than concatenation).

- [ ] **Step 5: Extract AlbumDetailPage.vue strings**

Add `useI18n` import. This page has many strings — replace all:

Script-level (error messages — change to `t('...')`):
- `'Invalid album id.'` → `t('album.invalidId')`
- `'Failed to load album detail.'` → `t('album.loadFailed')`
- `'Failed to save album.'` → `t('album.saveFailed')`
- `'Failed to add photo to album.'` → `t('album.addPhotoFailed')`
- `'Failed to remove photo from album.'` → `t('album.removePhotoFailed')`
- `'Failed to add tag.'` → `t('album.addTagFailed')`
- `'Failed to remove tag.'` → `t('album.removeTagFailed')`
- `'Failed to create tag.'` → `t('album.createTagFailed')`

Template-level:
- `{{ album?.name ?? "Album Detail" }}` → `{{ album?.name ?? $t('album.detail') }}`
- `Manage album metadata...` → `{{ $t('album.detailDesc') }}`
- `Start Slideshow` → `{{ $t('album.startSlideshow') }}`
- `Album Settings` → `{{ $t('album.albumSettings') }}`
- `Name` → `{{ $t('album.nameLabel') }}`
- `Cover Photo` → `{{ $t('album.coverPhoto') }}`
- `None` → `{{ $t('common.none') }}`
- `Description` → `{{ $t('album.descriptionLabel') }}`
- `{{ savingAlbum ? "Saving..." : "Save Album" }}` → `{{ savingAlbum ? $t('common.saving') : $t('common.save') }}`
- `Add Photos` → `{{ $t('album.addPhotos') }}`
- `Select a photo` → `{{ $t('album.selectPhoto') }}`
- `Add To Album` → `{{ $t('album.addToAlbum') }}`
- `Album Photos` → `{{ $t('album.albumPhotos') }}`
- `{{ album.photo_count }} items` → `{{ $t('common.items', { count: album.photo_count }) }}`
- `No photos in this album yet.` → `{{ $t('album.noPhotos') }}`
- `Remove` → `{{ $t('common.remove') }}`
- `Loading album details...` → `{{ $t('album.loadingDetails') }}`

- [ ] **Step 6: Extract UploadPage.vue strings**

Add `useI18n` import. Replace:

Script:
- `'Upload failed. Please try again.'` → `t('photo.uploadFailed')`
- `'Failed to load existing photos.'` → `t('photo.loadFailed')`

Template:
- `Upload` (heading) → `{{ $t('photo.uploadTitle') }}`
- `Batch upload your memories...` → `{{ $t('album.description') }}`

Actually, the upload page description is unique: "Batch upload your memories and review them instantly." Let me add a specific key. I'll use `photo.uploadDesc` — but it's not in the locale files yet.

Wait, looking at the locale files I created in Task 4, I should check if every string maps. Let me re-check...

The UploadPage description "Batch upload your memories and review them instantly." — I didn't include this specific key in the locale. I need to add `photo.uploadDesc` to both locale files.

For simplicity, add these to the locale files in this task:

In zh-CN.ts, add to the `photo` section:
```ts
uploadDesc: '批量上传你的回忆，即时预览。',
```

In en.ts, add to the `photo` section:
```ts
uploadDesc: 'Batch upload your memories and review them instantly.',
```

Template:
- `Batch upload your memories...` → `{{ $t('photo.uploadDesc') }}`

- [ ] **Step 7: Extract MusicPage.vue strings**

Add `useI18n` import. This is the largest page.

Script (error messages):
- `'Failed to upload music files.'` → `t('music.uploadFailed')`
- `'Failed to create playlist.'` → `t('music.createFailed')`
- `'Failed to delete playlist.'` → `t('music.deleteFailed')` (add key `deleteFailed` to locale)
- `'Failed to add track to playlist.'` → `t('music.addTrackFailed')`
- `'Failed to remove track from playlist.'` → `t('music.removeTrackFailed')`
- `'Failed to reorder playlist tracks.'` → `t('music.reorderFailed')`
- `'Failed to delete track.'` → `t('music.deleteFailed')`
- `'Failed to load music data.'` → `t('music.loadFailed')`
- `'Failed to load selected playlist.'` → `t('music.loadPlaylistFailed')`

Add to locale files:
```ts
deleteFailed: '删除播放列表失败。', // zh-CN (also used for track deletion)
```

Wait, we have `deleteFailed` for track and playlist. They use the same English text "Failed to delete track." and "Failed to delete playlist." — different messages. Let me use:
- `music.deleteTrackFailed` for track
- `music.deletePlaylistFailed` for playlist

Add these to locale files.

Template:
- `Music & Playlists` → `{{ $t('music.title') }}`
- `Upload tracks, organize playlists...` → `{{ $t('music.description') }}`
- `All Tracks` → `{{ $t('music.allTracks') }}`
- `{{ tracks.length }} tracks` → `{{ $t('music.trackCount', { count: tracks.length }) }}`
- `Loading tracks...` → `{{ $t('music.loadingTracks') }}`
- `No tracks yet. Upload your first audio file.` → `{{ $t('music.emptyState') }}`
- `{{ track.artist || "Unknown Artist" }}` → `{{ track.artist || $t('music.unknownArtist') }}`
- `{{ selectedTrackIds.has(track.id) ? "Added" : "Add" }}` → `{{ selectedTrackIds.has(track.id) ? $t('common.added') : $t('common.add') }}`
- `Delete` → `{{ $t('common.delete') }}`
- `Playlists` → `{{ $t('music.playlists') }}`
- `New playlist name` (placeholder) → `$t('music.newPlaylistPlaceholder')`
- `{{ creatingPlaylist ? "Creating..." : "Create" }}` → `{{ creatingPlaylist ? $t('common.creating') : $t('common.create') }}`
- `Selected Playlist` → `{{ $t('music.selectedPlaylist') }}`
- `Delete Selected Playlist` → `{{ $t('music.deletePlaylist') }}`

- [ ] **Step 8: Extract SlideshowPage.vue strings**

Add `useI18n` import. Replace:

Script:
- `'Failed to load slideshow photos.'` → `t('slideshow.loadFailed')`

Template:
- `Loading slideshow...` → `{{ $t('slideshow.loading') }}`
- `Go Back` (both instances) → `{{ $t('slideshow.goBack') }}`
- `{{ albumId ? "No photos found in this album." : "No photos available for slideshow." }}` → `{{ albumId ? $t('slideshow.noPhotosAlbum') : $t('slideshow.noPhotosDefault') }}`

- [ ] **Step 9: Extract SettingsPage.vue strings**

Add `useI18n` import. Replace:

Script:
- `'Failed to load storage information.'` → `t('settings.loadFailed')`

Template:
- `Settings` → `{{ $t('settings.title') }}`
- `Manage storage overview...` → `{{ $t('settings.description') }}`
- `Storage Info` → `{{ $t('settings.storageInfo') }}`
- `Refresh` → `{{ $t('settings.refresh') }}`
- `Loading storage info...` → `{{ $t('settings.loadingStorage') }}`
- `Photos` → `{{ $t('settings.photos') }}`
- `Music Tracks` → `{{ $t('settings.musicTracks') }}`
- `Thumbnails` → `{{ $t('settings.thumbnails') }}`
- `Photo Storage` → `{{ $t('settings.photoStorage') }}`
- `Music Storage` → `{{ $t('settings.musicStorage') }}`
- `Total Storage` → `{{ $t('settings.totalStorage') }}`
- `Slideshow Defaults` → `{{ $t('settings.slideshowDefaults') }}`
- `Applied when slideshow starts...` → `{{ $t('settings.slideshowDesc') }}`
- `Default interval` → `{{ $t('settings.defaultInterval') }}`
- `About` → `{{ $t('settings.about') }}`
- `TimeSand` → `{{ $t('app.name') }}`
- `Version {{ appVersion }}` → `{{ $t('settings.version', { version: appVersion }) }}`
- `GitHub Repository` → `{{ $t('settings.github') }}`

- [ ] **Step 10: Extract component strings (AlbumCard, PhotoUploader, PhotoGrid, MusicUploader, MusicPlayer, MusicPlayerMini, PlaylistEditor, TagManager, SlideshowPlayer)**

**AlbumCard.vue**:
- `No cover photo` → `{{ $t('photo.noCoverPhoto') }}`
- `{{ album.photo_count }} photos` → `{{ $t('common.photos', { count: album.photo_count }) }}`

**PhotoUploader.vue**:
- `Drag photos here` → `{{ $t('photo.dropHint') }}`
- `JPEG, PNG, WebP, GIF, HEIC` → `{{ $t('photo.formats') }}`
- `{{ uploading ? "Uploading..." : "Choose Files" }}` → `{{ uploading ? $t('common.uploading') : $t('photo.chooseFiles') }}`
- `Upload progress: {{ progress }}%` → `{{ $t('photo.uploadProgress', { progress }) }}`

**PhotoGrid.vue**:
- `Uploaded Photos` → `{{ $t('photo.uploadedPhotos') }}`
- `{{ photos.length }} items` → `{{ $t('common.items', { count: photos.length }) }}`
- `No photos uploaded yet.` → `{{ $t('album.noPhotos') }}` (or add a dedicated key)

Add `photo.emptyState` to locale: 'No photos uploaded yet.' / '暂无已上传照片。'

**MusicUploader.vue**:
- `Drag music files here` → `{{ $t('music.dragHint') }}`

Wait — the locale key `music.dragHint` contains "MP3, WAV, FLAC, OGG, AAC" which is the format list, not the drag prompt. Let me fix: use `music.dropHint` for "Drag music files here" and `music.formats` for "MP3, WAV, FLAC, OGG, AAC".

Add to locales:
```ts
dropHint: 'Drag music files here', // en
dropHint: '将音乐文件拖拽到此处', // zh-CN
formats: 'MP3, WAV, FLAC, OGG, AAC', // same in both
```

And rename `dragHint` to `formats`.

- `{{ uploading ? "Uploading..." : "Choose Audio Files" }}` → `{{ uploading ? $t('common.uploading') : $t('music.chooseAudio') }}`

**MusicPlayer.vue**:
- `No music - upload tracks to get started` → `{{ $t('player.noMusic') }}`
- `{{ currentTrack?.title ?? "No track selected" }}` → `{{ currentTrack?.title ?? $t('player.noTrack') }}`
- `{{ currentTrack?.artist || "Unknown Artist" }}` → `{{ currentTrack?.artist || $t('player.unknownArtist') }}`
- `Prev` → `{{ $t('player.prev') }}`
- `{{ isPlaying ? "Pause" : "Play" }}` → `{{ isPlaying ? $t('player.pause') : $t('player.play') }}`
- `Next` → `{{ $t('player.next') }}`
- `Volume` → `{{ $t('player.volume') }}`

**MusicPlayerMini.vue**:
- `No music loaded` → `{{ $t('player.noMusicLoaded') }}`
- `{{ volume === 0 ? "Muted" : "Volume" }}` → `{{ volume === 0 ? $t('player.muted') : $t('player.volume') }}`
- `Pause` / `Play` → `$t('player.pause')` / `$t('player.play')`
- `Next` → `{{ $t('player.next') }}`
- `Unmute` / `Mute` → `$t('player.unmute')` / `$t('player.mute')`

**PlaylistEditor.vue**:
- `Playlist Tracks` → `{{ $t('music.playlistTracks') }}`
- `{{ localTracks.length }} tracks` → `{{ $t('music.trackCount', { count: localTracks.length }) }}`
- `No tracks in this playlist yet.` → `{{ $t('music.noPlaylistTracks') }}`
- `{{ track.artist || "Unknown Artist" }}` → `{{ track.artist || $t('music.unknownArtist') }}`
- `Remove` → `{{ $t('common.remove') }}`

**TagManager.vue**:
- `Add tag` (placeholder) → `$t('tag.addPlaceholder')`
- `Add` (button) → `{{ $t('tag.add') }}`
- `Remove tag {{ tag.name }}` (title/aria-label) → `$t('tag.removeLabel', { name: tag.name })`

**SlideshowPlayer.vue**:
- `No photos` → `{{ $t('slideshow.noPhotos') }}`
- `Exit` → `{{ $t('slideshow.exit') }}`
- `Prev` → `{{ $t('slideshow.prev') }}`
- `{{ isPlaying ? "Pause" : "Play" }}` → `{{ isPlaying ? $t('slideshow.pause') : $t('slideshow.play') }}`
- `Next` → `{{ $t('slideshow.next') }}`
- `Interval` → `{{ $t('slideshow.interval') }}`

- [ ] **Step 11: Extract draw component strings**

**CardDeck.vue**:
- `{{ disabled ? "Drawing..." : "Tap To Draw" }}` → `{{ disabled ? $t('draw.drawing') : $t('draw.tapToDraw') }}`

**CardPile.vue**:
- `Tap To Scatter` → `{{ $t('draw.tapToScatter') }}`
- `Draw cards to build the pile` → `{{ $t('draw.drawHint') }}`

**CardScatter.vue**:
- `Collect` → `{{ $t('draw.collect') }}`

**DrawnCard.vue** (uses script-level date formatting):
- `No capture date` → use `t('draw.noCaptureDate')`
- `Unknown capture date` → use `t('draw.unknownDate')`

Add `useI18n` import for DrawnCard.vue.

- [ ] **Step 12: Add missing locale keys discovered during extraction**

During extraction, several keys were needed that weren't in the original Task 4 locale files. Add these to both `zh-CN.ts` and `en.ts`:

```ts
// photo section additions:
photo.uploadDesc     // "Batch upload your memories and review them instantly."
photo.emptyState     // "No photos uploaded yet."

// music section additions:
music.dropHint       // "Drag music files here"
music.formats        // "MP3, WAV, FLAC, OGG, AAC"
music.deleteTrackFailed   // "Failed to delete track."
music.deletePlaylistFailed // "Failed to delete playlist."

// Rename music.dragHint → music.formats (update Task 4 locale if needed)
```

- [ ] **Step 13: Update existing test files to provide i18n plugin**

Any test that mounts a component using `$t()` needs the i18n plugin. Update each test file to use `mountWithI18n` from `test-utils.ts` instead of plain `mount`.

Example for `PhotoUploader.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import PhotoUploader from '../PhotoUploader.vue'
import { mountWithI18n } from '../../test-utils'

describe('photoUploader', () => {
  it('renders drop zone and file input', () => {
    const wrapper = mountWithI18n(PhotoUploader, {
      props: { uploading: false, progress: 0 },
    })
    expect(wrapper.find('[data-testid="photo-uploader-dropzone"]').exists()).toBe(true)
    const fileInput = wrapper.find('input[type="file"]')
    expect(fileInput.exists()).toBe(true)
    expect(fileInput.attributes('multiple')).toBeDefined()
  })
})
```

Apply the same pattern to all component test files that mount components with i18n strings.

- [ ] **Step 14: Run all tests and verify**

```bash
cd frontend && bun run test
```
Expected: All tests pass.

```bash
cd frontend && bun run type-check
```
Expected: No type errors.

```bash
cd frontend && bun run lint:fix
```
Expected: No lint errors.

```bash
cd frontend && bun run build
```
Expected: Build succeeds.

- [ ] **Step 15: Commit**

```bash
git add frontend/src/
git commit -m "$(cat <<'EOF'
feat(i18n): extract all hardcoded strings to vue-i18n locale keys

Replace ~134 hardcoded user-facing strings across 21 Vue files with
$t() / t() calls. Add test-utils.ts helper for mounting components
with i18n plugin in tests.
EOF
)"
```

## Tests

### Frontend

- All existing component tests updated to provide i18n plugin via `mountWithI18n`
- Verify rendered text comes from locale files (tests use en locale by default)
- `bun run build` verifies no broken template references
