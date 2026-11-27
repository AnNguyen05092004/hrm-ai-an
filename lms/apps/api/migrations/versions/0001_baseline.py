"""Bảng nền của LMS Studio.

DB tạo từ bản Node (drizzle) đã có đủ bảng: bỏ qua, không đụng dữ liệu. DB mới: tạo bảng từ SQL nền.
"""
from pathlib import Path

from alembic import op
from sqlalchemy import text

revision = "0001_baseline"
down_revision = None

SQL = Path(__file__).resolve().parent.parent / "sql" / "0000_studio_baseline.sql"


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(text("create extension if not exists vector"))
    if conn.execute(text("select to_regclass('public.orgs')")).scalar():
        return
    for stmt in SQL.read_text(encoding="utf-8").split("--> statement-breakpoint"):
        if stmt.strip():
            conn.execute(text(stmt))
