"""AI soạn khóa học: chi tiết → dàn ý nội dung → nội dung → (sau khi chốt) các định dạng soạn từ nội dung.
Mọi đoạn nội dung phải trích một đoạn căn cứ có mã [S#]: đoạn tài liệu nguồn, hoặc đoạn của nội dung đã chốt."""
import json
import re
from dataclasses import dataclass

from app.adapters.ai import ai_json
from app.modules.courses import schemas as S
from app.modules.courses.schemas import NULL_BLOCK, NULL_QUESTION
from app.modules.sources.service import Hit

RULES = """Bạn là chuyên gia thiết kế đào tạo nội bộ, viết tiếng Việt rõ ràng, câu ngắn, giọng trung tính.
Quy tắc bắt buộc:
- Chỉ dùng thông tin trong các đoạn nguồn được cấp (mã [S1], [S2]…). Không bịa số liệu, lệnh, quy định.
- Nội dung nào không có căn cứ trong nguồn thì không viết; ghi vào chỗ thiếu căn cứ (gap) để người soạn bổ sung.
- Nếu hai nguồn mâu thuẫn, nêu rõ mâu thuẫn, không tự chọn.
- Không đưa dữ liệu cá nhân, mật khẩu, khóa bí mật vào nội dung.
- Tên, tóm tắt, tiêu đề, dàn ý luôn viết tự nhiên theo mục tiêu đào tạo; không bao giờ ghi chữ "GAP", "thiếu nguồn" hay ghi chú cho người soạn trong các trường này. Phần thiếu căn cứ chỉ nêu trong warnings hoặc khối gap."""


@dataclass(frozen=True)
class KitBrief:
    title: str
    goal: str
    audience: str
    goals: list[str]
    takeaways: list[str]
    metrics: list[str]
    skillName: str
    level: int
    practice: str


def brief_text(k: KitBrief) -> str:
    practice = "nhiều" if k.practice == "more" else "ít" if k.practice == "less" else "cân bằng"
    return f"""Khóa học: {k.title}
Mô tả: {k.goal}
Đối tượng: {k.audience}
Mục tiêu: {'; '.join(k.goals)}
Điều cần nhớ: {'; '.join(k.takeaways)}
Kỹ năng: {k.skillName}, khóa đưa người học tới mức {k.level} (1 biết khái niệm, 2 làm được khi có hướng dẫn, 3 làm độc lập)
Lượng luyện tập: {practice}"""


def hits_text(hits: list[Hit]) -> str:
    return "\n\n".join(f"[S{i + 1}] ({h.sourceName} · {h.section})\n{h.text}" for i, h in enumerate(hits))


# ---------- 1. Chi tiết khóa học ----------
def draft_details(org_id: str, goal: str, skills: list[dict], hits: list[Hit], source_names: list[str], sensitive: list[str]) -> dict:
    skill_list = "\n".join(f"{s['id']}: {s['name']}" for s in skills)
    warn = f"Tài liệu có dấu hiệu chứa dữ liệu nhạy cảm: {', '.join(sensitive)}\n" if sensitive else ""
    return ai_json(
        org_id=org_id, feature="kit_details", schema=S.Details,
        system=f"""{RULES}
Nhiệm vụ: từ mô tả mục tiêu và tài liệu nguồn, đề xuất chi tiết một khóa học.
- title ngắn (≤ 60 ký tự), desc 1–2 câu.
- 3–4 mục tiêu, 3–5 điều cần nhớ, 2–3 chỉ số thành công đo được.
- Chọn skillId từ danh sách kỹ năng; level 1–3.
- warnings: nêu mâu thuẫn giữa nguồn, nguồn có dữ liệu nhạy cảm, hoặc nguồn không đủ cho mục tiêu.""",
        input=f"Mô tả mục tiêu của người soạn:\n{goal}\n\nKỹ năng có trong khung năng lực:\n{skill_list}\n\nTài liệu nguồn: {', '.join(source_names) or 'không có'}\n{warn}\nTrích đoạn nguồn:\n{hits_text(hits) or '(không có)'}",
        mock=lambda: _mock_details(goal, skills, source_names, sensitive),
    )


def _mock_details(goal: str, skills: list[dict], source_names: list[str], sensitive: list[str]) -> dict:
    t = re.split(r"[.,\n]", re.sub(r"^tạo (khóa|bài|bộ)( đào tạo)? ?(cho|về)? ?", "", goal, flags=re.I))[0].strip()[:60] or "Khóa học mới"
    low = goal.lower()
    sk = next((s for s in skills if s["id"] in low or s["name"].lower().split(" (")[0] in low), skills[0] if skills else None)
    warnings = ([] if source_names else ["Chưa có tài liệu nguồn: AI chỉ soạn khung, không viết nội dung chi tiết."]) + [
        f"{s} có dấu hiệu chứa dữ liệu nhạy cảm. Xác nhận phạm vi được dùng trước khi soạn." for s in sensitive]
    return {
        "title": t[:1].upper() + t[1:], "desc": goal[:200], "audience": "Nhân viên liên quan tới nội dung đã mô tả.",
        "goals": ["Nắm được nội dung chính", "Áp dụng vào công việc hằng ngày", "Tránh các lỗi hay gặp"],
        "takeaways": ["Giải thích được khái niệm chính", "Làm đúng các bước cơ bản", "Biết lỗi hay gặp"],
        "metrics": ["Giảm câu hỏi lặp lại gửi bộ phận phụ trách", "Tỷ lệ đạt bài kiểm tra ≥ 80%"],
        "skillId": sk["id"] if sk else "", "level": 2, "practice": "balanced", "warnings": warnings,
    }


# ---------- 2. Dàn ý ----------
OUTLINE_HINT = {
    "master": "Dàn ý Nội dung của cả khóa: 3–8 bài (sections) theo trình tự học, mỗi bài 3–6 ý chính (items), bao quát đủ các mục tiêu và điều cần nhớ.",
    "qr": "Dàn ý Tài liệu nhanh: tối đa 3 bài (sections), mỗi bài 2–4 ý chính (items).",
    "deck": "Dàn ý Bộ slide: 6–9 tiêu đề slide, slide đầu là bìa, slide cuối là việc cần làm.",
    "video": "Dàn ý video 5–8 phút: 4–6 chương.",
    "scenario": 'Dàn ý Tình huống: nhân vật AI đóng (character dạng "Tên · vai trò"), vai người học, bối cảnh (situation), 2–3 mục tiêu cho từng cảnh.',
}


def draft_outline(org_id: str, type_: str, kit: KitBrief, item: dict, hits: list[Hit]) -> dict:
    return ai_json(
        org_id=org_id, feature=f"outline_{type_}", schema=S.OUTLINE_SCHEMAS[type_],
        system=f"{RULES}\nNhiệm vụ: lập dàn ý cho một tài liệu trong khóa học. {OUTLINE_HINT[type_]} Chỉ đưa các ý có căn cứ trong nguồn; nếu nguồn ít thì dàn ý ngắn lại.",
        input=f"{brief_text(kit)}\n\nTài liệu cần lập dàn ý: {item['title']}\nMục đích: {item['summary']}\n\nTrích đoạn nguồn:\n{hits_text(hits) or '(không có nguồn)'}",
        mock=lambda: _mock_outline(type_, kit),
    )


def _mock_outline(type_: str, kit: KitBrief) -> dict:
    if type_ == "master":
        return {"sections": [{"t": t, "items": ["Khái niệm chính", "Ví dụ thực tế", "Điều cần lưu ý"]} for t in ["Tổng quan và khái niệm", "Các bước thực hiện", "Ví dụ thực tế", "Lỗi hay gặp và cách tránh"]]}
    if type_ == "qr":
        return {"sections": [{"t": t, "items": ["Khái niệm chính", "Ví dụ thực tế"]} for t in ["Tổng quan", "Các bước thực hiện", "Lỗi hay gặp"]]}
    if type_ == "deck":
        return {"slides": [kit.title, "Vì sao cần học", "Nội dung chính", "Ví dụ", "Việc cần làm"]}
    if type_ == "video":
        return {"chapters": ["Mở đầu", "Nội dung chính", "Ví dụ", "Tóm tắt"]}
    return {"character": "Chị Lan · Trưởng nhóm", "learner": "Nhân viên mới", "situation": "Trưởng nhóm hỏi người học cách xử lý một việc thường gặp.", "goals": ["Chọn cách làm đúng", "Giải thích được lý do"]}


# ---------- 3. Nội dung ----------
LEVEL_KINDS = {
    1: "mức 1: 4–5 câu trắc nghiệm (mc), 1 câu điền (fill), 1 câu ghép cặp (match) hoặc sắp thứ tự (order)",
    2: "mức 2: 3–4 câu trắc nghiệm tình huống (mc), 1 câu điền, 1 câu phân loại kéo thả (cat) hoặc sắp thứ tự (order), 1–2 câu tự luận ngắn (essay) có rubric 3 tiêu chí",
    3: "mức 3: 3 câu trắc nghiệm, 1 câu tự luận tình huống có rubric, 1 bài code JavaScript (code) có hàm solve và 3–4 test",
}
TASK = {
    "master": "Nhiệm vụ: viết Nội dung của khóa theo dàn ý, mỗi bài (lesson) ứng với một mục dàn ý. Đây là bản nội dung đầy đủ để chuyên gia duyệt; slide, video, tình huống, đề kiểm tra sẽ được soạn từ bản này, nên viết đủ ý, chính xác, có ví dụ. Không viết câu hỏi kiểm tra (questions là mảng rỗng).",
    "qr": "Nhiệm vụ: viết Tài liệu nhanh theo dàn ý, mỗi bài (lesson) ứng với một mục dàn ý, và bộ câu hỏi kiểm tra.",
    "lesson": "Nhiệm vụ: viết đúng một bài học (lesson) theo tên bài và yêu cầu. Không viết câu hỏi kiểm tra (questions là mảng rỗng).",
}
BLOCK_GUIDE = """Khối (block) dùng được: heading (h + p), para (p), list (intro + items), flash (h, p, cards mặt trước f / mặt sau b), accordion (h, p, accordion các mục t/b), tabs (h, p, accordion: mỗi mục là một tab t/b, hợp khi so sánh các lựa chọn), timeline (h, timeline: mốc d, tiêu đề t, mô tả b; hợp với quy trình theo thời gian hoặc lịch sử), sorting (h, p, groups: hoạt động kéo thả mục vào đúng nhóm), table (head, rows), code (h, code), process (h, steps), kc (câu hỏi nhanh: q, choices, correct là chỉ số), image (img, cap), gap (p: mô tả phần thiếu căn cứ).
- Mỗi bài 4–7 khối, mở đầu bằng heading, có ít nhất một khối tương tác (flash/accordion/tabs/timeline/sorting/process/table) và kết thúc bằng một kc.
- Mọi khối nội dung (trừ kc, image, gap) phải có src là mã đoạn nguồn dùng làm căn cứ.
- Ý trong dàn ý không tìm thấy trong nguồn: viết khối gap nêu rõ thiếu gì."""


def draft_qr(org_id: str, kit: KitBrief, item: dict, outline: dict, hits: list[Hit], mode: str = "qr") -> dict:
    """mode: master = Nội dung (không có câu hỏi), qr = Tài liệu nhanh kèm câu hỏi, lesson = một bài lẻ"""
    quiz = mode == "qr"
    quiz_rule = (f"- Câu hỏi kiểm tra: {LEVEL_KINDS.get(kit.level, LEVEL_KINDS[2])}. Mỗi câu có src. Câu mc có 3–4 lựa chọn, đúng một đáp án, mỗi lựa chọn có giải thích fb. "
                 "Câu code: tests là mảng, args là chuỗi JSON của mảng tham số, expected là chuỗi JSON.") if quiz else ""
    plan = "\n".join(f"Bài {i + 1}: {s['t']}\n" + "\n".join(f"  - {x}" for x in s["items"]) for i, s in enumerate(outline["sections"]))

    def mock() -> dict:
        d = _mock_qr(outline, kit, hits)
        return d if quiz else {**d, "questions": []}

    return ai_json(
        org_id=org_id, feature="gen_master" if mode == "master" else "gen_qr", schema=S.QrDraft, strong=True,
        system=f"{RULES}\n{TASK[mode]}\n{BLOCK_GUIDE}\n{quiz_rule}",
        input=f"{brief_text(kit)}\n\nTài liệu: {item['title']}\nMục đích: {item['summary']}\n\nDàn ý:\n{plan}\n\nTrích đoạn nguồn:\n{hits_text(hits) or '(không có nguồn: chỉ dựng khung và gap)'}",
        mock=mock,
    )


def _q(**kw: object) -> dict:
    return {**NULL_QUESTION, **kw}


def _mock_qr(outline: dict, kit: KitBrief, hits: list[Hit]) -> dict:
    src = "S1" if hits else None
    lessons = []
    for s in outline["sections"]:
        blocks = [
            {**NULL_BLOCK, "t": "heading", "h": s["t"], "p": hits[0].text[:200] if hits else f"Nội dung về {s['t']}.", "src": src},
            {**NULL_BLOCK, "t": "list", "intro": "Ý chính:", "items": s["items"], "src": src},
            *([] if hits else [{**NULL_BLOCK, "t": "gap", "p": "Chưa có tài liệu nguồn cho bài này."}]),
            {**NULL_BLOCK, "t": "kc", "q": f'Ý nào thuộc bài "{s["t"]}"?', "choices": [s["items"][0] if s["items"] else s["t"], "Không liên quan"], "correct": 0},
        ]
        lessons.append({"title": s["t"], "img": "office", "blocks": blocks})
    questions = [
        _q(type="match", level=1, q="Ghép mỗi khái niệm với mô tả đúng.", src=src, pairs=[{"l": "Mục tiêu", "r": "Điều người học làm được sau khóa"}, {"l": "Chỉ số", "r": "Cách đo kết quả"}, {"l": "Nguồn", "r": "Tài liệu làm căn cứ"}]),
        _q(type="order", level=1, q="Sắp xếp các bước học theo đúng thứ tự.", src=src, order=["Đọc tài liệu nhanh", "Xem slide", "Luyện tình huống", "Làm bài kiểm tra"]),
        _q(type="cat", level=2, q="Kéo mỗi việc vào đúng nhóm.", src=src, groups=[{"name": "Nên làm", "items": ["Kiểm tra nguồn", "Hỏi khi chưa rõ"]}, {"name": "Không nên", "items": ["Đoán khi chưa có căn cứ"]}]),
        _q(type="mc", level=1, q=f'Mục tiêu chính của khóa "{kit.title}" là gì?', src=src,
           choices=[{"t": kit.goals[0] if kit.goals else "Nắm nội dung chính", "ok": True, "fb": "Đúng."}, {"t": "Không có mục tiêu", "ok": False, "fb": "Xem lại phần mục tiêu."}]),
        _q(type="essay", level=2, q="Trình bày cách bạn áp dụng nội dung khóa vào công việc.", src=src, rubric=["Nêu đúng khái niệm chính", "Có ví dụ cụ thể", "Nêu được lỗi cần tránh"]),
        _q(type="code", level=3, q="Viết hàm solve(a, b) trả về tổng hai số.", starter="function solve(a, b) {\n  \n}",
           tests=[{"name": "Cộng hai số dương", "args": "[1, 2]", "expected": "3"}, {"name": "Có số âm", "args": "[-1, 5]", "expected": "4"}]),
    ]
    return {"lessons": lessons, "questions": questions}


SLIDE_NULLS = {"sub": None, "items": None, "cols": None, "head": None, "rows": None, "stats": None, "quote": None, "by": None, "delivery": None}


def draft_deck(org_id: str, kit: KitBrief, item: dict, titles: list[str], hits: list[Hit], for_video: bool = False) -> dict:
    titles_text = "\n".join(f"{i + 1}. {t}" for i, t in enumerate(titles))

    def mock() -> dict:
        return {"slides": [{**SLIDE_NULLS, "layout": "cover" if i == 0 else "bullets", "title": t, "sub": kit.goal[:80] if i == 0 else None,
                            "items": None if i == 0 else kit.goals[:3], "notes": f"Phần {t}. {kit.goals[0] if kit.goals else ''}", "src": "S1" if hits else None,
                            "delivery": ("Nhấn vào tên phần, ngừng một nhịp trước ý chính" if for_video else None)}
                           for i, t in enumerate(titles)]}

    return ai_json(
        org_id=org_id, feature="gen_video" if for_video else "gen_deck", schema=S.DeckDraft,
        system=f"""{RULES}
Nhiệm vụ: viết {'kịch bản video dạng slide + lời đọc' if for_video else 'bộ slide'} theo danh sách tiêu đề. Mỗi slide ngắn gọn (≤ 5 ý, mỗi ý ≤ 12 từ). Slide đầu layout cover.
Chọn layout hợp nội dung: bullets, steps (quy trình), two (so sánh hai cột), table, stat (số liệu có trong nguồn), quote.
notes: lời đọc tự nhiên {'3–5 câu, đây là lời đọc của giọng AI' if for_video else '2–4 câu'}. Mỗi slide nội dung có src.
{'delivery: chỉ dẫn ngắn cho giọng AI đọc slide này hay hơn: từ hoặc cụm cần nhấn (trích nguyên văn trong notes), chỗ ngừng, cảm xúc (vd: nhấn "phải dừng container trước", ngừng sau câu hỏi). Không lặp lại nội dung.' if for_video else 'delivery: null.'}""",
        input=f"{brief_text(kit)}\n\nTài liệu: {item['title']}\nMục đích: {item['summary']}\n\nTiêu đề các slide:\n{titles_text}\n\nTrích đoạn nguồn:\n{hits_text(hits) or '(không có nguồn)'}",
        mock=mock,
    )


def draft_scenario(org_id: str, kit: KitBrief, item: dict, o: dict, hits: list[Hit]) -> dict:
    def mock() -> dict:
        name, *role = o["character"].split(" · ")
        return {
            "character": {"name": name or "Chị Lan", "role": " · ".join(role) or "Trưởng nhóm"}, "learner": o["learner"], "intro": o["situation"],
            "scenes": [{"title": f"Cảnh {i + 1}", "goal": g, "line": f"Em xử lý việc này thế nào? ({g.lower()})", "choices": [
                {"t": "Em làm theo đúng quy trình và hỏi lại chỗ chưa rõ.", "ok": "good", "reply": "Tốt, cách đó an toàn nhất."},
                {"t": "Em làm trước rồi báo sau.", "ok": "neutral", "reply": "Được, nhưng nên báo trước để tránh rủi ro."},
                {"t": "Em làm theo cách quen, không cần xem quy trình.", "ok": "bad", "reply": "Cách đó dễ sai nếu quy trình vừa thay đổi."},
            ]} for i, g in enumerate(o["goals"])],
        }

    goals = "\n".join(f"{i + 1}. {g}" for i, g in enumerate(o["goals"]))
    return ai_json(
        org_id=org_id, feature="gen_scenario", schema=S.ScenarioDraft,
        system=f"{RULES}\nNhiệm vụ: viết tình huống hội thoại luyện tập. Mỗi cảnh ứng với một mục tiêu: nhân vật nói một câu (line), người học chọn 1 trong 3 lựa chọn (1 good: tốt nhất, 1 neutral: chấp nhận được nhưng chưa tối ưu, 1 bad: sai hoặc rủi ro), nhân vật đáp lại (reply) giải thích hệ quả dựa trên nguồn. Lời thoại tự nhiên như chat công việc.",
        input=f"{brief_text(kit)}\n\nTài liệu: {item['title']}\nNhân vật: {o['character']}\nNgười học đóng vai: {o['learner']}\nBối cảnh: {o['situation']}\nMục tiêu từng cảnh:\n{goals}\n\nTrích đoạn nguồn:\n{hits_text(hits) or '(không có nguồn)'}",
        mock=mock,
    )


# ---------- 4. Gợi ý thêm tài liệu vào kế hoạch ----------
def suggest_plan_item(org_id: str, kit: KitBrief, type_: str, instruction: str) -> dict:
    return ai_json(
        org_id=org_id, feature="plan_item", schema=S.PlanItemDraft,
        system="Đặt tên ngắn (≤ 60 ký tự) và mục đích 1–2 câu cho một tài liệu mới trong khóa học, theo hướng dẫn của người soạn. Tiếng Việt.",
        input=f"{brief_text(kit)}\nDạng: {type_}\nHướng dẫn: {instruction}",
        mock=lambda: {"title": instruction[:60], "summary": instruction},
    )


# ---------- 5. Sửa bằng AI một phần nội dung ----------
def ai_rewrite(org_id: str, current: dict, instruction: str, hits: list[Hit]) -> str:
    r = ai_json(
        org_id=org_id, feature="ai_edit", schema=S.Loose,
        system=f"{RULES}\nNhiệm vụ: sửa phần nội dung JSON theo yêu cầu của người soạn, giữ nguyên cấu trúc, giữ mã nguồn src nếu vẫn đúng.",
        input=f"Yêu cầu: {instruction}\n\nNội dung hiện tại (JSON):\n{json.dumps(current, ensure_ascii=False)}\n\nTrích đoạn nguồn:\n{hits_text(hits) or '(không có)'}",
        mock=lambda: {"json": json.dumps(current, ensure_ascii=False)},
    )
    return str(r.get("json") or r.get("json_") or "")
