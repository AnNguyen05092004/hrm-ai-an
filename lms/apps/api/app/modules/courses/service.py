"""Khóa học và tài liệu: đọc, tạo, dạng dữ liệu trả cho web."""
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select, update

from app.adapters.ai import embed
from app.modules.courses.drafts import KitBrief
from app.modules.sources.service import Hit, search_by_vector
from app.shared import tables as t
from app.shared.db import db, many, one
from app.shared.errors import must

VN = ZoneInfo("Asia/Ho_Chi_Minh")
IMG_OF = {"master": "notes", "qr": "office", "deck": "desk", "scenario": "person", "video": "video", "guide": "screen", "exam": "desk"}
_k, _a, _s = t.kits.c, t.artifacts.c, t.sources.c


def opt(d: dict, key: str, default: object) -> object:
    """Giống `d[key] ?? default` của JS"""
    v = d.get(key)
    return default if v is None else v


def fmt(d: datetime) -> str:
    """Giống toLocaleString('vi-VN') của bản Node: "10:05 27/11/2026" """
    return d.astimezone(VN).strftime("%H:%M %d/%m/%Y")


def get_kit(org_id: str, kit_id: str) -> dict:
    return must(one(select(t.kits).where(_k.id == kit_id, _k.orgId == org_id)), "Khóa học")


def is_bank(k: dict) -> bool:
    """Khóa ẩn chứa một đề trong Kho đề tạo thẳng từ tài liệu nguồn (không phải khóa học)"""
    return bool((k.get("details") or {}).get("bank"))


def theme_of(k: dict) -> dict | None:
    """Giao diện khóa (màu nhấn, font) lưu trong details"""
    return (k.get("details") or {}).get("theme")


def artifact_meta(a: dict) -> dict:
    """Bản tóm tắt tài liệu cho danh sách (không gồm nội dung). basedOn: phiên bản nội dung mà định dạng được soạn từ đó"""
    based_on = ((a["content"] or {}).get("plan") or {}).get("basedOn")
    return {"id": a["id"], "kitId": a["kitId"], "type": a["type"], "title": a["title"], "summary": a["summary"], "status": a["status"], "img": a["img"],
            "publishedVersion": a["publishedVersion"], "basedOn": based_on, "updated": fmt(a["updatedAt"]), "updatedAt": a["updatedAt"]}


def artifact_dto(a: dict) -> dict:
    """Tài liệu đầy đủ cho màn soạn: nội dung trải phẳng"""
    return {**(a["content"] or {}), **artifact_meta(a)}


def kit_artifacts(kit_id: str) -> list[dict]:
    return many(select(t.artifacts).where(_a.kitId == kit_id).order_by(_a.createdAt))


def kit_dto(k: dict) -> dict:
    from app.modules.courses.publish import has_unpublished_changes
    d = k["details"] or {}
    arts = kit_artifacts(k["id"])
    srcs = many(select(_s.id, _s.name, _s.version, _s.status, _s.sensitive).where(_s.id.in_(k["sourceIds"]))) if k["sourceIds"] else []
    master = next((a for a in arts if a["type"] == "master"), None)
    return {
        "id": k["id"], "title": k["title"], "desc": k["goal"], "goalText": opt(d, "goalText", ""), "audience": opt(d, "audience", ""), "goals": opt(d, "goals", []),
        "takeaways": opt(d, "takeaways", []), "metrics": opt(d, "metrics", []), "practice": opt(d, "practice", "balanced"), "plan": opt(d, "plan", []), "warnings": opt(d, "warnings", []),
        "skill": k["skillId"], "level": k["level"], "stage": k["stage"], "img": k["img"], "updated": fmt(k["updatedAt"]), "updatedAt": k["updatedAt"],
        "sources": srcs, "sourceIds": k["sourceIds"], "artifacts": [artifact_meta(a) for a in arts], "job": d.get("job"), "theme": d.get("theme"), "bank": is_bank(k),
        # nội dung: đã chốt phiên bản nào, bản nháp có thay đổi chưa chốt không
        "master": {"id": master["id"], "status": master["status"], "lockedVersion": master["publishedVersion"],
                   "changed": master["status"] != "generating" and has_unpublished_changes(master)} if master else None,
    }


def review_summaries(org_id: str) -> dict[str, dict]:
    """Tình trạng review của khóa: số người được mời theo từng trạng thái, số góp ý chưa xử lý"""
    r, c = t.kit_reviews.c, t.review_comments.c
    out: dict[str, dict] = {}

    def of(kid: str) -> dict:
        return out.setdefault(kid, {"total": 0, "pending": 0, "approved": 0, "changes": 0, "open": 0})

    for row in many(select(r.kitId, r.status).where(r.orgId == org_id)):
        x = of(row["kitId"])
        x["total"] += 1
        x[row["status"]] += 1
    for row in many(select(c.kitId).where(c.orgId == org_id, c.resolvedAt.is_(None), c.parentId.is_(None))):
        of(row["kitId"])["open"] += 1
    return out


def list_kits(org_id: str) -> list[dict]:
    kits = many(select(t.kits, t.users.c.name.label("by")).select_from(t.kits.outerjoin(t.users, t.users.c.id == _k.createdBy))
                .where(_k.orgId == org_id).order_by(_k.updatedAt.desc()))
    arts = many(select(t.artifacts).where(_a.orgId == org_id).order_by(_a.createdAt))
    reviews = review_summaries(org_id)
    return [{
        "id": k["id"], "title": k["title"], "desc": k["goal"], "skill": k["skillId"], "level": k["level"], "stage": k["stage"], "img": k["img"], "createdBy": k["by"] or "",
        "updated": fmt(k["updatedAt"]), "updatedAt": k["updatedAt"], "artifacts": [artifact_meta(a) for a in arts if a["kitId"] == k["id"]], "review": reviews.get(k["id"]),
    } for k in kits if not is_bank(k)]


def _skill_name(org_id: str, skill_id: str | None) -> str:
    if not skill_id:
        return "chưa chọn"
    s = one(select(t.skills.c.name).where(t.skills.c.id == skill_id, t.skills.c.orgId == org_id))
    return s["name"] if s else skill_id


def brief_of(k: dict) -> KitBrief:
    d = k["details"] or {}
    return KitBrief(title=k["title"], goal=k["goal"], audience=opt(d, "audience", ""), goals=opt(d, "goals", []), takeaways=opt(d, "takeaways", []), metrics=opt(d, "metrics", []),
                    skillName=_skill_name(k["orgId"], k["skillId"]), level=k["level"] or 1, practice=opt(d, "practice", "balanced"))


def patch_kit(kit_id: str, values: dict | None = None, details: dict | None = None) -> None:
    """Cập nhật cột của khóa và gộp thêm vào details (đọc lại details mới nhất để không ghi đè thay đổi khác)"""
    changes = dict(values or {})
    if details:
        cur = one(select(_k.details).where(_k.id == kit_id))
        changes["details"] = {**((cur or {}).get("details") or {}), **details}
    db().execute(update(t.kits).where(_k.id == kit_id).values(**changes, updatedAt=t.func_now()))


def gather(org_id: str, source_ids: list[str], queries: list[str], per_query: int = 4, max_hits: int = 14) -> list[Hit]:
    """Gộp kết quả tìm kiếm nhiều câu hỏi, bỏ trùng, xen kẽ để mỗi mục dàn ý đều có đoạn nguồn"""
    if not source_ids or not queries:
        return []
    lists = [search_by_vector(org_id, source_ids, v, per_query) for v in embed(org_id, queries)]
    seen: dict[str, Hit] = {}
    for i in range(per_query):
        for lst in lists:
            if i < len(lst) and lst[i].id not in seen:
                seen[lst[i].id] = lst[i]
    return list(seen.values())[:max_hits]


def create_artifact(k: dict, plan: dict, status: str = "generating", content: dict | None = None) -> dict:
    return one(t.artifacts.insert().values(
        orgId=k["orgId"], kitId=k["id"], type=plan["type"], title=plan.get("title") or "Tài liệu mới", summary=plan.get("summary") or "", status=status,
        img=IMG_OF.get(plan["type"], "office"), content={**(content or {}), "plan": plan},
    ).returning(t.artifacts))


def get_artifact(org_id: str, artifact_id: str) -> dict:
    return must(one(select(t.artifacts).where(_a.id == artifact_id, _a.orgId == org_id)), "Tài liệu")


def set_artifact(artifact_id: str, **values: object) -> dict:
    return one(update(t.artifacts).where(_a.id == artifact_id).values(**values, updatedAt=t.func_now()).returning(t.artifacts))
