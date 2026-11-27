"""Sửa bằng AI một khối / slide / câu hỏi; AI soạn thêm một khối, một bài học, hoặc câu hỏi theo độ khó và dạng."""
import json

from app.adapters.ai import ai_json
from app.modules.courses import schemas as S
from app.modules.courses.content import qr_content
from app.modules.courses.drafts import ai_rewrite, draft_qr, hits_text
from app.modules.courses.master import locked_master, master_hits
from app.modules.courses.schemas import NULL_BLOCK, NULL_QUESTION
from app.modules.courses.service import brief_of
from app.modules.sources.service import Hit, search_sources
from app.shared.errors import bad_request

# giữ định danh, loại khối và nguồn trích của bản gốc: AI chỉ sửa nội dung
KEEP_KEYS = ("id", "t", "type", "src", "srcRef", "level", "approved", "layout", "st", "boxes", "bg", "bgImg", "bgTone", "img")
FORMAT_HINT = ("Chữ có thể chứa thẻ định dạng <b> <i> <u> <s> <br> <span data-c=\"…\"> <mark data-c=\"…\"> <a href=\"…\">: "
               "giữ nguyên các thẻ này quanh phần chữ tương ứng, không thêm thẻ khác")
MAX_EDIT_CHARS = 4000


def ai_edit_block(org_id: str, source_ids: list[str], kind: str, value: dict, instruction: str) -> dict:
    """Sửa một phần nội dung theo yêu cầu, có tra nguồn; trả về object cùng cấu trúc"""
    raw = json.dumps(value, ensure_ascii=False)[:MAX_EDIT_CHARS]
    hits = search_sources(org_id, source_ids, f"{instruction} {raw[:500]}", 5)
    out_text = ai_rewrite(org_id, value, f"{instruction} (phần cần sửa là một {kind}. {FORMAT_HINT})", hits)
    try:
        out = json.loads(out_text)
    except ValueError as e:
        raise bad_request("AI trả về nội dung không hợp lệ, thử lại hoặc diễn đạt yêu cầu khác") from e
    if not isinstance(out, dict):
        raise bad_request("AI trả về nội dung không hợp lệ, thử lại")
    return {**out, **{k: value[k] for k in KEEP_KEYS if k in value}}


def ai_block(kit: dict, instruction: str) -> dict:
    """Tạo một khối mới từ tài liệu nguồn theo mô tả; không có căn cứ thì trả khối gap"""
    hits = search_sources(kit["orgId"], kit["sourceIds"], instruction, 6)
    r = ai_json(
        org_id=kit["orgId"], feature="ai_block", schema=S.OneBlock,
        system="Bạn viết một khối nội dung bài học tiếng Việt từ các đoạn nguồn [S#]. Chọn loại khối hợp với yêu cầu (para, heading, list, flash, accordion, tabs, timeline, sorting, table, code, process, kc). Bắt buộc src là mã đoạn nguồn. Không có căn cứ trong nguồn thì trả t = \"gap\" và p mô tả phần thiếu. Không bịa.",
        input=f"Yêu cầu: {instruction}\n\nTrích đoạn nguồn:\n{hits_text(hits) or '(không có)'}",
        mock=lambda: {"block": {**NULL_BLOCK, "t": "para" if hits else "gap", "p": hits[0].text[:300] if hits else f"Tài liệu nguồn chưa có nội dung về: {instruction}", "src": "S1" if hits else None}},
    )
    c = qr_content({"lessons": [{"title": "", "img": "office", "blocks": [r["block"]]}], "questions": []}, kit, hits, bool(kit["sourceIds"]))
    blocks = c["lessons"][0]["blocks"]
    return blocks[1] if len(blocks) > 1 else blocks[0]


def ai_lesson(kit: dict, type_: str, title: str, instruction: str) -> dict:
    """Một bài học mới. Nội dung: căn cứ là tài liệu nguồn. Tài liệu nhanh: căn cứ là nội dung đã chốt (chưa chốt thì tài liệu nguồn)"""
    m = locked_master(kit["id"]) if type_ == "qr" else None
    hits = master_hits(m.content) if m else search_sources(kit["orgId"], kit["sourceIds"], f"{title}. {instruction}", 10)
    outline = {"sections": [{"t": title, "items": [instruction] if instruction else []}]}
    r = draft_qr(kit["orgId"], brief_of(kit), {"title": title, "summary": instruction or title}, outline, hits, "lesson")
    c = qr_content({"lessons": r["lessons"][:1], "questions": []}, kit, hits, bool(m) or bool(kit["sourceIds"]), max_lessons=1, quiz=False)
    if not c["lessons"]:
        raise bad_request("AI chưa soạn được bài học, thử lại hoặc viết yêu cầu cụ thể hơn")
    return {**c["lessons"][0], "title": title}


# Độ khó (trường level của câu): 1 dễ, 2 trung bình, 3 khó
DIFF_HOW = {
    1: "dễ: nhớ và hiểu khái niệm, một bước suy luận, phương án sai dễ loại",
    2: "trung bình: áp dụng vào tình huống quen thuộc, cần hiểu vì sao",
    3: "khó: phân tích, so sánh phương án, tình huống nhiều bước hoặc phương án sai rất dễ nhầm",
}
# Dạng câu mặc định khi người soạn không chọn dạng
KIND_BY_LEVEL = {
    1: "trắc nghiệm một đáp án (mc), đúng/sai (tf), điền chỗ trống (fill), ghép cặp (match) hoặc sắp thứ tự (order)",
    2: "trắc nghiệm tình huống (mc), nhiều đáp án (mr), phân loại kéo thả (cat), sắp thứ tự quy trình (order) và tự luận ngắn (essay) có rubric 3 tiêu chí",
    3: "tự luận tình huống (essay) có rubric, hoặc bài code JavaScript (code) có hàm solve và 3–4 test (args là chuỗi JSON mảng tham số, expected là chuỗi JSON)",
}
# Cách viết từng dạng câu khi người soạn chọn dạng cụ thể
HOW = {
    "mc": "mc: một đáp án đúng, 3–4 lựa chọn, mỗi lựa chọn có giải thích fb",
    "mr": "mr: nhiều đáp án đúng (ít nhất 2), 4–5 lựa chọn, mỗi lựa chọn có fb",
    "tf": 'tf: câu q là một phát biểu; choices đúng 2 mục "Đúng" và "Sai", đánh dấu ok mục đúng, fb giải thích',
    "fill": "fill: câu có chỗ trống ____, answer là đáp án (nhiều đáp án chấp nhận cách nhau bằng |)",
    "order": "order: 3–6 mục theo đúng thứ tự",
    "match": "match: 3–5 cặp vế trái / vế phải",
    "cat": "cat: 2–3 nhóm, mỗi nhóm 2–4 mục",
    "essay": "essay: câu tự luận tình huống, rubric 3–5 tiêu chí chấm",
    "code": "code: bài JavaScript có starter khai báo function solve và 3–4 test (args là chuỗi JSON mảng tham số, expected là chuỗi JSON)",
}
LEVEL_KINDS = {1: ["mc", "tf", "fill", "match", "order"], 2: ["mc", "mr", "cat", "order", "essay"], 3: ["mc", "essay", "match"]}


def _mock_question(level: int, t: str, i: int, topic: str, src: str | None) -> dict:
    """Câu nháp khi chạy AI giả lập: xoay vòng các dạng câu được chọn để test đủ dạng"""
    base = {**NULL_QUESTION, "level": level, "src": src}
    by_type = {
        "match": {"q": f"Ghép khái niệm với mô tả ({topic})", "pairs": [{"l": f"Khái niệm {x}", "r": f"Mô tả {x}"} for x in "ABC"]},
        "order": {"q": f"Sắp xếp các bước ({topic})", "order": ["Bước một", "Bước hai", "Bước ba", "Bước bốn"]},
        "cat": {"q": f"Phân loại các mục ({topic})", "groups": [{"name": "Nên làm", "items": ["Kiểm tra nguồn", "Ghi lại"]}, {"name": "Không nên", "items": ["Đoán bừa"]}]},
        "essay": {"q": f"Trình bày cách áp dụng ({topic})", "rubric": ["Đúng khái niệm", "Có ví dụ", "Nêu rủi ro"]},
        "code": {"q": f"Viết hàm solve cộng hai số ({topic})", "starter": "function solve(a, b) {\n  \n}",
                 "tests": [{"name": "Cộng", "args": "[1,2]", "expected": "3"}, {"name": "Số âm", "args": "[-1,1]", "expected": "0"}]},
        "fill": {"q": f"Điền vào chỗ trống: khái niệm chính của {topic} là ____.", "answer": "đáp án"},
        "tf": {"q": f"Phát biểu nháp {i + 1} về {topic} là đúng.", "choices": [{"t": "Đúng", "ok": True, "fb": "Đúng theo tài liệu."}, {"t": "Sai", "ok": False, "fb": "Chưa đúng."}]},
        "mr": {"q": f"Chọn mọi ý đúng về {topic}", "choices": [{"t": "Ý đúng thứ nhất", "ok": True, "fb": "Đúng."}, {"t": "Ý đúng thứ hai", "ok": True, "fb": "Đúng."}, {"t": "Ý sai", "ok": False, "fb": "Chưa đúng."}]},
    }
    mc = {"q": f"Câu hỏi nháp {i + 1} về {topic}", "choices": [{"t": "Lựa chọn đúng", "ok": True, "fb": "Đúng."}, {"t": "Lựa chọn sai", "ok": False, "fb": "Chưa đúng."}]}
    return {**base, "type": t if t in by_type else "mc", **by_type.get(t, mc)}


def generate_questions(kit: dict, level: int, count: int, focus: str, existing: list[str], types: list[str] | None = None, hits: list[Hit] | None = None) -> list[dict]:
    """Sinh câu hỏi theo độ khó và dạng. hits: đoạn căn cứ (mặc định tìm trong tài liệu nguồn; khóa đã chốt nội dung thì truyền đoạn của nội dung)"""
    hits = hits if hits is not None else search_sources(kit["orgId"], kit["sourceIds"], focus or kit["title"], 10)
    kinds = f"chỉ dùng các dạng sau, chia đều: {'; '.join(HOW[x] for x in types)}" if types else KIND_BY_LEVEL.get(level, KIND_BY_LEVEL[1])
    pool = types or LEVEL_KINDS.get(level, LEVEL_KINDS[1])
    topic = focus or kit["title"]
    existing_text = "\n".join(f"- {x}" for x in existing) or "(chưa có)"
    r = ai_json(
        org_id=kit["orgId"], feature="gen_questions", schema=S.Questions, strong=True,
        system=f"Bạn là chuyên gia ra đề. Viết {count} câu hỏi, độ khó {DIFF_HOW.get(level, DIFF_HOW[1])}. Mọi câu có level = {level}. Dạng câu: {kinds}. Mỗi câu có src là mã đoạn nguồn [S#] làm căn cứ. Không trùng các câu đã có. Không bịa nội dung ngoài nguồn. Tiếng Việt.",
        input=f"Khóa: {kit['title']}\nTrọng tâm: {focus or 'toàn bộ nội dung'}\nCâu đã có:\n{existing_text}\n\nTrích đoạn nguồn:\n{hits_text(hits) or '(không có)'}",
        mock=lambda: {"questions": [_mock_question(level, pool[i % len(pool)], i, topic, "S1" if hits else None) for i in range(count)]},
    )
    allowed = [q for q in r["questions"] if not types or q["type"] in types]
    # độ khó do người soạn chọn, không để AI tự đổi
    c = qr_content({"lessons": [], "questions": [{**q, "level": level} for q in allowed[:count]]}, kit, hits, True)
    return c["quiz"]["questions"]
