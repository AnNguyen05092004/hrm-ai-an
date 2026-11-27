"""Hàng đợi job trong PostgreSQL (bảng jobs). API xếp job trong cùng giao dịch với thay đổi nghiệp vụ;
Background Worker (tiến trình riêng) nhận job bằng `for update skip locked`, chạy, ghi tiến độ và kết quả."""
import logging
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from sqlalchemy import text, update

from app.shared import tables as t
from app.shared.db import independent, one, unit_of_work

log = logging.getLogger("lms.jobs")
MAX_ATTEMPTS = 2
STALE_MINUTES = 10


@dataclass
class JobCtx:
    job: dict

    @property
    def payload(self) -> dict:
        return self.job["payload"]

    def report(self, progress: int, message: str) -> None:
        """Ghi tiến độ ngay (giao dịch riêng) để trình duyệt thấy trong lúc job chạy"""
        _set(self.job["id"], progress=progress, message=message)


Handler = Callable[[JobCtx], dict | None]
_handlers: dict[str, Handler] = {}


def define_job(kind: str) -> Callable[[Handler], Handler]:
    def deco(fn: Handler) -> Handler:
        _handlers[kind] = fn
        return fn
    return deco


def enqueue(org_id: str, kind: str, payload: dict, created_by: str | None = None) -> dict:
    return one(t.jobs.insert().values(orgId=org_id, kind=kind, payload=payload, createdBy=created_by).returning(t.jobs))  # type: ignore[return-value]


def _set(job_id: str, **values: Any) -> None:
    with independent() as c:
        c.execute(update(t.jobs).where(t.jobs.c.id == job_id).values(**values, updatedAt=text("now()")))


def claim() -> dict | None:
    with independent():
        return one(text("""
          update jobs set status = 'running', attempts = attempts + 1, updated_at = now()
          where id = (select id from jobs where status = 'queued' order by created_at limit 1 for update skip locked)
          returning id, org_id as "orgId", kind, payload, attempts, created_by as "createdBy" """))


def run(job: dict) -> None:
    h = _handlers.get(job["kind"])
    if not h:
        _set(job["id"], status="failed", error=f"Không có xử lý cho {job['kind']}")
        return
    try:
        with unit_of_work():
            result = h(JobCtx(job))
        _set(job["id"], status="done", progress=100, result=result or {})
    except Exception as e:  # noqa: BLE001 - mọi lỗi của job đều ghi lại để thử lại hoặc báo lỗi
        log.exception("job %s (%s) lỗi", job["id"], job["kind"])
        if job["attempts"] < MAX_ATTEMPTS:
            _set(job["id"], status="queued", message="Đang thử lại…")
        else:
            _set(job["id"], status="failed", error=str(e)[:1000])


def drain_jobs() -> int:
    """Chạy hết hàng đợi (dùng trong test)"""
    n = 0
    while (j := claim()) is not None:
        run(j)
        n += 1
    return n


def recover_stale() -> None:
    """Job không báo tiến độ quá 10 phút (worker dừng giữa chừng) thì chạy lại hoặc đánh lỗi"""
    with independent() as c:
        c.execute(text(f"""update jobs set status = case when attempts >= {MAX_ATTEMPTS} then 'failed' else 'queued' end,
          error = case when attempts >= {MAX_ATTEMPTS} then 'Worker dừng khi đang xử lý' else error end
          where status = 'running' and updated_at < now() - interval '{STALE_MINUTES} minutes'"""))
