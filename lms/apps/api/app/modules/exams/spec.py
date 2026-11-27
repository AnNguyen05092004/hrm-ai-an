"""Đề kiểm tra: AI soạn ngân hàng câu theo ma trận đề (dạng câu × độ khó × số câu), người soạn duyệt từng câu."""
import math
from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints
from sqlalchemy import select

from app.modules.courses.ai_edit import generate_questions
from app.modules.courses.content import js_round
from app.modules.courses.jobs import mark_failed_if_final
from app.modules.courses.master import locked_master, master_hits
from app.modules.courses.schemas import QuestionType
from app.modules.courses.service import get_kit, set_artifact
from app.modules.exams.matrix import DIFF_NAME, TYPE_NAME
from app.modules.sources.service import Hit
from app.shared import tables as t
from app.shared.db import one
from app.shared.errors import bad_request
from app.shared.jobs import JobCtx, define_job

MAX_EXAM = 50
MAX_BANK = 100
CHUNK = 10
DEFAULT_PICK = 10


class MatrixCell(BaseModel):
    """Một ô của ma trận đề: dạng câu, độ khó (1 dễ, 2 trung bình, 3 khó), số câu trong mỗi lượt thi"""
    type: QuestionType
    level: int = Field(ge=1, le=3)
    count: int = Field(ge=1, le=20)


class ExamSpec(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] = ""
    focus: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] = ""
    matrix: list[MatrixCell] | None = Field(None, min_length=1, max_length=27)
    # ngân hàng soạn gấp mấy lần số câu trong đề, để mỗi lượt thi rút một bộ khác nhau
    reserve: int = Field(2, ge=1, le=3)
    # đề tạo trước khi có ma trận: soạn theo mức, rút ngẫu nhiên `pick` câu
    levels: list[Annotated[int, Field(ge=1, le=3)]] | None = Field(None, min_length=1, max_length=3)
    perLevel: int = Field(5, ge=1, le=10)
    types: list[QuestionType] | None = Field(None, max_length=9)
    pick: int | None = Field(None, ge=1, le=50)
    mode: Literal["official", "practice"] = "official"
    minutes: int = Field(30, ge=5, le=240)
    passScore: int = Field(80, ge=1, le=100)
    attempts: int = Field(2, ge=1, le=10)
    proctor: bool = False

    def outline(self) -> dict:
        return self.model_dump(exclude_none=True)


def exam_size(m: list[dict]) -> int:
    return sum(c["count"] for c in m)


def check_matrix(spec: ExamSpec) -> None:
    """Không trùng ô, không quá số câu cho phép"""
    if not spec.matrix:
        if not spec.levels:
            raise bad_request("Thêm ít nhất một dòng vào ma trận đề")
        return
    m = [c.model_dump() for c in spec.matrix]
    keys = [f"{c['type']}:{c['level']}" for c in m]
    if len(set(keys)) != len(keys):
        raise bad_request("Ma trận có hai dòng trùng dạng câu và độ khó, gộp lại thành một dòng")
    if exam_size(m) > MAX_EXAM:
        raise bad_request(f"Mỗi đề tối đa {MAX_EXAM} câu")
    if exam_size(m) * spec.reserve > MAX_BANK:
        raise bad_request(f"Ngân hàng tối đa {MAX_BANK} câu, giảm số câu hoặc số câu dự phòng")


def exam_plan(k: dict, spec: ExamSpec) -> dict:
    check_matrix(spec)
    shape = (f"{exam_size([c.model_dump() for c in spec.matrix])} câu mỗi lượt thi theo ma trận {len(spec.matrix)} dòng" if spec.matrix
             else f"mức {', '.join(str(x) for x in sorted(set(spec.levels or [])))}")
    focus = f" · trọng tâm: {spec.focus}" if spec.focus else ""
    return {
        "type": "exam", "title": spec.title or f"Đề kiểm tra: {k['title']}",
        "summary": f"{'Thi chính thức' if spec.mode == 'official' else 'Luyện tập'} · {shape} · {spec.minutes} phút · đạt từ {spec.passScore}%{focus}",
        "outline": spec.outline(),
    }


def _batches(spec: ExamSpec) -> list[dict]:
    """Các lượt gọi AI: mỗi ô ma trận một lượt (chia nhỏ khi nhiều câu)"""
    if spec.matrix:
        rows = [{"level": c.level, "count": c.count * spec.reserve, "types": [c.type], "label": f"{TYPE_NAME[c.type]} · {DIFF_NAME[c.level]}"} for c in spec.matrix]
    else:
        rows = [{"level": lv, "count": spec.perLevel, "types": spec.types, "label": f"độ khó {DIFF_NAME[lv]}"} for lv in spec.levels or []]
    return [{**r, "count": min(CHUNK, r["count"] - i * CHUNK)} for r in rows for i in range(math.ceil(r["count"] / CHUNK))]


def build_exam(k: dict, spec: ExamSpec, ctx: JobCtx, hits: list[Hit] | None = None) -> dict:
    """Soạn ngân hàng câu theo ma trận: lần lượt từng ô để AI tránh câu trùng"""
    questions: list[dict] = []
    batches = _batches(spec)
    for i, b in enumerate(batches):
        ctx.report(10 + js_round(80 * i / len(batches)), f"AI soạn câu {b['label']}")
        questions.extend(generate_questions(k, b["level"], b["count"], spec.focus, [str(q.get("q")) for q in questions], b["types"], hits))
    matrix = [c.model_dump() for c in spec.matrix] if spec.matrix else None
    return {"quiz": {
        "mode": spec.mode, "skill": k["skillId"], "level": k["level"] or 1, "passScore": spec.passScore, "attempts": spec.attempts, "minutes": spec.minutes,
        "proctor": spec.mode == "official" and spec.proctor, **({"matrix": matrix} if matrix else {}),
        "pick": exam_size(matrix) if matrix else min(spec.pick or DEFAULT_PICK, len(questions)), "questions": questions,
    }}


@define_job("exam.generate")
def generate_exam(ctx: JobCtx) -> dict | None:
    a = one(select(t.artifacts).where(t.artifacts.c.id == str(ctx.payload["artifactId"])))
    if not a:
        return None
    plan = (a["content"] or {}).get("plan") or {}
    try:
        # khóa đã chốt nội dung: ra đề từ nội dung; đề trong kho đề tạo từ tài liệu: ra đề từ tài liệu nguồn
        m = locked_master(a["kitId"])
        content = build_exam(get_kit(a["orgId"], a["kitId"]), ExamSpec.model_validate(plan.get("outline") or {}), ctx, master_hits(m.content) if m else None)
        set_artifact(a["id"], content={**content, "plan": {**plan, **({"basedOn": m.version} if m else {})}}, status="published" if a["publishedVersion"] else "draft")
        return {"artifactId": a["id"]}
    except Exception:
        mark_failed_if_final(ctx, a["id"])
        raise
