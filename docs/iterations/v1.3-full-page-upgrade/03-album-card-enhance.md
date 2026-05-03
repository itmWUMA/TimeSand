---
type: task
iteration: "1.3"
status: pending
branch: feat/album-card-enhance
pr:
completed: 2026-05-03
tags:
  - full-page-upgrade
  - album
---

# Task 3: Album Card Enhancement

- **Branch**: `feat/album-card-enhance`
- **Scope**: Enrich `AlbumCard.vue` with album description and relative update time display.
- **Dependencies**: None

## Files

### Frontend

- `frontend/src/components/AlbumCard.vue` (modify)
- `frontend/src/utils/formatRelativeTime.ts` (create)
- `frontend/src/i18n/locales/zh-CN.ts` (modify — add relative time keys)
- `frontend/src/i18n/locales/en.ts` (modify — add relative time keys)

## Design

### Updated Card Layout

```
┌──────────────────────────┐
│        Cover Photo        │
├──────────────────────────┤
│ Album Name                │
│ Album description text... │
│ 12 photos · 3 days ago    │
└──────────────────────────┘
```

### Changes to AlbumCard.vue

1. Add description line below name: `text-sm text-ts-muted truncate`, only rendered when `album.description` is non-null
2. Add relative time next to photo count: `· formatRelativeTime(album.updated_at)`
3. Bottom info line becomes: `{count} photos · {relativeTime}`

### formatRelativeTime Utility

```ts
function formatRelativeTime(dateString: string, locale: string): string
```

- Accepts ISO 8601 date string and current locale
- Returns locale-aware relative time:
  - < 1 minute: "just now" / "刚刚"
  - < 1 hour: "N minutes ago" / "N 分钟前"
  - < 1 day: "N hours ago" / "N 小时前"
  - < 7 days: "N days ago" / "N 天前"
  - < 30 days: "N weeks ago" / "N 周前"
  - < 365 days: "N months ago" / "N 个月前"
  - ≥ 365 days: "N years ago" / "N 年前"
- Use `Intl.RelativeTimeFormat` if available, fallback to manual i18n keys

### Data Availability

- `album.updated_at` — already exists in both backend model (`Album.updated_at`) and frontend type (`Album.updated_at: string`)
- `album.description` — already exists in frontend type (`Album.description: string | null`)

## Acceptance Criteria

- [ ] Album cards show description when available, hidden when null
- [ ] Album cards show relative update time next to photo count
- [ ] Relative time is locale-aware (changes with language setting)
- [ ] Description is truncated to one line with ellipsis
- [ ] `bun run type-check` passes
- [ ] Visual verification via Chrome DevTools MCP

## Tests

### Frontend

- Unit test `formatRelativeTime` with various date inputs and both locales
- Visual verification: album cards show enriched info
