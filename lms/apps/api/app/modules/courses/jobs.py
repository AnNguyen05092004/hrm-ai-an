"""Job nền soạn khóa: chi tiết (kit.draft), dàn ý (kit.outline), soạn một tài liệu (artifact.generate)."""
from sqlalchemy import select

from app.modules.courses import drafts
from app.modules.courses.content import deck_content, js_round, qr_content, scenario_content, video_content
from app.modules.courses.master import MASTER_TITLE, master_hits, master_lessons, require_locked
from app.modules.courses.service import brief_of, gather, get_kit, patch_kit, set_artifact
from app.shared import tables as t
from app.shared.db import independent, many, one
from app.shared.jobs import MAX_ATTEMPTS, JobCtx, define_job

MAX_MASTER_LESSONS = 8
MAX_LEVEL = 3


@define_job("kit.draft")
def draft_details(ctx: JobCtx) -> dict:
    k = get_kit(ctx.job["orgId"], str(ctx.payload["kitId"]))
    d = k["details"] or {}
    goal = d.get("goalText") or k["goal"]
    ctx.report(15, "Đọc tài liệu nguồn")
    srcs = many(select(t.sources).where(t.sources.c.id.in_(k["sourceIds"]))) if k["sourceIds"] else []
    hits = gather(k["orgId"], k["sourceIds"], [goal], 10, 10)
    skills = many(select(t.skills.c.id, t.skills.c.name).where(t.skills.c.orgId == k["orgId"]))
    ctx.report(45, "Viết mục tiêu, đối tượng và kế hoạch tài liệu")
    r = drafts.draft_details(k["orgId"], goal, skills, hits, [s["name"] for s in srcs], [s["name"] for s in srcs if s["sensitive"]])
    skill_ok = any(s["id"] == r["skillId"] for s in skills)
    patch_kit(k["id"], {
        "title": r["title"], "goal": r["desc"],
        "skillId": k["skillId"] or (r["skillId"] if skill_ok else None),
        "level": k["level"] or min(MAX_LEVEL, max(1, r["level"])),
    }, {
        "audience": r["audience"], "goals": r["goals"], "takeaways": r["takeaways"], "metrics": r["metrics"], "practice": r["practice"],
        "plan": [{"type": "master", "title": MASTER_TITLE, "summary": r["desc"]}], "warnings": r["warnings"], "job": None,
    })
    return {"kitId": k["id"]}


@define_job("kit.outline")
def draft_outline(ctx: JobCtx) -> dict:
    k = get_kit(ctx.job["orgId"], str(ctx.payload["kitId"]))
    brief = brief_of(k)
    plan: list[dict] = (k["details"] or {}).get("plan") or []
    ctx.report(10, "Lập dàn ý từng tài liệu")
    out = []
    done = 0
    for p in plan:
        if p.get("outline") or p["type"] == "exam":
            out.append(p)
            continue
        hits = gather(k["orgId"], k["sourceIds"], [f"{p['title']}. {p['summary']}", *brief.goals[:2]], 5, 10)
        outline = drafts.draft_outline(k["orgId"], p["type"], brief, p, hits)
        done += 1
        ctx.report(10 + js_round(85 * done / len(plan)), f"Đã lập dàn ý: {p['title']}")
        out.append({**p, "outline": outline})
    # giữ các thay đổi người soạn làm trong lúc chờ (đọc lại kế hoạch mới nhất)
    latest: list[dict] = (get_kit(ctx.job["orgId"], k["id"])["details"] or {}).get("plan") or []
    merged = [p if p.get("outline") else next((o for o in out if o["title"] == p["title"] and o["type"] == p["type"]), p) for p in latest]
    patch_kit(k["id"], {"stage": "outline"}, {"plan": merged, "job": None})
    return {"kitId": k["id"]}


def _sections(outline: dict) -> list[dict]:
    return outline.get("sections") or []


def _master_content(k: dict, brief: drafts.KitBrief, p: dict, ctx: JobCtx) -> tuple[dict, dict]:
    """Nội dung: soạn thẳng từ tài liệu nguồn"""
    ctx.report(10, "Tìm đoạn nguồn liên quan")
    secs = _sections(p.get("outline") or {})
    queries = [f"{s['t']}. {'. '.join(s['items'])}" for s in secs] if secs else [p["title"]]
    hits = gather(k["orgId"], k["sourceIds"], queries, 4, 24)
    ctx.report(30, "Viết nội dung")
    r = drafts.draft_qr(k["orgId"], brief, p, {"sections": secs or [{"t": k["title"], "items": []}]}, hits, "master")
    return qr_content(r, k, hits, bool(k["sourceIds"]), max_lessons=MAX_MASTER_LESSONS, quiz=False), p


def _format_content(k: dict, brief: drafts.KitBrief, p: dict, ctx: JobCtx) -> tuple[dict, dict]:
    """Định dạng cho người học: soạn từ phiên bản nội dung đã chốt"""
    ctx.report(10, "Đọc nội dung đã chốt")
    m = require_locked(k["id"])
    hits = master_hits(m.content)
    lessons = master_lessons(m.content)
    plan = {**p, "basedOn": m.version}
    o = p.get("outline") or {}
    if p["type"] == "qr":
        ctx.report(30, "Tóm gọn thành bài học và câu hỏi")
        return qr_content(drafts.draft_qr(k["orgId"], brief, p, {"sections": _sections(o) or lessons[:3]}, hits), k, hits, True), plan
    if p["type"] in ("deck", "video"):
        titles = (o.get("slides") if p["type"] == "deck" else o.get("chapters")) or [k["title"], *[x["t"] for x in lessons]]
        ctx.report(30, "Viết slide và ghi chú" if p["type"] == "deck" else "Viết kịch bản video")
        r = drafts.draft_deck(k["orgId"], brief, p, titles, hits, p["type"] == "video")
        return (deck_content(r, hits) if p["type"] == "deck" else video_content(r, hits)), plan
    so = {"character": o.get("character") or "Chị Lan · Trưởng nhóm", "learner": o.get("learner") or brief.audience,
          "situation": o.get("situation") or p["summary"], "goals": o.get("goals") or [x["t"] for x in lessons[:3]]}
    ctx.report(30, "Viết lời thoại và lựa chọn")
    return scenario_content(drafts.draft_scenario(k["orgId"], brief, p, so, hits)), plan


def mark_failed_if_final(ctx: JobCtx, artifact_id: str) -> None:
    """Lần thử cuối vẫn lỗi: đánh dấu tài liệu soạn lỗi (giao dịch riêng vì giao dịch chính sẽ rollback)"""
    if ctx.job["attempts"] >= MAX_ATTEMPTS:
        with independent():
            set_artifact(artifact_id, status="failed")


@define_job("artifact.generate")
def generate_artifact(ctx: JobCtx) -> dict | None:
    a = one(select(t.artifacts).where(t.artifacts.c.id == str(ctx.payload["artifactId"])))
    if not a:
        return None
    k = get_kit(a["orgId"], a["kitId"])
    p = (a["content"] or {}).get("plan") or {}
    try:
        build = _master_content if p["type"] == "master" else _format_content
        content, plan = build(k, brief_of(k), p, ctx)
        set_artifact(a["id"], content={**content, "plan": plan}, status="published" if a["publishedVersion"] else "draft")
        return {"artifactId": a["id"]}
    except Exception:
        mark_failed_if_final(ctx, a["id"])
        raise
