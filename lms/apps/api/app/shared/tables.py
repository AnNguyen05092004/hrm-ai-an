"""Bảng CSDL (SQLAlchemy Core). Tên cột trong code viết camelCase (`key=`) để khớp dạng JSON API trả cho web."""
from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    PrimaryKeyConstraint,
    Table,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB

EMBED_DIM = 1536
ROLES = ("admin", "author", "reviewer")
ARTIFACT_TYPES = ("master", "qr", "deck", "scenario", "video", "guide", "exam")
REVIEW_STATUS = ("pending", "approved", "changes")

meta = MetaData()


def _id() -> Column:
    return Column("id", Text, primary_key=True, server_default=text("gen_random_uuid()::text"))


def _ts(name: str, key: str, nullable: bool = False, default: bool = True) -> Column:
    return Column(name, DateTime(timezone=True), key=key, nullable=nullable, server_default=text("now()") if default else None)


def _fk(name: str, key: str, target: str, nullable: bool = True, ondelete: str | None = None) -> Column:
    return Column(name, Text, ForeignKey(target, ondelete=ondelete), key=key, nullable=nullable)


orgs = Table(
    "orgs", meta, _id(),
    Column("name", Text, nullable=False),
    Column("ai_monthly_tokens", Integer, key="aiMonthlyTokens", nullable=False, server_default=text("2000000")),
    _ts("created_at", "createdAt"),
)

users = Table(
    "users", meta, _id(),
    _fk("org_id", "orgId", "orgs.id", nullable=False),
    Column("email", Text, nullable=False),
    Column("name", Text, nullable=False),
    Column("password_hash", Text, key="passwordHash"),
    # admin: quản lý người dùng, cài đặt, nhật ký và mọi khóa; author: soạn, mời review, xuất; reviewer: xem và góp ý khóa được mời
    Column("role", Text, nullable=False, server_default=text("'author'")),
    Column("title", Text, nullable=False, server_default=text("''")),
    Column("color", Text, nullable=False, server_default=text("'#8b88c9'")),
    Column("active", Boolean, nullable=False, server_default=text("true")),
    _ts("created_at", "createdAt"),
)

sessions = Table(
    "sessions", meta,
    Column("token_hash", Text, key="tokenHash", primary_key=True),
    _fk("user_id", "userId", "users.id", nullable=False, ondelete="CASCADE"),
    _ts("expires_at", "expiresAt", default=False),
    _ts("created_at", "createdAt"),
)

skills = Table(
    "skills", meta,
    Column("id", Text, primary_key=True),
    _fk("org_id", "orgId", "orgs.id", nullable=False),
    Column("name", Text, nullable=False),
    Column("group", Text, nullable=False, server_default=text("''")),
)

sources = Table(
    "sources", meta, _id(),
    _fk("org_id", "orgId", "orgs.id", nullable=False),
    Column("name", Text, nullable=False),
    Column("mime", Text, nullable=False),
    Column("version", Integer, nullable=False, server_default=text("1")),
    Column("text", Text, nullable=False, server_default=text("''")),
    Column("status", Text, nullable=False, server_default=text("'processing'")),
    Column("error", Text),
    Column("sensitive", Boolean, nullable=False, server_default=text("false")),
    _fk("uploaded_by", "uploadedBy", "users.id"),
    _ts("created_at", "createdAt"),
    _ts("updated_at", "updatedAt"),
)

source_chunks = Table(
    "source_chunks", meta, _id(),
    _fk("source_id", "sourceId", "sources.id", nullable=False, ondelete="CASCADE"),
    Column("version", Integer, nullable=False),
    Column("ord", Integer, nullable=False),
    Column("section", Text, nullable=False),
    Column("text", Text, nullable=False),
    Column("embedding", Vector(EMBED_DIM)),
)

kits = Table(
    "kits", meta, _id(),
    _fk("org_id", "orgId", "orgs.id", nullable=False),
    Column("title", Text, nullable=False),
    Column("goal", Text, nullable=False, server_default=text("''")),
    # chi tiết: đối tượng, mục tiêu, chỉ số, kế hoạch tài liệu, dàn ý, giao diện, job đang chạy
    Column("details", JSONB, nullable=False, server_default=text("'{}'::jsonb")),
    _fk("skill_id", "skillId", "skills.id"),
    Column("level", Integer),
    Column("source_ids", JSONB, key="sourceIds", nullable=False, server_default=text("'[]'::jsonb")),
    Column("stage", Text, nullable=False, server_default=text("'details'")),
    Column("img", Text, nullable=False, server_default=text("'server'")),
    _fk("created_by", "createdBy", "users.id"),
    _ts("created_at", "createdAt"),
    _ts("updated_at", "updatedAt"),
)

images = Table(
    "images", meta, _id(),
    _fk("org_id", "orgId", "orgs.id", nullable=False),
    Column("name", Text, nullable=False),
    Column("mime", Text, nullable=False),
    Column("size", Integer, nullable=False),
    Column("kind", Text, nullable=False),
    Column("prompt", Text),
    _fk("created_by", "createdBy", "users.id"),
    _ts("created_at", "createdAt"),
)

# master = Nội dung (chỉ dùng nội bộ, không xuất); các loại còn lại là định dạng cho người học
artifacts = Table(
    "artifacts", meta, _id(),
    _fk("org_id", "orgId", "orgs.id", nullable=False),
    _fk("kit_id", "kitId", "kits.id", nullable=False, ondelete="CASCADE"),
    Column("type", Text, nullable=False),
    Column("title", Text, nullable=False),
    Column("summary", Text, nullable=False, server_default=text("''")),
    Column("content", JSONB, nullable=False, server_default=text("'{}'::jsonb")),
    Column("status", Text, nullable=False, server_default=text("'draft'")),
    Column("published_version", Integer, key="publishedVersion"),
    Column("img", Text, nullable=False, server_default=text("'server'")),
    _ts("created_at", "createdAt"),
    _ts("updated_at", "updatedAt"),
)

artifact_versions = Table(
    "artifact_versions", meta,
    _fk("artifact_id", "artifactId", "artifacts.id", nullable=False, ondelete="CASCADE"),
    Column("version", Integer, nullable=False),
    Column("title", Text, nullable=False),
    Column("summary", Text, nullable=False),
    Column("content", JSONB, nullable=False),
    # phiên bản tài liệu nguồn lúc xuất bản: { sourceId: version }
    Column("source_versions", JSONB, key="sourceVersions", nullable=False, server_default=text("'{}'::jsonb")),
    Column("note", Text, nullable=False, server_default=text("''")),
    _fk("published_by", "publishedBy", "users.id"),
    _ts("created_at", "createdAt"),
    PrimaryKeyConstraint("artifactId", "version"),
)

jobs = Table(
    "jobs", meta, _id(),
    Column("org_id", Text, key="orgId", nullable=False),
    Column("kind", Text, nullable=False),
    Column("payload", JSONB, nullable=False),
    Column("status", Text, nullable=False, server_default=text("'queued'")),
    Column("progress", Integer, nullable=False, server_default=text("0")),
    Column("message", Text, nullable=False, server_default=text("''")),
    Column("result", JSONB),
    Column("error", Text),
    Column("attempts", Integer, nullable=False, server_default=text("0")),
    Column("created_by", Text, key="createdBy"),
    _ts("created_at", "createdAt"),
    _ts("updated_at", "updatedAt"),
)

ai_usage = Table(
    "ai_usage", meta, _id(),
    Column("org_id", Text, key="orgId", nullable=False),
    Column("feature", Text, nullable=False),
    Column("model", Text, nullable=False),
    Column("input_tokens", Integer, key="inputTokens", nullable=False, server_default=text("0")),
    Column("output_tokens", Integer, key="outputTokens", nullable=False, server_default=text("0")),
    _ts("created_at", "createdAt"),
)

audit_logs = Table(
    "audit_logs", meta, _id(),
    Column("org_id", Text, key="orgId", nullable=False),
    Column("user_id", Text, key="userId"),
    Column("action", Text, nullable=False),
    Column("target", Text, nullable=False, server_default=text("''")),
    Column("meta", JSONB, nullable=False, server_default=text("'{}'::jsonb")),
    _ts("created_at", "createdAt"),
)

# Mời review: mỗi người review một dòng. pending → approved | changes; người soạn gửi lại thì về pending, round tăng
kit_reviews = Table(
    "kit_reviews", meta, _id(),
    _fk("org_id", "orgId", "orgs.id", nullable=False),
    _fk("kit_id", "kitId", "kits.id", nullable=False, ondelete="CASCADE"),
    _fk("reviewer_id", "reviewerId", "users.id", nullable=False, ondelete="CASCADE"),
    _fk("invited_by", "invitedBy", "users.id"),
    Column("message", Text, nullable=False, server_default=text("''")),
    _ts("due", "due", nullable=True, default=False),
    Column("status", Text, nullable=False, server_default=text("'pending'")),
    Column("round", Integer, nullable=False, server_default=text("1")),
    Column("decision_note", Text, key="decisionNote", nullable=False, server_default=text("''")),
    _ts("decided_at", "decidedAt", nullable=True, default=False),
    # đã gửi nhắc hạn cho vòng review hiện tại chưa
    _ts("reminded_at", "remindedAt", nullable=True, default=False),
    _ts("created_at", "createdAt"),
    _ts("updated_at", "updatedAt"),
)

# Góp ý: gắn với khóa, có thể gắn một tài liệu và vị trí trong tài liệu. parentId: trả lời trong luồng
review_comments = Table(
    "review_comments", meta, _id(),
    _fk("org_id", "orgId", "orgs.id", nullable=False),
    _fk("kit_id", "kitId", "kits.id", nullable=False, ondelete="CASCADE"),
    _fk("artifact_id", "artifactId", "artifacts.id", ondelete="CASCADE"),
    Column("anchor", JSONB),
    Column("parent_id", Text, key="parentId"),
    _fk("author_id", "authorId", "users.id", nullable=False, ondelete="CASCADE"),
    Column("body", Text, nullable=False),
    Column("round", Integer, nullable=False, server_default=text("1")),
    _ts("resolved_at", "resolvedAt", nullable=True, default=False),
    _fk("resolved_by", "resolvedBy", "users.id"),
    _ts("created_at", "createdAt"),
)

# Thông báo trong app; email gửi kèm do worker làm (emailStatus: none | queued | sent | skipped | failed)
notifications = Table(
    "notifications", meta, _id(),
    _fk("org_id", "orgId", "orgs.id", nullable=False),
    _fk("user_id", "userId", "users.id", nullable=False, ondelete="CASCADE"),
    Column("kind", Text, nullable=False),
    Column("title", Text, nullable=False),
    Column("body", Text, nullable=False, server_default=text("''")),
    Column("link", Text, nullable=False, server_default=text("''")),
    _fk("kit_id", "kitId", "kits.id", ondelete="CASCADE"),
    _ts("read_at", "readAt", nullable=True, default=False),
    Column("email_status", Text, key="emailStatus", nullable=False, server_default=text("'none'")),
    Column("email_error", Text, key="emailError"),
    # số lần đã gộp vào dòng này (góp ý liên tiếp của cùng người trên cùng khóa khi chưa đọc)
    Column("grouped", Integer, nullable=False, server_default=text("1")),
    _ts("created_at", "createdAt"),
)

# Gửi gói sang LMS công ty qua API: ghi đúng phiên bản người soạn xác nhận, mã hoặc lỗi LMS trả về
lms_exports = Table(
    "lms_exports", meta, _id(),
    _fk("org_id", "orgId", "orgs.id", nullable=False),
    _fk("kit_id", "kitId", "kits.id", nullable=False, ondelete="CASCADE"),
    _fk("artifact_id", "artifactId", "artifacts.id", ondelete="SET NULL"),
    Column("kind", Text, nullable=False),
    Column("title", Text, nullable=False),
    Column("versions", JSONB, nullable=False, server_default=text("'{}'::jsonb")),
    Column("status", Text, nullable=False, server_default=text("'queued'")),
    Column("remote_id", Text, key="remoteId"),
    Column("error", Text),
    Column("size", Integer),
    _fk("created_by", "createdBy", "users.id"),
    _ts("created_at", "createdAt"),
    _ts("updated_at", "updatedAt"),
    _ts("sent_at", "sentAt", nullable=True, default=False),
)

Index("notifications_user", notifications.c.userId, notifications.c.createdAt)
Index("lms_exports_kit", lms_exports.c.kitId, lms_exports.c.createdAt)


def func_now():  # noqa: ANN201 - giá trị now() của CSDL cho cột updated_at
    return text("now()")
