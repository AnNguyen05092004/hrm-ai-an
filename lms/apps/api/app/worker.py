"""Background Worker: tiến trình riêng nhận job từ bảng jobs, chạy AI soạn, đọc tài liệu, dựng video, gửi email, gửi gói sang LMS.
Chạy: python -m app.worker"""
import logging
import signal
import threading
import time

import app.job_registry  # noqa: F401 - đăng ký các loại job
from app.modules.notifications import service as notifications
from app.shared.db import unit_of_work
from app.shared.jobs import claim, recover_stale, run

log = logging.getLogger("lms.worker")
CONCURRENCY = 3
POLL_SECONDS = 0.8
HOUSEKEEPING_SECONDS = 60
_stop = threading.Event()


def _loop(n: int) -> None:
    while not _stop.is_set():
        try:
            job = claim()
        except Exception:  # noqa: BLE001 - mất kết nối CSDL tạm thời: chờ rồi thử lại
            log.exception("worker %s không nhận được job", n)
            _stop.wait(5)
            continue
        if job:
            run(job)
        else:
            _stop.wait(POLL_SECONDS)


def _housekeeping() -> None:
    """Đưa lại job chạy dở (worker dừng giữa chừng) vào hàng đợi; nhắc hạn review"""
    while not _stop.is_set():
        try:
            recover_stale()
            with unit_of_work():
                sent = notifications.remind_due_reviews()
            if sent:
                log.info("đã nhắc %s reviewer sắp tới hạn", sent)
        except Exception:  # noqa: BLE001
            log.exception("housekeeping lỗi")
        _stop.wait(HOUSEKEEPING_SECONDS)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: _stop.set())
    threads = [threading.Thread(target=_loop, args=(i,), daemon=True) for i in range(CONCURRENCY)]
    threads.append(threading.Thread(target=_housekeeping, daemon=True))
    for th in threads:
        th.start()
    log.info("Background Worker chạy %s luồng", CONCURRENCY)
    while not _stop.is_set():
        time.sleep(0.5)
    log.info("Đang dừng, chờ job đang chạy xong…")
    for th in threads:
        th.join(timeout=30)


if __name__ == "__main__":
    main()
