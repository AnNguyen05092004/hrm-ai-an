// Review khóa học: người soạn mời reviewer, reviewer xem bản nháp và góp ý theo từng tài liệu / vị trí,
// rồi kết luận "Duyệt" hoặc "Cần sửa". Người soạn trả lời, đánh dấu đã xử lý và gửi lại vòng review mới.
import { z } from 'zod'
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { canEdit, me, requireUser, type AuthUser } from '../../lib/auth.js'
import { badRequest, forbidden, must } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { artifactMeta, getKit, type Kit } from '../kits/service.js'

const K = z.object({ kitId: z.string().max(64) })
const fmt = (d: Date | null): string | null => d?.toISOString() ?? null
type Review = typeof schema.kitReviews.$inferSelect

/** Khóa mà người này được xem trong review: người soạn xem mọi khóa, reviewer chỉ khóa được mời */
async function access(u: AuthUser, kitId: string): Promise<{ kit: Kit; mine: Review | null }> {
  const kit = await getKit(u.orgId, kitId)
  if (canEdit(u)) return { kit, mine: null }
  const [mine] = await db.select().from(schema.kitReviews).where(and(eq(schema.kitReviews.kitId, kit.id), eq(schema.kitReviews.reviewerId, u.id)))
  if (!mine) throw forbidden('Bạn chưa được mời review khóa này')
  return { kit, mine }
}

const editorOnly = (u: AuthUser): void => { if (!canEdit(u)) throw forbidden('Chỉ người soạn khóa làm được việc này') }

const person = { id: schema.users.id, name: schema.users.name, title: schema.users.title, color: schema.users.color, role: schema.users.role }

async function reviewersOf(kitId: string): Promise<Record<string, unknown>[]> {
  const rows = await db.select({ r: schema.kitReviews, u: person }).from(schema.kitReviews)
    .innerJoin(schema.users, eq(schema.users.id, schema.kitReviews.reviewerId)).where(eq(schema.kitReviews.kitId, kitId)).orderBy(asc(schema.kitReviews.createdAt))
  return rows.map(({ r, u }) => ({
    id: r.id, user: u, status: r.status, round: r.round, message: r.message, due: fmt(r.due),
    decisionNote: r.decisionNote, decidedAt: fmt(r.decidedAt), invitedAt: fmt(r.createdAt),
  }))
}

async function commentsOf(kitId: string): Promise<Record<string, unknown>[]> {
  const rows = await db.select({ c: schema.reviewComments, u: person, art: { title: schema.artifacts.title, type: schema.artifacts.type } }).from(schema.reviewComments)
    .innerJoin(schema.users, eq(schema.users.id, schema.reviewComments.authorId))
    .leftJoin(schema.artifacts, eq(schema.artifacts.id, schema.reviewComments.artifactId))
    .where(eq(schema.reviewComments.kitId, kitId)).orderBy(asc(schema.reviewComments.createdAt))
  const resolver = new Map((await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users)
    .where(inArray(schema.users.id, [...new Set(rows.map((x) => x.c.resolvedBy).filter((x): x is string => !!x))].concat('-')))).map((x) => [x.id, x.name]))
  const dto = ({ c, u, art }: typeof rows[number]): Record<string, unknown> => ({
    id: c.id, body: c.body, author: u, round: c.round, at: fmt(c.createdAt), artifactId: c.artifactId, artifact: c.artifactId ? art : null, anchor: c.anchor,
    resolvedAt: fmt(c.resolvedAt), resolvedBy: c.resolvedBy ? resolver.get(c.resolvedBy) ?? '' : null,
  })
  const replies = new Map<string, Record<string, unknown>[]>()
  for (const r of rows) if (r.c.parentId) replies.set(r.c.parentId, [...(replies.get(r.c.parentId) ?? []), dto(r)])
  // góp ý mới nhất lên đầu, trả lời trong luồng theo thứ tự thời gian
  return rows.filter((r) => !r.c.parentId).reverse().map((r) => ({ ...dto(r), replies: replies.get(r.c.id) ?? [] }))
}

export const reviewRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireUser)

  // Hộp việc của reviewer: các khóa được mời, mới nhất trước
  app.get('/', async (req) => {
    const u = me(req)
    if (u.role !== 'reviewer') return []
    const rows = await db.select({ r: schema.kitReviews, k: { id: schema.kits.id, title: schema.kits.title, desc: schema.kits.goal, img: schema.kits.img, updatedAt: schema.kits.updatedAt }, by: schema.users.name })
      .from(schema.kitReviews).innerJoin(schema.kits, eq(schema.kits.id, schema.kitReviews.kitId)).leftJoin(schema.users, eq(schema.users.id, schema.kitReviews.invitedBy))
      .where(and(eq(schema.kitReviews.reviewerId, u.id), eq(schema.kitReviews.orgId, u.orgId))).orderBy(desc(schema.kitReviews.updatedAt))
    const ids = rows.map((x) => x.k.id).concat('-')
    const [arts, mine] = await Promise.all([
      db.select({ kitId: schema.artifacts.kitId }).from(schema.artifacts).where(inArray(schema.artifacts.kitId, ids)),
      db.select({ kitId: schema.reviewComments.kitId }).from(schema.reviewComments).where(and(inArray(schema.reviewComments.kitId, ids), eq(schema.reviewComments.authorId, u.id), isNull(schema.reviewComments.parentId), isNull(schema.reviewComments.resolvedAt))),
    ])
    return rows.map(({ r, k, by }) => ({
      kitId: k.id, title: k.title, desc: k.desc, img: k.img, updatedAt: fmt(k.updatedAt), invitedBy: by ?? '', message: r.message, due: fmt(r.due),
      status: r.status, round: r.round, artifacts: arts.filter((a) => a.kitId === k.id).length, myOpen: mine.filter((c) => c.kitId === k.id).length,
    }))
  })

  // Toàn cảnh review một khóa: tài liệu, người review và kết luận, các góp ý
  app.get('/kits/:kitId', { schema: { params: K } }, async (req) => {
    const u = me(req)
    const { kit, mine } = await access(u, req.params.kitId)
    const d = kit.details as Record<string, unknown>
    const [arts, reviewers, comments, candidates] = await Promise.all([
      db.select().from(schema.artifacts).where(eq(schema.artifacts.kitId, kit.id)).orderBy(asc(schema.artifacts.createdAt)),
      reviewersOf(kit.id),
      commentsOf(kit.id),
      // người soạn chọn reviewer từ danh sách tài khoản vai reviewer đang hoạt động
      canEdit(u) ? db.select(person).from(schema.users).where(and(eq(schema.users.orgId, u.orgId), eq(schema.users.role, 'reviewer'), eq(schema.users.active, true))).orderBy(asc(schema.users.name)) : [],
    ])
    return {
      kit: { id: kit.id, title: kit.title, desc: kit.goal, img: kit.img, audience: d.audience ?? '', goals: d.goals ?? [], takeaways: d.takeaways ?? [] },
      artifacts: arts.filter((a) => a.status !== 'generating' && a.status !== 'failed').map(artifactMeta),
      reviewers, comments, mine: mine && { id: mine.id, status: mine.status, round: mine.round, message: mine.message, due: fmt(mine.due), decisionNote: mine.decisionNote },
      candidates, canEdit: canEdit(u),
    }
  })

  // Mời reviewer (bỏ qua người đã được mời)
  app.post('/kits/:kitId/invite', {
    schema: { params: K, body: z.object({ reviewerIds: z.array(z.string().max(64)).min(1).max(20), message: z.string().trim().max(1000).default(''), due: z.string().date().optional() }) },
  }, async (req) => {
    const u = me(req); editorOnly(u)
    const { kit } = await access(u, req.params.kitId)
    const valid = (await db.select({ id: schema.users.id }).from(schema.users)
      .where(and(eq(schema.users.orgId, u.orgId), eq(schema.users.role, 'reviewer'), eq(schema.users.active, true), inArray(schema.users.id, req.body.reviewerIds)))).map((x) => x.id)
    if (!valid.length) throw badRequest('Chọn ít nhất một người có vai reviewer')
    const due = req.body.due ? new Date(`${req.body.due}T23:59:00+07:00`) : null
    const rows = await db.insert(schema.kitReviews).values(valid.map((reviewerId) => ({ orgId: u.orgId, kitId: kit.id, reviewerId, invitedBy: u.id, message: req.body.message, due })))
      .onConflictDoNothing().returning({ id: schema.kitReviews.id })
    await audit(u, 'review.invite', kit.id, { invited: rows.length })
    return { invited: rows.length, skipped: valid.length - rows.length }
  })

  // Bỏ một người khỏi review (góp ý đã viết vẫn giữ)
  app.delete('/kits/:kitId/reviewers/:id', { schema: { params: K.extend({ id: z.string().max(64) }) } }, async (req) => {
    const u = me(req); editorOnly(u)
    const { kit } = await access(u, req.params.kitId)
    const [r] = await db.delete(schema.kitReviews).where(and(eq(schema.kitReviews.id, req.params.id), eq(schema.kitReviews.kitId, kit.id))).returning()
    must(r, 'Lời mời review')
    await audit(u, 'review.remove', kit.id, { reviewerId: r.reviewerId })
    return { ok: true }
  })

  // Sửa xong: mở vòng review mới cho những người đã kết luận "Cần sửa"
  app.post('/kits/:kitId/request-again', { schema: { params: K, body: z.object({ message: z.string().trim().max(1000).default('') }) } }, async (req) => {
    const u = me(req); editorOnly(u)
    const { kit } = await access(u, req.params.kitId)
    const rows = await db.select().from(schema.kitReviews).where(and(eq(schema.kitReviews.kitId, kit.id), eq(schema.kitReviews.status, 'changes')))
    if (!rows.length) throw badRequest('Không có ai đang yêu cầu sửa')
    for (const r of rows) {
      await db.update(schema.kitReviews).set({ status: 'pending', round: r.round + 1, message: req.body.message || r.message, decidedAt: null, updatedAt: new Date() }).where(eq(schema.kitReviews.id, r.id))
    }
    await audit(u, 'review.request_again', kit.id, { reviewers: rows.length })
    return { reviewers: rows.length }
  })

  // Reviewer kết luận: Duyệt, hoặc Cần sửa (phải nói rõ cần sửa gì)
  app.post('/kits/:kitId/decision', {
    schema: { params: K, body: z.object({ status: z.enum(['approved', 'changes']), note: z.string().trim().max(3000).default('') }) },
  }, async (req) => {
    const u = me(req)
    const { kit, mine } = await access(u, req.params.kitId)
    if (!mine) throw forbidden('Chỉ reviewer được mời mới kết luận được')
    if (req.body.status === 'changes' && !req.body.note) {
      const [open] = await db.select({ id: schema.reviewComments.id }).from(schema.reviewComments)
        .where(and(eq(schema.reviewComments.kitId, kit.id), eq(schema.reviewComments.authorId, u.id), isNull(schema.reviewComments.parentId), isNull(schema.reviewComments.resolvedAt))).limit(1)
      if (!open) throw badRequest('Ghi rõ cần sửa gì: viết nhận xét chung hoặc thêm góp ý vào tài liệu')
    }
    await db.update(schema.kitReviews).set({ status: req.body.status, decisionNote: req.body.note, decidedAt: new Date(), updatedAt: new Date() }).where(eq(schema.kitReviews.id, mine.id))
    await audit(u, 'review.decision', kit.id, { status: req.body.status, round: mine.round })
    return { status: req.body.status }
  })

  // Góp ý mới hoặc trả lời trong luồng. Gắn được với một tài liệu và một vị trí trong tài liệu
  app.post('/kits/:kitId/comments', {
    schema: { params: K, body: z.object({
      body: z.string().trim().min(1).max(3000), artifactId: z.string().max(64).optional(), parentId: z.string().max(64).optional(),
      anchor: z.object({ key: z.string().max(80), label: z.string().max(200) }).optional(),
    }) },
  }, async (req) => {
    const u = me(req)
    const { kit, mine } = await access(u, req.params.kitId)
    const b = req.body
    let artifactId = b.artifactId ?? null, anchor = b.anchor ?? null
    if (b.parentId) {
      const p = must((await db.select().from(schema.reviewComments).where(and(eq(schema.reviewComments.id, b.parentId), eq(schema.reviewComments.kitId, kit.id))))[0], 'Góp ý')
      if (p.parentId) throw badRequest('Chỉ trả lời được góp ý gốc')
      artifactId = p.artifactId; anchor = p.anchor
    } else if (artifactId) {
      must((await db.select({ id: schema.artifacts.id }).from(schema.artifacts).where(and(eq(schema.artifacts.id, artifactId), eq(schema.artifacts.kitId, kit.id))))[0], 'Tài liệu')
    }
    const [c] = await db.insert(schema.reviewComments).values({ orgId: u.orgId, kitId: kit.id, artifactId, anchor, parentId: b.parentId ?? null, authorId: u.id, body: b.body, round: mine?.round ?? 1 }).returning()
    return { id: c.id }
  })

  // Người soạn đánh dấu đã xử lý / mở lại; người viết góp ý cũng tự đóng được góp ý của mình
  app.patch('/comments/:id', { schema: { params: z.object({ id: z.string().max(64) }), body: z.object({ resolved: z.boolean() }) } }, async (req) => {
    const u = me(req)
    const c = must((await db.select().from(schema.reviewComments).where(and(eq(schema.reviewComments.id, req.params.id), eq(schema.reviewComments.orgId, u.orgId))))[0], 'Góp ý')
    await access(u, c.kitId)
    if (c.parentId) throw badRequest('Đánh dấu ở góp ý gốc')
    if (!canEdit(u) && c.authorId !== u.id) throw forbidden('Chỉ người soạn hoặc người viết góp ý mới đánh dấu được')
    await db.update(schema.reviewComments).set(req.body.resolved ? { resolvedAt: new Date(), resolvedBy: u.id } : { resolvedAt: null, resolvedBy: null }).where(eq(schema.reviewComments.id, c.id))
    return { ok: true }
  })

  // Xóa góp ý của chính mình khi chưa ai trả lời
  app.delete('/comments/:id', { schema: { params: z.object({ id: z.string().max(64) }) } }, async (req) => {
    const u = me(req)
    const c = must((await db.select().from(schema.reviewComments).where(and(eq(schema.reviewComments.id, req.params.id), eq(schema.reviewComments.orgId, u.orgId))))[0], 'Góp ý')
    if (c.authorId !== u.id) throw forbidden('Chỉ xóa được góp ý của mình')
    const [reply] = await db.select({ id: schema.reviewComments.id }).from(schema.reviewComments).where(eq(schema.reviewComments.parentId, c.id)).limit(1)
    if (reply) throw badRequest('Góp ý đã có trả lời nên không xóa được. Đánh dấu đã xử lý thay vì xóa')
    await db.delete(schema.reviewComments).where(eq(schema.reviewComments.id, c.id))
    return { ok: true }
  })
}
