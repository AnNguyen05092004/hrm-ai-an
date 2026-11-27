"""Gộp thông báo góp ý: nhiều góp ý chưa đọc của cùng người trên cùng khóa thành một dòng (đếm số lần)."""
from alembic import op

revision = "0004_notification_grouping"
down_revision = "0003_notifications_lms_exports"


def upgrade() -> None:
    op.execute("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS grouped integer NOT NULL DEFAULT 1")

