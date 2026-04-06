# TimeSand MVP Design Spec

## 1. Product Overview

### 1.1 Positioning

TimeSand is a self-hosted smart photo wall & music box. It helps users rediscover their photos through gamified card-drawing (gacha) mechanics, paired with background music for atmosphere.

### 1.2 Problem Statement

People take many photos but rarely revisit them. Existing gallery tools focus on "management" over "experience". There is no open-source solution focused on **display and rediscovery**.

### 1.3 Target Users (MVP)

- NAS / self-hosting enthusiasts
- Family users wanting to display photos on TV / tablet / browser
- Individuals seeking a way to revisit personal photo collections

### 1.4 MVP Scope

- Web-only (responsive, desktop + mobile browser)
- Single-user (no authentication)
- Two display modes: Card Draw + Slideshow
- Self-managed photo and music storage
- Docker deployment

### 1.5 Out of MVP Scope

- User login / multi-user / permissions
- Cross-platform clients (desktop / mobile apps)
- Gamification (rarity / card packs / collection)
- AI features (smart curation, recommendation, soundtrack generation)
- External gallery integration (Immich / PhotoPrism / S3)
- Built-in royalty-free music library

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend Framework | Vue 3 |
| Animation | GSAP |
| UI Primitives | Radix Vue |
| Styling | TailwindCSS |
| Build Tool | Vite |
| Frontend Package Manager | Bun |
| API Protocol | REST (JSON) |
| Backend Framework | FastAPI (Python) |
| Python Toolchain | uv |
| ORM | SQLModel |
| Database | SQLite |
| File Storage | Local filesystem (Docker volume) |
| Deployment | Docker |
| Authentication | None (MVP) |

---

## 3. Architecture

### 3.1 High-Level

```
Browser (Vue 3 SPA)
    ↕ REST API (JSON)
FastAPI Backend
    ↕ SQLModel
SQLite DB + Local Filesystem
```

### 3.2 Project Structure

```
timesand/
├── frontend/                # Vue 3 SPA
│   ├── src/
│   │   ├── assets/          # Static assets, global styles
│   │   ├── components/      # Reusable UI components
│   │   ├── composables/     # Vue composables (shared logic)
│   │   ├── layouts/         # Page layouts
│   │   ├── pages/           # Route-level page components
│   │   ├── router/          # Vue Router config
│   │   ├── stores/          # Pinia stores
│   │   ├── services/        # API client layer
│   │   ├── types/           # TypeScript type definitions
│   │   └── App.vue
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── backend/                 # FastAPI
│   ├── app/
│   │   ├── api/             # Route handlers
│   │   │   ├── photos.py
│   │   │   ├── albums.py
│   │   │   ├── tags.py
│   │   │   ├── music.py
│   │   │   ├── draw.py      # Card draw logic
│   │   │   └── slideshow.py
│   │   ├── models/          # SQLModel models
│   │   ├── schemas/         # Pydantic request/response schemas (if needed beyond SQLModel)
│   │   ├── services/        # Business logic
│   │   ├── core/            # Config, database setup, dependencies
│   │   └── main.py          # FastAPI app entry
│   ├── pyproject.toml
│   └── uv.lock
├── data/                    # Runtime data (Docker volume mount point)
│   ├── photos/
│   │   ├── originals/
│   │   └── thumbnails/
│   ├── music/
│   │   └── files/
│   └── timesand.db          # SQLite database
├── docker-compose.yml
├── Dockerfile
└── README.md
```

### 3.3 File Storage

```
/data
  /photos
    /originals/       # Original uploaded photos
    /thumbnails/      # Auto-generated thumbnails (on upload)
  /music
    /files/           # Uploaded music files
  timesand.db         # SQLite database file
```

- Photos and music stored on local filesystem
- Database stores metadata only (filename, path, size, EXIF, etc.)
- Thumbnails generated on upload using Pillow
- Entire `/data` directory is a Docker volume for persistence and easy backup

---

## 4. Data Model

### 4.1 Core Entities

**Photo**
| Field | Type | Description |
|---|---|---|
| id | int (PK) | Auto-increment |
| filename | str | Original filename |
| file_path | str | Path relative to /data/photos/originals/ |
| thumbnail_path | str | Path relative to /data/photos/thumbnails/ |
| file_size | int | File size in bytes |
| width | int | Image width in pixels |
| height | int | Image height in pixels |
| taken_at | datetime | EXIF capture time (nullable if unknown) |
| uploaded_at | datetime | Upload timestamp |
| mime_type | str | e.g. image/jpeg |

**Album**
| Field | Type | Description |
|---|---|---|
| id | int (PK) | Auto-increment |
| name | str | Album name |
| description | str | Optional description |
| cover_photo_id | int (FK) | Optional cover photo |
| created_at | datetime | Creation timestamp |
| updated_at | datetime | Last modified |

**PhotoAlbum** (many-to-many join)
| Field | Type |
|---|---|
| photo_id | int (FK → Photo) |
| album_id | int (FK → Album) |

**Tag**
| Field | Type |
|---|---|
| id | int (PK) |
| name | str (unique) |

**PhotoTag** (many-to-many join)
| Field | Type |
|---|---|
| photo_id | int (FK → Photo) |
| tag_id | int (FK → Tag) |

**Music**
| Field | Type | Description |
|---|---|---|
| id | int (PK) | Auto-increment |
| title | str | Song title (from metadata or filename) |
| artist | str | Artist (nullable) |
| filename | str | Original filename |
| file_path | str | Path relative to /data/music/files/ |
| file_size | int | File size in bytes |
| duration | float | Duration in seconds (nullable) |
| mime_type | str | e.g. audio/mpeg |
| uploaded_at | datetime | Upload timestamp |

**Playlist**
| Field | Type | Description |
|---|---|---|
| id | int (PK) | Auto-increment |
| name | str | Playlist name |
| is_default | bool | Whether this is the global default playlist |
| created_at | datetime | Creation timestamp |

**PlaylistMusic** (ordered many-to-many)
| Field | Type |
|---|---|
| playlist_id | int (FK → Playlist) |
| music_id | int (FK → Music) |
| position | int | Order in playlist |

**AlbumPlaylist** (album ↔ playlist association)
| Field | Type |
|---|---|
| album_id | int (FK → Album) |
| playlist_id | int (FK → Playlist) |

---

## 5. API Design

### 5.1 Photos

| Method | Path | Description |
|---|---|---|
| POST | /api/photos/upload | Upload photos (multipart, batch) |
| GET | /api/photos | List photos (pagination, filter by album/tag) |
| GET | /api/photos/{id} | Get photo detail |
| DELETE | /api/photos/{id} | Delete photo |
| GET | /api/photos/{id}/file | Serve original photo file |
| GET | /api/photos/{id}/thumbnail | Serve thumbnail |

### 5.2 Albums

| Method | Path | Description |
|---|---|---|
| POST | /api/albums | Create album |
| GET | /api/albums | List albums |
| GET | /api/albums/{id} | Get album detail |
| PUT | /api/albums/{id} | Update album |
| DELETE | /api/albums/{id} | Delete album |
| POST | /api/albums/{id}/photos | Add photos to album |
| DELETE | /api/albums/{id}/photos/{photo_id} | Remove photo from album |

### 5.3 Tags

| Method | Path | Description |
|---|---|---|
| POST | /api/tags | Create tag |
| GET | /api/tags | List tags |
| DELETE | /api/tags/{id} | Delete tag |
| POST | /api/photos/{id}/tags | Add tags to photo |
| DELETE | /api/photos/{id}/tags/{tag_id} | Remove tag from photo |

### 5.4 Music

| Method | Path | Description |
|---|---|---|
| POST | /api/music/upload | Upload music files |
| GET | /api/music | List music |
| GET | /api/music/{id} | Get music detail |
| DELETE | /api/music/{id} | Delete music |
| GET | /api/music/{id}/file | Stream music file |

### 5.5 Playlists

| Method | Path | Description |
|---|---|---|
| POST | /api/playlists | Create playlist |
| GET | /api/playlists | List playlists |
| GET | /api/playlists/{id} | Get playlist detail with tracks |
| PUT | /api/playlists/{id} | Update playlist (name, reorder tracks) |
| DELETE | /api/playlists/{id} | Delete playlist |
| POST | /api/playlists/{id}/tracks | Add music to playlist |
| DELETE | /api/playlists/{id}/tracks/{music_id} | Remove music from playlist |

### 5.6 Album-Playlist Association

| Method | Path | Description |
|---|---|---|
| PUT | /api/albums/{id}/playlist | Set playlist for album |
| DELETE | /api/albums/{id}/playlist | Remove playlist from album |

### 5.7 Card Draw

| Method | Path | Description |
|---|---|---|
| POST | /api/draw | Draw a card (returns a photo with time-weighted randomness) |
| POST | /api/draw/reset | Reset draw session (reshuffle) |

**Draw request body:**
```json
{
  "album_id": null,       // optional: draw from specific album
  "exclude_ids": [1, 2]   // optional: exclude already drawn photos
}
```

**Draw response:**
```json
{
  "photo": { ... },       // full photo object
  "weight_reason": "3_years_ago_today"  // why this photo was weighted (nullable)
}
```

### 5.8 Slideshow

| Method | Path | Description |
|---|---|---|
| GET | /api/slideshow/photos | Get ordered photo list for slideshow (by album or all) |

Query params: `album_id`, `order` (random / chronological), `limit`

---

## 6. Card Draw Algorithm

### 6.1 Time-Weighted Random

Base: uniform random selection from the photo pool.

Time weighting overlay:
- For each photo with a `taken_at` value, calculate proximity to "this day in previous years"
- Photos taken within ±3 days of today's month-day in any previous year get a weight boost
- Boost multiplier: 3x for exact date match, 2x for ±1 day, 1.5x for ±2-3 days
- Photos without `taken_at` get base weight (1x)

### 6.2 Implementation

```
1. Query candidate photos (all, or filtered by album)
2. Exclude already-drawn IDs (from request)
3. Calculate weight for each candidate
4. Weighted random selection
5. Return selected photo + weight reason
```

### 6.3 Session State

Draw session state (which cards have been drawn) is managed client-side. The frontend sends `exclude_ids` with each draw request. "Reset/Reshuffle" simply clears the client-side exclude list.

---

## 7. Feature Details

### 7.1 Photo Upload

- Accept: JPEG, PNG, WebP, GIF
- Batch upload supported
- On upload:
  1. Save original to `/data/photos/originals/`
  2. Generate thumbnail (max 400px on longest side) to `/data/photos/thumbnails/`
  3. Extract EXIF data (taken_at, GPS if available)
  4. Create database record
- Filename: UUID-based to avoid conflicts

### 7.2 Music Upload

- Accept: MP3, WAV, FLAC, OGG, AAC
- On upload:
  1. Save to `/data/music/files/`
  2. Extract metadata (title, artist, duration) via mutagen or tinytag
  3. Create database record
- Filename: UUID-based

### 7.3 Card Draw Experience

**Interaction flow:**
1. User sees a card pile (deck) in the center of the screen
2. User clicks/taps to draw — a card flies out from the deck with flip animation, reveals photo
3. Card displays in center stage area
4. On next draw, current card shrinks and flies to bottom area, landing with random slight rotation and offset (natural table scatter)
5. Bottom pile shows top 3-5 cards with edges visible, interactive
6. Tapping the bottom pile → all drawn cards scatter across the full screen (table spread)
7. Hover/tap on any scattered card → card floats up and enlarges for viewing
8. Tap blank area or "collect" button → cards gather back to bottom pile
9. "Reshuffle" button → clears all drawn cards, resets the deck

**Background music:** Plays during card draw from the global default playlist or album-associated playlist.

### 7.4 Slideshow Experience

- Triggered from an album or all photos
- Full-screen immersive display
- Auto-advance with configurable interval (default 5 seconds)
- Transition animations: fade, Ken Burns (slow zoom + pan)
- Background music from associated playlist or global default
- Controls: play/pause, previous/next, interval adjustment, exit
- Dark background, photo centered with appropriate scaling

### 7.5 Background Music Player

- Persistent player bar at bottom of screen (outside slideshow/draw modes)
- In draw/slideshow modes, player is integrated into the experience
- Controls: play/pause, next/previous track, volume, progress bar
- Plays from current playlist context:
  - Album view → album's playlist
  - Global → default playlist
  - Manual selection available

---

## 8. Pages & Navigation

### 8.1 Page Structure

| Page | Route | Description |
|---|---|---|
| Card Draw | / | Home page, core card draw experience |
| Slideshow | /slideshow | Full-screen slideshow player |
| Albums | /albums | Album list with cover thumbnails |
| Album Detail | /albums/:id | Photos in album, manage, start slideshow |
| Upload | /upload | Batch upload photos and music |
| Music | /music | Music list, playlist management |
| Settings | /settings | Draw weight preferences, slideshow defaults, storage info |

### 8.2 Navigation

- Minimal side navigation or top navigation bar (dark theme)
- Card Draw page is the landing/home page
- Navigation collapses to hamburger menu on mobile
- Slideshow runs full-screen, overlaying navigation

---

## 9. Visual Design

### 9.1 Style Direction

- **Dark immersive theme**: deep dark backgrounds (#0a0a0a range)
- Photos are the visual focus — they should "glow" against the dark background
- Subtle ambient effects (soft shadows, gentle gradients)
- Card draw area has a "table surface" feel
- Typography: clean sans-serif, light weight on dark background
- Accent color: warm tone (amber/gold) to complement the "sand" in TimeSand
- Transitions and micro-animations throughout for polish

### 9.2 Responsive Behavior

- Desktop: full layout with side navigation
- Tablet: adapted layout, touch-friendly card draw
- Mobile: stacked layout, hamburger navigation, swipe gestures for card draw

---

## 10. Deployment

### 10.1 Docker

- Single `Dockerfile` (multi-stage build):
  - Stage 1: Build frontend (Bun + Vite)
  - Stage 2: Python backend serving built frontend as static files
- `docker-compose.yml` for easy startup with volume mapping
- Data volume: `/data` mapped to host for persistence

### 10.2 Minimal Configuration

```yaml
# docker-compose.yml
services:
  timesand:
    image: timesand:latest
    ports:
      - "8080:8080"
    volumes:
      - ./data:/data
```

Users only need: Docker installed → `docker-compose up` → open browser.

---

## 11. Evolution Path (Post-MVP, for reference only)

1. Gamification: rarity levels, card packs, collection mechanics
2. More display modes: waterfall, timeline
3. External gallery integration: Immich, PhotoPrism, S3
4. AI: smart curation, photo-to-music matching, memory generation
5. Built-in royalty-free music library
6. User authentication & multi-user support
7. Desktop / mobile native clients
