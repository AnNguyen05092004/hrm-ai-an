"""Kiểu dữ liệu đầu vào dùng chung (giống ràng buộc zod của bản Node)."""
import re
from typing import Annotated

from pydantic import AfterValidator, StringConstraints

_EMAIL = re.compile(r"^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$")


def _email(v: str) -> str:
    if not _EMAIL.match(v):
        raise ValueError("Email không hợp lệ")
    return v


Email = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200), AfterValidator(_email)]


Id = Annotated[str, StringConstraints(max_length=64)]
