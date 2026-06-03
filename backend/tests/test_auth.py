from __future__ import annotations

from datetime import timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.security import hash_password
from app.models.user import Session as UserSession
from app.models.user import User, UserRole, utc_now


def create_user(
    session: Session,
    *,
    username: str = "admin",
    display_name: str = "Admin",
    password: str = "timesand123",
    role: str = UserRole.ADMIN,
    is_active: bool = True,
) -> User:
    user = User(
        username=username,
        display_name=display_name,
        password_hash=hash_password(password),
        role=role,
        is_active=is_active,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def login(client: TestClient, username: str = "admin", password: str = "timesand123"):
    return client.post(
        "/api/auth/login",
        json={"username": username, "password": password, "remember_me": False},
    )


def test_login_returns_503_when_system_uninitialized(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "timesand123"},
    )

    assert response.status_code == 503
    assert response.json()["message"] == "System not initialized"


def test_login_success_sets_http_only_session_cookie(
    client: TestClient,
    session: Session,
) -> None:
    create_user(session)

    response = login(client)

    assert response.status_code == 200
    assert response.json()["user"] == {
        "id": 1,
        "username": "admin",
        "display_name": "Admin",
        "role": "admin",
        "is_active": True,
    }
    assert "session_id=" in response.headers["set-cookie"]
    assert "HttpOnly" in response.headers["set-cookie"]
    assert session.exec(select(UserSession)).one().user_id == 1


def test_login_rejects_invalid_password(client: TestClient, session: Session) -> None:
    create_user(session)

    response = login(client, password="wrong-password")

    assert response.status_code == 401
    assert response.json()["message"] == "Invalid username or password"
    assert session.exec(select(UserSession)).all() == []


def test_me_returns_current_user_from_session(client: TestClient, session: Session) -> None:
    create_user(session)
    login(client)

    response = client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["username"] == "admin"
    assert response.json()["role"] == "admin"


def test_me_rejects_expired_session(client: TestClient, session: Session) -> None:
    create_user(session)
    login(client)
    user_session = session.exec(select(UserSession)).one()
    user_session.expires_at = utc_now() - timedelta(seconds=1)
    session.add(user_session)
    session.commit()

    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json()["message"] == "Not authenticated"


def test_logout_deletes_current_session_and_clears_cookie(
    client: TestClient,
    session: Session,
) -> None:
    create_user(session)
    login(client)

    response = client.post("/api/auth/logout")

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert session.exec(select(UserSession)).all() == []
    assert "session_id=" in response.headers["set-cookie"]
    assert "Max-Age=0" in response.headers["set-cookie"]


def test_password_change_requires_old_password(client: TestClient, session: Session) -> None:
    user = create_user(session)
    login(client)

    response = client.put(
        "/api/auth/password",
        json={"old_password": "wrong", "new_password": "new-timesand"},
    )

    session.refresh(user)
    assert response.status_code == 400
    assert user.password_hash == session.get(User, user.id).password_hash


def test_password_change_updates_password_hash(client: TestClient, session: Session) -> None:
    user = create_user(session)
    login(client)

    response = client.put(
        "/api/auth/password",
        json={"old_password": "timesand123", "new_password": "new-timesand"},
    )

    session.refresh(user)
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert login(client, password="new-timesand").status_code == 200


def test_admin_registers_member(client: TestClient, session: Session) -> None:
    create_user(session)
    login(client)

    response = client.post(
        "/api/auth/register",
        json={
            "username": "member",
            "display_name": "Member",
            "password": "timesand123",
            "role": "member",
        },
    )

    assert response.status_code == 201
    assert response.json()["username"] == "member"
    assert response.json()["role"] == "member"


def test_non_admin_cannot_register_users(client: TestClient, session: Session) -> None:
    create_user(
        session,
        username="member",
        display_name="Member",
        role=UserRole.MEMBER,
    )
    login(client, username="member")

    response = client.post(
        "/api/auth/register",
        json={
            "username": "other",
            "display_name": "Other",
            "password": "timesand123",
            "role": "member",
        },
    )

    assert response.status_code == 403
