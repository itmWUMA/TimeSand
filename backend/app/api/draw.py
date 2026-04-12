from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.core.database import get_session
from app.models.photo import Photo
from app.services import draw_service
from app.services.draw_service import NoAvailablePhotosError

router = APIRouter(prefix="/api/draw", tags=["draw"])


class DrawRequest(BaseModel):
    album_id: int | None = Field(default=None, ge=1)
    exclude_ids: list[int] = Field(default_factory=list)


class DrawResponse(BaseModel):
    photo: Photo
    weight_reason: str | None = None


class DrawResetResponse(BaseModel):
    ok: bool
    total_available: int


@router.post("", response_model=DrawResponse)
def draw_card(
    request: DrawRequest,
    session: Session = Depends(get_session),
) -> DrawResponse:
    try:
        photo, weight_reason = draw_service.draw_photo(
            session,
            album_id=request.album_id,
            exclude_ids=request.exclude_ids,
        )
    except NoAvailablePhotosError as exc:
        raise HTTPException(status_code=404, detail="No more photos available to draw") from exc

    return DrawResponse(photo=photo, weight_reason=weight_reason)


@router.post("/reset", response_model=DrawResetResponse)
def reset_draw(session: Session = Depends(get_session)) -> DrawResetResponse:
    return DrawResetResponse(ok=True, total_available=draw_service.count_available_photos(session))
