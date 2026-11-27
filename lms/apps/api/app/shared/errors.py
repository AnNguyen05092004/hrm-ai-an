"""Lỗi nghiệp vụ trả về dạng {error: {code, message}}."""
from typing import Any


class AppError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def not_found(what: str = "Dữ liệu") -> AppError:
    return AppError(404, "not_found", f"{what} không tồn tại")


def forbidden(msg: str = "Bạn không có quyền làm việc này") -> AppError:
    return AppError(403, "forbidden", msg)


def bad_request(msg: str, code: str = "bad_request") -> AppError:
    return AppError(400, code, msg)


def conflict(msg: str) -> AppError:
    return AppError(409, "conflict", msg)


def must(v: Any, what: str = "Dữ liệu") -> Any:
    if v is None:
        raise not_found(what)
    return v
