from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlmodel import Session as DbSession
from sqlmodel import func, select

from app.core.auth import get_current_user, require_admin
from app.core.database import get_session
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    generate_session_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.user import Session as UserSession
from app.models.user import User, UserRole, UserSetting, utc_now
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    OkResponse,
    PasswordChangeRequest,
    RegisterUserRequest,
    UserResponse,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
SESSION_COOKIE = "session_id"
SESSION_DAYS = 7
REMEMBER_SESSION_DAYS = 30


def to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id or 0,
        username=user.username,
        display_name=user.display_name,
        role=user.role,
        is_active=user.is_active,
    )


def find_user_by_username(session: DbSession, username: str) -> User | None:
    return session.exec(
        select(User).where(func.lower(User.username) == username.strip().lower())
    ).first()


def ensure_valid_role(role: str) -> str:
    if role not in {UserRole.ADMIN, UserRole.MEMBER}:
        raise HTTPException(status_code=422, detail="Invalid role")
    return role


def create_user_with_settings(
    session: DbSession,
    *,
    username: str,
    display_name: str,
    password: str,
    role: str,
) -> User:
    if find_user_by_username(session, username):
        raise HTTPException(status_code=409, detail="Username already exists")

    user = User(
        username=username.strip(),
        display_name=display_name.strip(),
        password_hash=hash_password(password),
        role=ensure_valid_role(role),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    session.add(UserSetting(user_id=user.id or 0))
    session.commit()
    session.refresh(user)
    return user


def set_session_cookie(response: Response, token: str, max_age: int) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        path="/",
    )


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: DbSession = Depends(get_session),
) -> LoginResponse:
    if session.exec(select(func.count()).select_from(User)).one() == 0:
        verify_password(payload.password, DUMMY_PASSWORD_HASH)
        raise HTTPException(status_code=503, detail="System not initialized")

    user = find_user_by_username(session, payload.username)
    password_hash = user.password_hash if user else DUMMY_PASSWORD_HASH
    if user is None or not user.is_active or not verify_password(payload.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = generate_session_token()
    days = REMEMBER_SESSION_DAYS if payload.remember_me else SESSION_DAYS
    max_age = days * 24 * 60 * 60
    user_session = UserSession(
        token_hash=hash_token(token),
        user_id=user.id or 0,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        expires_at=utc_now() + timedelta(days=days),
    )
    session.add(user_session)
    session.commit()
    set_session_cookie(response, token, max_age)

    return LoginResponse(user=to_user_response(user))


@router.post("/logout", response_model=OkResponse)
def logout(
    response: Response,
    session_id: str | None = Cookie(default=None),
    session: DbSession = Depends(get_session),
) -> OkResponse:
    if session_id:
        user_session = session.exec(
            select(UserSession).where(UserSession.token_hash == hash_token(session_id))
        ).first()
        if user_session:
            session.delete(user_session)
            session.commit()
    response.delete_cookie(SESSION_COOKIE, path="/", samesite="lax")
    return OkResponse(ok=True)


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> UserResponse:
    return to_user_response(user)


@router.put("/password", response_model=OkResponse)
def change_password(
    payload: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    session: DbSession = Depends(get_session),
) -> OkResponse:
    if not verify_password(payload.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid old password")

    db_user = session.get(User, user.id)
    if db_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db_user.password_hash = hash_password(payload.new_password)
    session.add(db_user)
    session.commit()
    return OkResponse(ok=True)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterUserRequest,
    _: User = Depends(require_admin),
    session: DbSession = Depends(get_session),
) -> UserResponse:
    user = create_user_with_settings(
        session,
        username=payload.username,
        display_name=payload.display_name,
        password=payload.password,
        role=payload.role,
    )
    return to_user_response(user)
