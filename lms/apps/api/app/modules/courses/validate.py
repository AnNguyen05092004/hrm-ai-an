"""Kiểm tra trước khi xuất bản: chặn lỗi nghiêm trọng, nhắc các điểm cần xem lại."""
from app.modules.exams.matrix import cell_name, matrix_pools
from app.shared.text import strip_tags

QUESTION_PREVIEW = 40
SPOT_PREVIEW = 160


def _spots(lessons: list[dict]) -> list[dict]:
    """Các khối thiếu căn cứ / chưa có nguồn theo thứ tự bài, để người soạn bấm tới đúng khối"""
    out = []
    for lesson in lessons:
        for b in lesson.get("blocks") or []:
            kind = "gap" if b.get("t") == "gap" else "nosrc" if b.get("nosrc") else None
            if kind:
                text_ = strip_tags(b.get("p") if b.get("p") is not None else b.get("h") if b.get("h") is not None else b.get("intro"))
                out.append({"kind": kind, "lesson": lesson.get("id"), "lessonTitle": strip_tags(lesson.get("title")) or "Bài chưa đặt tên", "block": b.get("id"), "text": text_[:SPOT_PREVIEW]})
    return out


def _matrix_issues(matrix: list[dict], approved: list[dict], warnings: list[str]) -> None:
    """Mỗi ô cần đủ câu đã duyệt; câu đã duyệt ngoài ma trận không được rút"""
    cells, rest = matrix_pools(matrix, approved)
    for c in cells:
        if len(c["pool"]) < c["count"]:
            warnings.append(f"Ô {cell_name(c)} cần {c['count']} câu mỗi lượt thi nhưng ngân hàng có {len(c['pool'])} câu đã duyệt.")
    if rest:
        warnings.append(f"{len(rest)} câu đã duyệt không thuộc ô nào của ma trận đề nên không được rút. Đổi dạng / độ khó của câu hoặc thêm dòng vào ma trận.")


def _dup(xs: list) -> bool:
    return len({str(x).strip() for x in xs}) != len(xs)


def _question_issues(q: dict, blocking: list[str]) -> None:
    t = q.get("type")
    short = f"{str(q.get('q'))[:QUESTION_PREVIEW]}…"
    name = f'"{short}"'
    if t in ("mc", "mr", "tf") and not any(x.get("ok") for x in q.get("choices") or []):
        blocking.append(f"Câu {name} chưa có đáp án đúng.")
    if t == "code" and not q.get("tests"):
        blocking.append(f"Câu code {name} chưa có test case.")
    if t == "essay" and not q.get("rubric"):
        blocking.append(f"Câu tự luận {name} chưa có rubric.")
    if t == "match":
        ps = q.get("pairs") or []
        if len(ps) < 2 or any(not str(p.get("l") or "").strip() or not str(p.get("r") or "").strip() for p in ps):
            blocking.append(f"Câu ghép cặp {name} cần ít nhất 2 cặp, không để trống vế nào.")
        elif _dup([p.get("r") for p in ps]):
            blocking.append(f"Câu ghép cặp {name} có vế phải trùng nhau.")
    if t == "order":
        xs = q.get("items") or []
        if len(xs) < 2 or any(not str(x).strip() for x in xs):
            blocking.append(f"Câu sắp thứ tự {name} cần ít nhất 2 mục, không để trống.")
        elif _dup(xs):
            blocking.append(f"Câu sắp thứ tự {name} có mục trùng nhau.")
    if t == "cat":
        gs = q.get("groups") or []
        items = [x for g in gs for x in g.get("items") or []]
        if len(gs) < 2 or len(items) < 2 or any(not str(g.get("name") or "").strip() for g in gs) or any(not str(x).strip() for x in items):
            blocking.append(f"Câu phân loại {name} cần ít nhất 2 nhóm có tên và 2 mục.")
        elif _dup(items):
            blocking.append(f"Câu phân loại {name} có mục trùng nhau.")


def _quiz_issues(quiz: dict | None, blocking: list[str], warnings: list[str], required: bool) -> None:
    """Ngân hàng câu hỏi; đề kiểm tra riêng bắt buộc có câu đã duyệt"""
    qs = (quiz or {}).get("questions") or []
    approved = [q for q in qs if q.get("approved")]
    if not approved and (required or qs):
        (blocking if required else warnings).append("Chưa có câu nào được duyệt vào ngân hàng đề, người học chưa thi được.")
    pick = (quiz or {}).get("pick")
    if approved and (quiz or {}).get("matrix"):
        _matrix_issues(quiz["matrix"], approved, warnings)  # type: ignore[index]
    elif approved and isinstance(pick, (int, float)) and pick > len(approved):
        warnings.append(f"Đề rút {pick} câu nhưng ngân hàng chỉ có {len(approved)} câu đã duyệt.")
    pending = len(qs) - len(approved)
    if required and approved and pending:
        warnings.append(f"{pending} câu chưa duyệt sẽ không vào đề.")
    for q in approved:
        _question_issues(q, blocking)


def publish_issues(a: dict) -> dict:
    c = a["content"] or {}
    blocking: list[str] = []
    warnings: list[str] = []
    spots: list[dict] = []
    if a["status"] == "generating":
        blocking.append("Tài liệu đang được AI soạn.")
    if not a["title"].strip():
        blocking.append("Tài liệu chưa có tên.")
    if a["type"] in ("qr", "master"):
        lessons = [x for x in c.get("lessons") or [] if x.get("kind") == "lesson"]
        if not lessons:
            blocking.append("Chưa có bài học nào.")
        spots = _spots(lessons)
        gaps = sum(1 for x in spots if x["kind"] == "gap")
        nosrc = len(spots) - gaps
        if gaps:
            warnings.append(f"Còn {gaps} chỗ thiếu căn cứ. Các khối này không được dùng khi soạn định dạng; nên bổ sung trước khi chốt." if a["type"] == "master"
                            else f"Còn {gaps} chỗ thiếu căn cứ trong tài liệu nguồn (người học không thấy các khối này).")
        if nosrc:
            warnings.append(f"{nosrc} khối chưa có nguồn trích dẫn.")
        if a["type"] == "qr":
            _quiz_issues(c.get("quiz"), blocking, warnings, False)
    if a["type"] == "exam":
        if not c.get("quiz"):
            blocking.append("Đề kiểm tra chưa có ngân hàng câu hỏi.")
        else:
            _quiz_issues(c["quiz"], blocking, warnings, True)
    if a["type"] == "deck" and not c.get("slides"):
        blocking.append("Bộ slide chưa có slide nào.")
    if a["type"] == "scenario" and not c.get("scenes"):
        blocking.append("Tình huống chưa có cảnh nào.")
    if a["type"] == "video" and not c.get("chapters"):
        blocking.append("Video chưa có chương nào.")
    return {"blocking": blocking, "warnings": warnings, "spots": spots}
