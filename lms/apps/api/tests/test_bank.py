import json

from helpers import drain_jobs, kit_by, unzip

from app.modules.courses.content import tf_choices
from app.modules.exams.qti import item_xml


def _exams(ctx):
    return ctx.author("GET", "/api/exams").body


def test_bank_lists_exams_with_origin_and_approved_count(ctx):
    sec = next(e for e in _exams(ctx) if e["title"].startswith("Đề kiểm tra: An toàn"))
    assert sec["origin"]["kind"] == "kit" and sec["origin"]["title"] == "An toàn thông tin cho mọi nhân viên"
    assert sec["approved"] == sec["questions"]
    assert ctx.reviewer("GET", "/api/exams").status == 403


def test_matrix_exam_reserve_and_qti_sections(ctx):
    docker = kit_by(ctx.author, "Docker")
    matrix = [{"type": "tf", "level": 1, "count": 2}, {"type": "mr", "level": 2, "count": 1}]
    r = ctx.author("POST", "/api/exams", {"from": "kit", "kitId": docker["id"], "matrix": matrix, "reserve": 2})
    assert r.status == 200, r.body
    drain_jobs()
    e = ctx.author("GET", f"/api/artifacts/{r.body['id']}").body
    qs = e["quiz"]["questions"]
    assert len([q for q in qs if q["type"] == "tf" and q["level"] == 1]) == 4
    assert len([q for q in qs if q["type"] == "mr" and q["level"] == 2]) == 2
    assert len(qs) == 6
    assert e["quiz"]["matrix"] == matrix and e["quiz"]["pick"] == 3 and e["plan"]["basedOn"] == 1
    assert [c["t"] for c in next(q for q in qs if q["type"] == "tf")["choices"]] == ["Đúng", "Sai"]

    def approve(pred):
        return {"quiz": {**e["quiz"], "questions": [{**q, "approved": pred(q, i)} for i, q in enumerate(qs)]}}

    first_tf = next(i for i, q in enumerate(qs) if q["type"] == "tf")
    first_mr = next(i for i, q in enumerate(qs) if q["type"] == "mr")
    ctx.author("PATCH", f"/api/artifacts/{e['id']}", {"content": approve(lambda _q, i: i in (first_tf, first_mr))})
    warnings = ctx.author("GET", f"/api/artifacts/{e['id']}/check").body["warnings"]
    assert any("Đúng / Sai · Dễ cần 2 câu" in w and "có 1 câu" in w for w in warnings)
    assert not any("Nhiều đáp án" in w for w in warnings)

    ctx.author("PATCH", f"/api/artifacts/{e['id']}", {"content": approve(lambda _q, _i: True)})
    assert ctx.author("POST", f"/api/artifacts/{e['id']}/publish", {}).status == 200
    res = ctx.author("GET", f"/api/kits/{docker['id']}/export/exam/{e['id']}")
    assert res.status == 200
    files = unzip(res.body)
    test = files["test.xml"].decode()
    assert test.count("<assessmentSection ") == 2
    assert 'title="Đúng / Sai · Dễ"' in test
    assert '<selection select="2"' in test and '<selection select="1"' in test
    assert '<value>3</value></defaultValue></outcomeDeclaration>\n  <outcomeDeclaration identifier="PASS_SCORE"' in test
    exam = json.loads(files["exam.json"])
    assert exam["settings"]["matrix"] == [{"type": "tf", "difficulty": 1, "difficultyName": "Dễ", "count": 2}, {"type": "mr", "difficulty": 2, "difficultyName": "Trung bình", "count": 1}]
    assert "## Ma trận đề" in files["huong-dan-cham.md"].decode()


def test_duplicate_or_oversized_matrix_rejected_without_orphan_kit(ctx):
    src = ctx.author("GET", "/api/sources").body[0]["id"]
    before = len(_exams(ctx))
    dup = ctx.author("POST", "/api/exams", {"from": "sources", "sourceIds": [src], "title": "Đề trùng ô", "matrix": [{"type": "mc", "level": 1, "count": 2}, {"type": "mc", "level": 1, "count": 3}]})
    assert dup.status == 400
    big = ctx.author("POST", "/api/exams", {"from": "sources", "sourceIds": [src], "title": "Đề quá lớn", "matrix": [{"type": "mc", "level": lv, "count": 20} for lv in (1, 2, 3)]})
    assert big.status == 400
    assert len(_exams(ctx)) == before


def test_exam_straight_from_sources_is_standalone(ctx):
    src = ctx.author("GET", "/api/sources").body[0]
    r = ctx.author("POST", "/api/exams", {"from": "sources", "sourceIds": [src["id"]], "title": "Đề nhanh từ quy định", "matrix": [{"type": "mc", "level": 1, "count": 1}, {"type": "fill", "level": 2, "count": 1}]})
    assert r.status == 200, r.body
    drain_jobs()
    mine = next(e for e in _exams(ctx) if e["id"] == r.body["id"])
    assert mine["origin"] == {"kind": "sources", "names": [src["name"]]}
    assert mine["questions"] == 4
    assert not any(k["id"] == r.body["kitId"] for k in ctx.author("GET", "/api/kits").body)
    assert ctx.author("GET", f"/api/kits/{r.body['kitId']}").body["bank"] is True
    # xóa đề thì xóa luôn khóa ẩn chứa nó
    assert ctx.author("DELETE", f"/api/artifacts/{r.body['id']}").status == 200
    assert ctx.author("GET", f"/api/kits/{r.body['kitId']}").status == 404


def test_exam_from_unlocked_kit_blocked(ctx):
    c = ctx.author("POST", "/api/kits", {"goal": "Khóa mới chưa có nội dung"})
    drain_jobs()
    r = ctx.author("POST", "/api/exams", {"from": "kit", "kitId": c.body["id"], "matrix": [{"type": "mc", "level": 1, "count": 2}]})
    assert r.status == 400 and r.body["error"]["code"] == "master_not_locked"


def test_true_false_always_two_ordered_choices_not_shuffled():
    assert tf_choices([{"t": "Sai", "ok": True, "fb": "Vì…"}, {"t": "Đúng", "ok": False, "fb": ""}]) == [{"t": "Đúng", "ok": False, "fb": ""}, {"t": "Sai", "ok": True, "fb": "Vì…"}]
    x = item_xml({"id": "q1", "type": "tf", "q": "Mật khẩu được gửi qua email", "choices": [{"t": "Đúng", "ok": False}, {"t": "Sai", "ok": True}]})
    assert 'shuffle="false" maxChoices="1"' in x and "<value>C1</value>" in x
