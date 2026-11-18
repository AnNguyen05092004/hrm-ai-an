import { and, desc, eq } from 'drizzle-orm'
import { db, schema } from '../../db/client.js'
import type { AuthUser } from '../../lib/auth.js'
import { forbidden, must } from '../../lib/errors.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
export type Artifact = typeof schema.artifacts.$inferSelect

/** Người học xem được: tài liệu đã xuất bản, được giao hoặc có đường dẫn chia sẻ. Người soạn xem mọi tài liệu trong tổ chức. */
export async function canView(u: AuthUser, a: Artifact): Promise<boolean> {
  if (a.orgId !== u.orgId) return false
  if (u.role === 'author') return true
  if (!a.publishedVersion) return false
  if (a.shareSlug) return true
  const [as] = await db.select({ id: schema.assignments.id }).from(schema.assignments).where(and(eq(schema.assignments.artifactId, a.id), eq(schema.assignments.userId, u.id)))
  return !!as
}

export async function viewable(u: AuthUser, id: string): Promise<Artifact> {
  const a = must((await db.select().from(schema.artifacts).where(and(eq(schema.artifacts.id, id), eq(schema.artifacts.orgId, u.orgId))))[0], 'Tài liệu')
  if (!(await canView(u, a))) throw forbidden('Bạn chưa được giao tài liệu này')
  return a
}

/** Nội dung bản đã xuất bản; đề thi chỉ còn cấu hình, không lộ câu hỏi và đáp án */
export async function publishedContent(a: Artifact): Promise<Json> {
  const [v] = await db.select().from(schema.artifactVersions).where(and(eq(schema.artifactVersions.artifactId, a.id), eq(schema.artifactVersions.version, a.publishedVersion ?? -1)))
  if (!v) throw forbidden('Tài liệu chưa được xuất bản')
  return { title: v.title, summary: v.summary, version: v.version, content: v.content as Json }
}

export function learnerView(content: Json): Json {
  const { plan: _plan, quiz, ...rest } = content
  const lessons = (rest.lessons ?? []).map((l: Json) => l.kind === 'lesson' ? { ...l, blocks: (l.blocks ?? []).filter((b: Json) => b.t !== 'gap').map(({ srcRef: _r, nosrc: _n, ...b }: Json) => b) } : l)
  const out: Json = { ...rest, ...(rest.lessons ? { lessons } : {}) }
  if (quiz) {
    const approved = (quiz.questions ?? []).filter((q: Json) => q.approved).length
    out.quiz = { mode: quiz.mode, level: quiz.level, skill: quiz.skill, passScore: quiz.passScore, attempts: quiz.attempts, minutes: quiz.minutes, proctor: quiz.proctor, pick: Math.min(quiz.pick ?? approved, approved), bank: approved }
  }
  return out
}

/** Đơn vị tính tiến độ của từng dạng tài liệu */
export function unitsOf(type: string, c: Json): string[] {
  if (type === 'qr') return (c.lessons ?? []).filter((l: Json) => l.kind === 'lesson').map((l: Json) => l.id)
  if (type === 'video') return (c.chapters ?? []).map((x: Json) => `t${x.t}`)
  if (type === 'deck') return (c.slides ?? []).map((s: Json) => s.id)
  if (type === 'scenario') return ['end']
  if (type === 'guide') return (c.steps ?? []).map((_: Json, i: number) => `s${i}`)
  return []
}

export async function latestAttempts(userId: string, artifactId: string): Promise<(typeof schema.attempts.$inferSelect)[]> {
  return db.select().from(schema.attempts).where(and(eq(schema.attempts.userId, userId), eq(schema.attempts.artifactId, artifactId))).orderBy(desc(schema.attempts.startedAt))
}
