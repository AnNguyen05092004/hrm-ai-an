"""Tài liệu nguồn có bản mới → chỉ ra bài, slide, câu hỏi đang trích đoạn bị đổi."""
import re

from sqlalchemy import select

from app.shared import tables as t
from app.shared.db import many, one

FORMAT_NAMES = {"qr": "Tài liệu nhanh", "deck": "Bộ slide", "scenario": "Tình huống", "video": "Video", "guide": "Hướng dẫn từng bước"}
_ch = t.source_chunks.c


def _cites(a: dict) -> list[dict]:
    c = a["content"] or {}
    name = FORMAT_NAMES.get(a["type"])
    out = []
    lessons = [x for x in c.get("lessons") or [] if x.get("kind") == "lesson"]
    for i, lesson in enumerate(lessons):
        for b in lesson.get("blocks") or []:
            if b.get("srcRef"):
                out.append({"ref": b["srcRef"], "artifactId": a["id"], "lessonId": lesson.get("id"), "where": f"{name} · Bài {i + 1} · {b.get('h') or lesson.get('title')}"})
    for i, q in enumerate((c.get("quiz") or {}).get("questions") or []):
        if q.get("srcRef"):
            out.append({"ref": q["srcRef"], "artifactId": a["id"], "where": f"Bài kiểm tra · Câu {i + 1}"})
    for i, s in enumerate(c.get("slides") or []):
        if s.get("srcRef"):
            where = f'{name} · đoạn "{s.get("title")}"' if a["type"] == "video" else f"{name} · Slide {i + 1} · {s.get('title')}"
            out.append({"ref": s["srcRef"], "artifactId": a["id"], "where": where, "t": s.get("t")})
    return out


def _norm(x: str) -> str:
    return re.sub(r"\s+", " ", x).strip()


def source_changes(kit_id: str) -> list[dict]:
    k = one(select(t.kits).where(t.kits.c.id == kit_id))
    if not k or not k["sourceIds"]:
        return []
    srcs = many(select(t.sources.c.id, t.sources.c.name, t.sources.c.version, t.sources.c.status).where(t.sources.c.id.in_(k["sourceIds"])))
    cites = [x for a in many(select(t.artifacts).where(t.artifacts.c.kitId == kit_id)) for x in _cites(a)]
    result = []
    for s in srcs:
        if s["status"] != "ready":
            continue
        mine = [c for c in cites if c["ref"].get("sourceId") == s["id"] and (c["ref"].get("version") or 0) < s["version"]]
        if not mine:
            continue
        old_chunks = {x["id"]: x for x in many(select(t.source_chunks).where(_ch.id.in_({c["ref"].get("chunkId") for c in mine})))}
        new_chunks = many(select(t.source_chunks).where(_ch.sourceId == s["id"], _ch.version == s["version"]))
        new_text = {_norm(x["text"]) for x in new_chunks}
        parts = []
        for c in mine:
            old = old_chunks.get(c["ref"].get("chunkId"))
            if not old or _norm(old["text"]) in new_text:
                continue
            same_section = any(x["section"] == old["section"] for x in new_chunks)
            what = f'Nội dung "{old["section"]}" đã thay đổi trong bản mới' if same_section else f'"{old["section"]}" không còn trong bản mới'
            parts.append({k_: v for k_, v in {"artifactId": c["artifactId"], "lessonId": c.get("lessonId"), "where": c["where"], "t": c.get("t"), "what": what}.items() if v is not None})
        if parts:
            result.append({"sourceId": s["id"], "sourceName": s["name"], "from": min(c["ref"].get("version") or 0 for c in mine), "to": s["version"], "parts": parts})
    return result
