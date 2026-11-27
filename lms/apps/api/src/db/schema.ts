import { sql } from 'drizzle-orm'
import {
  pgTable, text, integer, timestamp, jsonb, boolean, uniqueIndex, index, primaryKey, customType,
} from 'drizzle-orm/pg-core'

const id = () => text('id').primaryKey().default(sql`gen_random_uuid()::text`)
const created = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updated = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

export const EMBED_DIM = 1536
const vector = customType<{ data: number[]; driverData: string }>({
  dataType: () => `vector(${EMBED_DIM})`,
  toDriver: (v) => `[${v.join(',')}]`,
  fromDriver: (v) => JSON.parse(v),
})

export const orgs = pgTable('orgs', {
  id: id(),
  name: text('name').notNull(),
  aiMonthlyTokens: integer('ai_monthly_tokens').notNull().default(2_000_000),
  createdAt: created(),
})

export const ROLES = ['admin', 'author', 'reviewer'] as const
export type Role = typeof ROLES[number]
export const users = pgTable('users', {
  id: id(),
  orgId: text('org_id').notNull().references(() => orgs.id),
  email: text('email').notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  // admin: quản lý người dùng, cài đặt, nhật ký và mọi khóa; author: soạn, mời review, xuất; reviewer: xem và góp ý khóa được mời
  role: text('role', { enum: ROLES }).notNull().default('author'),
  title: text('title').notNull().default(''),
  color: text('color').notNull().default('#8b88c9'),
  active: boolean('active').notNull().default(true),
  createdAt: created(),
}, (t) => [uniqueIndex('users_email_uq').on(t.email)])

export const sessions = pgTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: created(),
})

export const skills = pgTable('skills', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => orgs.id),
  name: text('name').notNull(),
  group: text('group').notNull().default(''),
})

export const sources = pgTable('sources', {
  id: id(),
  orgId: text('org_id').notNull().references(() => orgs.id),
  name: text('name').notNull(),
  mime: text('mime').notNull(),
  version: integer('version').notNull().default(1),
  text: text('text').notNull().default(''),
  status: text('status', { enum: ['processing', 'ready', 'failed'] }).notNull().default('processing'),
  error: text('error'),
  sensitive: boolean('sensitive').notNull().default(false),
  uploadedBy: text('uploaded_by').references(() => users.id),
  createdAt: created(),
  updatedAt: updated(),
})

export const sourceChunks = pgTable('source_chunks', {
  id: id(),
  sourceId: text('source_id').notNull().references(() => sources.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  ord: integer('ord').notNull(),
  section: text('section').notNull(),
  text: text('text').notNull(),
  embedding: vector('embedding'),
}, (t) => [index('source_chunks_src').on(t.sourceId, t.version)])

export const kits = pgTable('kits', {
  id: id(),
  orgId: text('org_id').notNull().references(() => orgs.id),
  title: text('title').notNull(),
  goal: text('goal').notNull().default(''),
  // chi tiết: đối tượng, mục tiêu, chỉ số, kế hoạch tài liệu, dàn ý
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  skillId: text('skill_id').references(() => skills.id),
  level: integer('level'),
  sourceIds: jsonb('source_ids').$type<string[]>().notNull().default([]),
  stage: text('stage', { enum: ['details', 'outline', 'generating', 'ready'] }).notNull().default('details'),
  img: text('img').notNull().default('server'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: created(),
  updatedAt: updated(),
})

// Ảnh của tổ chức: tải lên hoặc AI tạo; dùng cho khối ảnh, slide, ảnh bìa tài liệu và khóa
export const images = pgTable('images', {
  id: id(),
  orgId: text('org_id').notNull().references(() => orgs.id),
  name: text('name').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  kind: text('kind', { enum: ['upload', 'ai'] }).notNull(),
  prompt: text('prompt'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: created(),
}, (t) => [index('images_org').on(t.orgId)])

// master = Nội dung gốc (chỉ dùng nội bộ, không xuất); các loại còn lại là định dạng cho người học
export const ARTIFACT_TYPES = ['master', 'qr', 'deck', 'scenario', 'video', 'guide', 'exam'] as const
export type ArtifactType = typeof ARTIFACT_TYPES[number]
export const artifacts = pgTable('artifacts', {
  id: id(),
  orgId: text('org_id').notNull().references(() => orgs.id),
  kitId: text('kit_id').notNull().references(() => kits.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ARTIFACT_TYPES }).notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  // cây nội dung: lessons/blocks, quiz, slides, scenes, chapters, steps...
  content: jsonb('content').$type<Record<string, unknown>>().notNull().default({}),
  status: text('status', { enum: ['generating', 'draft', 'published', 'failed'] }).notNull().default('draft'),
  publishedVersion: integer('published_version'),
  img: text('img').notNull().default('server'),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index('artifacts_kit').on(t.kitId)])

export const artifactVersions = pgTable('artifact_versions', {
  artifactId: text('artifact_id').notNull().references(() => artifacts.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  content: jsonb('content').$type<Record<string, unknown>>().notNull(),
  // phiên bản tài liệu nguồn lúc xuất bản: { sourceId: version }
  sourceVersions: jsonb('source_versions').$type<Record<string, number>>().notNull().default({}),
  note: text('note').notNull().default(''),
  publishedBy: text('published_by').references(() => users.id),
  createdAt: created(),
}, (t) => [primaryKey({ columns: [t.artifactId, t.version] })])

export const jobs = pgTable('jobs', {
  id: id(),
  orgId: text('org_id').notNull(),
  kind: text('kind').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  status: text('status', { enum: ['queued', 'running', 'done', 'failed'] }).notNull().default('queued'),
  progress: integer('progress').notNull().default(0),
  message: text('message').notNull().default(''),
  result: jsonb('result').$type<Record<string, unknown>>(),
  error: text('error'),
  attempts: integer('attempts').notNull().default(0),
  createdBy: text('created_by'),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index('jobs_status').on(t.status)])

export const aiUsage = pgTable('ai_usage', {
  id: id(),
  orgId: text('org_id').notNull(),
  feature: text('feature').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  createdAt: created(),
}, (t) => [index('ai_usage_org').on(t.orgId, t.createdAt)])

export const auditLogs = pgTable('audit_logs', {
  id: id(),
  orgId: text('org_id').notNull(),
  userId: text('user_id'),
  action: text('action').notNull(),
  target: text('target').notNull().default(''),
  meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: created(),
})


// Mời review khóa học: mỗi người review một dòng. pending → approved | changes; người soạn gửi lại thì về pending, round tăng
export const REVIEW_STATUS = ['pending', 'approved', 'changes'] as const
export const kitReviews = pgTable('kit_reviews', {
  id: id(),
  orgId: text('org_id').notNull().references(() => orgs.id),
  kitId: text('kit_id').notNull().references(() => kits.id, { onDelete: 'cascade' }),
  reviewerId: text('reviewer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  invitedBy: text('invited_by').references(() => users.id),
  message: text('message').notNull().default(''),
  due: timestamp('due', { withTimezone: true }),
  status: text('status', { enum: REVIEW_STATUS }).notNull().default('pending'),
  round: integer('round').notNull().default(1),
  decisionNote: text('decision_note').notNull().default(''),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex('kit_reviews_uq').on(t.kitId, t.reviewerId), index('kit_reviews_reviewer').on(t.reviewerId)])

// Góp ý: gắn với khóa, có thể gắn một tài liệu và vị trí trong tài liệu (bài, slide, cảnh, câu hỏi…). parentId: trả lời trong luồng
export type CommentAnchor = { key: string; label: string }
export const reviewComments = pgTable('review_comments', {
  id: id(),
  orgId: text('org_id').notNull().references(() => orgs.id),
  kitId: text('kit_id').notNull().references(() => kits.id, { onDelete: 'cascade' }),
  artifactId: text('artifact_id').references(() => artifacts.id, { onDelete: 'cascade' }),
  anchor: jsonb('anchor').$type<CommentAnchor | null>(),
  parentId: text('parent_id'),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  round: integer('round').notNull().default(1),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: text('resolved_by').references(() => users.id),
  createdAt: created(),
}, (t) => [index('review_comments_kit').on(t.kitId, t.createdAt)])
