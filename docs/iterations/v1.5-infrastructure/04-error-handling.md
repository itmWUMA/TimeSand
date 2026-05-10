---
type: task
iteration: "1.5"
status: done
branch: "feat/error-handling"
pr:
completed: 2026-05-08
tags:
  - v1.5
  - infrastructure
  - error-handling
---

# Task 4: Unified Error Handling

- **Branch**: `feat/error-handling`
- **Scope**: Backend unified error response format with global exception handler; frontend Axios interceptor with toast composable for automatic error display
- **Dependencies**: Task 1 (Structured Logging) must be merged first — error events are logged

## Files

### Backend

- `backend/app/core/errors.py` (create — error response model, global exception handlers)
- `backend/app/main.py` (modify — register exception handlers)

### Frontend

- `frontend/src/composables/useToast.ts` (create — programmatic toast API wrapping Radix Vue Toast)
- `frontend/src/services/api.ts` (modify — add Axios response error interceptor)
- `frontend/src/layouts/DefaultLayout.vue` (modify — integrate toast composable for global toast rendering)

## Design Details

### Backend: Unified Error Response

All API errors return this JSON structure:

```json
{
  "error": "not_found",
  "message": "Photo with id 'abc-123' not found",
  "status_code": 404
}
```

**Error code mapping**:

| HTTP Status | `error` value | Default `message` |
|-------------|---------------|-------------------|
| 400 | `bad_request` | Varies by endpoint |
| 404 | `not_found` | Resource not found |
| 413 | `file_too_large` | File exceeds size limit |
| 422 | `validation_error` | Invalid request data |
| 500 | `internal_error` | An unexpected error occurred |

**Implementation** (`app/core/errors.py`):

```python
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": ERROR_CODE_MAP.get(exc.status_code, "error"),
            "message": str(exc.detail),
            "status_code": exc.status_code,
        },
    )

async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("unhandled_exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": "An unexpected error occurred",
            "status_code": 500,
        },
    )
```

Register in `main.py`:
```python
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)
```

### Frontend: Toast Composable

Create `useToast` composable using a Pinia store to manage toast state:

```typescript
// composables/useToast.ts
interface Toast {
  id: string
  title: string
  description?: string
  variant: 'default' | 'success' | 'error'
}

// Provides: showToast(title, description?, variant?), dismissToast(id), toasts (reactive list)
```

Integrate into `DefaultLayout.vue`: render a list of `TsToast` components bound to the toast store's reactive list.

### Frontend: Axios Error Interceptor

Add to `services/api.ts`:

```typescript
api.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    const toast = useToastStore()

    if (!error.response) {
      toast.show({ title: t('error.network'), variant: 'error' })
    } else {
      const message = error.response.data?.message || t('error.unknown')
      toast.show({ title: message, variant: 'error' })
    }

    return Promise.reject(error)
  }
)
```

Individual API calls can still `.catch()` for custom handling — the interceptor is the fallback that prevents silent failures.

### i18n

Add error message keys to both `zh.json` and `en.json`:

```json
{
  "error": {
    "network": "Cannot connect to server / 无法连接到服务器",
    "unknown": "An unexpected error occurred / 发生未知错误",
    "fileTooLarge": "File exceeds size limit / 文件超出大小限制"
  }
}
```

## Acceptance Criteria

- [x] All API error responses follow the unified `{error, message, status_code}` format
- [x] Unhandled exceptions return 500 with generic message (no internal details leaked)
- [x] Unhandled exceptions are logged with full error details
- [x] `useToast` composable provides `showToast()` for programmatic toast display
- [x] Axios interceptor automatically shows error toast on API failure
- [x] Network errors (server unreachable) show a user-friendly message
- [x] Individual API calls can still catch errors for custom handling
- [x] Error messages are i18n'd (zh + en)
- [x] Existing tests still pass
- [x] Frontend type-check passes: `bun run type-check`

## Tests

### Backend

- Test HTTP exception handler returns unified format for 404, 400, 500
- Test unhandled exception returns 500 with generic message
- Test validation error returns 422 with field details

### Frontend

- Test `useToast` composable: `showToast()` adds toast, auto-dismisses after timeout
- Test Axios interceptor triggers toast on 500 response
- Test Axios interceptor triggers toast on network error
