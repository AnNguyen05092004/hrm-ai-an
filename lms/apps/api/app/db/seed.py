"""Dữ liệu mẫu: tổ chức "Công ty demo", 1 quản trị, 1 người soạn, 2 reviewer, 6 khóa học lấy từ prototype và vài lượt review.
Mật khẩu mẫu của mọi tài khoản: demo1234 (chỉ dùng cho môi trường phát triển). Chạy: python -m app.cli seed"""
import json
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import select, text

from app.db.seed_exam import seed_exam
from app.modules.courses.master import MASTER_TITLE
from app.modules.identity.demo_accounts import ADMIN_EMAIL, AUTHOR_EMAIL, REVIEWER_EMAIL
from app.modules.sources.service import chunk_existing
from app.shared import tables as t
from app.shared.auth import hash_password
from app.shared.db import db, many, one

DEMO_PASSWORD = "demo1234"
P = json.loads((Path(__file__).parent / "seed-data" / "prototype.json").read_text(encoding="utf-8"))
META_KEYS = {"id", "kitId", "type", "title", "summary", "status", "updated", "img", "viewers", "sessions", "done", "link"}
TABLES = ("orgs, users, sessions, skills, sources, source_chunks, kits, images, artifacts, artifact_versions, kit_reviews, review_comments, "
          "notifications, lms_exports, jobs, ai_usage, audit_logs")


def _content_of(a: dict) -> dict:
    return {k: v for k, v in a.items() if k not in META_KEYS}


def _vn_date(s: str) -> datetime:
    d, m, y = (int(x) for x in s.split("/"))
    return datetime(y, m, d, 10, tzinfo=UTC)


def _source_texts() -> dict[str, list[str]]:
    """Gom nội dung các khối trích cùng một tài liệu nguồn thành văn bản nguồn mẫu"""
    out: dict[str, list[str]] = {}
    for a in P["artifacts"].values():
        for lesson in a.get("lessons") or []:
            for b in lesson.get("blocks") or []:
                if not b.get("src"):
                    continue
                parts = str(b["src"]).split(" · ")
                file, sec = parts[0], parts[1] if len(parts) > 1 else None
                body = "\n".join(str(x) for x in [b.get("h"), b.get("p"), *(b.get("items") or []), *(b.get("steps") or []), b.get("code"),
                                                   *[" | ".join(r) for r in b.get("rows") or []]] if x)
                out.setdefault(file, []).append(f"## {sec or 'Nội dung'}\n{body}")
    return out


def reset_db() -> None:
    db().execute(text(f"truncate {TABLES} restart identity cascade"))


@dataclass
class SeedIds:
    orgId: str
    adminId: str
    authorId: str
    reviewerId: str
    reviewer2Id: str
    kits: dict[str, str] = field(default_factory=dict)


class _Linker:
    """Gắn trích nguồn của nội dung mẫu với đoạn nguồn thật (để phát hiện khi tài liệu nguồn đổi)"""

    def __init__(self) -> None:
        ch = t.source_chunks.c
        self.chunks = many(select(ch.id, ch.sourceId, ch.section, ch.version, t.sources.c.name).select_from(t.source_chunks.join(t.sources, t.sources.c.id == ch.sourceId)))

    def ref(self, src: str | None) -> dict | None:
        if not src:
            return None
        parts = src.split(" · ")
        sec = parts[1] if len(parts) > 1 else None
        c = next((x for x in self.chunks if x["name"] == parts[0] and x["section"] == sec), None)
        return {"sourceId": c["sourceId"], "chunkId": c["id"], "version": c["version"]} if c else None

    def _with_ref(self, x: dict) -> dict:
        r = self.ref(x.get("src"))
        return {**x, "srcRef": r} if r else x

    def link(self, c: dict) -> dict:
        out = dict(c)
        if c.get("lessons"):
            out["lessons"] = [{**lesson, "blocks": [self._with_ref(b) for b in lesson["blocks"]]} if lesson.get("blocks") else lesson for lesson in c["lessons"]]
        if c.get("quiz"):
            out["quiz"] = {**c["quiz"], "questions": [self._with_ref(q) for q in c["quiz"]["questions"]]}
        return out


def _version(artifact_id: str, title: str, summary: str, content: dict, author_id: str, note: str) -> None:
    db().execute(t.artifact_versions.insert().values(artifactId=artifact_id, version=1, title=title, summary=summary, content=content, publishedBy=author_id, note=note))


def _seed_kit(org_id: str, author_id: str, k: dict, src_ids: dict[str, str], linker: _Linker, art_ids: dict[str, str]) -> str:
    first = P["artifacts"].get(k["artifacts"][0]) if k["artifacts"] else None
    kit = one(t.kits.insert().values(
        orgId=org_id, title=k["title"], goal=k["desc"], skillId=k["skill"], level=k["level"], stage="ready", createdBy=author_id, img=(first or {}).get("img") or "server",
        details={"audience": k["audience"], "goals": k["goals"], "takeaways": k["takeaways"], "metrics": k["metrics"], "practice": k["practice"]},
        sourceIds=[src_ids[s["name"]] for s in k["sources"] if s["name"] in src_ids],
    ).returning(t.kits.c.id))
    master = None
    for aid in k["artifacts"]:
        a = P["artifacts"].get(aid)
        if not a:
            continue
        published = a["status"] == "published"
        content = linker.link({**_content_of(a), "plan": {"type": a["type"], "title": a["title"], "summary": a["summary"], "basedOn": 1}})
        row = one(t.artifacts.insert().values(orgId=org_id, kitId=kit["id"], type=a["type"], title=a["title"], summary=a["summary"], content=content,
                                              status="published" if published else "draft", publishedVersion=1 if published else None, img=a["img"],
                                              updatedAt=_vn_date(a["updated"].split(" ")[0])).returning(t.artifacts.c.id))
        art_ids[aid] = row["id"]
        if a["type"] == "qr" and master is None:
            master = {"lessons": [x for x in _content_of(a)["lessons"] if x.get("kind") == "lesson"]}
        if published:
            _version(row["id"], a["title"], a["summary"], linker.link(_content_of(a)), author_id, "Bản đầu")
    # nội dung mẫu: lấy các bài của Tài liệu nhanh, đã chốt v1; các định dạng mẫu coi như soạn từ v1
    if master:
        content = linker.link(master)
        ma = one(t.artifacts.insert().values(orgId=org_id, kitId=kit["id"], type="master", title=MASTER_TITLE, summary=k["desc"], content=content, status="published",
                                             publishedVersion=1, img="notes").returning(t.artifacts.c.id))
        _version(ma["id"], MASTER_TITLE, k["desc"], content, author_id, "Chốt nội dung")
    return kit["id"]


def seed() -> SeedIds:
    reset_db()
    org_id = one(t.orgs.insert().values(name="Công ty demo").returning(t.orgs.c.id))["id"]
    pw = hash_password(DEMO_PASSWORD)
    db().execute(t.skills.insert(), [{"id": s["id"], "orgId": org_id, "name": s["name"], "group": s["comp"]} for s in P["skills"]])

    def person(email: str, name: str, role: str, title: str, color: str) -> str:
        return one(t.users.insert().values(orgId=org_id, email=email, name=name, passwordHash=pw, role=role, title=title, color=color).returning(t.users.c.id))["id"]

    admin = person(ADMIN_EMAIL, "Đỗ Minh Quân", "admin", "Quản trị hệ thống đào tạo", "#7a8b99")
    author = person(AUTHOR_EMAIL, "Nguyễn An", "author", "Chuyên viên thiết kế đào tạo", "#8b88c9")
    reviewer = person(REVIEWER_EMAIL, "Phạm Thu Hà", "reviewer", "Chuyên gia an toàn thông tin", "#4caf8e")
    reviewer2 = person("nam.lh@demo.local", "Lê Hoàng Nam", "reviewer", "Kỹ sư DevOps", "#5b9bd5")

    src_ids: dict[str, str] = {}
    for name, parts in _source_texts().items():
        s = one(t.sources.insert().values(orgId=org_id, name=name, mime="text/markdown", text="\n\n".join(parts), status="ready", uploadedBy=author).returning(t.sources.c.id))
        src_ids[name] = s["id"]
        chunk_existing(s["id"])

    linker = _Linker()
    art_ids: dict[str, str] = {}
    kit_ids = {k["id"]: _seed_kit(org_id, author, k, src_ids, linker, art_ids) for k in P["kits"]}
    sec = one(select(t.kits.c.img).where(t.kits.c.id == kit_ids["k-sec"]))
    seed_exam(org_id, kit_ids["k-sec"], sec["img"], author)
    _seed_reviews(org_id, author, reviewer, reviewer2, kit_ids, art_ids)
    return SeedIds(org_id, admin, author, reviewer, reviewer2, kit_ids)


def _seed_reviews(org_id: str, author_id: str, ha_id: str, nam_id: str, kits: dict[str, str], arts: dict[str, str]) -> None:
    """Một khóa đang chờ review, một khóa cần sửa có góp ý, một khóa đã duyệt"""
    now = datetime.now(UTC)

    def day(n: int) -> datetime:
        return now + timedelta(days=n)

    def lesson_of(aid: str, i: int) -> dict | None:
        lessons = [x for x in P["artifacts"].get(aid, {}).get("lessons") or [] if x.get("kind") == "lesson"]
        return {"key": f"lesson:{lessons[i]['id']}", "label": f"Bài {i + 1}: {lessons[i]['title']}"} if i < len(lessons) else None

    base = {"orgId": org_id, "invitedBy": author_id, "message": "", "status": "pending", "decisionNote": "", "decidedAt": None, "due": None}
    db().execute(t.kit_reviews.insert(), [
        {**base, "kitId": kits["k-sec"], "reviewerId": ha_id, "message": "Chị xem giúp em phần nhận diện email lừa đảo và quy trình báo cáo đã đúng chính sách mới chưa ạ.", "due": day(3)},
        {**base, "kitId": kits["k-docker"], "reviewerId": nam_id, "message": "Anh rà giúp các lệnh sao lưu volume.", "status": "changes",
         "decisionNote": "Lệnh sao lưu cần dừng container trước, và thêm cảnh báo về quyền thư mục khi dùng bind mount.", "decidedAt": day(-1), "due": day(2)},
        {**base, "kitId": kits["k-leave"], "reviewerId": ha_id, "status": "approved", "decisionNote": "Nội dung đúng quy định nghỉ phép hiện hành.", "decidedAt": day(-3)},
    ])
    c1 = one(t.review_comments.insert().values(orgId=org_id, kitId=kits["k-docker"], artifactId=arts["a-qr"], anchor=lesson_of("a-qr", 2), authorId=nam_id,
                                               body="Ví dụ tar đang chạy khi container còn ghi dữ liệu: bản sao lưu có thể hỏng. Thêm bước docker stop trước khi sao lưu.").returning(t.review_comments.c.id))
    db().execute(t.review_comments.insert(), [
        {"orgId": org_id, "kitId": kits["k-docker"], "parentId": c1["id"], "artifactId": arts["a-qr"], "anchor": lesson_of("a-qr", 2), "authorId": author_id,
         "body": "Em đã thêm bước dừng container, anh xem lại giúp em."},
        {"orgId": org_id, "kitId": kits["k-docker"], "parentId": None, "artifactId": arts["a-qr"], "anchor": lesson_of("a-qr", 1), "authorId": nam_id,
         "body": "Nên nói rõ bind mount phụ thuộc quyền thư mục trên máy chủ (UID/GID)."},
    ])
