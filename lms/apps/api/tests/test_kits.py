from helpers import drain_jobs

DOC = """# Quy trình triển khai

## 1. Chuẩn bị
Trước khi triển khai phải chạy toàn bộ test tự động và quality gate. Không bỏ qua bước này.

## 2. Rollback
Nếu lỗi sau triển khai, rollback trong vòng 15 phút bằng lệnh deploy rollback. Ghi lại sự cố vào sổ.
"""
state: dict[str, str] = {}


def test_upload_and_process_source(ctx):
    r = ctx.author.upload("/api/sources", "trien-khai.md", DOC, "text/markdown")
    assert r.status == 200
    state["source"] = r.body["source"]["id"]
    drain_jobs()
    s = ctx.author("GET", f"/api/sources/{state['source']}").body
    assert s["status"] == "ready"
    assert "mục 2 Rollback" in [c["section"] for c in s["chunks"]]


def test_rejects_unsupported_files(ctx):
    assert ctx.author.upload("/api/sources", "virus.exe", "MZ", "application/octet-stream").status == 400


def test_reviewers_cannot_use_authoring_api(ctx):
    assert ctx.reviewer("GET", "/api/kits").status == 403
    assert ctx.reviewer("POST", "/api/kits", {"goal": "Tạo khóa CI/CD"}).status == 403


def test_details_outline_then_cited_content(ctx):
    c = ctx.author("POST", "/api/kits", {"goal": "Tạo khóa CI/CD cho dev mới: quy trình triển khai và rollback", "sourceIds": [state["source"]]})
    assert c.status == 200
    kid = state["kit"] = c.body["id"]
    drain_jobs()
    k = ctx.author("GET", f"/api/kits/{kid}").body
    assert k["stage"] == "details"
    assert len(k["plan"]) == 1 and k["plan"][0]["type"] == "master" and k["plan"][0]["title"] == "Nội dung"
    assert ctx.author("POST", f"/api/kits/{kid}/outline").status == 200
    drain_jobs()
    k = ctx.author("GET", f"/api/kits/{kid}").body
    assert k["stage"] == "outline"
    assert len(k["plan"][0]["outline"]["sections"]) > 3
    assert ctx.author("POST", f"/api/kits/{kid}/generate").status == 200
    assert ctx.author("POST", f"/api/kits/{kid}/generate").status == 409
    drain_jobs()
    k = ctx.author("GET", f"/api/kits/{kid}").body
    assert [a["type"] for a in k["artifacts"]] == ["master"]
    assert k["master"]["lockedVersion"] is None
    m = ctx.author("GET", f"/api/artifacts/{k['master']['id']}").body
    assert len(m["lessons"]) > 3
    assert any(str(b.get("src", "")).startswith("trien-khai.md · ") for b in m["lessons"][0]["blocks"])
    assert "quiz" not in m


def test_formats_need_locked_content(ctx):
    kid = state["kit"]
    k = ctx.author("GET", f"/api/kits/{kid}").body
    item = {"type": "qr", "title": "CI/CD: những điều cần biết", "summary": "Tóm gọn"}
    early = ctx.author("POST", f"/api/kits/{kid}/artifacts", item)
    assert early.status == 400 and early.body["error"]["code"] == "master_not_locked"
    assert ctx.author("POST", f"/api/kits/{kid}/exams", {"matrix": [{"type": "mc", "level": 1, "count": 2}]}).status == 400
    assert ctx.author("POST", f"/api/artifacts/{k['master']['id']}/publish", {"note": "Chốt nội dung"}).status == 200
    assert ctx.author("POST", f"/api/kits/{kid}/artifacts", item).status == 200
    assert ctx.author("POST", f"/api/kits/{kid}/artifacts", {"type": "deck", "title": "CI/CD trong 10 phút", "summary": "Slide"}).status == 200
    drain_jobs()
    after = ctx.author("GET", f"/api/kits/{kid}").body
    assert after["master"]["lockedVersion"] == 1 and after["master"]["changed"] is False
    qr = next(a for a in after["artifacts"] if a["type"] == "qr")
    deck = next(a for a in after["artifacts"] if a["type"] == "deck")
    assert qr["basedOn"] == 1 and deck["basedOn"] == 1
    a = ctx.author("GET", f"/api/artifacts/{qr['id']}").body
    # định dạng soạn từ nội dung vẫn trích đúng tài liệu nguồn gốc
    assert any(str(b.get("src", "")).startswith("trien-khai.md · ") and (b.get("srcRef") or {}).get("sourceId") == state["source"] for b in a["lessons"][0]["blocks"])
    assert a["quiz"]["questions"] and all(q["approved"] is False for q in a["quiz"]["questions"])
    # nội dung không xuất bản cùng cả khóa
    assert not any(x["type"] == "master" for x in ctx.author("GET", f"/api/kits/{kid}/publish-status").body["items"])


def test_relock_marks_formats_built_from_older_version(ctx):
    kid = state["kit"]
    k = ctx.author("GET", f"/api/kits/{kid}").body
    m = ctx.author("GET", f"/api/artifacts/{k['master']['id']}").body
    m["lessons"][0]["title"] = "Chuẩn bị trước khi triển khai"
    ctx.author("PATCH", f"/api/artifacts/{m['id']}", {"content": {"lessons": m["lessons"]}})
    assert ctx.author("GET", f"/api/kits/{kid}").body["master"] == {**k["master"], "changed": True}
    ctx.author("POST", f"/api/artifacts/{m['id']}/publish", {"note": "Chốt lại"})
    k2 = ctx.author("GET", f"/api/kits/{kid}").body
    assert k2["master"]["lockedVersion"] == 2 and k2["master"]["changed"] is False
    qr = next(a for a in k2["artifacts"] if a["type"] == "qr")
    assert qr["basedOn"] == 1
    assert ctx.author("POST", f"/api/artifacts/{qr['id']}/regenerate", {"force": True}).status == 200
    drain_jobs()
    assert next(a for a in ctx.author("GET", f"/api/kits/{kid}").body["artifacts"] if a["id"] == qr["id"])["basedOn"] == 2


def test_lock_warnings_point_to_exact_blocks(ctx):
    k = ctx.author("GET", f"/api/kits/{state['kit']}").body
    m = ctx.author("GET", f"/api/artifacts/{k['master']['id']}").body
    lesson = m["lessons"][1]
    lesson["blocks"] += [{"id": "b-gap-test", "t": "gap", "p": "Chưa có quy định về <b>thời gian</b> chờ duyệt"}, {"id": "b-nosrc-test", "t": "para", "p": "Tự viết", "nosrc": True}]
    ctx.author("PATCH", f"/api/artifacts/{m['id']}", {"content": {"lessons": m["lessons"]}})
    chk = ctx.author("GET", f"/api/artifacts/{m['id']}/check").body
    assert {"kind": "gap", "lesson": lesson["id"], "lessonTitle": lesson["title"], "block": "b-gap-test", "text": "Chưa có quy định về thời gian chờ duyệt"} in chk["spots"]
    assert {"kind": "nosrc", "lesson": lesson["id"], "lessonTitle": lesson["title"], "block": "b-nosrc-test", "text": "Tự viết"} in chk["spots"]
    assert any("thiếu căn cứ" in w for w in chk["warnings"])


def test_ai_adds_a_lesson_from_content(ctx):
    k = ctx.author("GET", f"/api/kits/{state['kit']}").body
    qr = next(a for a in k["artifacts"] if a["type"] == "qr")
    r = ctx.author("POST", f"/api/artifacts/{qr['id']}/lessons/generate", {"title": "Rollback khi có sự cố", "instruction": "các bước và thời hạn"})
    assert r.status == 200
    assert r.body["lesson"]["kind"] == "lesson" and r.body["lesson"]["title"] == "Rollback khi có sự cố"
    assert len(r.body["lesson"]["blocks"]) > 1
    assert ctx.reviewer("POST", f"/api/artifacts/{qr['id']}/lessons/generate", {"title": "x x"}).status == 403


def test_autosave_and_publish_version(ctx):
    k = ctx.author("GET", f"/api/kits/{state['kit']}").body
    qr = next(a for a in k["artifacts"] if a["type"] == "qr")
    a = ctx.author("GET", f"/api/artifacts/{qr['id']}").body
    lessons, quiz = a["lessons"], a["quiz"]
    lessons[0]["title"] = "Bài đã sửa tay"
    quiz["questions"][0]["approved"] = True
    assert ctx.author("PATCH", f"/api/artifacts/{qr['id']}", {"title": "CI/CD cho dev mới", "content": {"lessons": lessons, "quiz": quiz}}).status == 200
    pub = ctx.author("POST", f"/api/artifacts/{qr['id']}/publish", {"note": "Bản đầu"})
    assert pub.status == 200 and pub.body["publishedVersion"] == 1
    v = ctx.author("GET", f"/api/artifacts/{qr['id']}/versions").body
    assert v[0]["version"] == 1 and v[0]["note"] == "Bản đầu"


def test_cannot_read_missing_kit(ctx):
    assert ctx.author("GET", "/api/kits/khong-ton-tai").status == 404
