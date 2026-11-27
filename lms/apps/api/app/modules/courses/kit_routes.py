"""Khóa học: tạo từ mục tiêu, chi tiết, dàn ý, soạn nội dung, thêm định dạng."""
from typing import Annotated, Literal

from fastapi import Depends
from pydantic import BaseModel, Field, StringConstraints
from sqlalchemy import delete, select, update

from app.modules.courses.drafts import suggest_plan_item
from app.modules.courses.master import MASTER_TITLE, master_from_qr, master_of, require_locked
from app.modules.courses.schemas import GenType
from app.modules.courses.service import brief_of, create_artifact, get_kit, kit_dto, list_kits, patch_kit
from app.modules.courses.source_changes import source_changes
from app.shared import tables as t
from app.shared.audit import audit
from app.shared.auth import AuthUser, require_editor
from app.shared.db import db, many, one
from app.shared.errors import bad_request, conflict
from app.shared.http import TxRouter
from app.shared.jobs import enqueue

router = TxRouter(dependencies=[Depends(require_editor)])
Editor = Annotated[AuthUser, Depends(require_editor)]
_k = t.kits.c
Line = Annotated[str, StringConstraints(max_length=500)]
GOAL_PREVIEW = 60


class PlanItem(BaseModel):
    type: GenType
    title: str = Field(max_length=200)
    summary: str = Field(max_length=2000)
    outline: dict | None = None


class Theme(BaseModel):
    """giao diện khóa: màu nhấn và bộ font"""
    accent: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    font: Literal["classic", "modern", "clean"]


class NewKit(BaseModel):
    goal: Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=5000)]
    sourceIds: list[str] = Field(default_factory=list, max_length=20)
    skillId: str | None = None
    level: int | None = Field(None, ge=1, le=3)


class PatchKit(BaseModel):
    title: str | None = Field(None, max_length=200)
    desc: str | None = Field(None, max_length=3000)
    audience: str | None = Field(None, max_length=3000)
    goals: list[Line] | None = Field(None, max_length=20)
    takeaways: list[Line] | None = Field(None, max_length=20)
    metrics: list[Line] | None = Field(None, max_length=20)
    practice: Literal["less", "balanced", "more"] | None = None
    skill: str | None = None
    level: int | None = Field(None, ge=1, le=3)
    plan: list[PlanItem] | None = Field(None, max_length=8)
    sourceIds: list[str] | None = Field(None, max_length=20)
    warnings: list[str] | None = None
    theme: Theme | None = None
    img: str | None = Field(None, max_length=300)


class PlanItemRequest(BaseModel):
    type: GenType
    instruction: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=5000)]


def _assert_skill(org_id: str, skill_id: str) -> None:
    if not one(select(t.skills.c.id).where(t.skills.c.id == skill_id, t.skills.c.orgId == org_id)):
        raise bad_request("Kỹ năng không tồn tại")


def _own_sources(org_id: str, ids: list[str]) -> list[str]:
    if not ids:
        return []
    return [r["id"] for r in many(select(t.sources.c.id).where(t.sources.c.orgId == org_id, t.sources.c.id.in_(ids)))]


@router.get("")
def kits(u: Editor) -> list[dict]:
    return list_kits(u.org_id)


@router.get("/{kit_id}")
def kit(kit_id: str, u: Editor) -> dict:
    return kit_dto(get_kit(u.org_id, kit_id))


@router.post("")
def create(body: NewKit, u: Editor) -> dict:
    """Tạo khóa từ mô tả mục tiêu + tài liệu nguồn: AI soạn chi tiết ở job nền"""
    if body.skillId:
        _assert_skill(u.org_id, body.skillId)
    k = one(t.kits.insert().values(orgId=u.org_id, title=body.goal[:GOAL_PREVIEW], goal=body.goal, sourceIds=_own_sources(u.org_id, body.sourceIds), createdBy=u.id,
                                   skillId=body.skillId, level=body.level, details={"goalText": body.goal, "plan": []}).returning(t.kits))
    job = enqueue(u.org_id, "kit.draft", {"kitId": k["id"]}, u.id)
    patch_kit(k["id"], details={"job": job["id"]})
    audit(u, "kit.create", k["id"])
    return {"id": k["id"], "jobId": job["id"]}


@router.patch("/{kit_id}")
def patch(kit_id: str, body: PatchKit, u: Editor) -> dict:
    k = get_kit(u.org_id, kit_id)
    b = body.model_dump(exclude_unset=True)
    if b.get("skill") == "":
        b["skill"] = None
    if b.get("skill"):
        _assert_skill(u.org_id, b["skill"])
    values: dict = {"sourceIds": _own_sources(u.org_id, b["sourceIds"]) if b.get("sourceIds") is not None else k["sourceIds"]}
    for key, col in (("title", "title"), ("desc", "goal"), ("skill", "skillId"), ("img", "img"), ("level", "level")):
        if key in b and (b[key] is not None or key == "skill"):
            values[col] = b[key]
    details = {key: b[key] for key in ("theme", "audience", "goals", "takeaways", "metrics", "practice", "plan", "warnings") if b.get(key) is not None}
    patch_kit(k["id"], values, details)
    return kit_dto(get_kit(u.org_id, k["id"]))


@router.get("/{kit_id}/source-changes")
def changes(kit_id: str, u: Editor) -> list[dict]:
    return source_changes(get_kit(u.org_id, kit_id)["id"])


@router.delete("/{kit_id}")
def remove(kit_id: str, u: Editor) -> dict:
    k = get_kit(u.org_id, kit_id)
    db().execute(delete(t.kits).where(_k.id == k["id"]))
    audit(u, "kit.delete", k["id"], {"title": k["title"]})
    return {"ok": True}


@router.post("/{kit_id}/outline")
def outline(kit_id: str, u: Editor) -> dict:
    k = get_kit(u.org_id, kit_id)
    if not (k["details"] or {}).get("plan"):
        raise bad_request("Kế hoạch chưa có tài liệu nào")
    job = enqueue(u.org_id, "kit.outline", {"kitId": k["id"]}, u.id)
    patch_kit(k["id"], details={"job": job["id"]})
    return {"jobId": job["id"]}


@router.post("/{kit_id}/plan-item")
def plan_item(kit_id: str, body: PlanItemRequest, u: Editor) -> dict:
    """AI đặt tên và mục đích cho tài liệu người soạn muốn thêm"""
    k = get_kit(u.org_id, kit_id)
    return {"type": body.type, **suggest_plan_item(u.org_id, brief_of(k), body.type, body.instruction)}


@router.post("/{kit_id}/master")
def create_master(kit_id: str, u: Editor) -> dict:
    """Khóa tạo trước khi có bước nội dung: tạo nội dung (bản nháp) từ Tài liệu nhanh đang có, không có thì tạo bản trống"""
    k = get_kit(u.org_id, kit_id)
    if master_of(k["id"]):
        raise conflict("Khóa đã có nội dung")
    qr = one(select(t.artifacts).where(t.artifacts.c.kitId == k["id"], t.artifacts.c.type == "qr").limit(1))
    a = create_artifact(k, {"type": "master", "title": MASTER_TITLE, "summary": k["goal"]}, "draft", master_from_qr(qr["content"]) if qr else {"lessons": []})
    audit(u, "master.create", a["id"], {"from": qr["id"] if qr else None})
    return {"id": a["id"]}


@router.post("/{kit_id}/generate")
def generate(kit_id: str, u: Editor) -> dict:
    """Soạn nội dung theo dàn ý (mỗi tài liệu một job)"""
    k = get_kit(u.org_id, kit_id)
    # khóa nguyên tử: hai lần bấm cùng lúc chỉ một lần được tạo
    locked = one(update(t.kits).where(_k.id == k["id"], _k.stage.in_(["details", "outline"])).values(stage="generating", updatedAt=t.func_now()).returning(_k.id))
    if not locked:
        raise conflict("Khóa này đã được tạo nội dung")
    plan = (k["details"] or {}).get("plan") or []
    if not plan:
        raise bad_request("Kế hoạch chưa có tài liệu nào")
    ids = []
    for p in plan:
        a = create_artifact(k, p)
        enqueue(u.org_id, "artifact.generate", {"artifactId": a["id"]}, u.id)
        ids.append(a["id"])
    patch_kit(k["id"], {"stage": "ready"})
    audit(u, "kit.generate", k["id"], {"artifacts": len(ids)})
    return {"artifactIds": ids}


@router.post("/{kit_id}/artifacts")
def add_format(kit_id: str, body: PlanItem, u: Editor) -> dict:
    """Thêm định dạng cho người học: AI soạn ngay từ nội dung đã chốt"""
    k = get_kit(u.org_id, kit_id)
    require_locked(k["id"])
    a = create_artifact(k, body.model_dump(exclude_none=True))
    job = enqueue(u.org_id, "artifact.generate", {"artifactId": a["id"]}, u.id)
    return {"id": a["id"], "jobId": job["id"]}
