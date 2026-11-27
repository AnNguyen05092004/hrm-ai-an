"""Vector giả lập: băm từ khóa vào các chiều, đủ để tìm kiếm theo từ chung khi chạy không có key.
Giữ đúng phép băm của bản Node (FNV-1a 32 bit)."""
import math
import re

from app.shared.tables import EMBED_DIM
from app.shared.text import fold


def _i32(x: int) -> int:
    x &= 0xFFFFFFFF
    return x - 0x100000000 if x >= 0x80000000 else x


def _word_hash(w: str) -> int:
    h = _i32(2166136261)
    for ch in w:  # từ đã bỏ dấu, chỉ gồm a-z0-9
        h = _i32((h ^ ord(ch)) * 16777619)
    return h


def mock_embed(text: str) -> list[float]:
    v = [0.0] * EMBED_DIM
    for w in re.split(r"[^a-z0-9]+", fold(text)):
        if len(w) > 2:
            v[abs(_word_hash(w)) % EMBED_DIM] += 1
    n = math.sqrt(sum(x * x for x in v)) or 1
    return [x / n for x in v]
