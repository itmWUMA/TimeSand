from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger

logger = get_logger(__name__)

ERROR_CODE_MAP: dict[int, str] = {
    400: "bad_request",
    404: "not_found",
    413: "file_too_large",
    422: "validation_error",
    500: "internal_error",
}

DEFAULT_MESSAGE_MAP: dict[int, str] = {
    404: "Resource not found",
    413: "File exceeds size limit",
    422: "Invalid request data",
    500: "An unexpected error occurred",
}

DEFAULT_ERROR_MESSAGE = "Request failed"


class ErrorResponse(BaseModel):
    error: str
    message: str
    status_code: int


def resolve_error_code(status_code: int) -> str:
    return ERROR_CODE_MAP.get(status_code, "error")


def resolve_message(status_code: int, detail: Any) -> str:
    if status_code >= 500:
        return DEFAULT_MESSAGE_MAP[500]

    if isinstance(detail, str):
        normalized = detail.strip()
        if normalized:
            return normalized

    if isinstance(detail, dict):
        message = detail.get("message")
        if isinstance(message, str):
            normalized = message.strip()
            if normalized:
                return normalized

    if isinstance(detail, list):
        first = detail[0] if detail else None
        if isinstance(first, str):
            normalized = first.strip()
            if normalized:
                return normalized
        if isinstance(first, dict):
            message = first.get("message")
            if isinstance(message, str):
                normalized = message.strip()
                if normalized:
                    return normalized

    return DEFAULT_MESSAGE_MAP.get(status_code, DEFAULT_ERROR_MESSAGE)


def build_validation_message(exc: RequestValidationError) -> str:
    parts: list[str] = []
    for validation_error in exc.errors():
        location = ".".join(str(item) for item in validation_error.get("loc", ()) if item != "body")
        message = validation_error.get("msg", "Invalid value")
        parts.append(f"{location}: {message}" if location else message)

    return "; ".join(parts) if parts else DEFAULT_MESSAGE_MAP[422]


def build_error_response(status_code: int, message: str) -> JSONResponse:
    payload = ErrorResponse(
        error=resolve_error_code(status_code),
        message=message,
        status_code=status_code,
    )
    return JSONResponse(status_code=status_code, content=payload.model_dump())


async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    message = resolve_message(exc.status_code, exc.detail)
    if exc.status_code >= 500:
        logger.error(
            "http_exception_5xx",
            status_code=exc.status_code,
            path=request.url.path,
            method=request.method,
            detail=str(exc.detail),
        )

    return build_error_response(exc.status_code, message)


async def validation_exception_handler(
    _: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return build_error_response(422, build_validation_message(exc))


async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    logger.exception(
        "unhandled_exception",
        path=request.url.path,
        method=request.method,
        error=str(exc),
    )
    return build_error_response(500, DEFAULT_MESSAGE_MAP[500])
