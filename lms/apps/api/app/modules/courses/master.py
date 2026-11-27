"""Nội dung của khóa: bản soạn đầy đủ, duyệt nội bộ, không xuất cho người học.
"Chốt nội dung" = xuất bản bản nội dung thành một phiên bản; mọi định dạng chỉ soạn từ phiên bản đã chốt,
nên các định dạng luôn khớp nhau và khớp bản đã duyệt."""
import re
from dataclasses import dataclass

from sqlalchemy import select

from app.modules.sources.service import Hit
from app.shared import tables as t
from app.shared.db import one
from app.shared.errors import bad_request

MASTER_TITLE = "Nội dung"
MAX_PASSAGES = 40
MAX_CHARS = 1500
_a, _v = t.artifacts.c, t.artifact_versions.c


def master_of(kit_id: str) -> dict | None:
    return one(select(t.artifacts).where(_a.kitId == kit_id, _a.type == "master").limit(1))


@dataclass(frozen=True)
class LockedMaster:
    artifact: dict
    version: int
    content: dict


def locked_master(kit_id: str) -> LockedMaster | None:
    """Phiên bản nội dung đã chốt gần nhất; None khi chưa chốt"""
    a = master_of(kit_id)
    if not a or not a["publishedVersion"]:
        return None
    v = one(select(t.artifact_versions).where(_v.artifactId == a["id"], _v.version == a["publishedVersion"]))
    return LockedMaster(a, v["version"], v["content"]) if v else None


def require_locked(kit_id: str) -> LockedMaster:
    """Bắt buộc đã chốt nội dung trước khi soạn định dạng"""
    m = locked_master(kit_id)
    if not m:
        raise bad_request("Chốt nội dung trước khi tạo định dạng cho người học", "master_not_locked")
    return m


def _item_text(x: object) -> str:
    return x if isinstance(x, str) else f"{x.get('t') or x.get('d') or ''}: {x.get('b') or ''}"  # type: ignore[union-attr]


def block_text(b: dict) -> str:
    """Chữ thuần của một khối (bỏ thẻ định dạng)"""
    parts = [b.get("h"), b.get("p"), b.get("intro"), *[_item_text(x) for x in b.get("items") or []], *(b.get("steps") or []),
             *[f"{c.get('f')}: {c.get('b')}" for c in b.get("cards") or []], b.get("code"),
             *([" | ".join(b["head"])] if b.get("head") else []), *[" | ".join(r) for r in b.get("rows") or []],
             *[f"{g.get('name')}: {', '.join(g.get('items') or [])}" for g in b.get("groups") or []]]
    return re.sub(r"<[^>]+>", "", "\n".join(str(p) for p in parts if p)).strip()


def master_hits(content: dict) -> list[Hit]:
    """Các đoạn của nội dung dùng làm căn cứ khi soạn định dạng. Khối có trích nguồn giữ nguyên tài liệu và đoạn nguồn gốc,
    nên định dạng sinh ra vẫn trích đúng tài liệu nguồn (và vẫn được báo khi tài liệu nguồn đổi)."""
    out: list[Hit] = []
    for lesson in content.get("lessons") or []:
        if lesson.get("kind") != "lesson":
            continue
        for b in lesson.get("blocks") or []:
            if b.get("t") in ("image", "gap", "kc"):
                continue
            txt = block_text(b)
            if not txt:
                continue
            src = str(b.get("src") or "")
            parts = src.split(" · ")
            file, sec = parts[0], parts[1] if len(parts) > 1 else ""
            ref = b.get("srcRef") or {}
            out.append(Hit(
                id=ref.get("chunkId") or b.get("id"), sourceId=ref.get("sourceId") or "", version=ref.get("version") or 0, score=1.0,
                sourceName=file if src else MASTER_TITLE, section=(sec or lesson["title"]) if src else lesson["title"], text=f"[{lesson['title']}] {txt}"[:MAX_CHARS],
            ))
    return out[:MAX_PASSAGES]


def master_lessons(content: dict) -> list[dict]:
    """Tên các bài của nội dung, dùng làm dàn ý mặc định cho định dạng mới"""
    return [{"t": str(x["title"]), "items": []} for x in content.get("lessons") or [] if x.get("kind") == "lesson"]


def master_from_qr(qr: dict) -> dict:
    """Tạo nội dung từ Tài liệu nhanh có sẵn (khóa tạo trước khi có bước nội dung)"""
    return {"lessons": [x for x in qr.get("lessons") or [] if x.get("kind") == "lesson"]}
