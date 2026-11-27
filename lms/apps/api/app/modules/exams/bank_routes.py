"""Kho đề: mọi đề kiểm tra của công ty ở một chỗ. Tạo đề từ một khóa học (ra đề từ nội dung đã chốt của khóa)
hoặc thẳng từ tài liệu nguồn (đề đứng riêng, nằm trong một khóa ẩn chỉ chứa đề đó để dùng chung luồng soạn, review, xuất)."""
from typing import Annotated, Literal

from fastapi import Body, Depends
from pydantic import Field, StringConstraints
from sqlalchemy import select

from app.modules.courses.master import require_locked
from app.modules.courses.service import artifact_meta, create_artifact, get_kit, is_bank
from app.modules.exams.spec import ExamSpec, check_matrix, exam_plan
from app.shared import tables as t
from app.shared.audit import audit
from app.shared.auth import AuthUser, require_editor
from app.shared.db import many, one
from app.shared.errors import bad_request
from app.shared.http import TxRouter
from app.shared.jobs import enqueue
from app.shared.validation import Id

router = TxRouter(dependencies=[Depends(require_editor)])
Editor = Annotated[AuthUser, Depends(require_editor)]
_a, _k, _s = t.artifacts.c, t.kits.c, t.sources.c


class FromKit(ExamSpec):
    from_: Literal["kit"] = Field(alias="from")
    kitId: Id


class FromSources(ExamSpec):
    from_: Literal["sources"] = Field(alias="from")
    sourceIds: list[Id] = Field(min_length=1, max_length=20)
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=200)]


NewExam = Annotated[FromKit | FromSources, Field(discriminator="from_")]


@router.get("")
def exams(u: Editor) -> list[dict]:
    rows = many(select(t.artifacts, _k.title.label("kitTitle"), _k.details.label("kitDetails"), _k.sourceIds.label("kitSources"))
                .select_from(t.artifacts.join(t.kits, _k.id == _a.kitId)).where(_a.orgId == u.org_id, _a.type == "exam").order_by(_a.updatedAt.desc()))
    bank_ids = {sid for r in rows if is_bank({"details": r["kitDetails"]}) for sid in r["kitSources"]}
    names = {s["id"]: s["name"] for s in many(select(_s.id, _s.name).where(_s.id.in_(bank_ids)))} if bank_ids else {}
    out = []
    for r in rows:
        qs = ((r["content"] or {}).get("quiz") or {}).get("questions") or []
        bank = is_bank({"details": r["kitDetails"]})
        origin = {"kind": "sources", "names": [names[x] for x in r["kitSources"] if x in names]} if bank else {"kind": "kit", "kitId": r["kitId"], "title": r["kitTitle"]}
        out.append({**artifact_meta(r), "questions": len(qs), "approved": sum(1 for q in qs if q.get("approved")), "origin": origin})
    return out


@router.post("")
def create(u: Editor, body: NewExam = Body(...)) -> dict:
    check_matrix(body)
    if isinstance(body, FromKit):
        kit = get_kit(u.org_id, body.kitId)
        if is_bank(kit):
            raise bad_request("Chọn một khóa học")
        require_locked(kit["id"])
    else:
        ids = [r["id"] for r in many(select(_s.id).where(_s.orgId == u.org_id, _s.status == "ready", _s.id.in_(body.sourceIds)))]
        if not ids:
            raise bad_request("Chọn ít nhất một tài liệu nguồn đã xử lý xong")
        kit = one(t.kits.insert().values(orgId=u.org_id, title=body.title, goal=body.focus or body.title, sourceIds=ids, createdBy=u.id, stage="ready", img="desk",
                                         details={"bank": True}).returning(t.kits))
    spec = ExamSpec.model_validate(body.model_dump(include=set(ExamSpec.model_fields)))
    a = create_artifact(kit, exam_plan(kit, spec))
    job = enqueue(u.org_id, "exam.generate", {"artifactId": a["id"]}, u.id)
    audit(u, "exam.create", a["id"], {"from": body.from_, "matrix": [c.model_dump() for c in body.matrix] if body.matrix else None, "levels": body.levels})
    return {"id": a["id"], "kitId": kit["id"], "jobId": job["id"]}
