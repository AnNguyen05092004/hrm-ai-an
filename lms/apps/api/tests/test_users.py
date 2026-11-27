import re


def test_only_admin_manages_users_and_audit(ctx):
    assert sorted(u["role"] for u in ctx.admin("GET", "/api/users").body) == ["admin", "author", "reviewer", "reviewer"]
    assert ctx.author("GET", "/api/users").status == 403
    assert ctx.reviewer("GET", "/api/audit").status == 403
    assert ctx.author("PATCH", "/api/settings/ai", {"quota": 50_000}).status == 403
    assert ctx.admin("PATCH", "/api/settings/ai", {"quota": 50_000}).status == 200


def test_create_account_with_temp_password(ctx):
    r = ctx.admin("POST", "/api/users", {"name": "Trần Mai", "email": "Mai.T@demo.local", "role": "reviewer", "title": "Chuyên gia pháp chế"})
    assert r.status == 200
    assert r.body["email"] == "mai.t@demo.local" and r.body["role"] == "reviewer"
    assert re.fullmatch(r"[A-Za-z2-9]{12}", r.body["tempPassword"])
    login = ctx.anon()("POST", "/api/auth/login", {"email": "mai.t@demo.local", "password": r.body["tempPassword"]})
    assert login.status == 200
    assert ctx.admin("POST", "/api/users", {"name": "Trùng", "email": "mai.t@demo.local", "role": "author"}).status == 409
    assert not any("passwordHash" in u for u in ctx.admin("GET", "/api/users").body)


def test_disable_or_role_change_ends_sessions_and_no_self_demotion(ctx):
    mai = next(u for u in ctx.admin("GET", "/api/users").body if u["email"] == "mai.t@demo.local")
    temp = ctx.admin("POST", f"/api/users/{mai['id']}/reset-password").body["tempPassword"]
    mc = ctx.anon()
    assert mc("POST", "/api/auth/login", {"email": mai["email"], "password": temp}).status == 200
    assert mc("GET", "/api/reviews").status == 200
    assert ctx.admin("PATCH", f"/api/users/{mai['id']}", {"role": "author"}).body["role"] == "author"
    assert mc("GET", "/api/auth/me").status == 401
    assert ctx.admin("PATCH", f"/api/users/{ctx.ids.adminId}", {"role": "author"}).status == 400
    assert ctx.admin("PATCH", f"/api/users/{ctx.ids.adminId}", {"active": False}).status == 400


def test_reviewer_role_change_drops_invitations(ctx):
    assert ctx.admin("PATCH", f"/api/users/{ctx.ids.reviewer2Id}", {"role": "author"}).status == 200
    docker = next(k for k in ctx.author("GET", "/api/kits").body if k["title"].startswith("Docker"))
    assert (docker["review"] or {}).get("total", 0) == 0
