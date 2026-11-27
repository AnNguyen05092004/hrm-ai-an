"""Email Adapter: gửi email qua SMTP (máy dev: Mailpit trong Docker, xem thư ở http://localhost:8025)."""
import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage

from app.config import settings

log = logging.getLogger("lms.mail")


@dataclass(frozen=True)
class Mail:
    to: str
    subject: str
    text: str
    html: str


# MAIL_TRANSPORT=memory: thư gửi đi nằm ở đây để test kiểm tra
OUTBOX: list[Mail] = []


class MailDisabled(Exception):
    pass


def send_mail(m: Mail) -> None:
    s = settings()
    if s.MAIL_TRANSPORT == "off":
        raise MailDisabled("Email đang tắt (MAIL_TRANSPORT=off)")
    if s.MAIL_TRANSPORT == "memory":
        OUTBOX.append(m)
        return
    if s.MAIL_TRANSPORT == "console":
        log.info("EMAIL tới %s: %s\n%s", m.to, m.subject, m.text)
        return
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = s.MAIL_FROM, m.to, m.subject
    msg.set_content(m.text)
    msg.add_alternative(m.html, subtype="html")
    with smtplib.SMTP(s.SMTP_HOST, s.SMTP_PORT, timeout=15) as smtp:
        if s.SMTP_TLS:
            smtp.starttls()
        if s.SMTP_USER:
            smtp.login(s.SMTP_USER, s.SMTP_PASSWORD or "")
        smtp.send_message(msg)
