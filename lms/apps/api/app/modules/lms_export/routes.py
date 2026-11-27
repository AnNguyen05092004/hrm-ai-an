"""Xuất sang LMS công ty: tải gói về (SCORM 1.2, đề QTI 2.1 kèm đáp án) hoặc gửi thẳng qua API của LMS.

Gửi qua API: người soạn xác nhận → Studio ghi đúng phiên bản đã xuất bản lúc xác nhận → Background Worker đóng gói
đúng các phiên bản đó, gửi sang LMS (khóa chống trùng = mã lần gửi), lưu mã hoặc lỗi LMS trả về và báo người gửi."""
from typing import Annotated, Literal
from urllib.parse import quote

from fastapi import Depends, Response
from pydantic import BaseModel
from sqlalchemy import select, update

from app.adapters import lms_client
from app.config import settings
from app.modules.courses.service import get_kit
from app.modules.courses.view import published_content
from app.modules.exams.qti import build_exam_package
from app.modules.lms_export.scorm import build_scorm
from app.modules.notifications.service import Notice, notify
from app.shared import tables as t
from app.shared.audit import audit
from app.shared.auth import AuthUser, require_editor
from app.shared.db import independent, many, one
from app.shared.errors import bad_request, must, not_found
from app.shared.http import TxRouter
from app.shared.jobs import MAX_ATTEMPTS, JobCtx, define_job, enqueue
from app.shared.validation import Id

router = TxRouter(dependencies=[Depends(require_editor)])
Editor = Annotated[AuthUser, Depends(require_editor)]
HISTORY_LIMIT = 20
NOT_IN_SCORM = "Không vào gói SCORM để giữ bảo mật đề. Thi trên LMS này, hoặc tải riêng đề kèm đáp án ở mục dưới để LMS công ty tự chấm"
_a, _x = t.artifacts.c, t.lms_exports.c


class SendRequest(BaseModel):
    kind: Literal["scorm", "qti"]
    artifactId: Id | None = None


def _zip(name: str, data: bytes) -> Response:
    disposition = f"attachment; filename=\"{name}\"; filename*=UTF-8''{quote(name)}"
    return Response(data, media_type="application/zip", headers={"content-disposition": disposition})


def _approved(content: dict) -> list[dict]:
    return [q for q in (content.get("quiz") or {}).get("questions") or [] if q.get("approved")]


@router.get("/{kit_id}/export/scorm/info")
def scorm_info(kit_id: str, u: Editor) -> dict:
    """Xem trước nội dung gói (tài liệu nào được đưa vào, phần nào bỏ ra và vì sao) và các đề xuất được"""
    k = get_kit(u.org_id, kit_id)
    arts = many(select(t.artifacts).where(_a.kitId == k["id"]))
    exams = []
    for a in arts:
        if a["type"] == "exam" and a["publishedVersion"]:
            qs = _approved(published_content(a)["content"])
            exams.append({"id": a["id"], "title": a["title"], "version": a["publishedVersion"], "questions": len(qs), "manual": sum(1 for q in qs if q.get("type") in ("essay", "code"))})
    return {
        "exams": exams,
        "included": [{"id": a["id"], "type": a["type"], "title": a["title"], "version": a["publishedVersion"]} for a in arts if a["publishedVersion"] and a["type"] not in ("exam", "master")],
        "excluded": [{"id": a["id"], "type": a["type"], "title": a["title"], "reason": "Chưa xuất bản" if not a["publishedVersion"] else NOT_IN_SCORM}
                     for a in arts if a["type"] != "master" and (not a["publishedVersion"] or a["type"] == "exam")],
        "lms": {"name": settings().LMS_NAME, "configured": lms_client.configured()},
    }


@router.get("/{kit_id}/export/scorm")
def scorm_download(kit_id: str, u: Editor) -> Response:
    r = build_scorm(u.org_id, kit_id)
    audit(u, "kit.export_scorm", kit_id, {"items": r.items, "size": len(r.zip)})
    return _zip(r.name, r.zip)


@router.get("/{kit_id}/export/exam/{artifact_id}")
def exam_download(kit_id: str, artifact_id: str, u: Editor) -> Response:
    r = build_exam_package(u.org_id, kit_id, artifact_id)
    # gói có đáp án: ghi nhật ký mỗi lần tải
    audit(u, "kit.export_exam", artifact_id, {"kitId": kit_id, "questions": r.count, "size": len(r.zip)})
    return _zip(r.name, r.zip)


def _export_dto(x: dict) -> dict:
    return {k: x[k] for k in ("id", "kind", "title", "artifactId", "versions", "status", "remoteId", "error", "size", "createdAt", "sentAt")} | {"by": x.get("by") or ""}


@router.get("/{kit_id}/lms-exports")
def history(kit_id: str, u: Editor) -> dict:
    """Các lần gửi sang LMS công ty, mới nhất trước"""
    k = get_kit(u.org_id, kit_id)
    rows = many(select(t.lms_exports, t.users.c.name.label("by")).select_from(t.lms_exports.outerjoin(t.users, t.users.c.id == _x.createdBy))
                .where(_x.kitId == k["id"]).order_by(_x.createdAt.desc()).limit(HISTORY_LIMIT))
    return {"lms": {"name": settings().LMS_NAME, "configured": lms_client.configured()}, "items": [_export_dto(r) for r in rows]}


def _pin_versions(u: AuthUser, k: dict, body: SendRequest) -> tuple[str, dict[str, int], str | None]:
    """Phiên bản người soạn xác nhận gửi: kiểm tra đủ điều kiện ngay để báo lỗi trước khi xếp job"""
    if body.kind == "qti":
        a = one(select(t.artifacts).where(_a.id == (body.artifactId or ""), _a.kitId == k["id"], _a.orgId == u.org_id))
        if not a or a["type"] != "exam":
            raise not_found("Đề kiểm tra")
        if not a["publishedVersion"]:
            raise bad_request("Đề kiểm tra chưa được xuất bản")
        if not _approved(published_content(a)["content"]):
            raise bad_request("Đề chưa có câu nào được duyệt")
        return a["title"], {a["id"]: a["publishedVersion"]}, a["id"]
    arts = many(select(t.artifacts).where(_a.kitId == k["id"], _a.publishedVersion.is_not(None), _a.type.not_in(["exam", "master"])))
    if not arts:
        raise bad_request("Khóa chưa có tài liệu học nào được xuất bản")
    return k["title"], {a["id"]: a["publishedVersion"] for a in arts}, None


@router.post("/{kit_id}/lms-exports")
def send(kit_id: str, body: SendRequest, u: Editor) -> dict:
    """Người soạn xác nhận gửi gói sang LMS công ty qua API (chạy nền)"""
    if not lms_client.configured():
        raise bad_request("Chưa cấu hình API của LMS công ty (LMS_API_URL, LMS_API_TOKEN). Tải gói về rồi nhập tay.", "lms_not_configured")
    k = get_kit(u.org_id, kit_id)
    title, versions, artifact_id = _pin_versions(u, k, body)
    x = one(t.lms_exports.insert().values(orgId=u.org_id, kitId=k["id"], artifactId=artifact_id, kind=body.kind, title=title, versions=versions, createdBy=u.id).returning(t.lms_exports))
    enqueue(u.org_id, "lms.send", {"exportId": x["id"]}, u.id)
    audit(u, "kit.send_lms", k["id"], {"kind": body.kind, "exportId": x["id"], "versions": versions})
    return _export_dto(x)


@router.post("/{kit_id}/lms-exports/{export_id}/retry")
def retry(kit_id: str, export_id: str, u: Editor) -> dict:
    """Gửi lại lần gửi bị lỗi, cùng phiên bản và cùng khóa chống trùng"""
    k = get_kit(u.org_id, kit_id)
    x = must(one(select(t.lms_exports).where(_x.id == export_id, _x.kitId == k["id"])), "Lần gửi")
    if x["status"] != "failed":
        raise bad_request("Chỉ gửi lại được lần gửi bị lỗi")
    x = one(update(t.lms_exports).where(_x.id == x["id"]).values(status="queued", error=None, updatedAt=t.func_now()).returning(t.lms_exports))
    enqueue(u.org_id, "lms.send", {"exportId": x["id"]}, u.id)
    audit(u, "kit.send_lms_retry", k["id"], {"exportId": x["id"]})
    return _export_dto(x)


def _set_export(export_id: str, **values: object) -> None:
    with independent() as c:
        c.execute(update(t.lms_exports).where(_x.id == export_id).values(**values, updatedAt=t.func_now()))


def _finish(x: dict, ok: bool, detail: str) -> None:
    kind = "đề" if x["kind"] == "qti" else "khóa"
    if ok:
        n = Notice("lms.sent", f"Đã gửi {kind} sang {settings().LMS_NAME}: {x['title']}", f"{settings().LMS_NAME} đã nhận gói (mã {detail}).", f"/kit/{x['kitId']}", x["kitId"])
    else:
        n = Notice("lms.failed", f"Gửi {kind} sang {settings().LMS_NAME} lỗi: {x['title']}", detail, f"/kit/{x['kitId']}", x["kitId"])
    if x["createdBy"]:
        with independent():
            notify(x["orgId"], [x["createdBy"]], n)


@define_job("lms.send")
def send_to_lms(ctx: JobCtx) -> dict:
    x = one(select(t.lms_exports).where(_x.id == str(ctx.payload["exportId"])))
    if not x or x["status"] == "sent":
        return {"skipped": True}
    _set_export(x["id"], status="sending")
    try:
        if x["kind"] == "qti":
            pkg = build_exam_package(x["orgId"], x["kitId"], x["artifactId"], x["versions"].get(x["artifactId"]))
            data, ref = pkg.zip, x["artifactId"]
        else:
            scorm = build_scorm(x["orgId"], x["kitId"], x["versions"])
            data, ref = scorm.zip, x["kitId"]
        receipt = lms_client.send_package(key=x["id"], kind=x["kind"], title=x["title"], source_ref=ref, zip_bytes=data)
    except lms_client.LmsUnavailable as e:
        final = ctx.job["attempts"] >= MAX_ATTEMPTS
        _set_export(x["id"], status="failed" if final else "queued", error=str(e))
        if final:
            _finish(x, False, str(e))
        raise
    except Exception as e:  # noqa: BLE001 - LMS từ chối hoặc không đóng được gói: không thử lại, báo người gửi
        msg = getattr(e, "message", None) or str(e)
        _set_export(x["id"], status="failed", error=msg[:500])
        _finish(x, False, msg[:500])
        return {"error": msg}
    _set_export(x["id"], status="sent", remoteId=receipt.remote_id, error=None, size=len(data), sentAt=t.func_now())
    _finish(x, True, receipt.remote_id)
    return {"remoteId": receipt.remote_id}

