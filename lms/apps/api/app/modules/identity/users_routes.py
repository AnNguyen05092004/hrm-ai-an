"""Quản trị: tài khoản và vai (admin, author, reviewer), hạn mức AI, nhật ký thao tác."""
import secrets
from typing import Annotated, Literal

from fastapi import Depends
from pydantic import BaseModel, Field, StringConstraints, field_validator
from sqlalchemy import delete, func, select, update

from app.adapters.ai import month_start, month_usage
from app.shared import tables as t
from app.shared.audit import audit
from app.shared.auth import AuthUser, hash_password, require_admin, require_editor
from app.shared.db import db, many, one, scalar
from app.shared.errors import bad_request, conflict, must
from app.shared.http import TxRouter
from app.shared.validation import Email

router = TxRouter()
COLORS = ["#8b88c9", "#5b9bd5", "#4caf8e", "#e0a043", "#d9706b", "#7a8b99"]
# mật khẩu tạm 12 ký tự, bỏ các ký tự dễ nhầm (0/O, 1/l/I)
TEMP_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
Role = Literal["admin", "author", "reviewer"]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
Title = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120)]
_u = t.users.c
ROW = [_u.id, _u.name, _u.email, _u.role, _u.title, _u.color, _u.active, _u.createdAt]


def temp_password() -> str:
    return "".join(TEMP_ALPHABET[b % len(TEMP_ALPHABET)] for b in secrets.token_bytes(12))


class NewUser(BaseModel):
    name: Name
    email: Email
    role: Role
    title: Title = ""

    @field_validator("email", mode="before")
    @classmethod
    def _lower(cls, v: object) -> object:
        return v.strip().lower() if isinstance(v, str) else v


class PatchUser(BaseModel):
    role: Role | None = None
    active: bool | None = None
    name: Name | None = None
    title: Title | None = None


class Quota(BaseModel):
    quota: int = Field(ge=10_000, le=1_000_000_000)


def _other_admins(org_id: str, except_id: str) -> int:
    return scalar(select(func.count()).select_from(t.users).where(_u.orgId == org_id, _u.role == "admin", _u.active.is_(True), _u.id != except_id))


def _target(u: AuthUser, user_id: str) -> dict:
    return must(one(select(t.users).where(_u.id == user_id, _u.orgId == u.org_id)), "Người dùng")


@router.get("/users")
def list_users(u: AuthUser = Depends(require_admin)) -> list[dict]:
    return many(select(*ROW).where(_u.orgId == u.org_id).order_by(_u.name))


@router.post("/users")
def create_user(body: NewUser, u: AuthUser = Depends(require_admin)) -> dict:
    if one(select(_u.id).where(_u.email == body.email)):
        raise conflict("Email này đã có tài khoản")
    temp = temp_password()
    n = scalar(select(func.count()).select_from(t.users).where(_u.orgId == u.org_id))
    created = one(t.users.insert().values(orgId=u.org_id, name=body.name, email=body.email, role=body.role, title=body.title,
                                          color=COLORS[n % len(COLORS)], passwordHash=hash_password(temp)).returning(*ROW))
    audit(u, "user.create", created["id"], {"role": body.role})
    # mật khẩu tạm chỉ trả về một lần để quản trị gửi cho người dùng
    return {**created, "tempPassword": temp}


@router.patch("/users/{user_id}")
def patch_user(user_id: str, body: PatchUser, u: AuthUser = Depends(require_admin)) -> dict:
    tg = _target(u, user_id)
    b = body.model_dump(exclude_unset=True, exclude_none=True)
    demote = "role" in b and b["role"] != "admin" and tg["role"] == "admin"
    disable = b.get("active") is False and tg["active"]
    if tg["id"] == u.id and (demote or disable):
        raise bad_request("Không tự đổi vai hoặc khóa tài khoản của chính mình")
    if tg["role"] == "admin" and (demote or disable) and not _other_admins(u.org_id, tg["id"]):
        raise bad_request("Cần giữ ít nhất một quản trị đang hoạt động")
    row = one(update(t.users).where(_u.id == tg["id"]).values(**b).returning(*ROW)) if b else one(select(*ROW).where(_u.id == tg["id"]))
    role_changed = "role" in b and b["role"] != tg["role"]
    # khóa tài khoản hoặc đổi vai: đăng xuất mọi phiên để quyền mới có hiệu lực ngay
    if disable or role_changed:
        db().execute(delete(t.sessions).where(t.sessions.c.userId == tg["id"]))
    # không còn là reviewer thì bỏ các lời mời review đang có
    if role_changed and tg["role"] == "reviewer":
        db().execute(delete(t.kit_reviews).where(t.kit_reviews.c.reviewerId == tg["id"]))
    audit(u, "user.update", tg["id"], {k: v for k, v in b.items() if k in ("role", "active")})
    return row


@router.post("/users/{user_id}/reset-password")
def reset_password(user_id: str, u: AuthUser = Depends(require_admin)) -> dict:
    tg = _target(u, user_id)
    temp = temp_password()
    db().execute(update(t.users).where(_u.id == tg["id"]).values(passwordHash=hash_password(temp)))
    db().execute(delete(t.sessions).where(t.sessions.c.userId == tg["id"]))
    audit(u, "user.reset_password", tg["id"])
    return {"tempPassword": temp}


# Hạn mức AI: người soạn xem được mức đã dùng, chỉ quản trị đổi hạn mức
@router.get("/settings/ai")
def ai_settings(u: AuthUser = Depends(require_editor)) -> dict:
    a = t.ai_usage.c
    quota = scalar(select(t.orgs.c.aiMonthlyTokens).where(t.orgs.c.id == u.org_id))
    by_feature = many(select(a.feature, func.sum(a.inputTokens + a.outputTokens).label("tokens"), func.count().label("calls"))
                      .where(a.orgId == u.org_id, a.createdAt >= month_start()).group_by(a.feature))
    return {"quota": quota, "used": month_usage(u.org_id), "byFeature": [{**r, "tokens": int(r["tokens"] or 0)} for r in by_feature]}


@router.patch("/settings/ai")
def set_quota(body: Quota, u: AuthUser = Depends(require_admin)) -> dict:
    db().execute(update(t.orgs).where(t.orgs.c.id == u.org_id).values(aiMonthlyTokens=body.quota))
    audit(u, "settings.ai_quota", u.org_id, {"quota": body.quota})
    return {"ok": True}


@router.get("/audit")
def audit_log(u: AuthUser = Depends(require_admin)) -> list[dict]:
    a = t.audit_logs.c
    return many(select(a.id, a.action, a.target, a.meta, a.createdAt.label("at"), _u.name.label("who"))
                .select_from(t.audit_logs.outerjoin(t.users, _u.id == a.userId)).where(a.orgId == u.org_id).order_by(a.createdAt.desc()).limit(100))
