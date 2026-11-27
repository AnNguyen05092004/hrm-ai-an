import re

from fastapi import Depends, File, UploadFile
from sqlalchemy import delete, select, update

from app.adapters.extract import kind_of
from app.modules.sources.service import LIST_COLS, file_key, list_sources
from app.shared import tables as t
from app.shared.audit import audit
from app.shared.auth import AuthUser, require_editor
from app.shared.db import db, many, one
from app.shared.errors import bad_request, must
from app.shared.http import TxRouter
from app.shared.jobs import enqueue
from app.shared.storage import put_file

router = TxRouter(dependencies=[Depends(require_editor)])
MAX_UPLOAD = 25 * 1024 * 1024
_s, _ch = t.sources.c, t.source_chunks.c


@router.get("")
def sources(u: AuthUser = Depends(require_editor)) -> list[dict]:
    return list_sources(u.org_id)


@router.get("/{source_id}")
def source(source_id: str, u: AuthUser = Depends(require_editor)) -> dict:
    s = must(one(select(*LIST_COLS).where(_s.id == source_id, _s.orgId == u.org_id)), "Tài liệu")
    chunks = many(select(_ch.id, _ch.section, _ch.text).where(_ch.sourceId == s["id"], _ch.version == s["version"]).order_by(_ch.ord))
    return {**s, "chunks": chunks}


@router.post("")
def upload(file: UploadFile | None = File(None), replace: str | None = None, u: AuthUser = Depends(require_editor)) -> dict:
    """Tải tài liệu mới, hoặc bản mới của tài liệu đã có (?replace=<id>)"""
    if file is None:
        raise bad_request("Chưa chọn tệp")
    kind = kind_of(file.filename or "", file.content_type or "")
    buf = file.file.read(MAX_UPLOAD + 1)
    if len(buf) > MAX_UPLOAD:
        raise bad_request("Tệp tối đa 25 MB")
    if not buf:
        raise bad_request("Tệp rỗng")
    name = re.sub(r"[\\/]", "_", file.filename or "tai-lieu")[:160]
    if replace:
        old = must(one(select(t.sources).where(_s.id == replace, _s.orgId == u.org_id)), "Tài liệu")
        src = one(update(t.sources).where(_s.id == old["id"]).values(version=old["version"] + 1, name=name, mime=f"application/{kind}", status="processing", error=None,
                                                                    updatedAt=t.func_now()).returning(t.sources))
    else:
        src = one(t.sources.insert().values(orgId=u.org_id, name=name, mime=f"application/{kind}", uploadedBy=u.id).returning(t.sources))
    put_file(file_key(src), buf)
    job = enqueue(u.org_id, "source.process", {"sourceId": src["id"], "previousVersion": src["version"] - 1 if replace else None}, u.id)
    audit(u, "source.new_version" if replace else "source.upload", src["id"], {"name": name, "version": src["version"]})
    return {"source": {k: src[k] for k in ("id", "name", "version", "status")}, "jobId": job["id"]}


@router.delete("/{source_id}")
def remove(source_id: str, u: AuthUser = Depends(require_editor)) -> dict:
    db().execute(delete(t.sources).where(_s.id == source_id, _s.orgId == u.org_id))
    return {"ok": True}
