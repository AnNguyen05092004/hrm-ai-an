// Xem nội dung tài liệu: người soạn xem trước bản nháp, reviewer xem bản đang review, gói xuất dùng bản đã xuất bản.
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { canEdit, me, requireUser, type AuthUser } from '../../lib/auth.js'
import { forbidden, must } from '../../lib/errors.js'
import { themeOf } from '../kits/service.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
export type Artifact = typeof schema.artifacts.$inferSelect

/** Reviewer được mời vào khóa này chưa */
export async function isReviewerOf(u: AuthUser, kitId: string): Promise<boolean> {
  if (u.role !== 'reviewer') return false
  const [r] = await db.select({ id: schema.kitReviews.id }).from(schema.kitReviews).where(and(eq(schema.kitReviews.kitId, kitId), eq(schema.kitReviews.reviewerId, u.id), eq(schema.kitReviews.orgId, u.orgId)))
  return !!r
}

/** Người soạn xem mọi tài liệu trong tổ chức; reviewer chỉ xem tài liệu của khóa mình được mời */
export async function canView(u: AuthUser, a: Artifact): Promise<boolean> {
  if (a.orgId !== u.orgId) return false
  return canEdit(u) || isReviewerOf(u, a.kitId)
}

export async function viewable(u: AuthUser, id: string): Promise<Artifact> {
  const a = must((await db.select().from(schema.artifacts).where(and(eq(schema.artifacts.id, id), eq(schema.artifacts.orgId, u.orgId))))[0], 'Tài liệu')
  if (!(await canView(u, a))) throw forbidden('Bạn chưa được mời review khóa này')
  return a
}

/** Nội dung bản đã xuất bản (dùng cho gói xuất) */
export async function publishedContent(a: Artifact): Promise<Json> {
  const [v] = await db.select().from(schema.artifactVersions).where(and(eq(schema.artifactVersions.artifactId, a.id), eq(schema.artifactVersions.version, a.publishedVersion ?? -1)))
  if (!v) throw forbidden('Tài liệu chưa được xuất bản')
  return { title: v.title, summary: v.summary, version: v.version, content: v.content as Json }
}

/** Nội dung người học thấy: bỏ dàn ý, chỗ thiếu căn cứ, mã trích nguồn; đề chỉ còn cấu hình, không lộ câu hỏi và đáp án */
export function learnerView(content: Json): Json {
  const { plan: _plan, quiz, ...rest } = content
  const lessons = (rest.lessons ?? []).map((l: Json) => l.kind === 'lesson' ? { ...l, blocks: (l.blocks ?? []).filter((b: Json) => b.t !== 'gap').map(({ srcRef: _r, nosrc: _n, ...b }: Json) => b) } : l)
  const out: Json = { ...rest, ...(rest.lessons ? { lessons } : {}) }
  if (quiz) {
    const approved = (quiz.questions ?? []).filter((q: Json) => q.approved).length
    out.quiz = { mode: quiz.mode, level: quiz.level, skill: quiz.skill, passScore: quiz.passScore, attempts: quiz.attempts, minutes: quiz.minutes, pick: Math.min(quiz.pick ?? approved, approved), bank: approved }
  }
  return out
}

export const viewRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireUser)

  // Bản nháp hiện tại như người học sẽ thấy, kèm câu hỏi và đáp án để người soạn/reviewer kiểm tra
  app.get('/:id', { schema: { params: z.object({ id: z.string() }) } }, async (req) => {
    const u = me(req)
    const a = await viewable(u, req.params.id)
    const c = a.content as Json
    const [k] = await db.select({ title: schema.kits.title, details: schema.kits.details }).from(schema.kits).where(eq(schema.kits.id, a.kitId))
    return {
      id: a.id, type: a.type, img: a.img, kitId: a.kitId, kitTitle: k?.title, theme: k ? themeOf(k) : null, title: a.title, summary: a.summary,
      status: a.status, publishedVersion: a.publishedVersion, draft: true, ...learnerView(c), questions: c.quiz?.questions ?? [],
    }
  })
}
