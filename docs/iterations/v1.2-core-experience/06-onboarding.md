---
type: task
iteration: "1.2"
status: pending
branch: "feat/onboarding"
pr:
completed:
tags:
  - core-experience
  - onboarding
  - demo-data
  - phase-3
---

# Task 6: Onboarding & Demo Data

- **Branch**: `feat/onboarding`
- **Scope**: First-time experience overlay (4 guided steps) on the Card Draw page, backend demo data seeding with `is_demo` flag, and cleanup API endpoint. This task has two halves: backend (demo data) and frontend (onboarding overlay).
- **Dependencies**: Task 4 (Card Draw Ceremony — ceremony must work for onboarding to demo it)

## Files

### Backend

- `backend/app/models/photo.py` (modify) — add `is_demo: bool` field
- `backend/app/models/music.py` (modify) — add `is_demo: bool` field to Music model
- `backend/app/services/demo_service.py` (create) — seed and cleanup functions
- `backend/app/demo_data/` (create) — directory with demo photos, music, and metadata JSON
- `backend/app/demo_data/metadata.json` (create) — demo asset manifest
- `backend/app/demo_data/CREDITS.md` (create) — attribution for CC0 assets
- `backend/app/api/demo.py` (create) — `DELETE /api/demo` endpoint
- `backend/app/main.py` (modify) — call seed on startup, register demo router
- `backend/alembic/versions/xxxx_add_is_demo.py` (create) — migration for `is_demo` columns

### Frontend

- `frontend/src/components/OnboardingOverlay.vue` (create) — 4-step guided overlay
- `frontend/src/pages/HomePage.vue` (modify) — mount onboarding overlay
- `frontend/src/i18n/locales/zh-CN.ts` (modify) — add `onboarding` keys
- `frontend/src/i18n/locales/en.ts` (modify) — add `onboarding` keys

### Tests

- `backend/tests/test_demo_service.py` (create)
- `frontend/src/__tests__/components/OnboardingOverlay.test.ts` (create)

## Design Reference

- Onboarding flow: [[spec#5. First-Time Experience]]
- Demo data: [[spec#6. Demo Data]]

### Onboarding Steps

| Step | Title (en) | Content | Visual |
|------|-----------|---------|--------|
| 1 | Welcome to TimeSand | Private time hourglass, rediscover forgotten moments | Logo + scaleIn animation, background dim |
| 2 | Draw a Memory | Click the deck to draw a random photo | Spotlight on card deck area |
| 3 | Immersive Playback | Open slideshow with music | Spotlight on slideshow nav item |
| 4 | Begin Your Journey | Upload your photos and music | Fade out overlay, particle celebration |

### Trigger Condition

- `localStorage` key `ts-onboarding-complete` is NOT `'true'`
- User navigates to Card Draw page (home page)

## Acceptance Criteria

### Backend

- [ ] `is_demo` boolean field added to Photo model (default `false`)
- [ ] `is_demo` boolean field added to Music model (default `false`)
- [ ] Database migration created and applies cleanly
- [ ] `seed_demo_data(session)` creates demo records only when 0 photos exist in database
- [ ] Demo data includes 8 landscape photos and 1 ambient music track
- [ ] At least 2 demo photos have `taken_at` set to "today's date, N years ago" (dynamically calculated)
- [ ] Demo album named "TimeSand Demo" created
- [ ] Demo playlist named "TimeSand Demo" created
- [ ] `DELETE /api/demo` removes all demo records + files
- [ ] Seed function called on app startup in `main.py` lifespan
- [ ] Demo assets ≤ 5 MB total (NFR-4)
- [ ] `uv run pytest` passes
- [ ] `uv run ruff check .` passes

### Frontend

- [ ] Onboarding overlay appears on first visit (no `ts-onboarding-complete` in localStorage)
- [ ] 4 steps navigate correctly (Next button, dot indicators)
- [ ] Skip link and Done button both set `ts-onboarding-complete = 'true'`
- [ ] Once dismissed, overlay never shows again
- [ ] Step transitions use `fadeOut` → `fadeIn` (0.3 s each)
- [ ] Steps 2–3 show spotlight/highlight on target area
- [ ] Step 1: `scaleIn` animation on logo
- [ ] Step 4: particle celebration effect on completion
- [ ] `bun run type-check` passes
- [ ] `bun run lint:fix` passes

## Implementation Steps

### Backend Half

- [ ] **Step 1: Add `is_demo` field to models**

Modify `backend/app/models/photo.py` — add field to Photo:

```python
is_demo: bool = Field(default=False)
```

Modify `backend/app/models/music.py` — add field to Music:

```python
is_demo: bool = Field(default=False)
```

- [ ] **Step 2: Create database migration**

```bash
cd backend && uv run alembic revision --autogenerate -m "add is_demo to photo and music"
```

Review the generated migration to ensure it adds:
```sql
ALTER TABLE photo ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE music ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE;
```

Apply: `cd backend && uv run alembic upgrade head`

- [ ] **Step 3: Source and bundle demo assets**

Create `backend/app/demo_data/` directory with:

1. **8 landscape photos** (JPEG, max 1920px longest side, ≤400 KB each):
   - Source from Unsplash or Pexels (CC0/public domain)
   - Nature/landscape themes matching TimeSand's warm mood
   - Total ≤ 3 MB

2. **1 ambient music track** (~90s, calm/warm):
   - Source from Free Music Archive or freesound.org (CC0)
   - WebM Opus or MP3, ≤ 1.5 MB

3. **`metadata.json`** — asset manifest:

```json
{
  "photos": [
    { "filename": "demo-01.jpg", "taken_at_years_ago": 3, "taken_at_today": true },
    { "filename": "demo-02.jpg", "taken_at_years_ago": 1, "taken_at_today": true },
    { "filename": "demo-03.jpg", "taken_at_years_ago": 2, "taken_at_today": false },
    { "filename": "demo-04.jpg", "taken_at_years_ago": null, "taken_at_today": false },
    { "filename": "demo-05.jpg", "taken_at_years_ago": null, "taken_at_today": false },
    { "filename": "demo-06.jpg", "taken_at_years_ago": 4, "taken_at_today": false },
    { "filename": "demo-07.jpg", "taken_at_years_ago": null, "taken_at_today": false },
    { "filename": "demo-08.jpg", "taken_at_years_ago": null, "taken_at_today": false }
  ],
  "music": [
    { "filename": "demo-ambient.mp3", "title": "Gentle Drift", "artist": "TimeSand Demo" }
  ]
}
```

`taken_at_today: true` means set `taken_at` to exactly N years ago today. `taken_at_today: false` with a `taken_at_years_ago` value sets it to N years ago + random offset of 10–60 days. `null` sets a random date in the past 1–5 years.

4. **`CREDITS.md`** — attribution:

```markdown
# Demo Data Credits

All assets are CC0 / Public Domain.

## Photos
- demo-01.jpg — Source: [Unsplash](https://unsplash.com), Author: [Name]
...

## Music
- demo-ambient.mp3 — Source: [Free Music Archive](https://freemusicarchive.org), Author: [Name]
```

- [ ] **Step 4: Implement `demo_service.py`**

Create `backend/app/services/demo_service.py`:

```python
import json
import shutil
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from random import randint
from uuid import uuid4

from sqlmodel import Session, select

from app.models.music import Music, Playlist, PlaylistMusic
from app.models.photo import Photo
from app.core.config import settings

DEMO_DATA_DIR = Path(__file__).parent.parent / "demo_data"


def seed_demo_data(session: Session) -> None:
    """Seed demo photos and music if the database is empty."""
    existing = session.exec(select(Photo).limit(1)).first()
    if existing is not None:
        return

    metadata = json.loads((DEMO_DATA_DIR / "metadata.json").read_text())
    today = date.today()

    # Create demo album
    from app.models.album import Album
    album = Album(name="TimeSand Demo")
    session.add(album)
    session.flush()

    # Seed photos
    for photo_meta in metadata["photos"]:
        taken_at = _compute_taken_at(today, photo_meta)
        src = DEMO_DATA_DIR / photo_meta["filename"]
        dest_name = f"{uuid4().hex}.jpg"
        dest_path = Path(settings.PHOTO_DIR) / "originals" / dest_name
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest_path)

        # Generate thumbnail
        thumb_path = Path(settings.PHOTO_DIR) / "thumbnails" / dest_name
        thumb_path.parent.mkdir(parents=True, exist_ok=True)
        _create_thumbnail(dest_path, thumb_path)

        photo = Photo(
            filename=photo_meta["filename"],
            file_path=str(dest_path),
            thumbnail_path=str(thumb_path),
            file_size=src.stat().st_size,
            taken_at=taken_at,
            is_demo=True,
        )
        session.add(photo)
        session.flush()

        # Add to demo album
        from app.models.album import AlbumPhoto
        session.add(AlbumPhoto(album_id=album.id, photo_id=photo.id))

    # Seed music
    playlist = Playlist(name="TimeSand Demo", is_default=False)
    session.add(playlist)
    session.flush()

    for music_meta in metadata["music"]:
        src = DEMO_DATA_DIR / music_meta["filename"]
        dest_name = f"{uuid4().hex}{Path(music_meta['filename']).suffix}"
        dest_path = Path(settings.MUSIC_DIR) / "files" / dest_name
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest_path)

        track = Music(
            title=music_meta["title"],
            artist=music_meta["artist"],
            filename=music_meta["filename"],
            file_path=str(dest_path),
            file_size=src.stat().st_size,
            is_demo=True,
        )
        session.add(track)
        session.flush()
        session.add(PlaylistMusic(playlist_id=playlist.id, music_id=track.id, position=0))

    session.commit()


def cleanup_demo_data(session: Session) -> int:
    """Remove all demo data. Returns count of removed items."""
    photos = session.exec(select(Photo).where(Photo.is_demo == True)).all()
    tracks = session.exec(select(Music).where(Music.is_demo == True)).all()

    count = len(photos) + len(tracks)

    for photo in photos:
        _safe_delete(photo.file_path)
        _safe_delete(photo.thumbnail_path)
        session.delete(photo)

    for track in tracks:
        _safe_delete(track.file_path)
        session.delete(track)

    # Remove demo album and playlist by name
    from app.models.album import Album
    demo_album = session.exec(select(Album).where(Album.name == "TimeSand Demo")).first()
    if demo_album:
        session.delete(demo_album)

    demo_playlist = session.exec(select(Playlist).where(Playlist.name == "TimeSand Demo")).first()
    if demo_playlist:
        session.delete(demo_playlist)

    session.commit()
    return count


def _compute_taken_at(today: date, meta: dict) -> datetime | None:
    years_ago = meta.get("taken_at_years_ago")
    if years_ago is None:
        offset = randint(365, 365 * 5)
        return datetime(today.year, today.month, today.day, tzinfo=timezone.utc) - timedelta(days=offset)

    base = today.replace(year=today.year - years_ago)
    if meta.get("taken_at_today"):
        return datetime(base.year, base.month, base.day, 12, 0, 0, tzinfo=timezone.utc)

    offset = randint(10, 60)
    return datetime(base.year, base.month, base.day, tzinfo=timezone.utc) - timedelta(days=offset)


def _create_thumbnail(src: Path, dest: Path) -> None:
    from PIL import Image
    with Image.open(src) as img:
        img.thumbnail((400, 400))
        img.save(dest, "JPEG", quality=80)


def _safe_delete(path: str | None) -> None:
    if path:
        p = Path(path)
        if p.exists():
            p.unlink()
```

Note: The implementing agent should adjust imports and model references to match the actual codebase structure (e.g., `Album`, `AlbumPhoto` model locations, `settings` config paths).

- [ ] **Step 5: Create demo API endpoint**

Create `backend/app/api/demo.py`:

```python
from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.database import get_session
from app.services.demo_service import cleanup_demo_data

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.delete("")
def delete_demo_data(session: Session = Depends(get_session)):
    count = cleanup_demo_data(session)
    return {"removed": count}
```

- [ ] **Step 6: Register in `main.py`**

Modify `backend/app/main.py`:

1. Import demo router and `seed_demo_data`
2. Add router: `app.include_router(demo.router)`
3. Call seed in lifespan:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ... existing startup code ...
    with get_session_context() as session:
        seed_demo_data(session)
    yield
```

- [ ] **Step 7: Write backend tests**

Create `backend/tests/test_demo_service.py`:

```python
import pytest
from sqlmodel import Session, select
from app.models.photo import Photo
from app.models.music import Music
from app.services.demo_service import seed_demo_data, cleanup_demo_data


def test_seed_creates_demo_data(session: Session):
    seed_demo_data(session)
    photos = session.exec(select(Photo).where(Photo.is_demo == True)).all()
    assert len(photos) == 8

    tracks = session.exec(select(Music).where(Music.is_demo == True)).all()
    assert len(tracks) == 1


def test_seed_is_idempotent(session: Session):
    seed_demo_data(session)
    seed_demo_data(session)
    photos = session.exec(select(Photo).where(Photo.is_demo == True)).all()
    assert len(photos) == 8


def test_seed_skips_when_photos_exist(session: Session):
    # Create a non-demo photo first
    session.add(Photo(filename="user.jpg", file_path="/tmp/user.jpg", is_demo=False))
    session.commit()

    seed_demo_data(session)
    demo_photos = session.exec(select(Photo).where(Photo.is_demo == True)).all()
    assert len(demo_photos) == 0


def test_cleanup_removes_demo_data(session: Session):
    seed_demo_data(session)
    count = cleanup_demo_data(session)
    assert count == 9  # 8 photos + 1 track

    photos = session.exec(select(Photo).where(Photo.is_demo == True)).all()
    assert len(photos) == 0
    tracks = session.exec(select(Music).where(Music.is_demo == True)).all()
    assert len(tracks) == 0


def test_at_least_two_anniversary_photos(session: Session):
    seed_demo_data(session)
    from datetime import date
    today = date.today()
    photos = session.exec(select(Photo).where(Photo.is_demo == True)).all()
    anniversary_count = sum(
        1 for p in photos
        if p.taken_at and p.taken_at.month == today.month and p.taken_at.day == today.day
    )
    assert anniversary_count >= 2
```

Run: `cd backend && uv run pytest tests/test_demo_service.py -v`

- [ ] **Step 8: Verify backend lint**

```bash
cd backend && uv run ruff check .
```

- [ ] **Step 9: Commit backend half**

```bash
git add backend/app/models/photo.py backend/app/models/music.py backend/app/services/demo_service.py backend/app/demo_data/ backend/app/api/demo.py backend/app/main.py backend/alembic/versions/ backend/tests/test_demo_service.py
git commit -m "$(cat <<'EOF'
feat(demo): add demo data seeding with is_demo flag and cleanup API

Seed 8 CC0 photos and 1 ambient track on first launch when DB is empty.
is_demo flag on Photo/Music models enables targeted cleanup via
DELETE /api/demo endpoint.
EOF
)"
```

### Frontend Half

- [ ] **Step 10: Add i18n keys**

Add to `frontend/src/i18n/locales/zh-CN.ts`:

```ts
onboarding: {
  step1Title: '欢迎来到 TimeSand',
  step1Content: '这里是你的私人时光沙漏。通过抽取回忆卡牌，重新发现那些被遗忘的美好瞬间。',
  step2Title: '抽一张回忆',
  step2Content: '点击牌堆，随机抽取一张照片。如果恰好是多年前的今天拍的，会有特别的惊喜。',
  step3Title: '沉浸式播放',
  step3Content: '打开幻灯片，配合音乐，沉浸式浏览你的照片集。',
  step4Title: '开始你的旅程',
  step4Content: '上传你的照片和音乐，让 TimeSand 帮你重新发现回忆。',
  next: '下一步',
  skip: '跳过',
  done: '开始',
},
```

Add matching keys to `frontend/src/i18n/locales/en.ts`:

```ts
onboarding: {
  step1Title: 'Welcome to TimeSand',
  step1Content: 'Your private time hourglass. Draw memory cards to rediscover forgotten beautiful moments.',
  step2Title: 'Draw a Memory',
  step2Content: 'Click the deck to draw a random photo. If it happens to be from today years ago, there will be a special surprise.',
  step3Title: 'Immersive Playback',
  step3Content: 'Open the slideshow with music for an immersive photo browsing experience.',
  step4Title: 'Begin Your Journey',
  step4Content: 'Upload your photos and music, and let TimeSand help you rediscover memories.',
  next: 'Next',
  skip: 'Skip',
  done: 'Begin',
},
```

- [ ] **Step 11: Write failing test for `OnboardingOverlay`**

Create `frontend/src/__tests__/components/OnboardingOverlay.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import OnboardingOverlay from '../../components/OnboardingOverlay.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      onboarding: {
        step1Title: 'Welcome to TimeSand',
        step1Content: 'Your private time hourglass.',
        step2Title: 'Draw a Memory',
        step2Content: 'Click the deck.',
        step3Title: 'Immersive Playback',
        step3Content: 'Open the slideshow.',
        step4Title: 'Begin Your Journey',
        step4Content: 'Upload your photos.',
        next: 'Next',
        skip: 'Skip',
        done: 'Begin',
      },
    },
  },
})

describe('OnboardingOverlay', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders when no onboarding-complete flag', () => {
    const wrapper = mount(OnboardingOverlay, { global: { plugins: [i18n] } })
    expect(wrapper.text()).toContain('Welcome to TimeSand')
  })

  it('does not render when onboarding-complete is set', () => {
    localStorage.setItem('ts-onboarding-complete', 'true')
    const wrapper = mount(OnboardingOverlay, { global: { plugins: [i18n] } })
    expect(wrapper.text()).not.toContain('Welcome to TimeSand')
  })

  it('advances through steps with Next button', async () => {
    const wrapper = mount(OnboardingOverlay, { global: { plugins: [i18n] } })
    expect(wrapper.text()).toContain('Welcome to TimeSand')

    await wrapper.find('[data-testid="onboarding-next"]').trigger('click')
    expect(wrapper.text()).toContain('Draw a Memory')

    await wrapper.find('[data-testid="onboarding-next"]').trigger('click')
    expect(wrapper.text()).toContain('Immersive Playback')

    await wrapper.find('[data-testid="onboarding-next"]').trigger('click')
    expect(wrapper.text()).toContain('Begin Your Journey')
  })

  it('sets localStorage on skip', async () => {
    const wrapper = mount(OnboardingOverlay, { global: { plugins: [i18n] } })
    await wrapper.find('[data-testid="onboarding-skip"]').trigger('click')
    expect(localStorage.getItem('ts-onboarding-complete')).toBe('true')
  })

  it('sets localStorage on done (last step)', async () => {
    const wrapper = mount(OnboardingOverlay, { global: { plugins: [i18n] } })
    // Navigate to last step
    for (let i = 0; i < 3; i++) {
      await wrapper.find('[data-testid="onboarding-next"]').trigger('click')
    }
    await wrapper.find('[data-testid="onboarding-done"]').trigger('click')
    expect(localStorage.getItem('ts-onboarding-complete')).toBe('true')
  })
})
```

Run: `cd frontend && bun run test -- OnboardingOverlay`
Expected: FAIL — component not found.

- [ ] **Step 12: Implement `OnboardingOverlay.vue`**

Create `frontend/src/components/OnboardingOverlay.vue`:

```vue
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { scaleIn, fadeIn, fadeOut } from '../composables/motion/transitions'

const STORAGE_KEY = 'ts-onboarding-complete'
const TOTAL_STEPS = 4

const { t } = useI18n()
const visible = ref(false)
const currentStep = ref(0)
const contentRef = ref<HTMLElement | null>(null)

const steps = [
  { titleKey: 'onboarding.step1Title', contentKey: 'onboarding.step1Content' },
  { titleKey: 'onboarding.step2Title', contentKey: 'onboarding.step2Content' },
  { titleKey: 'onboarding.step3Title', contentKey: 'onboarding.step3Content' },
  { titleKey: 'onboarding.step4Title', contentKey: 'onboarding.step4Content' },
]

onMounted(() => {
  if (localStorage.getItem(STORAGE_KEY) !== 'true') {
    visible.value = true
  }
})

function dismiss(): void {
  localStorage.setItem(STORAGE_KEY, 'true')
  visible.value = false
}

async function nextStep(): Promise<void> {
  if (currentStep.value >= TOTAL_STEPS - 1) return

  if (contentRef.value) {
    await new Promise<void>((resolve) => {
      fadeOut(contentRef.value!, { duration: 0.3 }).then(() => resolve())
    })
  }

  currentStep.value++

  if (contentRef.value) {
    fadeIn(contentRef.value, { duration: 0.3, distance: 12 })
  }
}

function skip(): void {
  dismiss()
}

function done(): void {
  dismiss()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-modal flex items-center justify-center bg-black/60"
    >
      <div
        ref="contentRef"
        class="mx-4 max-w-md rounded-ts-lg bg-ts-panel p-8 shadow-ts-md"
      >
        <h2 class="text-xl font-semibold text-ts-text">
          {{ t(steps[currentStep].titleKey) }}
        </h2>
        <p class="mt-3 text-sm leading-relaxed text-ts-muted">
          {{ t(steps[currentStep].contentKey) }}
        </p>

        <!-- Dot indicators -->
        <div class="mt-6 flex justify-center gap-2">
          <span
            v-for="i in TOTAL_STEPS"
            :key="i"
            class="h-2 w-2 rounded-full transition-colors"
            :class="i - 1 === currentStep ? 'bg-ts-accent' : 'bg-ts-muted/40'"
          />
        </div>

        <!-- Navigation -->
        <div class="mt-6 flex items-center justify-between">
          <button
            data-testid="onboarding-skip"
            type="button"
            class="text-sm text-ts-muted transition hover:text-ts-text"
            @click="skip"
          >
            {{ t('onboarding.skip') }}
          </button>

          <button
            v-if="currentStep < TOTAL_STEPS - 1"
            data-testid="onboarding-next"
            type="button"
            class="rounded-ts-md bg-ts-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-ts-accentSoft"
            @click="nextStep"
          >
            {{ t('onboarding.next') }}
          </button>

          <button
            v-else
            data-testid="onboarding-done"
            type="button"
            class="rounded-ts-md bg-ts-accent px-5 py-2 text-sm font-semibold text-black transition hover:bg-ts-accentSoft"
            @click="done"
          >
            {{ t('onboarding.done') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
```

Note: The spotlight/highlight feature for steps 2–3 and the particle celebration for step 4 are enhancement details. The implementing agent should add CSS mask overlays or highlight rings for steps 2–3 targeting `[data-draw-deck]` and the slideshow nav item, and a simple particle burst animation on step 4 done.

Run: `cd frontend && bun run test -- OnboardingOverlay`
Expected: All tests PASS.

- [ ] **Step 13: Mount overlay in `HomePage.vue`**

Add to `frontend/src/pages/HomePage.vue`:

```vue
<script setup lang="ts">
import OnboardingOverlay from '../components/OnboardingOverlay.vue'
// ... existing imports
</script>

<template>
  <section class="mx-auto max-w-6xl space-y-6">
    <!-- ... existing content ... -->
    <OnboardingOverlay />
  </section>
</template>
```

- [ ] **Step 14: Verify type-check and lint**

```bash
cd frontend && bun run type-check && bun run lint:fix
```

- [ ] **Step 15: Visual verification**

1. **Fresh state**: Clear localStorage, reload → onboarding overlay appears
2. **Step navigation**: Click Next through all 4 steps, content transitions smoothly
3. **Skip**: Click Skip → overlay closes, never shows again on reload
4. **Done**: Navigate to step 4, click Begin → overlay closes, never shows again
5. **Demo data**: Fresh Docker launch → demo photos and music available → card draw and slideshow work immediately

- [ ] **Step 16: Commit frontend half**

```bash
git add frontend/src/components/OnboardingOverlay.vue frontend/src/pages/HomePage.vue frontend/src/i18n/locales/zh-CN.ts frontend/src/i18n/locales/en.ts frontend/src/__tests__/components/OnboardingOverlay.test.ts
git commit -m "$(cat <<'EOF'
feat(onboarding): add 4-step first-time experience overlay

Guided overlay on Card Draw page for new users. localStorage flag
prevents re-display. Step transitions with fadeIn/fadeOut.
EOF
)"
```

## Tests

### Backend

- `test_demo_service.py`: seed creates correct count, idempotent, skips when data exists, cleanup removes all, at least 2 anniversary photos

### Frontend

- `OnboardingOverlay.test.ts`: renders when no flag, hidden when flag set, step navigation, skip/done persistence
- **Visual verification**: overlay flow, step transitions, spotlight highlights, demo data integration
