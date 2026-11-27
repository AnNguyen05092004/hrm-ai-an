"""Kho tệp trên đĩa (dev). Khóa tệp chỉ gồm ký tự an toàn để chống path traversal."""
import re
from pathlib import Path

from app.config import settings

_SAFE = re.compile(r"^[a-zA-Z0-9/_.-]+$")


def file_path(key: str) -> Path:
    if not _SAFE.match(key) or ".." in key:
        raise ValueError("khóa tệp không hợp lệ")
    return settings().storage_root / key


def put_file(key: str, data: bytes) -> str:
    p = file_path(key)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data)
    return key


def get_file(key: str) -> bytes:
    return file_path(key).read_bytes()
