"""Review khóa học: người soạn mời reviewer, reviewer xem bản nháp và góp ý theo từng tài liệu / vị trí,
rồi kết luận "Duyệt" hoặc "Cần sửa". Người soạn trả lời, đánh dấu đã xử lý và gửi lại vòng review mới.
Mỗi bước gửi thông báo cho bên kia (trong app; mời, gửi lại và kết luận có thêm email)."""
from datetime import date, datetime
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from fastapi import Depends
from pydantic import BaseModel, Field, StringConstraints
from sqlalchemy import and_, delete, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.modules.courses.service import artifact_meta, get_kit
from app.modules.notifications.service import Notice, notify
from app.shared import tables as t
from app.shared.audit import audit
from app.shared.auth import AuthUser, current_user
from app.shared.db import db, many, one
from app.shared.errors import bad_request, forbidden, must
from app.shared.http import TxRouter
from app.shared.validation import Id

router = TxRouter()
User = Annotated[AuthUser, Depends(current_user)]
VN = ZoneInfo("Asia/Ho_Chi_Minh")
DUE_TIME = (23, 59)  # hạn review: cuối ngày theo giờ Việt Nam
PREVIEW = 160
_r, _c, _u, _a = t.kit_reviews.c, t.review_comments.c, t.users.c, t.artifacts.c
PERSON = [_u.id, _u.name, _u.title, _u.color, _u.role]
Message = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]


class Invite(BaseModel):
    reviewerIds: list[Id] = Field(min_length=1, max_length=20)
    message: Message = ""
    due: date | None = None


class Again(BaseModel):
    message: Message = ""


class Decision(BaseModel):
    status: Literal["approved", "changes"]
    note: Annotated[str, StringConstraints(strip_whitespace=True, max_length=3000)] = ""


class Anchor(BaseModel):
    key: str = Field(max_length=80)
    label: str = Field(max_length=200)


class NewComment(BaseModel):
    body: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=3000)]
    artifactId: Id | None = None
    parentId: Id | None = None
    anchor: Anchor | None = None


class Resolve(BaseModel):
    resolved: bool


def _access(u: AuthUser, kit_id: str) -> tuple[dict, dict | None]:
    """Người soạn xem mọi khóa, reviewer chỉ khóa được mời"""
    kit = get_kit(u.org_id, kit_id)
    if u.can_edit:
        return kit, None
    mine = one(select(t.kit_reviews).where(_r.kitId == kit["id"], _r.reviewerId == u.id))
    if not mine:
        raise forbidden("Bạn chưa được mời review khóa này")
    return kit, mine


def _editor_only(u: AuthUser) -> None:
    if not u.can_edit:
        raise forbidden("Chỉ người soạn khóa làm được việc này")


def _person(row: dict, prefix: str = "") -> dict:
    return {k: row[f"{prefix}{k}"] for k in ("id", "name", "title", "color", "role")}


def _reviewers(kit_id: str) -> list[dict]:
    rows = many(select(t.kit_reviews, *[c.label(f"u_{c.key}") for c in PERSON]).select_from(t.kit_reviews.join(t.users, _u.id == _r.reviewerId))
                .where(_r.kitId == kit_id).order_by(_r.createdAt))
    return [{"id": r["id"], "user": _person(r, "u_"), "status": r["status"], "round": r["round"], "message": r["message"], "due": r["due"],
             "decisionNote": r["decisionNote"], "decidedAt": r["decidedAt"], "invitedAt": r["createdAt"]} for r in rows]


def _comments(kit_id: str) -> list[dict]:
    rows = many(select(t.review_comments, *[c.label(f"u_{c.key}") for c in PERSON], _a.title.label("artTitle"), _a.type.label("artType"))
                .select_from(t.review_comments.join(t.users, _u.id == _c.authorId).outerjoin(t.artifacts, _a.id == _c.artifactId))
                .where(_c.kitId == kit_id).order_by(_c.createdAt))
    resolver_ids = {r["resolvedBy"] for r in rows if r["resolvedBy"]}
    resolver = {x["id"]: x["name"] for x in many(select(_u.id, _u.name).where(_u.id.in_(resolver_ids)))} if resolver_ids else {}

    def dto(r: dict) -> dict:
        return {"id": r["id"], "body": r["body"], "author": _person(r, "u_"), "round": r["round"], "at": r["createdAt"], "artifactId": r["artifactId"],
                "artifact": {"title": r["artTitle"], "type": r["artType"]} if r["artifactId"] else None, "anchor": r["anchor"],
                "resolvedAt": r["resolvedAt"], "resolvedBy": resolver.get(r["resolvedBy"], "") if r["resolvedBy"] else None}

    replies: dict[str, list[dict]] = {}
    for r in rows:
        if r["parentId"]:
            replies.setdefault(r["parentId"], []).append(dto(r))
    # góp ý mới nhất lên đầu, trả lời trong luồng theo thứ tự thời gian
    return [{**dto(r), "replies": replies.get(r["id"], [])} for r in reversed(rows) if not r["parentId"]]


def _open_by(kit_id: str, user_id: str) -> bool:
    return one(select(_c.id).where(_c.kitId == kit_id, _c.authorId == user_id, _c.parentId.is_(None), _c.resolvedAt.is_(None)).limit(1)) is not None


def _short(s: str) -> str:
    return s if len(s) <= PREVIEW else s[:PREVIEW].rsplit(" ", 1)[0] + "…"


@router.get("")
def inbox(u: User) -> list[dict]:
    """Hộp việc của reviewer: các khóa được mời, mới nhất trước"""
    if u.role != "reviewer":
        return []
    k = t.kits.c
    rows = many(select(t.kit_reviews, k.title, k.goal, k.img, k.updatedAt.label("kitUpdatedAt"), _u.name.label("by"))
                .select_from(t.kit_reviews.join(t.kits, k.id == _r.kitId).outerjoin(t.users, _u.id == _r.invitedBy))
                .where(_r.reviewerId == u.id, _r.orgId == u.org_id).order_by(_r.updatedAt.desc()))
    ids = [r["kitId"] for r in rows]
    arts = many(select(_a.kitId).where(_a.kitId.in_(ids))) if ids else []
    mine = many(select(_c.kitId).where(_c.kitId.in_(ids), _c.authorId == u.id, _c.parentId.is_(None), _c.resolvedAt.is_(None))) if ids else []
    return [{"kitId": r["kitId"], "title": r["title"], "desc": r["goal"], "img": r["img"], "updatedAt": r["kitUpdatedAt"], "invitedBy": r["by"] or "", "message": r["message"],
             "due": r["due"], "status": r["status"], "round": r["round"], "artifacts": sum(1 for a in arts if a["kitId"] == r["kitId"]),
             "myOpen": sum(1 for c in mine if c["kitId"] == r["kitId"])} for r in rows]


@router.get("/kits/{kit_id}")
def kit_review(kit_id: str, u: User) -> dict:
    """Toàn cảnh review một khóa: tài liệu, người review và kết luận, các góp ý"""
    kit, mine = _access(u, kit_id)
    d = kit["details"] or {}
    arts = many(select(t.artifacts).where(_a.kitId == kit["id"]).order_by(_a.createdAt))
    # người soạn chọn reviewer từ danh sách tài khoản vai reviewer đang hoạt động
    candidates = many(select(*PERSON).where(_u.orgId == u.org_id, _u.role == "reviewer", _u.active.is_(True)).order_by(_u.name)) if u.can_edit else []
    return {
        "kit": {"id": kit["id"], "title": kit["title"], "desc": kit["goal"], "img": kit["img"], "audience": d.get("audience") or "", "goals": d.get("goals") or [], "takeaways": d.get("takeaways") or []},
        "artifacts": [artifact_meta(a) for a in arts if a["status"] not in ("generating", "failed")],
        "reviewers": _reviewers(kit["id"]), "comments": _comments(kit["id"]),
        "mine": {k: mine[k] for k in ("id", "status", "round", "message", "due", "decisionNote")} if mine else None,
        "candidates": candidates, "canEdit": u.can_edit,
    }


@router.post("/kits/{kit_id}/invite")
def invite(kit_id: str, body: Invite, u: User) -> dict:
    """Mời reviewer (bỏ qua người đã được mời); người được mời nhận thông báo và email"""
    _editor_only(u)
    kit, _ = _access(u, kit_id)
    valid = [r["id"] for r in many(select(_u.id).where(_u.orgId == u.org_id, _u.role == "reviewer", _u.active.is_(True), _u.id.in_(body.reviewerIds)))]
    if not valid:
        raise bad_request("Chọn ít nhất một người có vai reviewer")
    due = datetime(body.due.year, body.due.month, body.due.day, *DUE_TIME, tzinfo=VN) if body.due else None
    stmt = pg_insert(t.kit_reviews).values([{"orgId": u.org_id, "kitId": kit["id"], "reviewerId": r, "invitedBy": u.id, "message": body.message, "due": due} for r in valid])
    invited = [r["reviewerId"] for r in many(stmt.on_conflict_do_nothing().returning(_r.reviewerId))]
    if invited:
        due_text = f" Hạn: {due.strftime('%d/%m/%Y')}." if due else ""
        msg = f'{u.name} mời bạn review khóa "{kit["title"]}".{due_text}' + (f"\nLời nhắn: {body.message}" if body.message else "")
        notify(u.org_id, invited, Notice("review.invited", f"Mời review: {kit['title']}", msg, f"/review/{kit['id']}", kit["id"], email=True))
    audit(u, "review.invite", kit["id"], {"invited": len(invited)})
    return {"invited": len(invited), "skipped": len(valid) - len(invited)}


@router.delete("/kits/{kit_id}/reviewers/{review_id}")
def remove_reviewer(kit_id: str, review_id: str, u: User) -> dict:
    """Bỏ một người khỏi review (góp ý đã viết vẫn giữ)"""
    _editor_only(u)
    kit, _ = _access(u, kit_id)
    r = must(one(delete(t.kit_reviews).where(_r.id == review_id, _r.kitId == kit["id"]).returning(t.kit_reviews)), "Lời mời review")
    audit(u, "review.remove", kit["id"], {"reviewerId": r["reviewerId"]})
    return {"ok": True}


@router.post("/kits/{kit_id}/request-again")
def request_again(kit_id: str, body: Again, u: User) -> dict:
    """Sửa xong: mở vòng review mới cho những người đã kết luận "Cần sửa" và báo cho họ"""
    _editor_only(u)
    kit, _ = _access(u, kit_id)
    rows = many(select(t.kit_reviews).where(_r.kitId == kit["id"], _r.status == "changes"))
    if not rows:
        raise bad_request("Không có ai đang yêu cầu sửa")
    for r in rows:
        db().execute(update(t.kit_reviews).where(_r.id == r["id"]).values(status="pending", round=r["round"] + 1, message=body.message or r["message"], decidedAt=None,
                                                                          remindedAt=None, updatedAt=t.func_now()))
    msg = f'{u.name} đã sửa khóa "{kit["title"]}" theo góp ý và mời bạn review lại.' + (f"\nLời nhắn: {body.message}" if body.message else "")
    notify(u.org_id, [r["reviewerId"] for r in rows], Notice("review.again", f"Mời review lại: {kit['title']}", msg, f"/review/{kit['id']}", kit["id"], email=True))
    audit(u, "review.request_again", kit["id"], {"reviewers": len(rows)})
    return {"reviewers": len(rows)}


@router.post("/kits/{kit_id}/decision")
def decide(kit_id: str, body: Decision, u: User) -> dict:
    """Reviewer kết luận: Duyệt, hoặc Cần sửa (phải nói rõ cần sửa gì); người mời và người tạo khóa được báo"""
    kit, mine = _access(u, kit_id)
    if not mine:
        raise forbidden("Chỉ reviewer được mời mới kết luận được")
    if body.status == "changes" and not body.note and not _open_by(kit["id"], u.id):
        raise bad_request("Ghi rõ cần sửa gì: viết nhận xét chung hoặc thêm góp ý vào tài liệu")
    db().execute(update(t.kit_reviews).where(_r.id == mine["id"]).values(status=body.status, decisionNote=body.note, decidedAt=t.func_now(), updatedAt=t.func_now()))
    verdict = "đã duyệt" if body.status == "approved" else "yêu cầu sửa"
    msg = f'{u.name} {verdict} khóa "{kit["title"]}" (vòng {mine["round"]}).' + (f"\nNhận xét: {_short(body.note)}" if body.note else "")
    to = [x for x in (mine["invitedBy"], kit["createdBy"]) if x and x != u.id]
    notify(u.org_id, to, Notice("review.decided", f"{u.name} {verdict}: {kit['title']}", msg, f"/review/{kit['id']}", kit["id"], email=True))
    audit(u, "review.decision", kit["id"], {"status": body.status, "round": mine["round"]})
    return {"status": body.status}


def _notify_comment(u: AuthUser, kit: dict, mine: dict | None, parent: dict | None, body: str) -> None:
    """Góp ý mới của reviewer → báo người mời; trả lời → báo người viết góp ý gốc (chỉ trong app)"""
    if parent:
        to = [parent["authorId"]]
    elif mine:
        to = [mine["invitedBy"] or kit["createdBy"]]
    else:
        return
    to = [x for x in to if x and x != u.id]
    title = f"{u.name} trả lời góp ý: {kit['title']}" if parent else f"{u.name} góp ý: {kit['title']}"
    notify(u.org_id, to, Notice("review.comment", title, _short(body), f"/review/{kit['id']}", kit["id"], group=True))


@router.post("/kits/{kit_id}/comments")
def comment(kit_id: str, body: NewComment, u: User) -> dict:
    """Góp ý mới hoặc trả lời trong luồng. Gắn được với một tài liệu và một vị trí trong tài liệu"""
    kit, mine = _access(u, kit_id)
    artifact_id, anchor, parent = body.artifactId, body.anchor.model_dump() if body.anchor else None, None
    if body.parentId:
        parent = must(one(select(t.review_comments).where(_c.id == body.parentId, _c.kitId == kit["id"])), "Góp ý")
        if parent["parentId"]:
            raise bad_request("Chỉ trả lời được góp ý gốc")
        artifact_id, anchor = parent["artifactId"], parent["anchor"]
    elif artifact_id:
        must(one(select(_a.id).where(and_(_a.id == artifact_id, _a.kitId == kit["id"]))), "Tài liệu")
    c = one(t.review_comments.insert().values(orgId=u.org_id, kitId=kit["id"], artifactId=artifact_id, anchor=anchor, parentId=body.parentId, authorId=u.id,
                                              body=body.body, round=mine["round"] if mine else 1).returning(_c.id))
    _notify_comment(u, kit, mine, parent, body.body)
    return {"id": c["id"]}


@router.patch("/comments/{comment_id}")
def resolve(comment_id: str, body: Resolve, u: User) -> dict:
    """Người soạn đánh dấu đã xử lý / mở lại; người viết góp ý cũng tự đóng được góp ý của mình"""
    c = must(one(select(t.review_comments).where(_c.id == comment_id, _c.orgId == u.org_id)), "Góp ý")
    _access(u, c["kitId"])
    if c["parentId"]:
        raise bad_request("Đánh dấu ở góp ý gốc")
    if not u.can_edit and c["authorId"] != u.id:
        raise forbidden("Chỉ người soạn hoặc người viết góp ý mới đánh dấu được")
    values = {"resolvedAt": t.func_now(), "resolvedBy": u.id} if body.resolved else {"resolvedAt": None, "resolvedBy": None}
    db().execute(update(t.review_comments).where(_c.id == c["id"]).values(**values))
    return {"ok": True}


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: str, u: User) -> dict:
    """Xóa góp ý của chính mình khi chưa ai trả lời"""
    c = must(one(select(t.review_comments).where(_c.id == comment_id, _c.orgId == u.org_id)), "Góp ý")
    if c["authorId"] != u.id:
        raise forbidden("Chỉ xóa được góp ý của mình")
    if one(select(_c.id).where(_c.parentId == c["id"]).limit(1)):
        raise bad_request("Góp ý đã có trả lời nên không xóa được. Đánh dấu đã xử lý thay vì xóa")
    db().execute(delete(t.review_comments).where(_c.id == c["id"]))
    return {"ok": True}
