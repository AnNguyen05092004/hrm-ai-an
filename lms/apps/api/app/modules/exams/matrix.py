"""Ma trận đề: mỗi ô là một dạng câu ở một độ khó, kèm số câu có trong mỗi lượt thi.
Ngân hàng câu soạn dư (gấp `reserve` lần) để mỗi lượt thi rút ngẫu nhiên một bộ khác nhau nhưng cùng cấu trúc."""

TYPE_NAME = {"mc": "Một đáp án", "mr": "Nhiều đáp án", "tf": "Đúng / Sai", "fill": "Điền chỗ trống", "match": "Ghép cặp", "order": "Sắp thứ tự",
             "cat": "Phân loại", "essay": "Tự luận", "code": "Bài code JavaScript"}
# Độ khó của câu hỏi (trường `level` của câu)
DIFF_NAME = {1: "Dễ", 2: "Trung bình", 3: "Khó"}


def _in_cell(q: dict, c: dict) -> bool:
    return q.get("type") == c["type"] and (q.get("level") or 1) == c["level"]


def cell_name(c: dict) -> str:
    return f"{TYPE_NAME.get(c['type'], c['type'])} · {DIFF_NAME.get(c['level'], c['level'])}"


def matrix_pools(matrix: list[dict], qs: list[dict]) -> tuple[list[dict], list[dict]]:
    """Chia các câu theo ô ma trận; phần thứ hai là câu không thuộc ô nào (không được rút)"""
    cells = [{**c, "pool": [q for q in qs if _in_cell(q, c)]} for c in matrix]
    rest = [q for q in qs if not any(_in_cell(q, c) for c in matrix)]
    return cells, rest


def exam_pick(quiz: dict, qs: list[dict]) -> int:
    """Số câu mỗi lượt thi thực rút được từ các câu `qs` (đã duyệt)"""
    m = quiz.get("matrix")
    if m:
        return sum(min(c["count"], len(c["pool"])) for c in matrix_pools(m, qs)[0])
    pick = quiz.get("pick")
    return min(int(pick if pick is not None else len(qs)), len(qs))
