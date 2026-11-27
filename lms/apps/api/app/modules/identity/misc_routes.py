"""Tiến độ job nền và danh mục kỹ năng."""
from typing import Annotated

from fastapi import Depends
from sqlalchemy import select

from app.shared import tables as t
from app.shared.auth import AuthUser, current_user
from app.shared.db import many, one
from app.shared.errors import must
from app.shared.http import TxRouter

router = TxRouter()
User = Annotated[AuthUser, Depends(current_user)]


@router.get("/jobs/{job_id}")
def job(job_id: str, u: User) -> dict:
    j = must(one(select(t.jobs).where(t.jobs.c.id == job_id, t.jobs.c.orgId == u.org_id)), "Việc")
    return {k: j[k] for k in ("id", "kind", "status", "progress", "message", "error", "result")}


@router.get("/skills")
def skills(u: User) -> list[dict]:
    s = t.skills.c
    return many(select(s.id, s.name, s.group).where(s.orgId == u.org_id).order_by(s.group, s.name))
