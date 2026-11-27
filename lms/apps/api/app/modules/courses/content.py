"""Chuyển bản nháp AI sang cấu trúc nội dung của trình soạn (bài, khối, câu hỏi, slide, cảnh)."""
import re

from app.modules.courses.narration import DEFAULT, narration_of
from app.modules.sources.service import Hit
from app.shared.ids import uid

NEEDS_SRC = {"heading", "para", "list", "flash", "accordion", "tabs", "timeline", "sorting", "table", "code", "process"}
CHARS_PER_SEC = 14
DEFAULT_QR_LESSONS = 3
DEFAULT_PICK = 10


def js_round(x: float) -> int:
    """Math.round của JS (0,5 làm tròn lên), khác round() của Python"""
    return int(x + 0.5) if x >= 0 else -int(-x + 0.5)


def clean(o: dict) -> dict:
    return {k: v for k, v in o.items() if v is not None}


def src_ref(code: str | None, hits: list[Hit]) -> dict:
    m = re.search(r"S(\d+)", code or "")
    i = int(m.group(1)) - 1 if m else -1
    if not m or i < 0 or i >= len(hits):
        return {}
    h = hits[i]
    # đoạn của nội dung không trích tài liệu nguồn nào: chỉ ghi chỗ trong nội dung
    if h.sourceId:
        return {"src": f"{h.sourceName} · {h.section}", "srcRef": {"sourceId": h.sourceId, "chunkId": h.id, "version": h.version}}
    return {"src": f"{h.sourceName} · {h.section}"}


def tf_choices(cs: list[dict] | None) -> list[dict]:
    """Câu đúng/sai luôn đúng 2 lựa chọn theo thứ tự Đúng, Sai; giữ đáp án và giải thích AI trả về"""
    cs = cs or []
    is_true = next((c for c in cs if re.match(r"^đúng", c["t"].strip(), re.I)), None)
    is_false = next((c for c in cs if re.match(r"^sai", c["t"].strip(), re.I)), None)
    true_ok = is_true["ok"] if is_true else (not is_false["ok"]) if is_false else True
    return [{"t": "Đúng", "ok": true_ok, "fb": is_true["fb"] if is_true else ""}, {"t": "Sai", "ok": not true_ok, "fb": is_false["fb"] if is_false else ""}]


def _block(b: dict, hits: list[Hit], has_sources: bool) -> dict:
    rest = {k: v for k, v in b.items() if k not in ("accordion", "timeline", "src")}
    ref = src_ref(b.get("src"), hits)
    items = b.get("accordion") if b["t"] in ("accordion", "tabs") else b.get("timeline") if b["t"] == "timeline" else rest.get("items")
    block = clean({**rest, "items": items, "id": uid("b"), **ref})
    if block["t"] == "kc":
        n = len(block.get("choices") or []) or 1
        return {**block, "choices": block.get("choices") or [], "correct": max(0, min(n - 1, block.get("correct") or 0))}
    if block["t"] in NEEDS_SRC and has_sources and not ref.get("src"):
        return {**block, "nosrc": True}
    return block


def question(q: dict, hits: list[Hit]) -> dict:
    t = q["type"]
    return clean({
        "id": uid("q"), "type": t, "level": min(3, max(1, int(q.get("level") or 1))), "approved": False, "q": q["q"],
        "choices": tf_choices(q.get("choices")) if t == "tf" else q.get("choices"), "answer": q.get("answer"), "rubric": q.get("rubric"), "starter": q.get("starter"),
        "pairs": q.get("pairs") if t == "match" else None, "items": q.get("order") if t == "order" else None, "groups": q.get("groups") if t == "cat" else None,
        "tests": [{"name": x["name"], "args": x["args"], "expected": x["expected"]} for x in q["tests"]] if q.get("tests") else None,
        **src_ref(q.get("src"), hits),
    })


def qr_content(r: dict, kit: dict, hits: list[Hit], has_sources: bool, max_lessons: int = DEFAULT_QR_LESSONS, quiz: bool = True) -> dict:
    """max_lessons: Tài liệu nhanh tối đa 3 bài; nội dung nhiều hơn. quiz=False: không có bài kiểm tra (nội dung, bài lẻ)"""
    lessons = [{
        "id": uid("l"), "kind": "lesson", "title": lesson["title"],
        "blocks": [{"id": uid("b"), "t": "image", "img": lesson["img"], "cap": lesson["title"]},
                   *[_block(b, hits, has_sources) for b in lesson["blocks"] if b["t"] != "image"]],
    } for lesson in r["lessons"][:max_lessons]]
    if not quiz:
        return {"lessons": lessons}
    questions = [question(q, hits) for q in r["questions"]]
    return {
        "lessons": [*lessons, {"id": "quiz", "kind": "quiz", "title": "Bài kiểm tra"}],
        "quiz": {"mode": "practice", "skill": kit["skillId"], "level": kit["level"] or 1, "passScore": 80, "attempts": 3, "minutes": 20, "proctor": False,
                 "pick": min(DEFAULT_PICK, len(questions)), "questions": questions},
    }


def _slide(s: dict, hits: list[Hit], **extra: object) -> dict:
    return clean({**s, "id": uid("s"), **extra, "src": None, **src_ref(s.get("src"), hits)})


def deck_content(r: dict, hits: list[Hit]) -> dict:
    return {"slides": [_slide(s, hits) for s in r["slides"]]}


def split_sentences(text_: str) -> list[str]:
    return [x for x in re.split(r"(?<=[.!?])\s+", text_ or "") if x]


def video_content(r: dict, hits: list[Hit]) -> dict:
    t = 0
    chapters: list[dict] = []
    transcript: list[dict] = []
    slides = []
    for s in r["slides"]:
        at = t
        chapters.append({"t": at, "title": s["title"]})
        for sentence in split_sentences(s["notes"]):
            transcript.append({"t": t, "x": sentence})
            t += max(3, js_round(len(sentence) / CHARS_PER_SEC))
        slides.append(_slide(s, hits, t=at))
    return {"ai": True, "voice": narration_of({"narration": DEFAULT}).label, "narration": dict(DEFAULT), "slides": slides, "chapters": chapters, "transcript": transcript, "checkpoints": [], "duration": t, "render": {"status": "none"}}


def scenario_content(r: dict) -> dict:
    return {
        "experience": "photo", "frame": "full", "character": r["character"], "learner": r["learner"], "intro": r["intro"],
        "scenes": [{"id": uid("sc"), "title": s["title"], "goal": s["goal"],
                    "cards": [{"id": uid("c"), "kind": "char", "text": s["line"]}, {"id": uid("c"), "kind": "decision", "choices": s["choices"]}]} for s in r["scenes"]],
    }
