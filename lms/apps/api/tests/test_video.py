import re

from helpers import drain_jobs

from app.modules.media.slide_svg import slide_svg

state: dict[str, str] = {}


def test_video_from_deck_with_captions(ctx):
    deck = next(a for a in ctx.author("GET", "/api/artifacts").body if a["type"] == "deck")
    r = ctx.author("POST", f"/api/artifacts/{deck['id']}/to-video")
    assert r.status == 200
    state["id"] = r.body["id"]
    drain_jobs()
    v = ctx.author("GET", f"/api/artifacts/{state['id']}").body
    assert v["render"]["status"] == "done"
    assert len(v["chapters"]) == len(v["slides"]) and v["transcript"]
    vtt = ctx.author.http.get(v["render"]["vtt"])
    assert vtt.status_code == 200 and vtt.text.startswith("WEBVTT")


def test_rerender_reuses_unchanged_segments(ctx):
    v = ctx.author("GET", f"/api/artifacts/{state['id']}").body
    slides = v["slides"]
    slides[0]["notes"] = "Lời đọc mới cho đoạn mở đầu."
    ctx.author("PATCH", f"/api/artifacts/{state['id']}", {"content": {**v, "slides": slides}})
    assert ctx.author("POST", f"/api/artifacts/{state['id']}/render").status == 200
    drain_jobs()
    assert ctx.author("GET", f"/api/artifacts/{state['id']}").body["render"]["reused"] == len(slides) - 1


def test_media_blocked_for_users_who_cannot_view(ctx):
    v = ctx.author("GET", f"/api/artifacts/{state['id']}").body
    assert ctx.reviewer("GET", v["render"]["url"]).status == 403
    assert ctx.author("GET", f"/api/media/{state['id']}/..%2F..%2Fsecret.mp4").status == 404


def test_slide_formatting_in_rendered_frame():
    svg = slide_svg({"layout": "bullets", "title": "Tiêu đề", "items": ["Ý một"], "bg": "#fff7ed", "st": {"title": {"color": "#2563eb", "size": 1.5, "x": 10}},
                     "boxes": [{"id": "b", "x": 50, "y": 60, "w": 30, "text": "Hộp chữ", "fill": "#111827", "color": "#ffffff"}]}, 1, 1)
    assert 'fill="#fff7ed"' in svg and 'fill="#2563eb"' in svg and re.search(r"scale\(1\.5\)", svg) and "Hộp chữ" in svg
    # màu không hợp lệ bị bỏ qua, không chèn được vào SVG
    assert "<script>" not in slide_svg({"layout": "bullets", "title": "x", "items": [], "bg": '"/><script>'}, 1, 1)


def test_background_images_shapes_and_opacity():
    pic = "data:image/png;base64,AAAA"
    s = {"layout": "bullets", "title": "Tiêu đề", "items": ["Ý một"], "bgImg": "desk", "bgTone": "dark", "st": {"title": {"u": True}}, "boxes": [
        {"id": "p", "kind": "img", "img": "desk", "x": 10, "y": 10, "w": 20, "h": 30, "r": True},
        {"id": "r", "kind": "shape", "shape": "round", "x": 40, "y": 10, "w": 20, "h": 20, "fill": "#fde68a", "stroke": "#111827", "sw": 4, "op": 0.5},
        {"id": "c", "kind": "shape", "shape": "circle", "x": 70, "y": 10, "w": 10, "h": 18, "fill": "#bbf7d0"},
        {"id": "a", "kind": "shape", "shape": "arrow", "x": 10, "y": 70, "w": 40, "stroke": "#2563eb", "sw": 3},
        {"id": "x", "kind": "shape", "shape": "rect", "x": 0, "y": 0, "w": 5, "h": 5, "fill": '"/><script>'},
    ]}
    svg = slide_svg(s, 1, 1, "#ff6119", None, {"bg": pic, "el:p": pic})
    assert svg.count("<image ") == 2  # ảnh nền + ảnh chèn
    assert 'fill="#0f172a" fill-opacity="0.6"' in svg and 'fill="#f8fafc"' in svg
    assert 'text-decoration="underline"' in svg and '<g opacity="0.5">' in svg and "<ellipse" in svg and "<polygon" in svg
    assert "<script>" not in svg
    # ảnh chưa tải được thì bỏ qua phần tử; slide cũ không có phần tử mới vẫn dựng như trước
    assert "<image " not in slide_svg({**s, "boxes": [s["boxes"][0]]}, 1, 1)
    assert "fill-opacity" not in slide_svg({"layout": "bullets", "title": "x", "items": ["a"]}, 1, 1)


def test_rotation_and_fonts():
    svg = slide_svg({"layout": "bullets", "title": "Tiêu đề", "items": ["Ý"], "font": "lora", "st": {"title": {"font": "mono"}}, "boxes": [
        {"id": "r", "kind": "shape", "shape": "rect", "x": 10, "y": 10, "w": 20, "h": 20, "fill": "#fde68a", "rot": 45},
        {"id": "t", "x": 50, "y": 50, "w": 30, "text": "Chữ", "font": "script", "rot": -30},
        {"id": "z", "kind": "shape", "shape": "rect", "x": 0, "y": 0, "w": 5, "h": 5, "rot": '1)"/><script>'},
    ]}, 1, 1)
    assert "rotate(45 256.0 144.0)" in svg  # tâm hình: x 10%+10% của 1280, y 10%+10% của 720
    assert re.search(r"rotate\(-30 ", svg)
    assert re.search(r'<svg[^>]*font-family="Lora, Georgia, serif"', svg)
    assert "font-family=\"'Roboto Mono', 'Courier New', monospace\"" in svg and "font-family=\"'Dancing Script'" in svg
    assert "<script>" not in svg
    assert "onload" not in slide_svg({"layout": "bullets", "title": "x", "items": [], "font": 'x" onload="'}, 1, 1)
    assert 'font-family="Arial, Helvetica, sans-serif"' in slide_svg({"layout": "bullets", "title": "x", "items": [], "font": "toString"}, 1, 1)


def test_voice_preview_needs_real_ai_and_author(ctx):
    assert ctx.author("POST", "/api/tts", {"text": "Xin chào"}).status == 400
    assert ctx.reviewer("POST", "/api/tts", {"text": "Xin chào"}).status == 403
