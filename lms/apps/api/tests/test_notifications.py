from datetime import UTC, datetime, timedelta

from helpers import drain_jobs, kit_by
from sqlalchemy import update

from app.adapters.mailer import OUTBOX
from app.modules.notifications.service import remind_due_reviews
from app.shared import tables as t
from app.shared.db import unit_of_work


def _bell(client):
    return client("GET", "/api/notifications").body


def test_invite_notifies_reviewer_in_app_and_by_email(ctx):
    OUTBOX.clear()
    sql = kit_by(ctx.author, "SQL")
    before = _bell(ctx.reviewer)["unread"]
    assert ctx.author("POST", f"/api/reviews/kits/{sql['id']}/invite", {"reviewerIds": [ctx.ids.reviewerId], "message": "Xem giúp câu JOIN", "due": "2026-12-31"}).status == 200
    bell = _bell(ctx.reviewer)
    assert bell["unread"] == before + 1
    n = bell["items"][0]
    assert n["kind"] == "review.invited" and n["link"] == f"/review/{sql['id']}" and n["read"] is False
    assert "Nguyễn An mời bạn review" in n["body"] and "Hạn: 31/12/2026" in n["body"] and "Xem giúp câu JOIN" in n["body"]
    drain_jobs()
    mail = next(m for m in OUTBOX if m.to == "ha@demo.local")
    assert mail.subject == f"Mời review: {sql['title']}"
    assert f"/review/{sql['id']}" in mail.text and "<a href=" in mail.html


def test_email_skipped_when_invitation_removed_before_sending(ctx):
    OUTBOX.clear()
    docker = kit_by(ctx.author, "Docker")
    ctx.author("POST", f"/api/reviews/kits/{docker['id']}/invite", {"reviewerIds": [ctx.ids.reviewerId]})
    rid = next(r["id"] for r in ctx.author("GET", f"/api/reviews/kits/{docker['id']}").body["reviewers"] if r["user"]["id"] == ctx.ids.reviewerId)
    ctx.author("DELETE", f"/api/reviews/kits/{docker['id']}/reviewers/{rid}")
    drain_jobs()
    assert not [m for m in OUTBOX if docker["title"] in m.subject]


def test_decision_and_comment_notify_author(ctx):
    OUTBOX.clear()
    sec = kit_by(ctx.author, "An toàn")
    assert ctx.reviewer("POST", f"/api/reviews/kits/{sec['id']}/comments", {"body": "Bổ sung số máy lẻ IT"}).status == 200
    assert ctx.reviewer("POST", f"/api/reviews/kits/{sec['id']}/decision", {"status": "changes", "note": "Cần thêm bước báo IT"}).status == 200
    kinds = [n["kind"] for n in _bell(ctx.author)["items"][:2]]
    assert kinds == ["review.decided", "review.comment"]
    drain_jobs()
    assert [m.subject for m in OUTBOX if m.to == "an@demo.local"] == [f"Phạm Thu Hà yêu cầu sửa: {sec['title']}"]
    # gửi lại: reviewer nhận thông báo mời review lại
    assert ctx.author("POST", f"/api/reviews/kits/{sec['id']}/request-again", {"message": "Đã thêm"}).status == 200
    assert _bell(ctx.reviewer)["items"][0]["kind"] == "review.again"


def test_mark_read_only_own(ctx):
    bell = _bell(ctx.reviewer)
    first = bell["items"][0]["id"]
    assert ctx.author("POST", "/api/notifications/read", {"ids": [first]}).status == 200
    assert _bell(ctx.reviewer)["items"][0]["read"] is False  # người khác không đánh dấu được
    ctx.reviewer("POST", "/api/notifications/read", {"ids": [first]})
    assert _bell(ctx.reviewer)["unread"] == bell["unread"] - 1
    ctx.reviewer("POST", "/api/notifications/read", {})
    assert _bell(ctx.reviewer)["unread"] == 0
    assert ctx.anon()("GET", "/api/notifications").status == 401


def test_reminder_once_per_round_before_due(ctx):
    OUTBOX.clear()
    now = datetime.now(UTC)
    with unit_of_work() as c:
        c.execute(update(t.kit_reviews).where(t.kit_reviews.c.reviewerId == ctx.ids.reviewerId, t.kit_reviews.c.status == "pending").values(due=now + timedelta(hours=5), remindedAt=None))
    with unit_of_work():
        n = remind_due_reviews(now)
    assert n >= 1
    with unit_of_work():
        assert remind_due_reviews(now) == 0
    assert _bell(ctx.reviewer)["items"][0]["kind"] == "review.reminder"
    drain_jobs()
    assert any(m.subject.startswith("Sắp tới hạn review") for m in OUTBOX)


def test_comments_grouped_until_read(ctx):
    """Reviewer viết nhiều góp ý liên tiếp: người soạn thấy một dòng có số đếm, không bị ngập chuông"""
    sec = kit_by(ctx.author, "An toàn")
    ctx.author("POST", "/api/notifications/read", {})
    for text in ("Góp ý một", "Góp ý hai", "Góp ý ba"):
        assert ctx.reviewer("POST", f"/api/reviews/kits/{sec['id']}/comments", {"body": text}).status == 200
    bell = _bell(ctx.author)
    comments = [n for n in bell["items"] if n["kind"] == "review.comment" and not n["read"]]
    assert bell["unread"] == 1 and len(comments) == 1
    assert comments[0]["count"] == 3 and comments[0]["body"] == "Góp ý ba"
    # đã đọc thì góp ý tiếp theo thành dòng mới
    ctx.author("POST", "/api/notifications/read", {"ids": [comments[0]["id"]]})
    ctx.reviewer("POST", f"/api/reviews/kits/{sec['id']}/comments", {"body": "Góp ý bốn"})
    fresh = _bell(ctx.author)["items"][0]
    assert fresh["id"] != comments[0]["id"] and fresh["count"] == 1 and not fresh["read"]
