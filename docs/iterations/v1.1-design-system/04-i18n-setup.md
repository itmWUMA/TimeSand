---
type: task
iteration: "1.1"
status: done
branch: "feat/i18n-setup"
pr: 15
completed: 2026-04-19
tags:
  - i18n
  - phase-1
---

# Task 4: i18n Infrastructure

- **Branch**: `feat/i18n-setup`
- **Scope**: Install vue-i18n, create type-safe locale files (zh-CN + en), wire i18n into the Vue app. Locale files include ALL keys needed by subsequent extraction task.
- **Dependencies**: None

## Files

### Frontend

- `frontend/package.json` (modify) — add `vue-i18n` dependency
- `frontend/src/i18n/types.ts` (create) — type definitions for locale schema
- `frontend/src/i18n/locales/zh-CN.ts` (create) — Chinese locale
- `frontend/src/i18n/locales/en.ts` (create) — English locale
- `frontend/src/i18n/index.ts` (create) — i18n instance creation
- `frontend/src/main.ts` (modify) — register i18n plugin
- `frontend/src/i18n/__tests__/i18n.spec.ts` (create) — locale key parity tests

## Acceptance Criteria

- [ ] `vue-i18n` installed and registered in the Vue app
- [ ] zh-CN and en locale files contain all ~134 UI strings organized by feature domain
- [ ] TypeScript enforces key parity — adding a key to zh-CN but not en causes a compile error
- [ ] Locale detection priority: localStorage `ts-locale` → `navigator.language` → `'en'` fallback
- [ ] `bun run type-check` passes
- [ ] Locale key parity test passes

## Implementation Steps

- [ ] **Step 1: Install vue-i18n**

```bash
cd frontend && bun add vue-i18n
```

- [ ] **Step 2: Create the Chinese locale file**

Create `frontend/src/i18n/locales/zh-CN.ts`:

```ts
export default {
  app: {
    name: 'TimeSand',
    tagline: '智能照片墙与音乐盒',
  },
  common: {
    save: '保存',
    cancel: '取消',
    delete: '删除',
    upload: '上传',
    loading: '加载中...',
    confirm: '确认',
    remove: '移除',
    add: '添加',
    create: '创建',
    refresh: '刷新',
    close: '关闭',
    menu: '菜单',
    goBack: '返回',
    none: '无',
    items: '{count} 项',
    tracks: '{count} 首',
    photos: '{count} 张',
    creating: '创建中...',
    saving: '保存中...',
    uploading: '上传中...',
    added: '已添加',
  },
  nav: {
    cardDraw: '抽卡',
    albums: '相册',
    upload: '上传',
    music: '音乐',
    slideshow: '幻灯片',
    settings: '设置',
  },
  photo: {
    uploadTitle: '上传',
    dropHint: '将照片拖拽到此处',
    formats: 'JPEG, PNG, WebP, GIF, HEIC',
    chooseFiles: '选择文件',
    uploadProgress: '上传进度：{progress}%',
    uploadFailed: '上传失败，请重试。',
    loadFailed: '加载已有照片失败。',
    noCoverPhoto: '无封面照片',
    uploadedPhotos: '已上传照片',
  },
  album: {
    title: '相册',
    description: '创建和浏览带有封面照片和数量统计的相册。',
    namePlaceholder: '相册名称',
    descPlaceholder: '描述（可选）',
    createFailed: '创建相册失败。',
    loadFailed: '加载相册失败。',
    loadingAlbums: '加载相册中...',
    emptyState: '暂无相册。请在上方创建你的第一个相册。',
    detail: '相册详情',
    detailDesc: '在一处管理相册信息、照片和标签。',
    startSlideshow: '开始放映',
    albumSettings: '相册设置',
    nameLabel: '名称',
    coverPhoto: '封面照片',
    descriptionLabel: '描述',
    addPhotos: '添加照片',
    selectPhoto: '选择一张照片',
    addToAlbum: '添加到相册',
    albumPhotos: '相册照片',
    noPhotos: '此相册暂无照片。',
    saveFailed: '保存相册失败。',
    addPhotoFailed: '添加照片到相册失败。',
    removePhotoFailed: '从相册移除照片失败。',
    addTagFailed: '添加标签失败。',
    removeTagFailed: '移除标签失败。',
    createTagFailed: '创建标签失败。',
    invalidId: '相册ID无效。',
    loadingDetails: '加载相册详情中...',
  },
  draw: {
    title: '抽卡',
    description: '牌堆 → 翻牌揭示 → 中央展示 → 底部堆叠 → 散开 → 收集',
    albumLabel: '相册',
    allPhotos: '全部照片',
    drawNext: '抽下一张',
    drawing: '抽取中...',
    reshuffle: '重新洗牌',
    swipeHint: '手机端：左滑抽卡，右滑撤销。',
    tapToDraw: '点击抽卡',
    tapToScatter: '点击散开',
    collect: '收集',
    drawHint: '抽卡以构建卡堆',
    noCaptureDate: '无拍摄日期',
    unknownDate: '未知拍摄日期',
  },
  music: {
    title: '音乐与播放列表',
    description: '上传曲目、整理播放列表，拖拽调整播放顺序。',
    uploadFailed: '上传音乐文件失败。',
    allTracks: '全部曲目',
    trackCount: '{count} 首曲目',
    loadingTracks: '加载曲目中...',
    emptyState: '暂无曲目。上传你的第一个音频文件吧。',
    unknownArtist: '未知艺术家',
    deleteFailed: '删除曲目失败。',
    playlists: '播放列表',
    newPlaylistPlaceholder: '新播放列表名称',
    createFailed: '创建播放列表失败。',
    selectedPlaylist: '已选播放列表',
    deletePlaylist: '删除所选播放列表',
    addTrackFailed: '添加曲目到播放列表失败。',
    removeTrackFailed: '从播放列表移除曲目失败。',
    reorderFailed: '重排播放列表曲目失败。',
    loadFailed: '加载音乐数据失败。',
    loadPlaylistFailed: '加载所选播放列表失败。',
    playlistTracks: '播放列表曲目',
    noPlaylistTracks: '此播放列表暂无曲目。',
    dragHint: 'MP3, WAV, FLAC, OGG, AAC',
    chooseAudio: '选择音频文件',
  },
  slideshow: {
    loading: '加载幻灯片中...',
    loadFailed: '加载幻灯片照片失败。',
    goBack: '返回',
    noPhotosAlbum: '此相册中未找到照片。',
    noPhotosDefault: '没有可用于幻灯片的照片。',
    noPhotos: '无照片',
    exit: '退出',
    prev: '上一张',
    pause: '暂停',
    play: '播放',
    next: '下一张',
    interval: '间隔',
  },
  settings: {
    title: '设置',
    description: '管理存储概览、幻灯片默认设置和应用信息。',
    loadFailed: '加载存储信息失败。',
    storageInfo: '存储信息',
    refresh: '刷新',
    loadingStorage: '加载存储信息中...',
    photos: '照片',
    musicTracks: '音乐曲目',
    thumbnails: '缩略图',
    photoStorage: '照片存储',
    musicStorage: '音乐存储',
    totalStorage: '总存储',
    slideshowDefaults: '幻灯片默认设置',
    slideshowDesc: '当幻灯片开始时未指定间隔则使用此值。',
    defaultInterval: '默认间隔',
    about: '关于',
    version: '版本 {version}',
    github: 'GitHub 仓库',
    language: '语言',
  },
  player: {
    noMusic: '暂无音乐 - 上传曲目以开始',
    noTrack: '未选择曲目',
    unknownArtist: '未知艺术家',
    prev: '上一首',
    pause: '暂停',
    play: '播放',
    next: '下一首',
    volume: '音量',
    noMusicLoaded: '未加载音乐',
    muted: '静音',
    unmute: '取消静音',
    mute: '静音',
  },
  tag: {
    addPlaceholder: '添加标签',
    add: '添加',
    removeLabel: '移除标签 {name}',
  },
} as const
```

- [ ] **Step 3: Create the type definitions file**

Create `frontend/src/i18n/types.ts`:

```ts
import type zhCN from './locales/zh-CN'

export type MessageSchema = typeof zhCN
```

- [ ] **Step 4: Create the English locale file**

Create `frontend/src/i18n/locales/en.ts`:

```ts
import type { MessageSchema } from '../types'

const en: MessageSchema = {
  app: {
    name: 'TimeSand',
    tagline: 'Smart photo wall and music box',
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    upload: 'Upload',
    loading: 'Loading...',
    confirm: 'Confirm',
    remove: 'Remove',
    add: 'Add',
    create: 'Create',
    refresh: 'Refresh',
    close: 'Close',
    menu: 'Menu',
    goBack: 'Go Back',
    none: 'None',
    items: '{count} items',
    tracks: '{count} tracks',
    photos: '{count} photos',
    creating: 'Creating...',
    saving: 'Saving...',
    uploading: 'Uploading...',
    added: 'Added',
  },
  nav: {
    cardDraw: 'Card Draw',
    albums: 'Albums',
    upload: 'Upload',
    music: 'Music',
    slideshow: 'Slideshow',
    settings: 'Settings',
  },
  photo: {
    uploadTitle: 'Upload',
    dropHint: 'Drag photos here',
    formats: 'JPEG, PNG, WebP, GIF, HEIC',
    chooseFiles: 'Choose Files',
    uploadProgress: 'Upload progress: {progress}%',
    uploadFailed: 'Upload failed. Please try again.',
    loadFailed: 'Failed to load existing photos.',
    noCoverPhoto: 'No cover photo',
    uploadedPhotos: 'Uploaded Photos',
  },
  album: {
    title: 'Albums',
    description: 'Create and browse albums with cover photos and quick counts.',
    namePlaceholder: 'Album name',
    descPlaceholder: 'Description (optional)',
    createFailed: 'Failed to create album.',
    loadFailed: 'Failed to load albums.',
    loadingAlbums: 'Loading albums...',
    emptyState: 'No albums yet. Create your first album above.',
    detail: 'Album Detail',
    detailDesc: 'Manage album metadata, photos, and tags in one place.',
    startSlideshow: 'Start Slideshow',
    albumSettings: 'Album Settings',
    nameLabel: 'Name',
    coverPhoto: 'Cover Photo',
    descriptionLabel: 'Description',
    addPhotos: 'Add Photos',
    selectPhoto: 'Select a photo',
    addToAlbum: 'Add To Album',
    albumPhotos: 'Album Photos',
    noPhotos: 'No photos in this album yet.',
    saveFailed: 'Failed to save album.',
    addPhotoFailed: 'Failed to add photo to album.',
    removePhotoFailed: 'Failed to remove photo from album.',
    addTagFailed: 'Failed to add tag.',
    removeTagFailed: 'Failed to remove tag.',
    createTagFailed: 'Failed to create tag.',
    invalidId: 'Invalid album id.',
    loadingDetails: 'Loading album details...',
  },
  draw: {
    title: 'Card Draw',
    description: 'Deck -> flip reveal -> center stage -> bottom pile -> scatter -> collect',
    albumLabel: 'Album',
    allPhotos: 'All photos',
    drawNext: 'Draw Next',
    drawing: 'Drawing...',
    reshuffle: 'Reshuffle',
    swipeHint: 'Mobile: swipe left to draw, swipe right to undo.',
    tapToDraw: 'Tap To Draw',
    tapToScatter: 'Tap To Scatter',
    collect: 'Collect',
    drawHint: 'Draw cards to build the pile',
    noCaptureDate: 'No capture date',
    unknownDate: 'Unknown capture date',
  },
  music: {
    title: 'Music & Playlists',
    description: 'Upload tracks, organize playlists, and drag to reorder playback sequence.',
    uploadFailed: 'Failed to upload music files.',
    allTracks: 'All Tracks',
    trackCount: '{count} tracks',
    loadingTracks: 'Loading tracks...',
    emptyState: 'No tracks yet. Upload your first audio file.',
    unknownArtist: 'Unknown Artist',
    deleteFailed: 'Failed to delete track.',
    playlists: 'Playlists',
    newPlaylistPlaceholder: 'New playlist name',
    createFailed: 'Failed to create playlist.',
    selectedPlaylist: 'Selected Playlist',
    deletePlaylist: 'Delete Selected Playlist',
    addTrackFailed: 'Failed to add track to playlist.',
    removeTrackFailed: 'Failed to remove track from playlist.',
    reorderFailed: 'Failed to reorder playlist tracks.',
    loadFailed: 'Failed to load music data.',
    loadPlaylistFailed: 'Failed to load selected playlist.',
    playlistTracks: 'Playlist Tracks',
    noPlaylistTracks: 'No tracks in this playlist yet.',
    dragHint: 'MP3, WAV, FLAC, OGG, AAC',
    chooseAudio: 'Choose Audio Files',
  },
  slideshow: {
    loading: 'Loading slideshow...',
    loadFailed: 'Failed to load slideshow photos.',
    goBack: 'Go Back',
    noPhotosAlbum: 'No photos found in this album.',
    noPhotosDefault: 'No photos available for slideshow.',
    noPhotos: 'No photos',
    exit: 'Exit',
    prev: 'Prev',
    pause: 'Pause',
    play: 'Play',
    next: 'Next',
    interval: 'Interval',
  },
  settings: {
    title: 'Settings',
    description: 'Manage storage overview, slideshow defaults, and app information.',
    loadFailed: 'Failed to load storage information.',
    storageInfo: 'Storage Info',
    refresh: 'Refresh',
    loadingStorage: 'Loading storage info...',
    photos: 'Photos',
    musicTracks: 'Music Tracks',
    thumbnails: 'Thumbnails',
    photoStorage: 'Photo Storage',
    musicStorage: 'Music Storage',
    totalStorage: 'Total Storage',
    slideshowDefaults: 'Slideshow Defaults',
    slideshowDesc: 'Applied when slideshow starts without explicit interval override.',
    defaultInterval: 'Default interval',
    about: 'About',
    version: 'Version {version}',
    github: 'GitHub Repository',
    language: 'Language',
  },
  player: {
    noMusic: 'No music - upload tracks to get started',
    noTrack: 'No track selected',
    unknownArtist: 'Unknown Artist',
    prev: 'Prev',
    pause: 'Pause',
    play: 'Play',
    next: 'Next',
    volume: 'Volume',
    noMusicLoaded: 'No music loaded',
    muted: 'Muted',
    unmute: 'Unmute',
    mute: 'Mute',
  },
  tag: {
    addPlaceholder: 'Add tag',
    add: 'Add',
    removeLabel: 'Remove tag {name}',
  },
}

export default en
```

- [ ] **Step 5: Create the i18n instance**

Create `frontend/src/i18n/index.ts`:

```ts
import { createI18n } from 'vue-i18n'

import type { MessageSchema } from './types'
import en from './locales/en'
import zhCN from './locales/zh-CN'

function detectLocale(): 'zh-CN' | 'en' {
  const saved = localStorage.getItem('ts-locale')
  if (saved === 'zh-CN' || saved === 'en') {
    return saved
  }

  const browserLang = navigator.language
  if (browserLang.startsWith('zh')) {
    return 'zh-CN'
  }

  return 'en'
}

const i18n = createI18n<[MessageSchema], 'zh-CN' | 'en'>({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: {
    'zh-CN': zhCN,
    en,
  },
})

export default i18n
```

- [ ] **Step 6: Register i18n in the Vue app**

Modify `frontend/src/main.ts` to:

```ts
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import i18n from './i18n'
import router from './router'
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(i18n)
app.use(router)
app.mount('#app')
```

Changes: import `i18n` and add `app.use(i18n)` before `app.use(router)`.

- [ ] **Step 7: Write locale key parity test**

Create `frontend/src/i18n/__tests__/i18n.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import en from '../locales/en'
import zhCN from '../locales/zh-CN'

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const value = obj[key]
    if (typeof value === 'object' && value !== null) {
      keys.push(...collectKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys.sort()
}

describe('i18n locales', () => {
  it('zh-CN and en have identical key sets', () => {
    const zhKeys = collectKeys(zhCN as unknown as Record<string, unknown>)
    const enKeys = collectKeys(en as unknown as Record<string, unknown>)
    expect(zhKeys).toEqual(enKeys)
  })

  it('no empty string values in zh-CN', () => {
    const values = collectValues(zhCN as unknown as Record<string, unknown>)
    for (const [key, value] of values) {
      expect(value, `zh-CN key "${key}" is empty`).not.toBe('')
    }
  })

  it('no empty string values in en', () => {
    const values = collectValues(en as unknown as Record<string, unknown>)
    for (const [key, value] of values) {
      expect(value, `en key "${key}" is empty`).not.toBe('')
    }
  })
})

function collectValues(obj: Record<string, unknown>, prefix = ''): [string, unknown][] {
  const entries: [string, unknown][] = []
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const value = obj[key]
    if (typeof value === 'object' && value !== null) {
      entries.push(...collectValues(value as Record<string, unknown>, fullKey))
    } else {
      entries.push([fullKey, value])
    }
  }
  return entries
}
```

- [ ] **Step 8: Run tests and verify**

```bash
cd frontend && bun run test
```
Expected: All tests pass, including the new locale parity tests.

```bash
cd frontend && bun run type-check
```
Expected: No type errors. The `MessageSchema` type ensures en matches zh-CN structure.

- [ ] **Step 9: Commit**

```bash
git add frontend/package.json frontend/bun.lockb frontend/src/i18n/ frontend/src/main.ts
git commit -m "$(cat <<'EOF'
feat(i18n): add vue-i18n with zh-CN and en locale files

Set up i18n infrastructure with type-safe locale schema, browser
language detection, and localStorage persistence. All ~134 UI strings
defined in both locales, ready for template extraction.
EOF
)"
```

## Tests

### Frontend

- **Key parity test**: Verifies zh-CN and en have exactly the same key structure
- **Empty value test**: Verifies no locale key maps to an empty string
- **Type safety**: TypeScript compilation verifies en conforms to `MessageSchema` (derived from zh-CN)
