"""Đăng nhập, đăng xuất, người dùng hiện tại; bản demo đổi vai không cần mật khẩu (tắt ở production)."""
from typing import Annotated

from fastapi import Depends, Request, Response
from pydantic import BaseModel, StringConstraints
from sqlalchemy import select

from app.config import demo_mode
from app.modules.identity.demo_accounts import DEMO_ACCOUNTS
from app.shared import tables as t
from app.shared.auth import COOKIE, AuthUser, check_password, create_session, current_user, destroy_session, set_session_cookie
from app.shared.db import db, many, one
from app.shared.errors import AppError, not_found
from app.shared.http import TxRouter
from app.shared.validation import Email

router = TxRouter()


class Login(BaseModel):
    email: Email
    password: Annotated[str, StringConstraints(min_length=1, max_length=200)]


class Demo(BaseModel):
    email: Email | None = None


@router.post("/login")
def login(body: Login, response: Response) -> dict:
    u = one(select(t.users).where(t.users.c.email == body.email.lower()))
    ok = bool(u and u["passwordHash"] and u["active"] and check_password(body.password, u["passwordHash"]))
    if not u or not ok:
        raise AppError(401, "bad_credentials", "Email hoặc mật khẩu không đúng")
    token, exp = create_session(db(), u["id"])
    set_session_cookie(response, token, exp)
    return {"id": u["id"]}


def _demo_users() -> list[dict]:
    if not demo_mode():
        raise not_found("Không có bản demo")
    c = t.users.c
    rows = many(select(c.id, c.email, c.name, c.title, c.role, c.color, c.active).where(c.email.in_([d["email"] for d in DEMO_ACCOUNTS])))
    out = []
    for d in DEMO_ACCOUNTS:
        u = next((r for r in rows if r["email"] == d["email"] and r["active"]), None)
        if u:
            out.append({k: v for k, v in u.items() if k != "active"} | {"label": d["label"]})
    return out


@router.get("/demo")
def demo_list() -> list[dict]:
    return _demo_users()


@router.post("/demo")
def demo_switch(body: Demo, request: Request, response: Response) -> dict:
    users = _demo_users()
    u = next((x for x in users if x["email"] == body.email), None) if body.email else (users[0] if users else None)
    if not u:
        raise AppError(400, "not_demo", "Tài khoản này không thuộc bản demo")
    old = request.cookies.get(COOKIE)
    if old:
        destroy_session(db(), old)
    token, exp = create_session(db(), u["id"])
    set_session_cookie(response, token, exp)
    return {"id": u["id"], "role": u["role"]}


@router.post("/logout")
def logout(request: Request, response: Response) -> dict:
    tok = request.cookies.get(COOKIE)
    if tok:
        destroy_session(db(), tok)
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
def me(u: AuthUser = Depends(current_user)) -> dict:
    c = t.users.c
    row = one(select(c.id, c.name, c.email, c.role, c.title, c.color, t.orgs.c.name.label("orgName"))
              .select_from(t.users.join(t.orgs, t.orgs.c.id == c.orgId)).where(c.id == u.id))
    return {**(row or {}), "demo": demo_mode()}
