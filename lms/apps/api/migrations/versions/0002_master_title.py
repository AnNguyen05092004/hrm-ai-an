"""Đổi tên hiển thị "Nội dung gốc" thành "Nội dung" (chỉ đổi tên, không đổi nội dung)."""
from alembic import op

revision = "0002_master_title"
down_revision = "0001_baseline"


def upgrade() -> None:
    op.execute("UPDATE artifacts SET title = 'Nội dung' WHERE type = 'master' AND title = 'Nội dung gốc'")
    op.execute("UPDATE artifact_versions SET title = 'Nội dung' WHERE title = 'Nội dung gốc' AND artifact_id IN (SELECT id FROM artifacts WHERE type = 'master')")
