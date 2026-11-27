"""Phần HTTP dùng chung: router mở giao dịch cho mỗi request, JSON như bản Node, chống CSRF, giới hạn số lần gọi, xử lý lỗi."""
import functools
import inspect
import json
import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable
from datetime import UTC, date, datetime
from typing import Any

from fastapi import APIRouter, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.shared.db import unit_of_work
from app.shared.errors import AppError


def js_time(d: datetime) -> str:
    """Giống Date.toISOString() của JS: UTC, mili giây, đuôi Z"""
    return d.astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def to_js(x: Any) -> Any:
    if isinstance(x, datetime):
        return js_time(x)
    if isinstance(x, date):
        return x.isoformat()
    if isinstance(x, dict):
        return {k: to_js(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [to_js(v) for v in x]
    return x


class JSResponse(JSONResponse):
    def render(self, content: Any) -> bytes:
        return json.dumps(to_js(content), ensure_ascii=False, separators=(",", ":")).encode()


def _transactional(fn: Callable) -> Callable:
    @functools.wraps(fn)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        with unit_of_work():
            result = fn(*args, **kwargs)
        return to_js(result)
    return wrapper


class TxRouter(APIRouter):
    """Mỗi endpoint đồng bộ chạy trong một unit of work: xong thì commit, lỗi thì rollback."""

    def add_api_route(self, path: str, endpoint: Callable, **kwargs: Any) -> None:
        if not inspect.iscoroutinefunction(endpoint):
            endpoint = _transactional(endpoint)
        super().add_api_route(path, endpoint, **kwargs)


def error_body(code: str, message: str, **extra: Any) -> dict:
    return {"error": {"code": code, "message": message, **extra}}


class RateLimiter:
    """Giới hạn theo IP trong cửa sổ trượt (bộ nhớ trong tiến trình: một tiến trình API)."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window: float = 60.0) -> bool:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and q[0] <= now - window:
                q.popleft()
            if len(q) >= limit:
                return False
            q.append(now)
            return True


GLOBAL_LIMIT = 600
# đường dẫn → số lần mỗi phút (đăng nhập chặn dò mật khẩu)
ROUTE_LIMITS = {("POST", "/api/auth/login"): 10, ("POST", "/api/auth/demo"): 30}
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def install(app: FastAPI) -> None:
    limiter = RateLimiter()

    @app.middleware("http")
    async def guard(request: Request, call_next: Callable) -> Any:
        ip = request.client.host if request.client else "-"
        route_limit = ROUTE_LIMITS.get((request.method, request.url.path))
        if not limiter.hit(f"all:{ip}", GLOBAL_LIMIT) or (route_limit and not limiter.hit(f"{request.url.path}:{ip}", route_limit)):
            return JSResponse(error_body("rate_limited", "Gửi quá nhiều yêu cầu, thử lại sau ít phút"), status_code=429)
        # Chống CSRF: mọi request ghi phải có header riêng (form từ trang khác không gửi được header này)
        if request.method not in SAFE_METHODS and request.headers.get("x-lms") != "1":
            return JSResponse(error_body("csrf", "Thiếu header bảo vệ"), status_code=403)
        return await call_next(request)

    @app.exception_handler(AppError)
    async def app_error(_: Request, e: AppError) -> JSResponse:
        return JSResponse(error_body(e.code, e.message), status_code=e.status)

    @app.exception_handler(RequestValidationError)
    async def invalid(_: Request, e: RequestValidationError) -> JSResponse:
        details = [{"loc": list(x.get("loc", [])), "msg": x.get("msg", "")} for x in e.errors()]
        return JSResponse(error_body("validation", "Dữ liệu gửi lên không hợp lệ", details=details), status_code=400)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, e: StarletteHTTPException) -> JSResponse:
        code = "not_found" if e.status_code == 404 else "error"
        return JSResponse(error_body(code, str(e.detail)), status_code=e.status_code)

    @app.exception_handler(Exception)
    async def internal(request: Request, e: Exception) -> JSResponse:
        app.state.log.exception("Lỗi khi xử lý %s %s", request.method, request.url.path, exc_info=e)
        return JSResponse(error_body("internal", "Lỗi máy chủ, vui lòng thử lại"), status_code=500)
