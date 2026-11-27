"""LMS Adapter: gửi gói (SCORM 1.2 hoặc đề QTI 2.1) sang LMS công ty qua HTTPS API.

Hợp đồng (LMS demo ở apps/company-lms làm đúng hợp đồng này):
  POST {LMS_API_URL}/packages   body: tệp .zip
    Authorization: Bearer <LMS_API_TOKEN>
    Idempotency-Key: <mã lần gửi>   gửi lại cùng khóa thì LMS trả lại bản đã nhận, không tạo trùng
    X-Package-Kind: scorm | qti, X-Package-Title: tên (mã hóa URL), X-Source-Ref: mã khóa/đề trong Studio
  → 201/200 {"id": "...", "status": "received"}
"""
from dataclasses import dataclass
from urllib.parse import quote

import httpx

from app.config import settings

TIMEOUT = 60.0


class LmsRejected(Exception):
    """LMS từ chối gói (lỗi 4xx): gửi lại cũng không được, cần người soạn sửa"""


class LmsUnavailable(Exception):
    """LMS không trả lời hoặc lỗi 5xx: thử lại sau"""


@dataclass(frozen=True)
class Receipt:
    remote_id: str
    status: str


def configured() -> bool:
    return bool(settings().LMS_API_URL and settings().LMS_API_TOKEN)


def send_package(*, key: str, kind: str, title: str, source_ref: str, zip_bytes: bytes) -> Receipt:
    s = settings()
    headers = {
        "Authorization": f"Bearer {s.LMS_API_TOKEN}", "Idempotency-Key": key, "Content-Type": "application/zip",
        "X-Package-Kind": kind, "X-Package-Title": quote(title), "X-Source-Ref": source_ref,
    }
    try:
        r = httpx.post(f"{s.LMS_API_URL.rstrip('/')}/packages", content=zip_bytes, headers=headers, timeout=TIMEOUT)
    except httpx.HTTPError as e:
        raise LmsUnavailable(f"Không kết nối được {s.LMS_NAME}: {e.__class__.__name__}") from e
    if r.status_code >= 500:
        raise LmsUnavailable(f"{s.LMS_NAME} lỗi {r.status_code}")
    try:
        body = r.json()
    except ValueError:
        body = {}
    if r.status_code >= 400:
        msg = (body.get("error") or {}).get("message") if isinstance(body.get("error"), dict) else body.get("error")
        raise LmsRejected(f"{s.LMS_NAME} từ chối gói ({r.status_code}): {msg or r.text[:200]}")
    if not body.get("id"):
        raise LmsRejected(f"{s.LMS_NAME} không trả về mã gói")
    return Receipt(str(body["id"]), str(body.get("status", "received")))
