"""Alembic chạy migration trên DATABASE_URL; khóa advisory để API và lệnh migrate không chạy chồng nhau."""
from alembic import context
from sqlalchemy import text

from app.shared.db import engine

MIGRATION_LOCK = 4100_0001


def run() -> None:
    with engine().connect() as conn:
        conn.execute(text("select pg_advisory_lock(:k)"), {"k": MIGRATION_LOCK})
        try:
            context.configure(connection=conn, target_metadata=None)
            with context.begin_transaction():
                context.run_migrations()
            conn.commit()
        finally:
            conn.execute(text("select pg_advisory_unlock(:k)"), {"k": MIGRATION_LOCK})
            conn.commit()


run()
