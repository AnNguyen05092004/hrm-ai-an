"""Ảnh của tổ chức: tải lên, AI tạo, thư viện; chỉ người cùng tổ chức xem được."""
from typing import Annotated

from fastapi import Depends, File, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, StringConstraints
from sqlalchemy import delete, select

from app.adapters.ai import image_gen
from app.adapters.render import svg_to_png
from app.shared import tables as t
from app.shared.audit import audit
from app.shared.auth import AuthUser, current_user, require_editor
from app.shared.db import db, many, one
from app.shared.errors import bad_request, must
from app.shared.http import TxRouter
from app.shared.storage import file_path, get_file, put_file

router = TxRouter()
Editor = Annotated[AuthUser, Depends(require_editor)]
MAX_IMAGE = 8 * 1024 * 1024
LIBRARY_LIMIT = 200
EXT = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif"}
_i = t.images.c


class Prompt(BaseModel):
    prompt: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=1000)]


def sniff_image(b: bytes) -> str | None:
    """Nhận diện định dạng theo byte đầu tệp, không tin phần mở rộng hay mime trình duyệt gửi"""
    if len(b) < 12:
        return None
    if b[0] == 0x89 and b[1:4] == b"PNG":
        return "image/png"
    if b[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP":
        return "image/webp"
    if b[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    return None


def key_of(img: dict) -> str:
    return f"images/{img['orgId']}/{img['id']}.{EXT[img['mime']]}"


def load_image(org_id: str, image_id: str) -> tuple[str, bytes] | None:
    """Đọc ảnh của tổ chức theo id (dùng khi dựng video và đóng gói SCORM)"""
    img = one(select(t.images).where(_i.id == image_id, _i.orgId == org_id))
    return (img["mime"], get_file(key_of(img))) if img else None


def image_url(image_id: str) -> str:
    return f"/api/images/{image_id}"


def _dto(x: dict) -> dict:
    return {"id": x["id"], "url": image_url(x["id"]), "name": x["name"], "kind": x["kind"], "prompt": x["prompt"], "createdAt": x["createdAt"]}


def _placeholder(prompt: str) -> bytes:
    """Ảnh thay thế khi chạy AI giả lập: nền chuyển màu và mô tả ngắn"""
    esc = "".join(ch for ch in prompt[:60] if ch not in '<>&"')
    return svg_to_png(f'<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e293b"/>'
                      f'<stop offset="1" stop-color="#64748b"/></linearGradient></defs><rect width="1536" height="1024" fill="url(#g)"/><text x="96" y="900" font-family="Arial" font-size="48" fill="#e2e8f0">{esc}</text></svg>')


def _save(u: AuthUser, name: str, mime: str, data: bytes, kind: str, prompt: str | None = None) -> dict:
    row = one(t.images.insert().values(orgId=u.org_id, name=name[:200], mime=mime, size=len(data), kind=kind, prompt=prompt, createdBy=u.id).returning(t.images))
    put_file(key_of(row), data)
    return row


@router.get("/images")
def library(u: Editor) -> list[dict]:
    return [_dto(x) for x in many(select(t.images).where(_i.orgId == u.org_id).order_by(_i.createdAt.desc()).limit(LIBRARY_LIMIT))]


@router.post("/images")
def upload(u: Editor, file: UploadFile | None = File(None)) -> dict:
    if file is None:
        raise bad_request("Chưa chọn ảnh")
    buf = file.file.read(MAX_IMAGE + 1)
    if len(buf) > MAX_IMAGE:
        raise bad_request("Ảnh tối đa 8 MB")
    mime = sniff_image(buf)
    if not mime:
        raise bad_request("Chỉ nhận ảnh PNG, JPG, WEBP hoặc GIF")
    row = _save(u, file.filename or "anh", mime, buf, "upload")
    audit(u, "image.upload", row["id"], {"size": len(buf)})
    return _dto(row)


@router.post("/images/generate")
def generate(body: Prompt, u: Editor) -> dict:
    png = image_gen(u.org_id, body.prompt) or _placeholder(body.prompt)
    row = _save(u, body.prompt[:80], "image/png", png, "ai", body.prompt)
    audit(u, "image.generate", row["id"])
    return _dto(row)


@router.delete("/images/{image_id}")
def remove(image_id: str, u: Editor) -> dict:
    db().execute(delete(t.images).where(_i.id == image_id, _i.orgId == u.org_id))
    return {"ok": True}


@router.get("/images/{image_id}")
def serve(image_id: str, u: AuthUser = Depends(current_user)) -> FileResponse:
    """Ảnh chỉ người trong cùng tổ chức xem được (tài liệu chứa ảnh có thể là nội bộ)"""
    img = must(one(select(t.images).where(_i.id == image_id, _i.orgId == u.org_id)), "Ảnh")
    return FileResponse(file_path(key_of(img)), media_type=img["mime"], headers={"cache-control": "private, max-age=31536000, immutable"})
