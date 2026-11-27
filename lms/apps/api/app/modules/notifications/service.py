"""Thông báo cho người dùng: luôn có trong app (chuông ở góc trên bên phải), việc quan trọng gửi kèm email.

Email do Background Worker gửi (job email.send) để request không phải chờ máy chủ thư, lỗi thì thử lại.
Trước khi gửi email về lời mời review, worker kiểm lại lời mời còn hiệu lực."""
import html
import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update

from app.adapters.mailer import Mail, MailDisabled, send_mail
from app.config import settings
from app.modules.courses.service import fmt
from app.shared import tables as t
from app.shared.db import db, many, one
from app.shared.jobs import JobCtx, define_job, enqueue

log = logging.getLogger("lms.notify")
REMIND_BEFORE = timedelta(hours=24)
# loại thông báo gắn với một lời mời review đang chờ: hết hiệu lực khi lời mời bị bỏ hoặc reviewer đã kết luận
INVITE_KINDS = {"review.invited", "review.again", "review.reminder"}
_n, _r = t.notifications.c, t.kit_reviews.c


@dataclass(frozen=True)
class Notice:
    kind: str
    title: str
    body: str
    link: str
    kit_id: str | None = None
    email: bool = False
    # gộp vào thông báo chưa đọc cùng loại, cùng khóa, cùng tiêu đề (vd. reviewer viết nhiều góp ý liên tiếp)
    group: bool = False


def notify(org_id: str, user_ids: list[str], n: Notice) -> list[str]:
    """Tạo thông báo trong app cho từng người; email=True thì xếp job gửi email (cùng giao dịch với thao tác nghiệp vụ)"""
    ids = []
    mail_on = n.email and settings().MAIL_TRANSPORT != "off"
    for uid_ in dict.fromkeys(user_ids):
        if n.group and (merged := _merge_unread(uid_, n)):
            ids.append(merged)
            continue
        row = one(t.notifications.insert().values(orgId=org_id, userId=uid_, kind=n.kind, title=n.title, body=n.body, link=n.link, kitId=n.kit_id,
                                                  emailStatus="queued" if mail_on else "none").returning(_n.id))
        ids.append(row["id"])
        if mail_on:
            enqueue(org_id, "email.send", {"notificationId": row["id"]})
    return ids


def _merge_unread(user_id: str, n: Notice) -> str | None:
    """Có thông báo chưa đọc giống hệt (loại, khóa, tiêu đề) thì cập nhật nội dung mới nhất, tăng số đếm, đưa lên đầu"""
    row = one(update(t.notifications)
              .where(_n.userId == user_id, _n.kind == n.kind, _n.kitId == n.kit_id, _n.title == n.title, _n.readAt.is_(None))
              .values(body=n.body, link=n.link, grouped=_n.grouped + 1, createdAt=t.func_now())
              .returning(_n.id))
    return row["id"] if row else None


def _invite_still_valid(n: dict) -> bool:
    r = one(select(_r.status).where(_r.kitId == n["kitId"], _r.reviewerId == n["userId"]))
    return bool(r and r["status"] == "pending")


def _mail_of(n: dict, to: str, name: str) -> Mail:
    url = f"{settings().WEB_ORIGIN.rstrip('/')}{n['link']}"
    text_ = f"Chào {name},\n\n{n['body']}\n\nMở trong LMS Studio: {url}\n\nEmail tự động từ LMS Studio, không cần trả lời."
    body_html = html.escape(n["body"]).replace("\n", "<br>")
    page = (f'<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1f2937;max-width:560px">'
            f'<p>Chào {html.escape(name)},</p><p>{body_html}</p>'
            f'<p><a href="{html.escape(url)}" style="display:inline-block;background:#1f2937;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Mở trong LMS Studio</a></p>'
            f'<p style="color:#6b7280;font-size:13px">Email tự động từ LMS Studio, không cần trả lời.</p></div>')
    return Mail(to=to, subject=n["title"], text=text_, html=page)


@define_job("email.send")
def send_notification_email(ctx: JobCtx) -> dict:
    n = one(select(t.notifications, t.users.c.email, t.users.c.name, t.users.c.active).select_from(t.notifications.join(t.users, t.users.c.id == _n.userId))
            .where(_n.id == str(ctx.payload["notificationId"])))
    if not n:
        return {"skipped": "notification_deleted"}
    if not n["active"] or (n["kind"] in INVITE_KINDS and not _invite_still_valid(n)):
        db().execute(update(t.notifications).where(_n.id == n["id"]).values(emailStatus="skipped"))
        return {"skipped": "no_longer_valid"}
    try:
        send_mail(_mail_of(n, n["email"], n["name"]))
    except MailDisabled:
        db().execute(update(t.notifications).where(_n.id == n["id"]).values(emailStatus="skipped"))
        return {"skipped": "mail_off"}
    except Exception as e:
        log.warning("Gửi email %s lỗi: %s", n["id"], e)
        db().execute(update(t.notifications).where(_n.id == n["id"]).values(emailStatus="failed", emailError=str(e)[:300]))
        raise
    db().execute(update(t.notifications).where(_n.id == n["id"]).values(emailStatus="sent", emailError=None))
    return {"sent": n["email"]}


def remind_due_reviews(now: datetime | None = None) -> int:
    """Nhắc reviewer còn dưới 24 giờ tới hạn mà chưa kết luận (mỗi vòng review nhắc một lần)"""
    now = now or datetime.now(UTC)
    rows = many(select(t.kit_reviews, t.kits.c.title.label("kitTitle")).select_from(t.kit_reviews.join(t.kits, t.kits.c.id == _r.kitId))
                .where(_r.status == "pending", _r.remindedAt.is_(None), _r.due.is_not(None), _r.due > now, _r.due <= now + REMIND_BEFORE))
    for r in rows:
        due = fmt(r["due"])
        notify(r["orgId"], [r["reviewerId"]], Notice("review.reminder", f"Sắp tới hạn review: {r['kitTitle']}",
                                                     f'Khóa "{r["kitTitle"]}" cần kết luận review trước {due}.', f"/review/{r['kitId']}", r["kitId"], email=True))
        db().execute(update(t.kit_reviews).where(_r.id == r["id"]).values(remindedAt=now))
    return len(rows)
