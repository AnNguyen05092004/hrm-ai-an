"""Kết nối CSDL và đơn vị công việc (unit of work).

Mỗi request ghi và mỗi job nền chạy trong một giao dịch: thành công thì commit, lỗi thì rollback.
Code nghiệp vụ lấy kết nối hiện tại bằng `db()`, không phải truyền kết nối qua từng hàm.
"""
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from functools import lru_cache
from typing import Any

from sqlalchemy import Connection, Engine, create_engine

from app.config import settings

_current: ContextVar[Connection | None] = ContextVar("db_connection", default=None)


@lru_cache
def engine() -> Engine:
    return create_engine(settings().sqlalchemy_url, pool_size=10, max_overflow=10, pool_pre_ping=True)


def db() -> Connection:
    c = _current.get()
    if c is None:
        raise RuntimeError("Chưa mở unit of work (dùng unit_of_work())")
    return c


@contextmanager
def unit_of_work() -> Iterator[Connection]:
    """Mở giao dịch mới; lồng trong một giao dịch đang mở thì dùng chung giao dịch đó."""
    if _current.get() is not None:
        yield db()
        return
    with independent() as c:
        yield c


@contextmanager
def independent() -> Iterator[Connection]:
    """Giao dịch riêng, commit ngay khi xong: ghi tiến độ job, ghi lỗi sau khi giao dịch chính rollback."""
    with engine().begin() as c:
        token = _current.set(c)
        try:
            yield c
        finally:
            _current.reset(token)


@lru_cache
def _keys() -> dict[str, str]:
    """Tên cột trong CSDL → tên trong code (org_id → orgId); mọi bảng dùng cùng một cách đặt tên"""
    from app.shared.tables import meta
    return {c.name: c.key for tbl in meta.tables.values() for c in tbl.c if c.name != c.key}


def _row(r: Any) -> dict:
    keys = _keys()
    return {keys.get(k, k): v for k, v in r.items()}


def one(stmt: Any) -> dict | None:
    r = db().execute(stmt).mappings().first()
    return _row(r) if r else None


def many(stmt: Any) -> list[dict]:
    return [_row(r) for r in db().execute(stmt).mappings().all()]


def scalar(stmt: Any) -> Any:
    return db().execute(stmt).scalar()
