from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session

from app.core.auth import require_admin
from app.core.database import get_session
from app.models.user import User
from app.services.demo_service import cleanup_demo_data

router = APIRouter(prefix="/api/demo", tags=["demo"])


class DeleteDemoResponse(BaseModel):
    removed: int


@router.delete("", response_model=DeleteDemoResponse)
def delete_demo(
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> DeleteDemoResponse:
    removed = cleanup_demo_data(session)
    return DeleteDemoResponse(removed=removed)
