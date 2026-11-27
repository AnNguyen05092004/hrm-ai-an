"""Chuông thông báo (góc trên bên phải): danh sách mới nhất, số chưa đọc, đánh dấu đã đọc."""
from typing import Annotated

from fastapi import Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update

from app.shared import tables as t
from app.shared.auth import AuthUser, current_user
from app.shared.db import db, many, scalar
from app.shared.http import TxRouter

router = TxRouter()
User = Annotated[AuthUser, Depends(current_user)]
LIST_LIMIT = 30
_n = t.notifications.c


class MarkRead(BaseModel):
    ids: list[str] | None = Field(None, max_length=100)


@router.get("")
def notifications(u: User) -> dict:
    rows = many(select(_n.id, _n.kind, _n.title, _n.body, _n.link, _n.grouped, _n.readAt, _n.createdAt).where(_n.userId == u.id).order_by(_n.createdAt.desc()).limit(LIST_LIMIT))
    unread = scalar(select(func.count()).select_from(t.notifications).where(_n.userId == u.id, _n.readAt.is_(None)))
    return {"unread": unread, "items": [{"id": r["id"], "kind": r["kind"], "title": r["title"], "body": r["body"], "link": r["link"],
                                         "count": r["grouped"], "read": r["readAt"] is not None, "at": r["createdAt"]} for r in rows]}


@router.post("/read")
def mark_read(body: MarkRead, u: User) -> dict:
    """Không gửi ids thì đánh dấu đã đọc tất cả"""
    q = update(t.notifications).where(_n.userId == u.id, _n.readAt.is_(None))
    if body.ids is not None:
        q = q.where(_n.id.in_(body.ids))
    db().execute(q.values(readAt=func.now()))
    return {"ok": True}
