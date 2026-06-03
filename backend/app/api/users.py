from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session as DbSession
from sqlmodel import select

from app.api.auth import ensure_valid_role, to_user_response
from app.core.auth import require_admin
from app.core.database import get_session
from app.models.user import User
from app.schemas.auth import UpdateUserRequest, UserResponse

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(
    _: User = Depends(require_admin),
    session: DbSession = Depends(get_session),
) -> list[UserResponse]:
    return [to_user_response(user) for user in session.exec(select(User).order_by(User.id)).all()]


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    _: User = Depends(require_admin),
    session: DbSession = Depends(get_session),
) -> UserResponse:
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return to_user_response(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UpdateUserRequest,
    _: User = Depends(require_admin),
    session: DbSession = Depends(get_session),
) -> UserResponse:
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.display_name is not None:
        user.display_name = payload.display_name
    if payload.role is not None:
        user.role = ensure_valid_role(payload.role)
    if payload.is_active is not None:
        user.is_active = payload.is_active

    session.add(user)
    session.commit()
    session.refresh(user)
    return to_user_response(user)


@router.delete("/{user_id}", response_model=dict[str, bool])
def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    session: DbSession = Depends(get_session),
) -> dict[str, bool]:
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete current user")

    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    session.delete(user)
    session.commit()
    return {"ok": True}
