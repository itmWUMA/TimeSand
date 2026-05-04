---
type: task
iteration: "1.3"
status: done
branch: "feat/settings-page"
pr:
completed: 2026-05-04
tags:
  - full-page-upgrade
  - settings
---

# Task 8: Settings Page Completion

- **Branch**: `feat/settings-page`
- **Scope**: Add language switch, card draw settings, and sound effects controls to the Settings page.
- **Dependencies**: Task 6 (music player rebuild) and Task 7 (draw settings API) must be merged first

## Files

### Frontend

- `frontend/src/pages/SettingsPage.vue` (modify — add three new sections)
- `frontend/src/stores/settings.ts` (modify — extend with draw settings)
- `frontend/src/composables/useSoundEffects.ts` (read — consume existing API)
- `frontend/src/i18n/locales/zh-CN.ts` (modify — add settings keys)
- `frontend/src/i18n/locales/en.ts` (modify — add settings keys)
- `frontend/src/services/album.ts` (read — list albums for default source dropdown)

## Design

### Section Order (top to bottom)

1. Storage Info (existing)
2. Slideshow Defaults (existing)
3. **Language** (new)
4. **Card Draw** (new)
5. **Sound Effects** (new)
6. About (existing)

### 3. Language Section

```
┌─────────────────────────────────────────┐
│ 🌐 Language / 语言                       │
│ Display language for the interface       │
│                                          │
│ Language    [  中文        ▼  ]           │
└─────────────────────────────────────────┘
```

- Use `TsSelect` component
- Options: `中文` (value: `zh-CN`), `English` (value: `en`)
- On change:
  - `locale.value = selected`
  - `localStorage.setItem('ts-locale', selected)`
  - `document.documentElement.lang = selected`
- Note: sidebar language toggle button remains as convenience shortcut

### 4. Card Draw Settings Section

```
┌──────────────────────────────────────────────────┐
│ 🎴 Card Draw / 抽卡设置                           │
│                                                    │
│ Time Weighting      [  Standard     ▼  ]           │
│ Nearby Date Range   [  ±3 days      ▼  ]           │
│ Animation Speed     [  Standard     ▼  ]           │
│ Default Source      [  All Photos   ▼  ]           │
└──────────────────────────────────────────────────┘
```

#### Settings Store Extension

Add to `useSettingsStore`:

```ts
state: () => ({
  slideshowIntervalSeconds: readPersistedInterval(),
  drawWeightMode: readFromLS('ts-draw-weight-mode', 'standard'),
  drawNearbyDays: readFromLS('ts-draw-nearby-days', 3),
  drawAnimSpeed: readFromLS('ts-draw-anim-speed', 1),
  drawDefaultAlbumId: readFromLS('ts-draw-default-album', null),
}),
```

Each setter persists to localStorage immediately.

#### Time Weighting Options

| Label (zh-CN) | Label (en) | Value |
|--------------|------------|-------|
| 关闭 | Off | `off` |
| 轻微 | Light | `light` |
| 标准 | Standard | `standard` |
| 强烈 | Strong | `strong` |

#### Nearby Date Range Options

| Label (zh-CN) | Label (en) | Value |
|--------------|------------|-------|
| ±1 天 | ±1 day | `1` |
| ±3 天 | ±3 days | `3` |
| ±7 天 | ±7 days | `7` |

#### Animation Speed Options

| Label (zh-CN) | Label (en) | Value (multiplier) |
|--------------|------------|---------------------|
| 快速 | Fast | `0.6` |
| 标准 | Standard | `1` |
| 悠闲 | Relaxed | `1.5` |

#### Default Source Options

- "All Photos" / "全部照片" (value: `null`) — always first
- Dynamically loaded album list from `listAlbums()` API on mount

### 5. Sound Effects Section

```
┌─────────────────────────────────────────┐
│ 🔊 Sound Effects / 音效                  │
│                                          │
│ Volume   ━━━━━━━●━━━━━━  60%             │
│ Mute     [ OFF ]                          │
└─────────────────────────────────────────┘
```

- Volume: `input[type=range]` 0–100, maps to `useSoundEffects().setVolume(v / 100)`
- Display percentage label next to slider
- Mute: `TsButton` toggle or styled switch
  - ON state: `text-ts-accent`, shows "ON" / "开"
  - OFF state: `text-ts-muted`, shows "OFF" / "关"
- Read initial state from `useSoundEffects().getVolume()` and `useSoundEffects().isMuted`

### Integration with HomePage

`HomePage.vue` reads draw settings from the store:
- `drawWeightMode` and `drawNearbyDays` → passed to `drawCard()` API call
- `drawDefaultAlbumId` → pre-selects the album dropdown
- `drawAnimSpeed` → multiplied into all GSAP duration values in `useCardDraw.ts`

The animation speed multiplier is applied by wrapping duration values:
```ts
const speed = useSettingsStore().drawAnimSpeed
const dur = (base: number) => base * (1 / speed) // speed 0.6 = faster, 1.5 = slower
```

## Acceptance Criteria

- [ ] Language section switches locale and persists choice
- [ ] Card draw settings (all 4) persist to localStorage and are readable by HomePage
- [ ] Time weighting and nearby days are passed to draw API on each draw
- [ ] Animation speed affects card draw ceremony timing
- [ ] Default source pre-selects album on HomePage
- [ ] SFX volume slider controls sound effects volume
- [ ] SFX mute toggle works and persists
- [ ] All new strings available in zh-CN and en
- [ ] Settings page uses consistent section styling (matches existing sections)
- [ ] `bun run type-check && bun run lint:fix` passes
- [ ] Visual verification via Chrome DevTools MCP

## Tests

### Frontend

- Unit test: settings store getters/setters for each new field
- Unit test: animation speed multiplier calculation
- Visual verification: all sections render, values persist after page reload
