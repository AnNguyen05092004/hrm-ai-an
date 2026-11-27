"""Schema JSON AI phải trả (structured output). Trường có thể vắng khai báo `X | None` nhưng vẫn bắt buộc có khóa."""
from typing import Literal

from pydantic import BaseModel, Field

IMAGES = ("server", "rack", "desk", "person", "screen", "office", "meeting", "team", "cyber", "lock", "mobile", "dash", "charts", "code", "plan", "support",
          "handshake", "teamwork", "terminal", "devscreen", "nodes", "ai", "ml", "servers", "setup", "devs", "shop", "notes", "writing", "welcome", "workshop", "warehouse")
ImageKey = Literal["server", "rack", "desk", "person", "screen", "office", "meeting", "team", "cyber", "lock", "mobile", "dash", "charts", "code", "plan", "support",
                   "handshake", "teamwork", "terminal", "devscreen", "nodes", "ai", "ml", "servers", "setup", "devs", "shop", "notes", "writing", "welcome", "workshop", "warehouse"]
GEN_TYPES = ("qr", "deck", "scenario", "video")
GenType = Literal["qr", "deck", "scenario", "video"]
# Dạng câu hỏi: một đáp án, nhiều đáp án, đúng/sai, điền chỗ trống, sắp thứ tự, ghép cặp, phân loại, tự luận, bài code
QUESTION_TYPES = ("mc", "mr", "tf", "fill", "order", "match", "cat", "essay", "code")
QuestionType = Literal["mc", "mr", "tf", "fill", "order", "match", "cat", "essay", "code"]


class Details(BaseModel):
    title: str
    desc: str
    audience: str
    goals: list[str]
    takeaways: list[str]
    metrics: list[str]
    skillId: str = Field(description="id kỹ năng trong danh sách, hoặc chuỗi rỗng nếu không khớp")
    level: int
    practice: Literal["less", "balanced", "more"]
    warnings: list[str] = Field(description="mâu thuẫn giữa các nguồn, dữ liệu nhạy cảm, nguồn thiếu")


class Section(BaseModel):
    t: str
    items: list[str]


class SectionsOutline(BaseModel):
    sections: list[Section]


class DeckOutline(BaseModel):
    slides: list[str]


class VideoOutline(BaseModel):
    chapters: list[str]


class ScenarioOutline(BaseModel):
    character: str = Field(description="Tên · vai trò")
    learner: str
    situation: str
    goals: list[str]


OUTLINE_SCHEMAS: dict[str, type[BaseModel]] = {"master": SectionsOutline, "qr": SectionsOutline, "deck": DeckOutline, "video": VideoOutline, "scenario": ScenarioOutline}


class Card(BaseModel):
    f: str
    b: str


class TB(BaseModel):
    t: str
    b: str


class TimelineItem(BaseModel):
    d: str = Field(description="mốc: năm, ngày, giai đoạn hoặc bước")
    t: str
    b: str


class Group(BaseModel):
    name: str
    items: list[str]


class Block(BaseModel):
    t: Literal["heading", "para", "list", "flash", "accordion", "tabs", "timeline", "sorting", "table", "code", "process", "kc", "image", "gap"]
    h: str | None
    p: str | None
    intro: str | None
    items: list[str] | None
    steps: list[str] | None
    cards: list[Card] | None
    accordion: list[TB] | None = Field(description="các mục t/b của accordion hoặc tabs")
    timeline: list[TimelineItem] | None
    groups: list[Group] | None = Field(description="sorting: các nhóm và mục thuộc nhóm, người học kéo mục vào đúng nhóm")
    head: list[str] | None
    rows: list[list[str]] | None
    code: str | None
    q: str | None
    choices: list[str] | None
    correct: int | None
    img: ImageKey | None
    cap: str | None
    src: str | None = Field(description='mã đoạn nguồn, ví dụ "S2"; null với kc, image, gap')


class Choice(BaseModel):
    t: str
    ok: bool
    fb: str


class Pair(BaseModel):
    l: str  # noqa: E741 - tên trường giữ như cấu trúc nội dung của web
    r: str


class CodeTest(BaseModel):
    name: str
    args: str = Field(description="mảng JSON các tham số")
    expected: str = Field(description="giá trị JSON mong đợi")


class Question(BaseModel):
    type: QuestionType
    level: int = Field(description="độ khó: 1 dễ, 2 trung bình, 3 khó")
    q: str
    choices: list[Choice] | None = Field(description='mc: 3–4 lựa chọn, đúng 1; mr: 4–5 lựa chọn, đúng từ 2; tf: đúng 2 lựa chọn "Đúng" và "Sai", câu q là một phát biểu')
    answer: str | None = Field(description="đáp án câu điền")
    rubric: list[str] | None
    pairs: list[Pair] | None = Field(description="match: 3–5 cặp vế trái / vế phải ghép đúng")
    order: list[str] | None = Field(description="order: 3–6 mục theo đúng thứ tự")
    groups: list[Group] | None = Field(description="cat: 2–3 nhóm, mỗi nhóm 2–4 mục, người thi kéo mục vào đúng nhóm")
    starter: str | None = Field(description="mã khởi đầu JavaScript cho câu code, khai báo function solve(...)")
    tests: list[CodeTest] | None
    src: str | None


class Lesson(BaseModel):
    title: str
    img: ImageKey
    blocks: list[Block]


class QrDraft(BaseModel):
    lessons: list[Lesson]
    questions: list[Question]


class Slide(BaseModel):
    layout: Literal["cover", "bullets", "steps", "two", "table", "stat", "quote"]
    title: str
    sub: str | None
    items: list[str] | None
    cols: list[list[str]] | None = Field(description="mỗi cột: phần tử đầu là tiêu đề cột")
    head: list[str] | None
    rows: list[list[str]] | None
    stats: list[list[str]] | None = Field(description="[[số, mô tả]]")
    quote: str | None
    by: str | None
    notes: str = Field(description="lời người trình bày, cũng là lời đọc khi tạo video, 2–4 câu")
    delivery: str | None = Field(description="chỉ dẫn cách đọc lời của slide này cho giọng AI (chỉ video, bộ slide để null): từ cần nhấn, chỗ ngừng, cảm xúc; ≤ 20 từ")
    src: str | None


class DeckDraft(BaseModel):
    slides: list[Slide]


class Character(BaseModel):
    name: str
    role: str


class ScenarioChoice(BaseModel):
    t: str
    # cùng thang với trình soạn và trình học: good (tốt nhất) / neutral (chấp nhận được) / bad
    ok: Literal["good", "neutral", "bad"]
    reply: str


class Scene(BaseModel):
    title: str
    goal: str
    line: str = Field(description="câu nhân vật nói mở đầu cảnh")
    choices: list[ScenarioChoice]


class ScenarioDraft(BaseModel):
    character: Character
    learner: str
    intro: str
    scenes: list[Scene]


class PlanItemDraft(BaseModel):
    title: str
    summary: str


class Loose(BaseModel):
    json_: str = Field(alias="json", description="nội dung sau khi sửa, dạng chuỗi JSON cùng cấu trúc với đầu vào")

    model_config = {"populate_by_name": True, "serialize_by_alias": True}


class OneBlock(BaseModel):
    block: Block


class Questions(BaseModel):
    questions: list[Question]


NULL_BLOCK = {k: None for k in Block.model_fields if k != "t"}
NULL_QUESTION = {k: None for k in ("choices", "answer", "rubric", "pairs", "order", "groups", "starter", "tests", "src")}
