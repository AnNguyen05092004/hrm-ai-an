import base64
import re
from pathlib import Path

from helpers import drain_jobs

from app.adapters.preset_images import PRESET_IMAGES
from app.modules.media.images import sniff_image

PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")


def test_sniff_image_by_bytes():
    assert sniff_image(PNG) == "image/png"
    assert sniff_image(b'<svg xmlns="http://www.w3.org/2000/svg"></svg>') is None


def test_upload_and_ai_images_visible_inside_org_only(ctx):
    up = ctx.author.upload("/api/images", "logo.png", PNG, "image/png")
    assert up.status == 200 and up.body["url"].startswith("/api/images/")
    assert ctx.author.upload("/api/images", "x.png", "<script>alert(1)</script>", "image/png").status == 400
    gen = ctx.author("POST", "/api/images/generate", {"prompt": "Kỹ sư kiểm tra tủ máy chủ"})
    assert gen.status == 200
    assert sorted(x["kind"] for x in ctx.author("GET", "/api/images").body) == ["ai", "upload"]
    assert ctx.reviewer("GET", gen.body["url"]).status == 200
    assert ctx.reviewer("POST", "/api/images/generate", {"prompt": "abc"}).status == 403


def test_kit_theme_saved_and_applied_to_preview(ctx):
    k = next(x for x in ctx.author("GET", "/api/kits").body if any(a["publishedVersion"] for a in x["artifacts"]))
    r = ctx.author("PATCH", f"/api/kits/{k['id']}", {"theme": {"accent": "#2563eb", "font": "modern"}, "img": "desk"})
    assert r.status == 200 and r.body["theme"] == {"accent": "#2563eb", "font": "modern"}
    assert ctx.author("PATCH", f"/api/kits/{k['id']}", {"theme": {"accent": "red;}", "font": "modern"}}).status == 400
    a = next(x for x in k["artifacts"] if x["publishedVersion"])
    assert ctx.author("GET", f"/api/view/{a['id']}").body["theme"]["accent"] == "#2563eb"


def test_drag_drop_question_types_publish_and_preview_answers(ctx):
    kit = ctx.author("GET", "/api/kits").body[0]
    ex = ctx.author("POST", f"/api/kits/{kit['id']}/exams", {"levels": [1, 2], "perLevel": 3, "mode": "practice", "types": ["match", "order", "cat"]})
    assert ex.status == 200, ex.body
    drain_jobs()
    e = ctx.author("GET", f"/api/artifacts/{ex.body['id']}").body
    assert {"match", "order", "cat"} <= {q["type"] for q in e["quiz"]["questions"]}
    qs = [{**q, "approved": True} for q in e["quiz"]["questions"] if q["type"] in ("match", "order", "cat")]
    ctx.author("PATCH", f"/api/artifacts/{e['id']}", {"content": {"quiz": {**e["quiz"], "pick": len(qs), "questions": qs}}})
    assert ctx.author("POST", f"/api/artifacts/{e['id']}/publish", {}).status == 200
    view = ctx.author("GET", f"/api/view/{e['id']}").body
    assert {"match", "order", "cat"} <= {q["type"] for q in view["questions"]}
    assert next(q for q in view["questions"] if q["type"] == "match")["pairs"]


def test_preset_images_match_web():
    web = (Path(__file__).resolve().parents[2] / "web" / "src" / "data.js").read_text(encoding="utf-8")
    ids = dict(re.findall(r"^\s+(\w+): \{ src: U\('([\w-]+)'\)", web, re.M))
    assert ids == PRESET_IMAGES
