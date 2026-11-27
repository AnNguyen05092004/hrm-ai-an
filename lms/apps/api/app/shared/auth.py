"""Phiên đăng nhập (cookie httpOnly, lưu băm token trong DB), mật khẩu bcrypt và kiểm tra vai."""
import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import bcrypt
from fastapi import Depends, Request, Response
from sqlalchemy import delete, insert, select

from app.config import settings
from app.shared import tables as t
from app.shared.db import engine
from app.shared.errors import AppError, forbidden

COOKIE = "lms_session"


@dataclass(frozen=True)
class AuthUser:
    id: str
    org_id: str
    role: str
    name: str
    email: str

    @property
    def can_edit(self) -> bool:
        """Người soạn khóa học: author, và admin (quản trị làm được mọi việc của người soạn)"""
        return self.role in ("author", "admin")


def _sha(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt(10)).decode()


def check_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except ValueError:
        return False


def create_session(conn, user_id: str) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(32)
    expires = datetime.now(UTC) + timedelta(days=settings().SESSION_DAYS)
    conn.execute(insert(t.sessions).values(tokenHash=_sha(token), userId=user_id, expiresAt=expires))
    return token, expires


def destroy_session(conn, token: str) -> None:
    conn.execute(delete(t.sessions).where(t.sessions.c.tokenHash == _sha(token)))


def set_session_cookie(resp: Response, token: str, expires: datetime) -> None:
    resp.set_cookie(COOKIE, token, httponly=True, samesite="lax", path="/", expires=expires, secure=settings().NODE_ENV == "production")


def user_from_token(token: str | None) -> AuthUser | None:
    if not token:
        return None
    u = t.users.c
    q = (select(u.id, u.orgId, u.role, u.name, u.email, u.active).select_from(t.sessions.join(t.users, t.users.c.id == t.sessions.c.userId))
         .where(t.sessions.c.tokenHash == _sha(token), t.sessions.c.expiresAt > datetime.now(UTC)))
    with engine().connect() as c:
        row = c.execute(q).mappings().first()
    if not row or not row["active"]:
        return None
    return AuthUser(row["id"], row["orgId"], row["role"], row["name"], row["email"])


def current_user(request: Request) -> AuthUser:
    """Bắt buộc đăng nhập"""
    u = user_from_token(request.cookies.get(COOKIE))
    if not u:
        raise AppError(401, "unauthenticated", "Bạn cần đăng nhập")
    return u


def require_editor(u: AuthUser = Depends(current_user)) -> AuthUser:
    """Vai người soạn (author hoặc admin)"""
    if not u.can_edit:
        raise forbidden()
    return u


def require_admin(u: AuthUser = Depends(current_user)) -> AuthUser:
    if u.role != "admin":
        raise forbidden()
    return u
