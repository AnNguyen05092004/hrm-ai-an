"""Tài liệu (nội dung và các định dạng): lưu tự động, xuất bản, phiên bản, sửa bằng AI, soạn lại."""
import json
from typing import Annotated, Literal

from fastapi import Depends
from pydantic import BaseModel, Field, StringConstraints
from sqlalchemy import delete, select

from app.modules.courses.ai_edit import ai_block, ai_edit_block, ai_lesson, generate_questions
from app.modules.courses.master import locked_master, master_hits, require_locked
from app.modules.courses.publish import publish_artifact
from app.modules.courses.schemas import QuestionType
from app.modules.courses.service import artifact_dto, artifact_meta, get_artifact, get_kit, is_bank, set_artifact
from app.modules.courses.validate import publish_issues
from app.shared import tables as t
from app.shared.audit import audit
from app.shared.auth import AuthUser, require_editor
from app.shared.db import db, many, one
from app.shared.errors import bad_request, conflict, must
from app.shared.http import TxRouter
from app.shared.jobs import enqueue

router = TxRouter(dependencies=[Depends(require_editor)])
Editor = Annotated[AuthUser, Depends(require_editor)]
MAX_CONTENT = 2_000_000
_a, _v = t.artifacts.c, t.artifact_versions.c


class PatchArtifact(BaseModel):
    title: str | None = Field(None, max_length=300)
    summary: str | None = Field(None, max_length=3000)
    img: str | None = Field(None, max_length=40)
    content: dict | None = None


class Note(BaseModel):
    note: str = Field("", max_length=500)


class AiEdit(BaseModel):
    kind: Literal["block", "slide", "question", "lesson"]
    value: dict
    instruction: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=2000)]


class AiBlock(BaseModel):
    instruction: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=1000)]


class GenQuestions(BaseModel):
    level: int = Field(ge=1, le=3)
    count: int = Field(ge=1, le=10)
    focus: str = Field("", max_length=300)
    types: list[QuestionType] | None = Field(None, max_length=9)


class GenLesson(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=200)]
    instruction: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] = ""


class Regenerate(BaseModel):
    force: bool = False


@router.get("")
def artifacts(u: Editor) -> list[dict]:
    return [artifact_meta(a) for a in many(select(t.artifacts).where(_a.orgId == u.org_id).order_by(_a.updatedAt.desc()))]


@router.get("/{artifact_id}")
def artifact(artifact_id: str, u: Editor) -> dict:
    return artifact_dto(get_artifact(u.org_id, artifact_id))


@router.patch("/{artifact_id}")
def save(artifact_id: str, body: PatchArtifact, u: Editor) -> dict:
    """Lưu tự động từ màn soạn: tên, tóm tắt, ảnh và toàn bộ cây nội dung"""
    a = get_artifact(u.org_id, artifact_id)
    if a["status"] == "generating":
        raise bad_request("Tài liệu đang được AI soạn, chờ xong rồi sửa")
    b = body.model_dump(exclude_unset=True, exclude_none=True)
    content = b.pop("content", None)
    if content is not None and len(json.dumps(content, ensure_ascii=False)) > MAX_CONTENT:
        raise bad_request("Nội dung quá lớn")
    if content is not None:
        # plan và render do server quản lý, không để bản lưu từ trình duyệt ghi đè
        old = a["content"] or {}
        keep = {k: old[k] for k in ("plan", "render") if old.get(k) is not None}
        content = {**content, **keep}
        b["content"] = content
    r = set_artifact(a["id"], **b)
    return {"ok": True, "updated": artifact_meta(r)["updated"]}


@router.delete("/{artifact_id}")
def remove(artifact_id: str, u: Editor) -> dict:
    a = get_artifact(u.org_id, artifact_id)
    k = get_kit(u.org_id, a["kitId"])
    # đề trong kho đề tạo từ tài liệu nằm trong khóa ẩn riêng: xóa đề thì xóa luôn khóa ẩn
    if is_bank(k):
        db().execute(delete(t.kits).where(t.kits.c.id == k["id"]))
    else:
        db().execute(delete(t.artifacts).where(_a.id == a["id"]))
    audit(u, "artifact.delete", a["id"], {"title": a["title"]})
    return {"ok": True}


@router.get("/{artifact_id}/check")
def check(artifact_id: str, u: Editor) -> dict:
    return publish_issues(get_artifact(u.org_id, artifact_id))


@router.post("/{artifact_id}/publish")
def publish(artifact_id: str, body: Note, u: Editor) -> dict:
    """Xuất bản: chụp bản hiện tại thành phiên bản mới; gói xuất (SCORM, đề QTI) dùng bản này"""
    return artifact_meta(publish_artifact(u, get_artifact(u.org_id, artifact_id), body.note))


@router.post("/{artifact_id}/unpublish")
def unpublish(artifact_id: str, u: Editor) -> dict:
    a = get_artifact(u.org_id, artifact_id)
    r = set_artifact(a["id"], status="draft", publishedVersion=None)
    audit(u, "artifact.unpublish", a["id"])
    return artifact_meta(r)


@router.get("/{artifact_id}/versions")
def versions(artifact_id: str, u: Editor) -> list[dict]:
    a = get_artifact(u.org_id, artifact_id)
    return many(select(_v.version, _v.note, _v.createdAt, t.users.c.name.label("by")).select_from(t.artifact_versions.outerjoin(t.users, t.users.c.id == _v.publishedBy))
                .where(_v.artifactId == a["id"]).order_by(_v.version.desc()))


@router.post("/{artifact_id}/versions/{v}/restore")
def restore(artifact_id: str, v: int, u: Editor) -> dict:
    """Khôi phục nội dung một phiên bản cũ vào bản nháp"""
    a = get_artifact(u.org_id, artifact_id)
    ver = must(one(select(t.artifact_versions).where(_v.artifactId == a["id"], _v.version == v)), "Phiên bản")
    set_artifact(a["id"], title=ver["title"], summary=ver["summary"], content=ver["content"])
    return {"ok": True}


@router.post("/{artifact_id}/ai-edit")
def ai_edit(artifact_id: str, body: AiEdit, u: Editor) -> dict:
    """Sửa bằng AI một khối / slide / câu hỏi"""
    a = get_artifact(u.org_id, artifact_id)
    k = get_kit(u.org_id, a["kitId"])
    return ai_edit_block(u.org_id, k["sourceIds"], body.kind, body.value, body.instruction)


@router.post("/{artifact_id}/ai-block")
def new_block(artifact_id: str, body: AiBlock, u: Editor) -> dict:
    a = get_artifact(u.org_id, artifact_id)
    return ai_block(get_kit(u.org_id, a["kitId"]), body.instruction)


@router.post("/{artifact_id}/questions/generate")
def new_questions(artifact_id: str, body: GenQuestions, u: Editor) -> dict:
    a = get_artifact(u.org_id, artifact_id)
    existing = [q.get("q") for q in ((a["content"] or {}).get("quiz") or {}).get("questions") or []]
    # căn cứ ra câu hỏi: nội dung đã chốt nếu có, không thì tài liệu nguồn
    m = locked_master(a["kitId"])
    qs = generate_questions(get_kit(u.org_id, a["kitId"]), body.level, body.count, body.focus, existing, body.types, master_hits(m.content) if m else None)
    return {"questions": qs}


@router.post("/{artifact_id}/lessons/generate")
def new_lesson(artifact_id: str, body: GenLesson, u: Editor) -> dict:
    """AI soạn thêm một bài học: nội dung soạn từ tài liệu nguồn; Tài liệu nhanh soạn từ nội dung đã chốt"""
    a = get_artifact(u.org_id, artifact_id)
    if a["type"] not in ("master", "qr"):
        raise bad_request("Chỉ thêm bài học cho Nội dung hoặc Tài liệu nhanh")
    return {"lesson": ai_lesson(get_kit(u.org_id, a["kitId"]), a["type"], body.title, body.instruction)}


@router.post("/{artifact_id}/regenerate")
def regenerate(artifact_id: str, u: Editor, body: Regenerate | None = None) -> dict:
    """Tạo lại nội dung: khi soạn lỗi, hoặc soạn lại theo nội dung mới chốt (force: thay bản nháp; bản đã xuất bản giữ nguyên tới khi xuất bản lại)"""
    force = bool(body and body.force)
    a = get_artifact(u.org_id, artifact_id)
    if a["status"] == "generating":
        raise conflict("AI đang soạn tài liệu này")
    if a["publishedVersion"] and not force:
        raise bad_request('Tài liệu đã xuất bản. Sửa trực tiếp hoặc dùng "Sửa bằng AI" cho từng phần.')
    if a["type"] != "master":
        require_locked(a["kitId"])
    audit(u, "artifact.regenerate", a["id"])
    set_artifact(a["id"], status="generating")
    job = enqueue(u.org_id, "exam.generate" if a["type"] == "exam" else "artifact.generate", {"artifactId": a["id"]}, u.id)
    return {"jobId": job["id"]}
