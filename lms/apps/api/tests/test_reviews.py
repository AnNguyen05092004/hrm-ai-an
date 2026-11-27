from helpers import kit_by


def test_reviewer_sees_only_invited_kits(ctx):
    inbox = ctx.reviewer("GET", "/api/reviews").body
    assert sorted(x["title"] for x in inbox) == ["An toàn thông tin cho mọi nhân viên", "Nghỉ phép cho nhân viên mới"]
    docker = kit_by(ctx.author, "Docker")
    assert ctx.reviewer("GET", f"/api/reviews/kits/{docker['id']}").status == 403
    assert ctx.reviewer("GET", f"/api/view/{docker['artifacts'][0]['id']}").status == 403
    assert ctx.reviewer("PATCH", f"/api/kits/{docker['id']}", {"title": "x"}).status == 403
    sec = kit_by(ctx.author, "An toàn")
    view = ctx.reviewer("GET", f"/api/view/{sec['artifacts'][0]['id']}")
    assert view.status == 200 and view.body["draft"] is True


def test_invite_only_reviewers_without_duplicates(ctx):
    sql = kit_by(ctx.author, "SQL")
    detail = ctx.author("GET", f"/api/reviews/kits/{sql['id']}").body
    assert all(c["role"] == "reviewer" for c in detail["candidates"])
    assert ctx.author("POST", f"/api/reviews/kits/{sql['id']}/invite", {"reviewerIds": [ctx.ids.authorId]}).status == 400
    r = ctx.author("POST", f"/api/reviews/kits/{sql['id']}/invite", {"reviewerIds": [ctx.ids.reviewerId, ctx.ids.reviewer2Id], "message": "Xem giúp câu lệnh JOIN", "due": "2026-12-31"})
    assert r.body == {"invited": 2, "skipped": 0}
    assert ctx.author("POST", f"/api/reviews/kits/{sql['id']}/invite", {"reviewerIds": [ctx.ids.reviewerId]}).body == {"invited": 0, "skipped": 1}
    assert ctx.reviewer("POST", f"/api/reviews/kits/{sql['id']}/invite", {"reviewerIds": [ctx.ids.reviewer2Id]}).status == 403
    review = kit_by(ctx.author, "SQL")["review"]
    assert review["total"] == 2 and review["pending"] == 2


def test_comment_with_anchor_reply_and_resolve(ctx):
    sec = kit_by(ctx.author, "An toàn")
    qr = next(a for a in sec["artifacts"] if a["type"] == "qr")
    c = ctx.reviewer("POST", f"/api/reviews/kits/{sec['id']}/comments", {"body": "Thiếu bước báo cho bộ phận IT", "artifactId": qr["id"], "anchor": {"key": "lesson:x", "label": "Bài 3: Lỡ bấm rồi thì làm gì"}})
    assert c.status == 200
    docker = kit_by(ctx.author, "Docker")
    assert ctx.reviewer("POST", f"/api/reviews/kits/{sec['id']}/comments", {"body": "x", "artifactId": docker["artifacts"][0]["id"]}).status == 404
    assert ctx.author("POST", f"/api/reviews/kits/{sec['id']}/comments", {"body": "Đã thêm bước báo IT", "parentId": c.body["id"]}).status == 200
    assert ctx.reviewer("DELETE", f"/api/reviews/comments/{c.body['id']}").status == 400  # đã có trả lời
    assert ctx.author("PATCH", f"/api/reviews/comments/{c.body['id']}", {"resolved": True}).status == 200
    d = ctx.reviewer("GET", f"/api/reviews/kits/{sec['id']}").body
    top = next(x for x in d["comments"] if x["id"] == c.body["id"])
    assert top["artifactId"] == qr["id"] and top["anchor"]["label"] == "Bài 3: Lỡ bấm rồi thì làm gì" and top["resolvedBy"] == "Nguyễn An"
    assert top["replies"][0]["body"] == "Đã thêm bước báo IT"
    assert d["candidates"] == []  # reviewer không thấy danh sách để mời


def test_changes_needs_reason_and_request_again_opens_new_round(ctx):
    leave = kit_by(ctx.author, "Nghỉ phép")
    assert ctx.reviewer("POST", f"/api/reviews/kits/{leave['id']}/decision", {"status": "changes"}).status == 400
    assert ctx.reviewer("POST", f"/api/reviews/kits/{leave['id']}/decision", {"status": "changes", "note": "Cập nhật số ngày phép năm 2027"}).status == 200
    assert ctx.author("POST", f"/api/reviews/kits/{leave['id']}/decision", {"status": "approved"}).status == 403
    assert ctx.author("POST", f"/api/reviews/kits/{leave['id']}/request-again", {"message": "Đã cập nhật số ngày phép"}).body == {"reviewers": 1}
    mine = ctx.reviewer("GET", f"/api/reviews/kits/{leave['id']}").body["mine"]
    assert (mine["status"], mine["round"], mine["message"]) == ("pending", 2, "Đã cập nhật số ngày phép")
    assert ctx.reviewer("POST", f"/api/reviews/kits/{leave['id']}/decision", {"status": "approved", "note": "Ổn"}).body == {"status": "approved"}
    log = ctx.admin("GET", "/api/audit").body
    assert sum(1 for x in log if x["action"] == "review.decision") >= 2


def test_removed_reviewer_loses_access(ctx):
    sql = kit_by(ctx.author, "SQL")
    nam = ctx.login("nam.lh@demo.local")
    assert nam("GET", f"/api/reviews/kits/{sql['id']}").status == 200
    r = next(x for x in ctx.author("GET", f"/api/reviews/kits/{sql['id']}").body["reviewers"] if x["user"]["id"] == ctx.ids.reviewer2Id)
    assert ctx.author("DELETE", f"/api/reviews/kits/{sql['id']}/reviewers/{r['id']}").status == 200
    assert nam("GET", f"/api/reviews/kits/{sql['id']}").status == 403
