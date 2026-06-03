from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import Cookie, Depends, HTTPException
from sqlmodel import Session as DbSession
from sqlmodel import select

from app.core.database import get_session
from app.core.security import hash_token
from app.models.user import Session as UserSession
from app.models.user import User, UserRole, utc_now


def as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def get_current_user(
    session_id: str | None = Cookie(default=None),
    session: DbSession = Depends(get_session),
) -> User:
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_session = session.exec(
        select(UserSession).where(UserSession.token_hash == hash_token(session_id))
    ).first()
    now = utc_now()
    if user_session is None or as_aware_utc(user_session.expires_at) <= now:
        if user_session is not None:
            session.delete(user_session)
            session.commit()
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = session.get(User, user_session.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if as_aware_utc(user_session.expires_at) - now < timedelta(hours=24):
        user_session.expires_at = now + timedelta(days=7)
        session.add(user_session)
        session.commit()

    return user


def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_admin(user: User = Depends(get_current_active_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
