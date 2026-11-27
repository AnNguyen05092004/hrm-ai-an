from app.shared import tables as t
from app.shared.auth import AuthUser
from app.shared.db import db


def audit(u: AuthUser, action: str, target: str = "", meta: dict | None = None) -> None:
    db().execute(t.audit_logs.insert().values(orgId=u.org_id, userId=u.id, action=action, target=target, meta=meta or {}))
