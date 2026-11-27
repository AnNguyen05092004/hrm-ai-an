def _deck(ctx):
    return next(a for a in ctx.author("GET", "/api/artifacts").body if a["type"] == "deck")


def test_ai_edit_keeps_id_type_source_and_slide_formatting(ctx):
    slide = {"id": "s-1", "layout": "bullets", "title": "Tiêu đề", "items": ["Ý một"], "notes": "Lời đọc", "st": {"title": {"color": "#2563eb"}},
             "boxes": [{"id": "b", "x": 1, "y": 1, "w": 20, "text": "Hộp"}], "src": "file · mục"}
    r = ctx.author("POST", f"/api/artifacts/{_deck(ctx)['id']}/ai-edit", {"kind": "slide", "value": slide, "instruction": "Viết ngắn gọn hơn"})
    assert r.status == 200
    assert {k: r.body[k] for k in ("id", "layout", "src", "st")} == {"id": "s-1", "layout": "bullets", "src": "file · mục", "st": {"title": {"color": "#2563eb"}}}
    assert len(r.body["boxes"]) == 1


def test_ai_edit_rejects_reviewers(ctx):
    r = ctx.reviewer("POST", f"/api/artifacts/{_deck(ctx)['id']}/ai-edit", {"kind": "block", "value": {"t": "para", "p": "x"}, "instruction": "Sửa"})
    assert r.status == 403
