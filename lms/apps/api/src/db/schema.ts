import { sql } from 'drizzle-orm'
import {
  pgTable, text, integer, timestamp, jsonb, boolean, uniqueIndex, index, primaryKey, real, customType,
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
  // kết nối hệ thống ngoài: { xapi: { enabled, endpoint, username, password }, webhook: { enabled, url, secret } }
  integrations: jsonb('integrations').$type<Record<string, Record<string, unknown>>>().notNull().default({}),
  createdAt: created(),
})

export const departments = pgTable('departments', {
  id: id(),
  orgId: text('org_id').notNull().references(() => orgs.id),
  name: text('name').notNull(),
  parentId: text('parent_id'),
  sort: integer('sort').notNull().default(0),
})

export const positions = pgTable('positions', {
  id: id(),
  orgId: text('org_id').notNull().references(() => orgs.id),
  name: text('name').notNull(),
  // { skillId: mức cần }
  needs: jsonb('needs').$type<Record<string, number>>().notNull().default({}),
})

export const users = pgTable('users', {
  id: id(),
  orgId: text('org_id').notNull().references(() => orgs.id),
  email: text('email').notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  role: text('role', { enum: ['author', 'learner'] }).notNull().default('learner'),
  title: text('title').notNull().default(''),
  deptId: text('dept_id').references(() => departments.id),
  positionId: text('position_id').references(() => positions.id),
  managerId: text('manager_id'),
  color: text('color').notNull().default('#8b88c9'),
  active: boolean('active').notNull().default(true),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
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

export const userSkills = pgTable('user_skills', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  skillId: text('skill_id').notNull().references(() => skills.id),
  level: integer('level').notNull(),
  source: text('source', { enum: ['declared', 'exam', 'evidence', 'manager'] }).notNull().default('declared'),
  updatedAt: updated(),
}, (t) => [primaryKey({ columns: [t.userId, t.skillId] })])

export const skillEvents = pgTable('skill_events', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  skillId: text('skill_id').notNull().references(() => skills.id),
  from: integer('from_level').notNull(),
  to: integer('to_level').notNull(),
  reason: text('reason').notNull(),
  refId: text('ref_id'),
  byUserId: text('by_user_id'),
  createdAt: created(),
})

export type KpiSkill = { skillId: string; why?: string; boost?: number; positions?: string[] }
export const kpis = pgTable('kpis', {
  id: id(),
  orgId: text('org_id').notNull().references(() => orgs.id),
  name: text('name').notNull(),
  metric: text('metric').notNull().default(''),
  target: text('target').notNull().default(''),
  current: text('current').notNull().default(''),
  due: text('due').notNull().default(''),
  active: boolean('active').notNull().default(true),
  skills: jsonb('skills').$type<KpiSkill[]>().notNull().default([]),
  // chuỗi số liệu theo tháng để đo tác động: [{m:'T1', v: 12}]
  trend: jsonb('trend').$type<{ m: string; v: number }[]>().notNull().default([]),
  createdAt: created(),
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
  fromPlan: jsonb('from_plan').$type<{ kpiId?: string; skillId?: string; people?: string[] } | null>(),
  img: text('img').notNull().default('server'),
  // đường dẫn chia sẻ cả bộ trong công ty (người có link học mọi tài liệu đã xuất bản của bộ)
  shareSlug: text('share_slug'),
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

export const ARTIFACT_TYPES = ['qr', 'deck', 'scenario', 'video', 'guide', 'exam'] as const
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
  shareSlug: text('share_slug'),
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

export type Jump = { lesson?: string; t?: number; slide?: number; step?: number; scene?: string }
export const contentChunks = pgTable('content_chunks', {
  id: id(),
  orgId: text('org_id').notNull(),
  artifactId: text('artifact_id').notNull().references(() => artifacts.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  // nơi nhảy tới: { lesson: 'l1' } | { t: 95 }
  jump: jsonb('jump').$type<Jump>().notNull(),
  text: text('text').notNull(),
  src: text('src'),
  embedding: vector('embedding'),
}, (t) => [index('content_chunks_art').on(t.artifactId)])

export const assignments = pgTable('assignments', {
  id: id(),
  orgId: text('org_id').notNull(),
  artifactId: text('artifact_id').notNull().references(() => artifacts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  due: timestamp('due', { withTimezone: true }),
  reason: text('reason').notNull().default(''),
  kpiId: text('kpi_id'),
  skillId: text('skill_id'),
  assignedBy: text('assigned_by').references(() => users.id),
  createdAt: created(),
}, (t) => [uniqueIndex('assign_uq').on(t.artifactId, t.userId)])

export const progress = pgTable('progress', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  artifactId: text('artifact_id').notNull().references(() => artifacts.id, { onDelete: 'cascade' }),
  done: jsonb('done').$type<string[]>().notNull().default([]),
  percent: integer('percent').notNull().default(0),
  sessions: integer('sessions').notNull().default(1),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  lastAt: timestamp('last_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.artifactId] })])

export type AttemptQuestion = Record<string, unknown> & { id: string; type: string }
export type Flag = { kind: 'tab' | 'paste' | 'blur' | 'camera'; at: number; note?: string; status?: 'open' | 'ok' | 'violation' }
export const attempts = pgTable('attempts', {
  id: id(),
  orgId: text('org_id').notNull(),
  artifactId: text('artifact_id').notNull().references(() => artifacts.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mode: text('mode', { enum: ['official', 'practice'] }).notNull(),
  // đề riêng: bản chụp câu hỏi (kèm đáp án, chỉ server đọc)
  questions: jsonb('questions').$type<AttemptQuestion[]>().notNull(),
  answers: jsonb('answers').$type<Record<string, unknown>>().notNull().default({}),
  // kết quả chấm từng câu: { qid: { score, max, auto, ai?, final? } }
  grades: jsonb('grades').$type<Record<string, Record<string, unknown>>>().notNull().default({}),
  flags: jsonb('flags').$type<Flag[]>().notNull().default([]),
  consent: boolean('consent').notNull().default(false),
  status: text('status', { enum: ['in_progress', 'grading', 'passed', 'failed'] }).notNull().default('in_progress'),
  score: real('score'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  deadline: timestamp('deadline', { withTimezone: true }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  gradedBy: text('graded_by'),
  gradedAt: timestamp('graded_at', { withTimezone: true }),
}, (t) => [index('attempts_user').on(t.userId, t.artifactId)])

export const tutorMessages = pgTable('tutor_messages', {
  id: id(),
  orgId: text('org_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  artifactId: text('artifact_id').notNull().references(() => artifacts.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: jsonb('answer').$type<Record<string, unknown>>().notNull(),
  found: boolean('found').notNull(),
  resolved: boolean('resolved').notNull().default(false),
  createdAt: created(),
})

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

// Kết quả gửi sang Talent (mẫu outbox: hệ thống Talent đọc và xác nhận)
export const outbox = pgTable('outbox', {
  id: id(),
  orgId: text('org_id').notNull(),
  topic: text('topic').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  // gửi lỗi thì thử lại sau, giãn dần; quá số lần thì dừng và giữ lỗi để xem
  attempts: integer('attempts').notNull().default(0),
  nextAt: timestamp('next_at', { withTimezone: true }).notNull().defaultNow(),
  lastError: text('last_error'),
  createdAt: created(),
})

// Bằng chứng năng lực (PR, đánh giá dự án) để AI đề xuất mức
export const evidence = pgTable('evidence', {
  id: id(),
  orgId: text('org_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  skillId: text('skill_id').notNull().references(() => skills.id),
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  text: text('text').notNull().default(''),
  proposedLevel: integer('proposed_level'),
  confidence: text('confidence'),
  rationale: text('rationale'),
  status: text('status', { enum: ['pending', 'accepted', 'rejected'] }).notNull().default('pending'),
  createdAt: created(),
})
