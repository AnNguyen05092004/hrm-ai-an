import httpx
import pytest
from helpers import drain_jobs, kit_by, unzip

from app.adapters import lms_client
from app.config import settings


class FakeLms:
    """LMS công ty giả: nhận gói, chống trùng theo Idempotency-Key"""

    def __init__(self) -> None:
        self.received: dict[str, dict] = {}
        self.fail_with: int | None = None

    def post(self, url: str, content: bytes, headers: dict, timeout: float) -> httpx.Response:  # noqa: ARG002
        req = httpx.Request("POST", url)
        if self.fail_with:
            return httpx.Response(self.fail_with, json={"error": {"message": "Gói không hợp lệ"}}, request=req)
        assert headers["Authorization"] == "Bearer test-token"
        key = headers["Idempotency-Key"]
        rec = self.received.setdefault(key, {"id": f"lms-{len(self.received) + 1}", "kind": headers["X-Package-Kind"], "zip": content})
        return httpx.Response(201, json={"id": rec["id"], "status": "received"}, request=req)


@pytest.fixture
def lms(monkeypatch):
    fake = FakeLms()
    monkeypatch.setattr(lms_client.httpx, "post", fake.post)
    return fake


@pytest.fixture
def player(tmp_path, monkeypatch):
    (tmp_path / "scorm.html").write_text("<!doctype html>")
    monkeypatch.setattr(settings(), "SCORM_PLAYER_DIR", str(tmp_path))


def _history(ctx, kit_id):
    return ctx.author("GET", f"/api/kits/{kit_id}/lms-exports").body


def test_send_exam_to_lms_pins_confirmed_version(ctx, lms):
    sec = kit_by(ctx.author, "An toàn")
    exam = next(a for a in sec["artifacts"] if a["type"] == "exam")
    r = ctx.author("POST", f"/api/kits/{sec['id']}/lms-exports", {"kind": "qti", "artifactId": exam["id"]})
    assert r.status == 200 and r.body["status"] == "queued" and r.body["versions"] == {exam["id"]: 1}
    # sửa và xuất bản bản mới sau khi đã xác nhận: gói gửi đi vẫn là bản 1
    e = ctx.author("GET", f"/api/artifacts/{exam['id']}").body
    ctx.author("PATCH", f"/api/artifacts/{exam['id']}", {"title": "Đề đã đổi tên", "content": {"quiz": e["quiz"], "plan": e["plan"]}})
    assert ctx.author("POST", f"/api/artifacts/{exam['id']}/publish", {}).body["publishedVersion"] == 2
    drain_jobs()
    x = _history(ctx, sec["id"])["items"][0]
    assert x["status"] == "sent" and x["remoteId"] == "lms-1" and x["size"] > 0 and x["by"] == "Nguyễn An"
    sent = unzip(next(iter(lms.received.values()))["zip"])
    assert '"version": 1' in sent["exam.json"].decode() and "Đề đã đổi tên" not in sent["exam.json"].decode()
    assert ctx.author("GET", "/api/notifications").body["items"][0]["kind"] == "lms.sent"
    assert any(a["action"] == "kit.send_lms" for a in ctx.admin("GET", "/api/audit").body)


def test_send_course_scorm(ctx, lms, player):
    sec = kit_by(ctx.author, "An toàn")
    r = ctx.author("POST", f"/api/kits/{sec['id']}/lms-exports", {"kind": "scorm"})
    assert r.status == 200
    assert all(t_ != "exam" for t_ in r.body["versions"])  # đề kiểm tra không vào gói SCORM
    drain_jobs()
    x = _history(ctx, sec["id"])["items"][0]
    assert x["kind"] == "scorm" and x["status"] == "sent"
    assert "imsmanifest.xml" in unzip(lms.received[x["id"]]["zip"])


def test_lms_rejects_then_retry_with_same_key(ctx, lms):
    sec = kit_by(ctx.author, "An toàn")
    exam = next(a for a in sec["artifacts"] if a["type"] == "exam")
    lms.fail_with = 422
    xid = ctx.author("POST", f"/api/kits/{sec['id']}/lms-exports", {"kind": "qti", "artifactId": exam["id"]}).body["id"]
    drain_jobs()
    x = next(i for i in _history(ctx, sec["id"])["items"] if i["id"] == xid)
    assert x["status"] == "failed" and "Gói không hợp lệ" in x["error"]
    assert ctx.author("GET", "/api/notifications").body["items"][0]["kind"] == "lms.failed"
    lms.fail_with = None
    assert ctx.author("POST", f"/api/kits/{sec['id']}/lms-exports/{xid}/retry").status == 200
    drain_jobs()
    assert next(i for i in _history(ctx, sec["id"])["items"] if i["id"] == xid)["status"] == "sent"
    assert ctx.author("POST", f"/api/kits/{sec['id']}/lms-exports/{xid}/retry").status == 400


def test_lms_down_retries_then_fails(ctx, lms):
    sec = kit_by(ctx.author, "An toàn")
    exam = next(a for a in sec["artifacts"] if a["type"] == "exam")
    lms.fail_with = 503
    xid = ctx.author("POST", f"/api/kits/{sec['id']}/lms-exports", {"kind": "qti", "artifactId": exam["id"]}).body["id"]
    drain_jobs()
    x = next(i for i in _history(ctx, sec["id"])["items"] if i["id"] == xid)
    assert x["status"] == "failed" and "503" in x["error"]


def test_send_requires_published_content_and_editor(ctx, lms):
    docker = kit_by(ctx.author, "Docker")
    assert ctx.author("POST", f"/api/kits/{docker['id']}/lms-exports", {"kind": "qti", "artifactId": "khong-co"}).status == 404
    assert ctx.reviewer("POST", f"/api/kits/{docker['id']}/lms-exports", {"kind": "scorm"}).status == 403
    c = ctx.author("POST", "/api/kits", {"goal": "Khóa chưa xuất bản gì"})
    drain_jobs()
    assert ctx.author("POST", f"/api/kits/{c.body['id']}/lms-exports", {"kind": "scorm"}).status == 400


def test_not_configured(ctx, monkeypatch):
    monkeypatch.setattr(settings(), "LMS_API_TOKEN", "")
    sec = kit_by(ctx.author, "An toàn")
    r = ctx.author("POST", f"/api/kits/{sec['id']}/lms-exports", {"kind": "scorm"})
    assert r.status == 400 and r.body["error"]["code"] == "lms_not_configured"
    assert _history(ctx, sec["id"])["lms"]["configured"] is False
