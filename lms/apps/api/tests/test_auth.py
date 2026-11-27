from app.config import Settings, demo_mode, settings


def test_rejects_wrong_password(ctx):
    r = ctx.anon()("POST", "/api/auth/login", {"email": "an@demo.local", "password": "sai"})
    assert r.status == 401
    assert r.body["error"]["code"] == "bad_credentials"


def test_returns_current_user(ctx):
    r = ctx.author("GET", "/api/auth/me")
    assert r.status == 200
    assert r.body["role"] == "author" and r.body["orgName"] == "Công ty demo"


def test_me_requires_login(ctx):
    assert ctx.anon()("GET", "/api/auth/me").status == 401


def test_blocks_writes_without_csrf_header(ctx):
    assert ctx.anon().http.post("/api/auth/logout").status_code == 403


def test_logout_invalidates_session(ctx):
    c = ctx.login("ha@demo.local")
    assert c("POST", "/api/auth/logout").status == 200
    assert c("GET", "/api/auth/me").status == 401


def test_demo_mode_switches_role_only_to_demo_accounts(ctx):
    anon = ctx.anon()
    assert [u["role"] for u in anon("GET", "/api/auth/demo").body] == ["author", "reviewer", "admin"]
    assert anon("POST", "/api/auth/demo", {"email": "ha@demo.local"}).status == 200
    me = anon("GET", "/api/auth/me").body
    assert me["role"] == "reviewer" and me["demo"] is True
    assert ctx.anon()("POST", "/api/auth/demo", {"email": "nam.lh@demo.local"}).status == 400


def test_demo_mode_off_in_production_unless_explicit():
    base = settings().model_dump()
    assert demo_mode(Settings(**{**base, "NODE_ENV": "production", "DEMO_MODE": None})) is False
    assert demo_mode(Settings(**{**base, "NODE_ENV": "production", "DEMO_MODE": "true"})) is True
    assert demo_mode(Settings(**{**base, "NODE_ENV": "development", "DEMO_MODE": "false"})) is False


def test_validation_errors_use_error_shape(ctx):
    r = ctx.anon()("POST", "/api/auth/login", {"email": "khong-phai-email", "password": "x"})
    assert r.status == 400 and r.body["error"]["code"] == "validation"
