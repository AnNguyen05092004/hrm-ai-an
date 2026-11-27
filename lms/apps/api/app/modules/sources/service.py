"""Tài liệu nguồn: đọc tệp, chia đoạn theo mục, tạo vector, tìm đoạn liên quan theo nghĩa."""
import re
from dataclasses import asdict, dataclass

from sqlalchemy import and_, delete, select, update

from app.adapters.ai import embed
from app.adapters.extract import chunk_text, extract_text
from app.shared import tables as t
from app.shared.db import db, many, one
from app.shared.errors import must
from app.shared.jobs import JobCtx, define_job
from app.shared.storage import get_file

SENSITIVE = [re.compile(p, re.I if flag else 0) for p, flag in [
    (r"\b\d{12}\b", False), (r"\b\d{9}\b", False), (r"\b0\d{9}\b", False), (r"\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b", False),
    (r"mật khẩu\s*[:=]", True), (r"password\s*[:=]", True), (r"tài liệu mật|tuyệt mật|\bconfidential\b|hạn chế lưu hành", True),
]]
MIN_TEXT = 30
_s, _ch = t.sources.c, t.source_chunks.c


def looks_sensitive(text_: str) -> bool:
    return any(r.search(text_) for r in SENSITIVE)


def kind_of_source(s: dict) -> str:
    return s["mime"].split("/")[1] if "/" in s["mime"] else "txt"


def file_key(s: dict) -> str:
    return f"sources/{s['id']}-v{s['version']}.{kind_of_source(s)}"


def _store_chunks(s: dict, text_: str) -> int:
    chunks = chunk_text(text_)
    vecs = embed(s["orgId"], [f"{s['name']} · {c.section}\n{c.text}" for c in chunks])
    db().execute(delete(t.source_chunks).where(_ch.sourceId == s["id"], _ch.version == s["version"]))
    if chunks:
        db().execute(t.source_chunks.insert(), [
            {"sourceId": s["id"], "version": s["version"], "ord": i, "section": c.section, "text": c.text, "embedding": vecs[i]} for i, c in enumerate(chunks)
        ])
    return len(chunks)


def process_source(source_id: str) -> int:
    s = must(one(select(t.sources).where(_s.id == source_id)), "Tài liệu")
    text_ = extract_text(get_file(file_key(s)), kind_of_source(s))
    if len(re.sub(r"\[\[trang \d+\]\]", "", text_).strip()) < MIN_TEXT:
        db().execute(update(t.sources).where(_s.id == s["id"]).values(status="failed", error="Không đọc được chữ trong tệp (tệp ảnh scan chưa hỗ trợ)"))
        return 0
    n = _store_chunks(s, text_)
    db().execute(update(t.sources).where(_s.id == s["id"]).values(status="ready", text=text_, error=None, sensitive=looks_sensitive(text_), updatedAt=t.func_now()))
    return n


@define_job("source.process")
def _process(ctx: JobCtx) -> dict:
    ctx.report(20, "Đang đọc tài liệu")
    sid = str(ctx.payload["sourceId"])
    try:
        return {"chunks": process_source(sid)}
    except Exception as e:  # noqa: BLE001 - tệp hỏng hoặc bị khóa: ghi lỗi lên tài liệu, không thử lại
        msg = "Tệp có mật khẩu, không đọc được" if re.search(r"password|encrypt", str(e), re.I) else "Không đọc được tệp. Kiểm tra tệp có bị hỏng không rồi tải lại."
        db().execute(update(t.sources).where(_s.id == sid).values(status="failed", error=msg))
        return {"error": msg}


def chunk_existing(source_id: str) -> None:
    """Seed và tài liệu dạng chữ: tạo đoạn trực tiếp từ text đã có"""
    s = must(one(select(t.sources).where(_s.id == source_id)))
    _store_chunks(s, s["text"])


@dataclass(frozen=True)
class Hit:
    id: str
    sourceId: str
    sourceName: str
    section: str
    text: str
    version: int
    score: float

    def as_dict(self) -> dict:
        return asdict(self)


def search_by_vector(org_id: str, source_ids: list[str], v: list[float], k: int = 6) -> list[Hit]:
    if not source_ids:
        return []
    dist = _ch.embedding.cosine_distance(v)
    rows = many(select(_ch.id, _ch.sourceId, _s.name.label("sourceName"), _ch.section, _ch.text, _ch.version, (1 - dist).label("score"))
                .select_from(t.source_chunks.join(t.sources, and_(_s.id == _ch.sourceId, _s.version == _ch.version)))
                .where(_s.orgId == org_id, _ch.sourceId.in_(source_ids)).order_by(dist).limit(k))
    return [Hit(**{**r, "score": float(r["score"] or 0)}) for r in rows]


def search_sources(org_id: str, source_ids: list[str], query: str, k: int = 6) -> list[Hit]:
    """Tìm các đoạn nguồn gần nhất với câu hỏi, chỉ trong các tài liệu được phép dùng"""
    if not source_ids:
        return []
    return search_by_vector(org_id, source_ids, embed(org_id, [query])[0], k)


LIST_COLS = [_s.id, _s.orgId, _s.name, _s.mime, _s.version, _s.status, _s.error, _s.sensitive, _s.uploadedBy, _s.createdAt, _s.updatedAt]


def list_sources(org_id: str) -> list[dict]:
    return many(select(*LIST_COLS).where(_s.orgId == org_id).order_by(_s.updatedAt.desc()))
