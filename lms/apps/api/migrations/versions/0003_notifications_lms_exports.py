"""Thông báo (trong app + email) và lịch sử gửi gói sang LMS công ty qua API."""
from alembic import op

revision = "0003_notifications_lms_exports"
down_revision = "0002_master_title"


def upgrade() -> None:
    op.execute("ALTER TABLE kit_reviews ADD COLUMN IF NOT EXISTS reminded_at timestamptz")
    op.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      org_id text NOT NULL REFERENCES orgs(id),
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind text NOT NULL,
      title text NOT NULL,
      body text NOT NULL DEFAULT '',
      link text NOT NULL DEFAULT '',
      kit_id text REFERENCES kits(id) ON DELETE CASCADE,
      read_at timestamptz,
      email_status text NOT NULL DEFAULT 'none',
      email_error text,
      created_at timestamptz NOT NULL DEFAULT now()
    )""")
    op.execute("CREATE INDEX IF NOT EXISTS notifications_user ON notifications (user_id, created_at)")
    op.execute("""
    CREATE TABLE IF NOT EXISTS lms_exports (
      id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      org_id text NOT NULL REFERENCES orgs(id),
      kit_id text NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
      artifact_id text REFERENCES artifacts(id) ON DELETE SET NULL,
      kind text NOT NULL,
      title text NOT NULL,
      versions jsonb NOT NULL DEFAULT '{}'::jsonb,
      status text NOT NULL DEFAULT 'queued',
      remote_id text,
      error text,
      size integer,
      created_by text REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      sent_at timestamptz
    )""")
    op.execute("CREATE INDEX IF NOT EXISTS lms_exports_kit ON lms_exports (kit_id, created_at)")
