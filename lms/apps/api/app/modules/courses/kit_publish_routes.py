"""Xuất bản cả khóa và tạo đề kiểm tra riêng của khóa."""
from typing import Annotated

from fastapi import Depends
from pydantic import BaseModel, Field

from app.modules.courses.master import require_locked
from app.modules.courses.publish import has_unpublished_changes, publish_artifact
from app.modules.courses.service import create_artifact, get_kit, is_bank, kit_artifacts
from app.modules.courses.validate import publish_issues
from app.modules.exams.spec import ExamSpec, exam_plan
from app.shared.audit import audit
from app.shared.auth import AuthUser, require_editor
from app.shared.http import TxRouter
from app.shared.jobs import enqueue

router = TxRouter(dependencies=[Depends(require_editor)])
Editor = Annotated[AuthUser, Depends(require_editor)]


class PublishAll(BaseModel):
    note: str = Field("", max_length=500)
    ids: list[str] | None = Field(None, max_length=100)


@router.get("/{kit_id}/publish-status")
def publish_status(kit_id: str, u: Editor) -> dict:
    """Từng tài liệu xuất bản chưa, có thay đổi chưa xuất bản, có gì chặn"""
    k = get_kit(u.org_id, kit_id)
    return {"items": [{
        "id": a["id"], "type": a["type"], "title": a["title"], "status": a["status"], "publishedVersion": a["publishedVersion"],
        "changed": a["status"] != "generating" and has_unpublished_changes(a), "issues": publish_issues(a),
    } for a in kit_artifacts(k["id"]) if a["type"] != "master"]}


@router.post("/{kit_id}/publish-all")
def publish_all(kit_id: str, body: PublishAll, u: Editor) -> dict:
    """Xuất bản mọi tài liệu sẵn sàng và có thay đổi; tài liệu bị chặn thì báo lý do. Nội dung chốt riêng, không xuất bản cùng"""
    k = get_kit(u.org_id, kit_id)
    published: list[str] = []
    unchanged: list[str] = []
    skipped: list[dict] = []
    for a in kit_artifacts(k["id"]):
        if a["type"] == "master" or (body.ids is not None and a["id"] not in body.ids):
            continue
        issues = publish_issues(a)
        if issues["blocking"]:
            skipped.append({"id": a["id"], "title": a["title"], "reasons": issues["blocking"]})
        elif not has_unpublished_changes(a):
            unchanged.append(a["id"])
        else:
            publish_artifact(u, a, body.note or "Xuất bản cả khóa")
            published.append(a["id"])
    audit(u, "kit.publish_all", k["id"], {"published": len(published), "skipped": len(skipped)})
    return {"published": published, "unchanged": unchanged, "skipped": skipped}


@router.post("/{kit_id}/exams")
def create_exam(kit_id: str, body: ExamSpec, u: Editor) -> dict:
    """Đề kiểm tra riêng: AI soạn ngân hàng câu theo ma trận (chạy nền), từ nội dung đã chốt"""
    k = get_kit(u.org_id, kit_id)
    if not is_bank(k):
        require_locked(k["id"])
    a = create_artifact(k, exam_plan(k, body))
    job = enqueue(u.org_id, "exam.generate", {"artifactId": a["id"]}, u.id)
    audit(u, "exam.create", a["id"], {"matrix": [c.model_dump() for c in body.matrix] if body.matrix else None, "levels": body.levels})
    return {"id": a["id"], "jobId": job["id"]}
