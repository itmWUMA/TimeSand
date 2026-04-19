---
type: task
iteration: "1.1"
status: done
branch: "feat/heic-support"
pr:
completed: 2026-04-19
tags:
  - heic
  - phase-1
---

# Task 7: HEIC Support

- **Branch**: `feat/heic-support`
- **Scope**: Add server-side HEIC/HEIF → JPEG conversion on upload and update the frontend file picker to accept HEIC files.
- **Dependencies**: None

## Files

### Backend

- `backend/pyproject.toml` (modify) — add `pillow-heif` dependency
- `backend/app/services/photo_service.py` (modify) — add HEIC MIME types, conversion logic
- `backend/tests/test_photos.py` (modify) — add HEIC upload test

### Frontend

- `frontend/src/components/PhotoUploader.vue` (modify) — add HEIC to `accept` attribute and format hint text

## API Contracts

No new API endpoints. The existing `POST /api/photos/upload` endpoint now accepts `image/heic` and `image/heif` MIME types in addition to the existing four.

## Acceptance Criteria

- [ ] `pillow-heif` added to `pyproject.toml` dependencies
- [ ] `ALLOWED_MIME_TYPES` includes `image/heic` and `image/heif`
- [ ] HEIC upload produces a JPEG original + JPEG thumbnail in storage
- [ ] EXIF metadata (date, GPS) is preserved through HEIC → JPEG conversion
- [ ] `Photo` record has `mime_type=image/jpeg`, original filename kept
- [ ] Frontend file picker accepts `.heic` and `.heif` files
- [ ] Frontend format hint text includes HEIC
- [ ] Backend tests pass
- [ ] Existing photo upload tests still pass

## Implementation Steps

- [ ] **Step 1: Add `pillow-heif` dependency**

In `backend/pyproject.toml`, add `pillow-heif` to the dependencies list:

```toml
dependencies = [
  "fastapi>=0.115.0",
  "uvicorn[standard]>=0.30.0",
  "sqlmodel>=0.0.22",
  "pillow>=11.0.0",
  "pillow-heif>=0.18.0",
  "python-multipart>=0.0.9",
  "mutagen>=1.47.0",
]
```

Then install:
```bash
cd backend && uv sync
```

- [ ] **Step 2: Register pillow-heif and add HEIC MIME types**

In `backend/app/services/photo_service.py`, add the following at the top of the file (after existing imports):

```python
from pillow_heif import register_heif_opener

register_heif_opener()
```

This registers HEIC/HEIF as a format Pillow can open, so `Image.open()` handles HEIC files transparently.

Add HEIC/HEIF entries to `ALLOWED_MIME_TYPES`:

```python
ALLOWED_MIME_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".jpg",
    "image/heif": ".jpg",
}
```

The HEIC/HEIF entries map to `.jpg` because the file will be converted to JPEG before saving.

- [ ] **Step 3: Add HEIC → JPEG conversion in `create_photo_from_upload`**

Replace the `create_photo_from_upload` function body with the following (changes marked with comments):

```python
def create_photo_from_upload(filename: str | None, mime_type: str | None, data: bytes) -> Photo:
    normalized_mime_type = (mime_type or "").lower()
    suffix = ALLOWED_MIME_TYPES.get(normalized_mime_type)
    if suffix is None:
        raise InvalidPhotoUploadError("Unsupported file type")

    if not data:
        raise InvalidPhotoUploadError("Empty upload")

    ensure_storage_directories()

    is_heic = normalized_mime_type in ("image/heic", "image/heif")

    try:
        with Image.open(BytesIO(data)) as image:
            image.load()

            taken_at, latitude, longitude = extract_exif_metadata(image)

            if is_heic:
                if image.mode != "RGB":
                    image = image.convert("RGB")
                converted_buffer = BytesIO()
                image.save(converted_buffer, format="JPEG", quality=95)
                data = converted_buffer.getvalue()
                suffix = ".jpg"
                normalized_mime_type = "image/jpeg"

            width, height = image.size

            storage_id = str(uuid4())
            original_name = f"{storage_id}{suffix}"
            thumbnail_name = f"{storage_id}_thumb{suffix}"

            original_path = get_original_path(original_name)
            thumbnail_path = get_thumbnail_path(thumbnail_name)

            try:
                original_path.write_bytes(data)
                save_thumbnail(image, thumbnail_path, suffix)
            except OSError:
                original_path.unlink(missing_ok=True)
                thumbnail_path.unlink(missing_ok=True)
                raise

    except UnidentifiedImageError as exc:
        raise InvalidPhotoUploadError("Invalid image file") from exc

    return Photo(
        filename=filename or original_name,
        file_path=original_name,
        thumbnail_path=thumbnail_name,
        file_size=len(data),
        width=width,
        height=height,
        taken_at=taken_at,
        latitude=latitude,
        longitude=longitude,
        mime_type=normalized_mime_type,
    )
```

Key changes:
- `is_heic` flag checks if the input is HEIC/HEIF
- EXIF is extracted BEFORE conversion (so original metadata is preserved)
- HEIC images are converted to RGB and saved as JPEG into a buffer
- `data` is replaced with the JPEG bytes, `suffix` and `mime_type` updated
- The rest of the flow (save original, save thumbnail, create Photo) uses the converted JPEG

- [ ] **Step 4: Write the HEIC upload test**

Add the following test functions to `backend/tests/test_photos.py`:

```python
def build_heic_bytes(width: int = 800, height: int = 600, with_exif: bool = True) -> bytes:
    """Build a minimal HEIC file for testing. Requires pillow-heif."""
    from pillow_heif import register_heif_opener
    register_heif_opener()

    image = Image.new("RGB", (width, height), color=(100, 200, 50))
    buffer = BytesIO()

    if with_exif:
        exif = Image.Exif()
        exif[36867] = "2024:01:20 14:30:00"
        image.save(buffer, format="HEIF", exif=exif)
    else:
        image.save(buffer, format="HEIF")

    return buffer.getvalue()


def test_upload_heic_converts_to_jpeg(client: TestClient) -> None:
    heic_data = build_heic_bytes()

    response = client.post(
        "/api/photos/upload",
        files=[("files", ("photo.heic", heic_data, "image/heic"))]
    )

    assert response.status_code == 201
    payload = response.json()
    photo = payload["photos"][0]

    assert photo["mime_type"] == "image/jpeg"
    assert photo["filename"] == "photo.heic"
    assert photo["file_path"].endswith(".jpg")
    assert photo["thumbnail_path"].endswith(".jpg")
    assert photo["width"] == 800
    assert photo["height"] == 600


def test_upload_heic_preserves_exif(client: TestClient) -> None:
    heic_data = build_heic_bytes(with_exif=True)

    response = client.post(
        "/api/photos/upload",
        files=[("files", ("exif.heic", heic_data, "image/heic"))]
    )

    assert response.status_code == 201
    photo = response.json()["photos"][0]
    assert photo["taken_at"] is not None


def test_upload_heif_mime_type_accepted(client: TestClient) -> None:
    heic_data = build_heic_bytes(with_exif=False)

    response = client.post(
        "/api/photos/upload",
        files=[("files", ("photo.heif", heic_data, "image/heif"))]
    )

    assert response.status_code == 201
    photo = response.json()["photos"][0]
    assert photo["mime_type"] == "image/jpeg"
```

- [ ] **Step 5: Run backend tests**

```bash
cd backend && uv run pytest -v
```
Expected: All tests pass, including the 3 new HEIC tests and all existing photo tests.

- [ ] **Step 6: Update frontend file picker**

In `frontend/src/components/PhotoUploader.vue`, update the `accept` attribute and format hint text:

Change the accept attribute:
```html
<input
  ref="fileInput"
  class="hidden"
  type="file"
  accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
  multiple
  :disabled="uploading"
  @change="onFileInputChange"
>
```

Change the format hint text:
```html
<p class="mt-1 text-sm text-ts-muted">
  JPEG, PNG, WebP, GIF, HEIC
</p>
```

- [ ] **Step 7: Run frontend tests and lint**

```bash
cd frontend && bun run test
```
Expected: All existing tests still pass.

```bash
cd frontend && bun run lint:fix
```
Expected: No lint errors.

- [ ] **Step 8: Commit**

```bash
git add backend/pyproject.toml backend/app/services/photo_service.py backend/tests/test_photos.py frontend/src/components/PhotoUploader.vue
git commit -m "$(cat <<'EOF'
feat(heic): add server-side HEIC/HEIF to JPEG conversion on upload

Register pillow-heif decoder so Pillow can open HEIC files. On upload,
HEIC images are converted to JPEG with EXIF metadata preserved. Frontend
file picker now accepts .heic/.heif files.
EOF
)"
```

## Tests

### Backend

- **HEIC upload test**: Upload a HEIC file → verify JPEG output, correct dimensions, correct MIME type
- **EXIF preservation test**: Upload a HEIC file with EXIF → verify `taken_at` is extracted
- **HEIF MIME type test**: Verify `image/heif` MIME type is accepted alongside `image/heic`
- **Regression**: All existing photo upload tests continue to pass

### Frontend

- Existing `PhotoUploader.spec.ts` tests continue to pass (no behavior change, only `accept` attribute update)
