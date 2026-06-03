from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.user import UserRole


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str
    role: str
    is_active: bool


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=32)
    password: str = Field(min_length=1, max_length=128)
    remember_me: bool = False


class LoginResponse(BaseModel):
    user: UserResponse


class PasswordChangeRequest(BaseModel):
    old_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class RegisterUserRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32, pattern=r"^[A-Za-z0-9_]+$")
    display_name: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=8, max_length=128)
    role: str = UserRole.MEMBER


class UpdateUserRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=64)
    role: str | None = None
    is_active: bool | None = None


class UpdateProfileRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=64)


class OkResponse(BaseModel):
    ok: bool
