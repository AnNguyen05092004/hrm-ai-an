import json

import pytest
from helpers import unzip

from app.config import settings
from app.modules.exams.qti import item_xml
from app.modules.lms_export.scorm import quiz_skip_reason


@pytest.fixture
def player(tmp_path, monkeypatch):
    (tmp_path / "assets").mkdir()
    (tmp_path / "scorm.html").write_text('<!doctype html><script src="./course.js"></script>')
    (tmp_path / "assets" / "player.js").write_text("console.log(1)")
    monkeypatch.setattr(settings(), "SCORM_PLAYER_DIR", str(tmp_path))
    return tmp_path


def test_scorm_has_manifest_published_data_and_no_official_exam(ctx, player):
    k = next(x for x in ctx.author("GET", "/api/kits").body if sum(1 for a in x["artifacts"] if a["publishedVersion"]) >= 2)
    info = ctx.author("GET", f"/api/kits/{k['id']}/export/scorm/info").body
    assert info["included"]
    res = ctx.author("GET", f"/api/kits/{k['id']}/export/scorm")
    assert res.status == 200 and res.raw.headers["content-type"] == "application/zip"
    files = unzip(res.body)
    assert {"imsmanifest.xml", "index.html", "course.js", "assets/player.js"} <= set(files)
    manifest = files["imsmanifest.xml"].decode()
    assert "<schemaversion>1.2</schemaversion>" in manifest and 'adlcp:scormtype="sco"' in manifest
    course = json.loads(files["course.js"].decode().removeprefix("window.COURSE = ").rstrip().rstrip(";"))
    assert len(course["items"]) == len(info["included"])
    assert not any(x["type"] == "exam" for x in course["items"])


def test_scorm_skip_reason_for_quick_guide_quiz():
    assert "chính thức" in quiz_skip_reason({"mode": "official", "questions": []})
    assert "Chưa duyệt" in quiz_skip_reason({"mode": "practice", "questions": [{"type": "mc", "approved": False}]})
    assert "tự luận" in quiz_skip_reason({"mode": "practice", "questions": [{"type": "essay", "approved": True}]})


def test_exam_package_with_answers_rubric_and_audit(ctx):
    k = next(x for x in ctx.author("GET", "/api/kits").body if any(a["type"] == "exam" and a["publishedVersion"] for a in x["artifacts"]))
    ex = ctx.author("GET", f"/api/kits/{k['id']}/export/scorm/info").body["exams"][0]
    assert ex["questions"] > 0
    res = ctx.author("GET", f"/api/kits/{k['id']}/export/exam/{ex['id']}")
    assert res.status == 200 and "qti21-co-dap-an.zip" in res.raw.headers["content-disposition"]
    files = unzip(res.body)
    assert len([f for f in files if f.startswith("items/")]) == ex["questions"]
    assert 'type="imsqti_test_xmlv2p1"' in files["imsmanifest.xml"].decode()
    test = files["test.xml"].decode()
    assert '<selection select="' in test and "PASS_SCORE" in test
    exam = json.loads(files["exam.json"])
    assert len(exam["questions"]) == ex["questions"]
    assert any(c["correct"] for c in next(q for q in exam["questions"] if q["type"] == "mc")["choices"])
    essay = next(q for q in exam["questions"] if q["type"] == "essay")
    assert essay["rubric"]
    xml = files[f"items/{essay['id']}.xml"].decode()
    assert 'externalScored="human"' in xml and '<rubricBlock view="scorer">' in xml
    assert "{{rubric}}" in files["huong-dan-cham.md"].decode()
    log = ctx.admin("GET", "/api/audit").body
    assert any(x["action"] == "kit.export_exam" and x["target"] == ex["id"] for x in log)
    assert ctx.reviewer("GET", f"/api/kits/{k['id']}/export/exam/{ex['id']}").status == 403
    assert ctx.author("GET", f"/api/kits/{k['id']}/export/exam/khong-co").status == 404


def test_qti_partial_scoring_and_escaping():
    m = item_xml({"id": "q1", "type": "match", "q": "A & B <x>", "pairs": [{"l": "a", "r": "1"}, {"l": "b", "r": "2"}]})
    assert '<mapEntry mapKey="L0 R0" mappedValue="0.5"/>' in m and "A &amp; B &lt;x&gt;" in m
    o = item_xml({"id": "q2", "type": "order", "q": "Thứ tự", "items": ["x", "y", "z"]})
    assert 'cardinality="ordered"' in o and o.count("<index n=") == 3
    assert 'mappedValue="0.3333"' in o or "0.3333" in o
    f = item_xml({"id": "q3", "type": "fill", "q": "Điền ____ vào", "answer": "StateGraph|state graph"})
    assert "<p>Điền <textEntryInteraction" in f and f.count('caseSensitive="false"') == 2


def test_scorm_never_includes_internal_content(ctx, player):
    k = next(x for x in ctx.author("GET", "/api/kits").body if any(a["type"] == "master" and a["publishedVersion"] for a in x["artifacts"]))
    info = ctx.author("GET", f"/api/kits/{k['id']}/export/scorm/info").body
    assert all(x["type"] != "master" for x in info["included"] + info["excluded"])
    course = json.loads(unzip(ctx.author("GET", f"/api/kits/{k['id']}/export/scorm").body)["course.js"].decode().removeprefix("window.COURSE = ").rstrip().rstrip(";"))
    assert all(x["type"] != "master" for x in course["items"])
