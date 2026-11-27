"""Lệnh quản trị: python -m app.cli migrate | seed | has-data"""
import sys

from sqlalchemy import func, select, text

from app.db.migrate import run_migrations
from app.shared import tables as t
from app.shared.db import scalar, unit_of_work


def main(argv: list[str]) -> int:
    cmd = argv[1] if len(argv) > 1 else ""
    if cmd == "migrate":
        run_migrations()
        print("Đã migrate")
        return 0
    if cmd == "seed":
        from app.db.seed import DEMO_PASSWORD, seed
        from app.modules.identity.demo_accounts import ADMIN_EMAIL, AUTHOR_EMAIL, REVIEWER_EMAIL
        run_migrations()
        with unit_of_work():
            seed()
        print(f"Đã tạo dữ liệu mẫu. Đăng nhập: {ADMIN_EMAIL}, {AUTHOR_EMAIL} hoặc {REVIEWER_EMAIL} / {DEMO_PASSWORD}")
        return 0
    if cmd == "has-data":
        # 0: đã có người dùng; 1: DB trống (cần seed)
        with unit_of_work() as c:
            if not c.execute(text("select to_regclass('public.users')")).scalar():
                return 1
            return 0 if scalar(select(func.count()).select_from(t.users)) else 1
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
