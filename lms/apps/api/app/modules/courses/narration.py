"""Cấu hình lời đọc của video: giọng, phong cách đọc, người dẫn ở góc.

Lưu trong nội dung video (`content.narration`). Video tạo trước khi có cấu hình này giữ giọng cũ
(alloy, không chỉ dẫn, không người dẫn) để dựng lại một đoạn không bị lệch giọng với các đoạn còn lại."""
from dataclasses import dataclass

# giọng có sẵn của dịch vụ TTS (không nhân bản giọng người thật); look: ảnh người dẫn đi kèm (nữ / nam)
VOICES: dict[str, dict[str, str]] = {
    "marin": {"label": "Nữ, tự nhiên", "look": "f"},
    "coral": {"label": "Nữ, ấm áp", "look": "f"},
    "cedar": {"label": "Nam, tự nhiên", "look": "m"},
    "onyx": {"label": "Nam, trầm", "look": "m"},
    "alloy": {"label": "Trung tính (giọng cũ)", "look": "f"},
}
# chỉ dẫn viết bằng tiếng Anh vì model TTS làm theo ổn định hơn; lời đọc vẫn là tiếng Việt
VIETNAMESE = "The script is Vietnamese: pronounce it naturally with correct Vietnamese tones, do not translate."
STYLES: dict[str, dict[str, str]] = {
    "friendly": {"label": "Giảng viên thân thiện", "prompt": "Warm, friendly instructor. Moderate pace, smile in the voice, lightly stress key terms, short pause after each idea."},
    "formal": {"label": "Trang trọng", "prompt": "Clear, confident, professional presenter at a company briefing. Even rhythm, stress numbers, rules and deadlines."},
    "calm": {"label": "Hướng dẫn chậm rãi", "prompt": "Calm, patient guide walking through steps. Slower pace, pause after each step so the listener can follow."},
    "energetic": {"label": "Hào hứng", "prompt": "Upbeat and energetic, slightly faster pace, emphasize benefits and surprising facts, rising intonation on highlights."},
    "none": {"label": "Không chỉ dẫn (giọng cũ)", "prompt": ""},
}
POSITIONS = ("right", "left")
DEFAULT = {"voice": "marin", "style": "friendly", "presenter": True, "pos": "right"}
LEGACY = {"voice": "alloy", "style": "none", "presenter": False, "pos": "right"}
SAMPLE_TEXT = "Xin chào, mình sẽ cùng bạn đi qua bài học này. Phần quan trọng nhất là bước thứ hai, mình sẽ nói kỹ hơn ngay sau đây."


@dataclass(frozen=True)
class Narration:
    voice: str
    style: str
    presenter: bool
    pos: str

    @property
    def look(self) -> str:
        return VOICES[self.voice]["look"]

    @property
    def label(self) -> str:
        return f"Giọng AI {VOICES[self.voice]['label'].lower()} · {STYLES[self.style]['label']}"

    def instructions(self, delivery: str | None = None) -> str | None:
        """Chỉ dẫn cách đọc cho một đoạn: phong cách chung của video + cách đọc riêng của slide"""
        parts = [STYLES[self.style]["prompt"], f"For this part: {delivery.strip()}" if delivery and delivery.strip() else ""]
        parts = [p for p in parts if p]
        return " ".join([*parts, VIETNAMESE]) if parts else None

    def key(self) -> dict | None:
        """Phần đưa vào hash của đoạn video; cấu hình cũ trả None để các đoạn đã dựng vẫn dùng lại được"""
        return None if self == narration_of({}) else {"voice": self.voice, "style": self.style, "presenter": self.presenter, "pos": self.pos}


def narration_of(content: dict) -> Narration:
    """Đọc cấu hình từ nội dung video, giá trị lạ thì về mặc định"""
    raw = content.get("narration")
    base = DEFAULT if isinstance(raw, dict) else LEGACY
    raw = raw if isinstance(raw, dict) else {}
    voice = raw.get("voice") if raw.get("voice") in VOICES else base["voice"]
    style = raw.get("style") if raw.get("style") in STYLES else base["style"]
    pos = raw.get("pos") if raw.get("pos") in POSITIONS else base["pos"]
    presenter = raw["presenter"] if isinstance(raw.get("presenter"), bool) else base["presenter"]
    return Narration(voice, style, presenter, pos)


def options() -> dict:
    """Danh sách cho giao diện chọn giọng"""
    return {"voices": [{"id": k, **v} for k, v in VOICES.items()], "styles": [{"id": k, "label": v["label"]} for k, v in STYLES.items()],
            "default": DEFAULT, "legacy": LEGACY}
