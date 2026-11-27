"""Xử lý chữ tiếng Việt dùng chung."""
import re
import unicodedata

_COMBINING = re.compile("[̀-ͯ]")


def fold(s: str) -> str:
    """Bỏ dấu tiếng Việt, chữ thường"""
    return _COMBINING.sub("", unicodedata.normalize("NFD", (s or "").lower())).replace("đ", "d")


def slugify(s: str, fallback: str) -> str:
    out = re.sub(r"[^a-zA-Z0-9]+", "-", _COMBINING.sub("", unicodedata.normalize("NFD", s)).replace("đ", "d").replace("Đ", "D"))
    return out.strip("-").lower()[:60] or fallback


def strip_tags(s: object) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", str(s if s is not None else ""))).strip()
