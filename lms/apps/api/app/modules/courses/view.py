"""Xem nội dung tài liệu: người soạn xem trước bản nháp, reviewer xem bản đang review, gói xuất dùng bản đã xuất bản."""
from fastapi import Depends
from sqlalchemy import select

from app.modules.courses.publish import version_of
from app.modules.courses.service import theme_of
from app.shared import tables as t
from app.shared.auth import AuthUser, current_user
from app.shared.db import one
from app.shared.errors import forbidden, must
from app.shared.http import TxRouter

router = TxRouter()
_a, _r = t.artifacts.c, t.kit_reviews.c


def is_reviewer_of(u: AuthUser, kit_id: str) -> bool:
    """Reviewer được mời vào khóa này chưa"""
    if u.role != "reviewer":
        return False
    return one(select(_r.id).where(_r.kitId == kit_id, _r.reviewerId == u.id, _r.orgId == u.org_id)) is not None


def viewable(u: AuthUser, artifact_id: str) -> dict:
    """Người soạn xem mọi tài liệu trong tổ chức; reviewer chỉ xem tài liệu của khóa mình được mời"""
    a = must(one(select(t.artifacts).where(_a.id == artifact_id, _a.orgId == u.org_id)), "Tài liệu")
    if not (u.can_edit or is_reviewer_of(u, a["kitId"])):
        raise forbidden("Bạn chưa được mời review khóa này")
    return a


def published_content(a: dict, version: int | None = None) -> dict:
    """Nội dung một bản đã xuất bản (mặc định bản mới nhất); dùng cho gói xuất"""
    v = version_of(a["id"], version if version is not None else a["publishedVersion"])
    if not v:
        raise forbidden("Tài liệu chưa được xuất bản")
    return {"title": v["title"], "summary": v["summary"], "version": v["version"], "content": v["content"]}


def learner_view(content: dict) -> dict:
    """Nội dung người học thấy: bỏ dàn ý, chỗ thiếu căn cứ, mã trích nguồn; đề chỉ còn cấu hình, không lộ câu hỏi và đáp án"""
    rest = {k: v for k, v in content.items() if k not in ("plan", "quiz")}
    out = dict(rest)
    if "lessons" in rest and rest["lessons"] is not None:
        out["lessons"] = [
            {**lesson, "blocks": [{k: v for k, v in b.items() if k not in ("srcRef", "nosrc")} for b in lesson.get("blocks") or [] if b.get("t") != "gap"]}
            if lesson.get("kind") == "lesson" else lesson
            for lesson in rest["lessons"]
        ]
    quiz = content.get("quiz")
    if quiz:
        approved = sum(1 for q in quiz.get("questions") or [] if q.get("approved"))
        pick = quiz.get("pick")
        out["quiz"] = {"mode": quiz.get("mode"), "level": quiz.get("level"), "skill": quiz.get("skill"), "passScore": quiz.get("passScore"), "attempts": quiz.get("attempts"),
                       "minutes": quiz.get("minutes"), "pick": min(pick if pick is not None else approved, approved), "bank": approved}
    return out


@router.get("/{artifact_id}")
def view(artifact_id: str, u: AuthUser = Depends(current_user)) -> dict:
    """Bản nháp hiện tại như người học sẽ thấy, kèm câu hỏi và đáp án để người soạn/reviewer kiểm tra"""
    a = viewable(u, artifact_id)
    c = a["content"] or {}
    k = one(select(t.kits.c.title, t.kits.c.details).where(t.kits.c.id == a["kitId"]))
    return {
        "id": a["id"], "type": a["type"], "img": a["img"], "kitId": a["kitId"], "kitTitle": k["title"] if k else None, "theme": theme_of(k) if k else None,
        "title": a["title"], "summary": a["summary"], "status": a["status"], "publishedVersion": a["publishedVersion"], "draft": True,
        **learner_view(c), "questions": (c.get("quiz") or {}).get("questions") or [],
    }
