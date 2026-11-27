"""Đề kiểm tra kèm đáp án và tiêu chí chấm để LMS công ty tự quản lý và tự chấm.
Gói .zip theo IMS QTI 2.1 (Moodle, Canvas, Blackboard, D2L… nhập được), kèm:
  exam.json          toàn bộ đề theo cấu trúc gốc: đáp án, giải thích, rubric, test case, cách tính điểm
  huong-dan-cham.md  hướng dẫn cho người quản trị và lời nhắc mẫu cho AI chấm tự luận theo tiêu chí
Chỉ câu đã duyệt. Gói chứa đáp án nên chỉ người soạn tải được và mỗi lần tải được ghi nhật ký."""
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select

from app.modules.courses.service import get_kit
from app.modules.courses.view import published_content
from app.modules.exams.matrix import DIFF_NAME, TYPE_NAME, cell_name, exam_pick, matrix_pools
from app.shared import tables as t
from app.shared.db import one
from app.shared.errors import bad_request, not_found
from app.shared.http import js_time
from app.shared.text import slugify
from app.shared.zipfiles import zip_files

QTI_NS = "http://www.imsglobal.org/xsd/imsqti_v2p1"
SCHEMA = "http://www.imsglobal.org/xsd/imsqti_v2p1 http://www.imsglobal.org/xsd/qti/qtiv2p1/imsqti_v2p1.xsd"
SECONDS_PER_MINUTE = 60

# Cách tính điểm từng dạng câu
SCORING = {
    "mc": "Đúng đáp án được 1 điểm, sai 0.",
    "mr": "Chọn đúng và đủ mọi đáp án đúng được 1 điểm, còn lại 0.",
    "tf": "Chọn đúng Đúng/Sai được 1 điểm.",
    "fill": "Khớp một trong các đáp án chấp nhận được 1 điểm. So khớp không phân biệt hoa thường, dấu tiếng Việt và khoảng trắng đầu cuối.",
    "match": "Mỗi cặp ghép đúng được 1/số cặp điểm.",
    "order": "Mỗi mục đứng đúng vị trí được 1/số mục điểm.",
    "cat": "Mỗi mục xếp đúng nhóm được 1/số mục điểm.",
    "essay": "Chấm theo tiêu chí: điểm = số tiêu chí đạt / tổng số tiêu chí. Chỉ tính tiêu chí có bằng chứng trong bài làm.",
    "code": "Chạy hàm solve với từng bộ tham số: điểm = số test đạt / tổng số test. So sánh kết quả dạng JSON.",
}

# Lời nhắc mẫu để AI của LMS công ty chấm nháp một câu tự luận theo tiêu chí
AI_PROMPT = """Bạn chấm nháp câu tự luận theo tiêu chí. Với từng tiêu chí, xét bài làm có đáp ứng không và trích nguyên văn đoạn bài làm làm bằng chứng.
Không cho đạt khi không có bằng chứng. Điểm = số tiêu chí đạt / tổng số tiêu chí. Đây là điểm nháp, người chấm xác nhận.
Trả JSON: {"criteria":[{"index":0,"met":true,"evidence":"..."}],"comment":"nhận xét ngắn"}

Câu hỏi: {{question}}
Tiêu chí:
{{rubric}}
Bài làm:
{{answer}}"""


def x(s: object) -> str:
    return str(s if s is not None else "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def ident(s: object) -> str:
    """mã định danh QTI: bắt đầu bằng chữ, chỉ chữ số gạch"""
    return "I" + re.sub(r"[^A-Za-z0-9_-]", "_", str(s))


def _num(v: float) -> str:
    """Số như JS in ra: 0.5, 0.3333, 1"""
    return str(int(v)) if float(v).is_integer() else repr(v)


def _share(n: int) -> str:
    return _num(round(1 / n * 10000) / 10000) if n else "0"


def _head(qid: str, title: str) -> str:
    return (f'<?xml version="1.0" encoding="UTF-8"?>\n<assessmentItem xmlns="{QTI_NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
            f'xsi:schemaLocation="{SCHEMA}" identifier="{ident(qid)}" title="{x(title)}" adaptive="false" timeDependent="false">\n')


def _score(external: str = "") -> str:
    ext = f' externalScored="{external}"' if external else ""
    return (f'  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float" normalMaximum="1"{ext}><defaultValue><value>0</value></defaultValue></outcomeDeclaration>\n'
            '  <outcomeDeclaration identifier="MAXSCORE" cardinality="single" baseType="float"><defaultValue><value>1</value></defaultValue></outcomeDeclaration>\n')


def _prompt(q: dict) -> str:
    return f"    <prompt>{x(q.get('q'))}</prompt>\n"


MATCH_CORRECT = '  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>\n'
MAP_RESPONSE = '  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/map_response"/>\n'


def _scorer(title: str, body: str) -> str:
    return f'    <rubricBlock view="scorer"><p><strong>{x(title)}</strong></p>{body}</rubricBlock>\n'


def _choice_item(q: dict, title: str) -> str:
    t_ = q["type"]
    choices = q.get("choices") or []
    ok = [f"C{i}" for i, c in enumerate(choices) if c.get("ok")]
    return (_head(q["id"], title)
            + f'  <responseDeclaration identifier="RESPONSE" cardinality="{"multiple" if t_ == "mr" else "single"}" baseType="identifier"><correctResponse>{"".join(f"<value>{v}</value>" for v in ok)}</correctResponse></responseDeclaration>\n'
            + _score()
            + f'  <itemBody>\n    <choiceInteraction responseIdentifier="RESPONSE" shuffle="{"false" if t_ == "tf" else "true"}" maxChoices="{0 if t_ == "mr" else 1}">\n{_prompt(q)}'
            + "".join(f'      <simpleChoice identifier="C{i}">{x(c.get("t"))}</simpleChoice>\n' for i, c in enumerate(choices))
            + "    </choiceInteraction>\n  </itemBody>\n" + MATCH_CORRECT + "</assessmentItem>\n")


def _fill_item(q: dict, title: str) -> str:
    accepted = [s.strip() for s in str(q.get("answer") or "").split("|") if s.strip()]
    blank = '<textEntryInteraction responseIdentifier="RESPONSE" expectedLength="20"/>'
    text_ = x(q.get("q"))
    body = re.sub(r"_{3,}", blank, text_, count=1) if re.search(r"_{3,}", text_) else f"{text_} {blank}"
    entries = "".join(f'<mapEntry mapKey="{x(a)}" mappedValue="1" caseSensitive="false"/>' for a in accepted)
    return (_head(q["id"], title)
            + f'  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string"><correctResponse><value>{x(accepted[0] if accepted else "")}</value></correctResponse><mapping defaultValue="0" upperBound="1">{entries}</mapping></responseDeclaration>\n'
            + _score() + f"  <itemBody>\n    <p>{body}</p>\n  </itemBody>\n" + MAP_RESPONSE + "</assessmentItem>\n")


def _match_item(q: dict, title: str) -> str:
    """ghép cặp: vế trái → vế phải; phân loại: mục → nhóm. Cả hai là matchInteraction, chấm từng phần qua mapping"""
    if q["type"] == "match":
        pairs_ = q.get("pairs") or []
        left = [(f"L{i}", p.get("l")) for i, p in enumerate(pairs_)]
        right = [(f"R{i}", p.get("r")) for i, p in enumerate(pairs_)]
        pairs = [f"L{i} R{i}" for i in range(len(left))]
    else:
        groups = q.get("groups") or []
        left = [(f"L{gi}_{ii}", it) for gi, g in enumerate(groups) for ii, it in enumerate(g.get("items") or [])]
        right = [(f"G{gi}", g.get("name")) for gi, g in enumerate(groups)]
        pairs = [f"L{gi}_{ii} G{gi}" for gi, g in enumerate(groups) for ii, _ in enumerate(g.get("items") or [])]
    each = _share(len(pairs))
    right_max = 1 if q["type"] == "match" else len(left)
    return (_head(q["id"], title)
            + f'  <responseDeclaration identifier="RESPONSE" cardinality="multiple" baseType="directedPair"><correctResponse>{"".join(f"<value>{p}</value>" for p in pairs)}</correctResponse><mapping defaultValue="0" lowerBound="0" upperBound="1">{"".join(f"<mapEntry mapKey=\"{p}\" mappedValue=\"{each}\"/>" for p in pairs)}</mapping></responseDeclaration>\n'
            + _score()
            + f'  <itemBody>\n    <matchInteraction responseIdentifier="RESPONSE" shuffle="true" maxAssociations="{len(left)}">\n{_prompt(q)}'
            + f'      <simpleMatchSet>{"".join(f"<simpleAssociableChoice identifier=\"{i}\" matchMax=\"1\">{x(s)}</simpleAssociableChoice>" for i, s in left)}</simpleMatchSet>\n'
            + f'      <simpleMatchSet>{"".join(f"<simpleAssociableChoice identifier=\"{i}\" matchMax=\"{right_max}\">{x(s)}</simpleAssociableChoice>" for i, s in right)}</simpleMatchSet>\n'
            + "    </matchInteraction>\n  </itemBody>\n" + MAP_RESPONSE + "</assessmentItem>\n")


def _order_item(q: dict, title: str) -> str:
    """điểm từng phần theo vị trí: mỗi vị trí đúng cộng 1/n"""
    items = q.get("items") or []
    each = _share(len(items))
    rp = "".join(f'    <responseCondition><responseIf><match><index n="{i + 1}"><variable identifier="RESPONSE"/></index><baseValue baseType="identifier">O{i}</baseValue></match>'
                 f'<setOutcomeValue identifier="SCORE"><sum><variable identifier="SCORE"/><baseValue baseType="float">{each}</baseValue></sum></setOutcomeValue></responseIf></responseCondition>\n'
                 for i in range(len(items)))
    return (_head(q["id"], title)
            + f'  <responseDeclaration identifier="RESPONSE" cardinality="ordered" baseType="identifier"><correctResponse>{"".join(f"<value>O{i}</value>" for i in range(len(items)))}</correctResponse></responseDeclaration>\n'
            + _score()
            + f'  <itemBody>\n    <orderInteraction responseIdentifier="RESPONSE" shuffle="true">\n{_prompt(q)}'
            + "".join(f'      <simpleChoice identifier="O{i}">{x(it)}</simpleChoice>\n' for i, it in enumerate(items))
            + "    </orderInteraction>\n  </itemBody>\n"
            + f"  <responseProcessing>\n{rp}  </responseProcessing>\n</assessmentItem>\n")


def _code_item(q: dict, title: str) -> str:
    tests = q.get("tests") or []
    placeholder = f' placeholderText="{x(q["starter"])}"' if q.get("starter") else ""
    rows = "".join(f"<tr><td>{x(c.get('name'))}</td><td>{x(c.get('args'))}</td><td>{x(c.get('expected'))}</td></tr>" for c in tests)
    table = f"<table><thead><tr><th>Tên</th><th>Tham số (mảng JSON)</th><th>Kết quả mong đợi (JSON)</th></tr></thead><tbody>{rows}</tbody></table><p>{x(SCORING['code'])}</p>"
    return (_head(q["id"], title)
            + '  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string"/>\n' + _score("externalMachine")
            + f'  <itemBody>\n    <extendedTextInteraction responseIdentifier="RESPONSE" format="preformatted" expectedLines="16"{placeholder}>\n{_prompt(q)}    </extendedTextInteraction>\n'
            + _scorer("Test case (gọi solve(...tham số), so sánh kết quả dạng JSON)", table)
            + "  </itemBody>\n</assessmentItem>\n")


def _essay_item(q: dict, title: str) -> str:
    """tự luận: người hoặc AI của LMS công ty chấm theo tiêu chí"""
    rubric = "".join(f"<li>{x(c)}</li>" for c in q.get("rubric") or [])
    return (_head(q["id"], title)
            + '  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string"/>\n' + _score("human")
            + f'  <itemBody>\n    <extendedTextInteraction responseIdentifier="RESPONSE" format="plain" expectedLines="10">\n{_prompt(q)}    </extendedTextInteraction>\n'
            + _scorer("Tiêu chí chấm (mỗi tiêu chí đạt được 1/số tiêu chí điểm)", f"<ol>{rubric}</ol><p>{x(SCORING['essay'])}</p>")
            + "  </itemBody>\n</assessmentItem>\n")


ITEM_BUILDERS = {"mc": _choice_item, "mr": _choice_item, "tf": _choice_item, "fill": _fill_item, "match": _match_item, "cat": _match_item, "order": _order_item, "code": _code_item}


def item_xml(q: dict) -> str:
    """Một câu hỏi → assessmentItem QTI 2.1"""
    title = f"{TYPE_NAME.get(q['type'], q['type'])} · {DIFF_NAME.get(q.get('level') or 1, 'Dễ')}"
    return ITEM_BUILDERS.get(q["type"], _essay_item)(q, title)


def _sections(quiz: dict, qs: list[dict]) -> list[dict]:
    """Có ma trận thì mỗi ô một phần (rút đúng số câu của ô), không thì một phần rút `pick` câu"""
    m = quiz.get("matrix")
    if not m:
        return [{"id": "S1", "title": "", "select": exam_pick(quiz, qs), "items": qs}]
    cells = [c for c in matrix_pools(m, qs)[0] if c["pool"]]
    return [{"id": f"S{i + 1}", "title": cell_name(c), "select": min(c["count"], len(c["pool"])), "items": c["pool"]} for i, c in enumerate(cells)]


def _section_xml(p: dict, title: str) -> str:
    refs = "\n".join(f'      <assessmentItemRef identifier="{ident(q["id"])}" href="items/{q["id"]}.xml"/>' for q in p["items"])
    return (f'    <assessmentSection identifier="{p["id"]}" title="{x(p["title"] or title)}" visible="true">\n'
            f'      <selection select="{p["select"]}" withReplacement="false"/>\n      <ordering shuffle="true"/>\n{refs}\n    </assessmentSection>')


def test_xml(aid: str, title: str, quiz: dict, qs: list[dict]) -> str:
    """assessmentTest: rút ngẫu nhiên theo từng phần, xáo thứ tự trong phần, giới hạn thời gian; điểm đạt ở outcome PASS_SCORE (%)"""
    sections = "\n".join(_section_xml(p, title) for p in _sections(quiz, qs))
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<assessmentTest xmlns="{QTI_NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="{SCHEMA}" identifier="{ident(aid)}" title="{x(title)}">
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float"><defaultValue><value>0</value></defaultValue></outcomeDeclaration>
  <outcomeDeclaration identifier="MAXSCORE" cardinality="single" baseType="float"><defaultValue><value>{exam_pick(quiz, qs)}</value></defaultValue></outcomeDeclaration>
  <outcomeDeclaration identifier="PASS_SCORE" cardinality="single" baseType="float"><defaultValue><value>{_num(float(quiz.get('passScore') or 80))}</value></defaultValue></outcomeDeclaration>
  <timeLimits maxTime="{int(quiz.get('minutes') or 30) * SECONDS_PER_MINUTE}" allowLateSubmission="false"/>
  <testPart identifier="P1" navigationMode="nonlinear" submissionMode="simultaneous">
    <itemSessionControl maxAttempts="{int(quiz.get('attempts') or 1)}" allowReview="true" showFeedback="false" showSolution="false"/>
{sections}
  </testPart>
  <outcomeProcessing>
    <setOutcomeValue identifier="SCORE"><sum><testVariables variableIdentifier="SCORE"/></sum></setOutcomeValue>
  </outcomeProcessing>
</assessmentTest>
"""


def manifest_xml(aid: str, title: str, qs: list[dict]) -> str:
    deps = "\n".join(f'      <dependency identifierref="{ident(q["id"])}"/>' for q in qs)
    res = "\n".join(f'    <resource identifier="{ident(q["id"])}" type="imsqti_item_xmlv2p1" href="items/{q["id"]}.xml"><file href="items/{q["id"]}.xml"/></resource>' for q in qs)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="exam-{x(aid)}" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd">
  <metadata><schema>QTIv2.1 Package</schema><schemaversion>1.0.0</schemaversion></metadata>
  <organizations/>
  <resources>
    <resource identifier="test" type="imsqti_test_xmlv2p1" href="test.xml">
      <metadata><imsmd:lom><imsmd:general><imsmd:title><imsmd:langstring xml:lang="vi">{x(title)}</imsmd:langstring></imsmd:title></imsmd:general></imsmd:lom></metadata>
      <file href="test.xml"/>
{deps}
    </resource>
{res}
    <resource identifier="answer-key" type="webcontent" href="exam.json"><file href="exam.json"/><file href="huong-dan-cham.md"/></resource>
  </resources>
</manifest>
"""


def guide_md(title: str, kit_title: str, quiz: dict, qs: list[dict]) -> str:
    counts: dict[str, int] = {}
    for q in qs:
        counts[q["type"]] = counts.get(q["type"], 0) + 1
    count = " · ".join(f"{TYPE_NAME.get(k, k)}: {n}" for k, n in counts.items())
    manual = sum(1 for q in qs if q["type"] in ("essay", "code"))
    matrix = ""
    if quiz.get("matrix"):
        rows = "\n".join(f"| {TYPE_NAME.get(c['type'], c['type'])} | {DIFF_NAME.get(c['level'], c['level'])} | {min(c['count'], len(c['pool']))} | {len(c['pool'])} |" for c in matrix_pools(quiz["matrix"], qs)[0])
        matrix = f"## Ma trận đề\n\n| Dạng câu | Độ khó | Câu mỗi lượt thi | Câu trong ngân hàng |\n|---|---|---|---|\n{rows}\n\n"
    scoring = "\n".join(f"- **{TYPE_NAME[k]}:** {s}" for k, s in SCORING.items())
    return f"""# {title}

Khóa: {kit_title}. Xuất lúc {js_time(datetime.now(UTC))}.

**Gói này có đáp án.** Chỉ người quản trị đào tạo giữ và nhập vào LMS. Không gửi cho người thi.

## Cấu hình đề

| Mục | Giá trị |
|---|---|
| Số câu trong ngân hàng | {len(qs)} ({count}) |
| Mỗi lượt thi rút | {exam_pick(quiz, qs)} câu ngẫu nhiên{' theo ma trận đề' if quiz.get('matrix') else ''}, xáo thứ tự |
| Thời gian | {quiz.get('minutes') or 30} phút |
| Điểm đạt | {quiz.get('passScore') or 80}% |
| Số lượt thi | {quiz.get('attempts') or 1} |
| Mỗi câu | 1 điểm, điểm bài = tổng điểm / số câu × 100 |

{matrix}## Nhập vào LMS

- LMS hỗ trợ **IMS QTI 2.1** (Canvas, Blackboard, D2L, TAO; Moodle qua plugin QTI): nhập nguyên tệp .zip. Đáp án, điểm từng phần và giới hạn thời gian nằm trong `test.xml` và `items/`.
- LMS không đọc QTI, hoặc có AI riêng: dùng `exam.json`. Tệp chứa mọi câu, đáp án, giải thích từng lựa chọn, tiêu chí chấm, test case và cách tính điểm từng dạng câu.

## Cách tính điểm từng dạng câu

{scoring}

## Câu cần chấm ngoài ({manual} câu)

Câu tự luận chấm theo tiêu chí trong `rubricBlock view="scorer"` (QTI) hoặc trường `rubric` (exam.json). Câu code chạy test case trong trường `tests`.
LMS có AI thì chấm nháp tự luận bằng lời nhắc dưới đây, thay {{{{question}}}}, {{{{rubric}}}}, {{{{answer}}}}. Người chấm vẫn xác nhận điểm cuối.

```
{AI_PROMPT}
```
"""


def _question_json(q: dict) -> dict:
    lv = q.get("level") or 1
    out = {"id": q["id"], "type": q["type"], "typeName": TYPE_NAME.get(q["type"], q["type"]), "difficulty": lv, "difficultyName": DIFF_NAME.get(lv),
           "question": q.get("q"), "points": 1, "source": q.get("src")}
    if q.get("choices"):
        out["choices"] = [{"text": c.get("t"), "correct": bool(c.get("ok")), "feedback": c.get("fb") or ""} for c in q["choices"]]
    if q["type"] == "fill":
        out["accepted"] = [s.strip() for s in str(q.get("answer") or "").split("|") if s.strip()]
    if q.get("pairs"):
        out["pairs"] = [{"left": p.get("l"), "right": p.get("r")} for p in q["pairs"]]
    if q["type"] == "order":
        out["correctOrder"] = q.get("items") or []
    if q.get("groups"):
        out["groups"] = [{"name": g.get("name"), "items": g.get("items") or []} for g in q["groups"]]
    if q.get("rubric"):
        out["rubric"] = q["rubric"]
    if q["type"] == "code":
        out |= {"starter": q.get("starter") or "", "tests": q.get("tests") or []}
    return out


@dataclass(frozen=True)
class Package:
    name: str
    zip: bytes
    count: int
    version: int


def build_exam_package(org_id: str, kit_id: str, artifact_id: str, version: int | None = None) -> Package:
    """version: phiên bản đã xuất bản cần đóng gói (mặc định bản mới nhất)"""
    k = get_kit(org_id, kit_id)
    a = one(select(t.artifacts).where(t.artifacts.c.id == artifact_id, t.artifacts.c.kitId == k["id"], t.artifacts.c.orgId == org_id))
    if not a or a["type"] != "exam":
        raise not_found("Đề kiểm tra")
    if not a["publishedVersion"]:
        raise bad_request("Đề kiểm tra chưa được xuất bản")
    pub = published_content(a, version)
    quiz = pub["content"].get("quiz") or {}
    approved = [q for q in quiz.get("questions") or [] if q.get("approved")]
    # có ma trận: chỉ xuất câu thuộc một ô của ma trận (câu ngoài ma trận không bao giờ được rút)
    outside = {id(q) for q in matrix_pools(quiz["matrix"], approved)[1]} if quiz.get("matrix") else set()
    qs = [q for q in approved if id(q) not in outside]
    if not qs:
        raise bad_request("Không có câu đã duyệt nào thuộc ma trận đề" if approved else "Đề chưa có câu nào được duyệt")
    settings_ = {"passScore": quiz.get("passScore") or 80, "minutes": quiz.get("minutes") or 30, "attempts": quiz.get("attempts") or 1, "pick": exam_pick(quiz, qs),
                 "shuffle": True, "pointsPerQuestion": 1}
    if quiz.get("matrix"):
        settings_["matrix"] = [{"type": c["type"], "difficulty": c["level"], "difficultyName": DIFF_NAME.get(c["level"]), "count": c["count"]} for c in quiz["matrix"]]
    exam = {"format": "lms-exam", "formatVersion": 1, "exportedAt": js_time(datetime.now(UTC)),
            "exam": {"id": a["id"], "title": pub["title"], "version": pub["version"], "kit": {"id": k["id"], "title": k["title"]}},
            "settings": settings_, "scoring": SCORING, "aiGrading": {"essayPrompt": AI_PROMPT}, "questions": [_question_json(q) for q in qs]}
    files = {
        "imsmanifest.xml": manifest_xml(a["id"], pub["title"], qs),
        "test.xml": test_xml(a["id"], pub["title"], quiz, qs),
        "exam.json": json.dumps(exam, ensure_ascii=False, indent=2),
        "huong-dan-cham.md": guide_md(pub["title"], k["title"], quiz, qs),
        **{f"items/{q['id']}.xml": item_xml(q) for q in qs},
    }
    return Package(f"{slugify(pub['title'], 'de-kiem-tra')}-qti21-co-dap-an.zip", zip_files(files), len(qs), pub["version"])
