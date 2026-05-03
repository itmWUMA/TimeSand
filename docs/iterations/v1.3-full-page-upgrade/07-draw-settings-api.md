---
type: task
iteration: "1.3"
status: pending
branch: "feat/draw-settings-api"
pr:
completed:
tags:
  - full-page-upgrade
  - draw
  - backend
---

# Task 7: Draw Settings API

- **Branch**: `feat/draw-settings-api`
- **Scope**: Parameterize the card draw weight algorithm — add `weight_mode` and `nearby_days` request parameters to the draw API.
- **Dependencies**: Task 1 (cleanup) must be merged first

## Files

### Backend

- `backend/app/api/draw.py` (modify — extend `DrawRequest`)
- `backend/app/services/draw_service.py` (modify — parameterize weights)
- `backend/tests/test_draw_service.py` (modify — add parameterized tests)

### Frontend

- `frontend/src/services/draw.ts` (modify — pass new parameters)
- `frontend/src/types/draw.ts` (create or modify — update request type)

## API Contract

### `POST /api/draw` (modified)

**Request:**

```json
{
  "album_id": null,
  "exclude_ids": [],
  "weight_mode": "standard",
  "nearby_days": 3
}
```

| Field | Type | Default | Validation | Description |
|-------|------|---------|------------|-------------|
| `album_id` | `int \| null` | `null` | `>= 1` | Filter to specific album |
| `exclude_ids` | `int[]` | `[]` | — | Photos to exclude |
| `weight_mode` | `string` | `"standard"` | One of: `"off"`, `"light"`, `"standard"`, `"strong"` | Time-weighting preset |
| `nearby_days` | `int` | `3` | `1 <= x <= 7` | Days range for "nearby" matching |

**Response:** unchanged.

### Backward Compatibility

All new fields have defaults matching current behavior. Existing clients work without changes.

## Backend Design

### Weight Presets

```python
WEIGHT_PRESETS: dict[str, dict[str, float]] = {
    "off":      {"exact": 1.0, "near_one": 1.0, "near_far": 1.0},
    "light":    {"exact": 1.8, "near_one": 1.4, "near_far": 1.2},
    "standard": {"exact": 3.0, "near_one": 2.0, "near_far": 1.5},
    "strong":   {"exact": 5.0, "near_one": 3.0, "near_far": 2.0},
}
```

### Modified `calculate_draw_weight`

```python
def calculate_draw_weight(
    taken_at: datetime | None,
    *,
    today: date | None = None,
    weight_mode: str = "standard",
    nearby_days: int = 3,
) -> tuple[float, str | None]:
```

- Look up weights from `WEIGHT_PRESETS[weight_mode]`
- Use `nearby_days` instead of hardcoded `3` in the day distance check
- Day distance ranges: `0` → exact, `1` → near_one, `2..nearby_days` → near_far

### Modified `draw_photo`

```python
def draw_photo(
    session: Session,
    *,
    album_id: int | None = None,
    exclude_ids: list[int] | None = None,
    today: date | None = None,
    weight_mode: str = "standard",
    nearby_days: int = 3,
) -> tuple[Photo, str | None]:
```

Pass `weight_mode` and `nearby_days` through to `calculate_draw_weight` and `choose_weighted_photo`.

### Modified API Route

```python
class DrawRequest(BaseModel):
    album_id: int | None = Field(default=None, ge=1)
    exclude_ids: list[int] = Field(default_factory=list)
    weight_mode: str = Field(default="standard")
    nearby_days: int = Field(default=3, ge=1, le=7)
```

Validate `weight_mode` is a valid key in `WEIGHT_PRESETS`, return 422 if not.

### Frontend Service Changes

Update `frontend/src/services/draw.ts` to accept and forward the new parameters:

```ts
interface DrawParams {
  albumId?: number
  excludeIds?: number[]
  weightMode?: string
  nearbyDays?: number
}
```

Read defaults from settings store, allowing per-request override.

## Acceptance Criteria

- [ ] `POST /api/draw` accepts `weight_mode` and `nearby_days` parameters
- [ ] `weight_mode="off"` produces uniform random (all weights = 1.0)
- [ ] `weight_mode="strong"` produces heavily time-biased results
- [ ] `nearby_days=1` only matches exact date; `nearby_days=7` matches wider range
- [ ] Invalid `weight_mode` returns 422
- [ ] `nearby_days` outside 1-7 range returns 422
- [ ] Default behavior (no params) is identical to pre-change behavior
- [ ] Frontend service passes parameters from settings store
- [ ] `uv run pytest` passes with new test cases
- [ ] `uv run ruff check .` passes
- [ ] `bun run type-check` passes

## Tests

### Backend

- Parameterized test: `calculate_draw_weight` with each weight_mode returns expected multipliers
- Test: `nearby_days=1` — only day_distance=0 triggers exact match, day_distance=1 is base weight
- Test: `nearby_days=7` — day_distance=5 still triggers near_far weight
- Test: invalid `weight_mode` → 422 response
- Test: `nearby_days=0` or `nearby_days=8` → 422 response
- Test: default params produce same results as before (regression)

### Frontend

- Type check: draw service accepts new parameters
