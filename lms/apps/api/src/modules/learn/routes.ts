import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { me, requireUser } from '../../lib/auth.js'
import { forbidden, must } from '../../lib/errors.js'
import { artifactMeta } from '../kits/service.js'
import { learnerView, publishedContent, unitsOf, viewable } from './access.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
const P = z.object({ id: z.string() })
// thứ tự học trong một khóa: đọc nhanh → slide → tình huống → video → hướng dẫn → kiểm tra
const TYPE_ORDER = ['qr', 'deck', 'scenario', 'video', 'guide', 'exam']

export const learnRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireUser)

  // Khóa được giao cho tôi, kèm tiến độ và kết quả thi
  app.get('/my', async (req) => {
    const u = me(req)
    const rows = await db.select({ a: schema.artifacts, as: schema.assignments, k: { title: schema.kits.title, skillId: schema.kits.skillId, level: schema.kits.level, img: schema.kits.img, goal: schema.kits.goal } })
      .from(schema.assignments).innerJoin(schema.artifacts, eq(schema.artifacts.id, schema.assignments.artifactId)).innerJoin(schema.kits, eq(schema.kits.id, schema.artifacts.kitId))
      .where(and(eq(schema.assignments.userId, u.id), eq(schema.assignments.orgId, u.orgId)))
    const ids = rows.map((r) => r.a.id)
    const [prog, atts, skills, mine] = await Promise.all([
      ids.length ? db.select().from(schema.progress).where(and(eq(schema.progress.userId, u.id), inArray(schema.progress.artifactId, ids))) : [],
      ids.length ? db.select({ artifactId: schema.attempts.artifactId, status: schema.attempts.status, score: schema.attempts.score, mode: schema.attempts.mode }).from(schema.attempts).where(and(eq(schema.attempts.userId, u.id), inArray(schema.attempts.artifactId, ids))) : [],
      db.select({ id: schema.skills.id, name: schema.skills.name }).from(schema.skills).where(eq(schema.skills.orgId, u.orgId)),
      db.select().from(schema.userSkills).where(eq(schema.userSkills.userId, u.id)),
    ])
    const items = rows.filter((r) => r.a.publishedVersion).map((r) => {
      const p = prog.find((x) => x.artifactId === r.a.id)
      const myAtts = atts.filter((x) => x.artifactId === r.a.id)
      return {
        ...artifactMeta(r.a), kitTitle: r.k.title, kitImg: r.k.img, kitDesc: r.k.goal, skillId: r.k.skillId, level: r.k.level,
        due: r.as.due, reason: r.as.reason, assignedAt: r.as.createdAt,
        percent: p?.percent ?? 0, completedAt: p?.completedAt ?? null, lastAt: p?.lastAt ?? null,
        best: myAtts.filter((x) => x.score != null).reduce<number | null>((m, x) => Math.max(m ?? 0, x.score ?? 0), null),
        passed: myAtts.some((x) => x.status === 'passed'), grading: myAtts.some((x) => x.status === 'grading'),
      }
    })
    return { items, skills: mine.map((s) => ({ ...s, name: skills.find((k) => k.id === s.skillId)?.name ?? s.skillId })), skillNames: Object.fromEntries(skills.map((k) => [k.id, k.name])) }
  })

  // Một khóa (khóa học) với các mục con người học xem được, theo thứ tự học
  app.get('/kit/:id', { schema: { params: P } }, async (req) => {
    const u = me(req)
    const k = must((await db.select().from(schema.kits).where(and(eq(schema.kits.id, req.params.id), eq(schema.kits.orgId, u.orgId))))[0], 'Khóa học')
    const published = (await db.select().from(schema.artifacts).where(eq(schema.artifacts.kitId, k.id))).filter((a) => a.publishedVersion)
    const mine = await db.select().from(schema.assignments).where(and(eq(schema.assignments.userId, u.id), inArray(schema.assignments.artifactId, published.length ? published.map((a) => a.id) : ['-'])))
    const open = u.role === 'author' || !!k.shareSlug
    const arts = published.filter((a) => open || mine.some((x) => x.artifactId === a.id))
      .sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.createdAt.getTime() - b.createdAt.getTime())
    if (!arts.length) throw forbidden(published.length ? 'Bạn chưa được giao khóa này' : 'Khóa chưa có tài liệu nào được xuất bản')
    const ids = arts.map((a) => a.id)
    const [prog, atts] = await Promise.all([
      db.select().from(schema.progress).where(and(eq(schema.progress.userId, u.id), inArray(schema.progress.artifactId, ids))),
      db.select({ artifactId: schema.attempts.artifactId, status: schema.attempts.status, score: schema.attempts.score }).from(schema.attempts).where(and(eq(schema.attempts.userId, u.id), inArray(schema.attempts.artifactId, ids))),
    ])
    const items = arts.map((a) => {
      const p = prog.find((x) => x.artifactId === a.id)
      const my = atts.filter((x) => x.artifactId === a.id)
      const passed = my.some((x) => x.status === 'passed')
      return {
        ...artifactMeta(a), percent: a.type === 'exam' ? (passed ? 100 : 0) : (p?.percent ?? 0), started: !!p || my.length > 0,
        passed, grading: my.some((x) => x.status === 'grading'), best: my.filter((x) => x.score != null).reduce<number | null>((m, x) => Math.max(m ?? 0, x.score ?? 0), null),
        due: mine.find((x) => x.artifactId === a.id)?.due ?? null,
      }
    })
    const dues = items.map((x) => x.due).filter(Boolean) as Date[]
    return {
      id: k.id, title: k.title, desc: k.goal, img: k.img, skillId: k.skillId, level: k.level, items,
      percent: Math.round(items.reduce((n, x) => n + x.percent, 0) / items.length), due: dues.length ? new Date(Math.min(...dues.map((d) => d.getTime()))) : null,
    }
  })

  app.get('/k/:slug', { schema: { params: z.object({ slug: z.string() }) } }, async (req) => {
    const u = me(req)
    const k = must((await db.select({ id: schema.kits.id }).from(schema.kits).where(and(eq(schema.kits.shareSlug, req.params.slug), eq(schema.kits.orgId, u.orgId))))[0], 'Đường dẫn')
    return { id: k.id }
  })

  app.get('/s/:slug', { schema: { params: z.object({ slug: z.string() }) } }, async (req) => {
    const u = me(req)
    const a = must((await db.select({ id: schema.artifacts.id }).from(schema.artifacts).where(and(eq(schema.artifacts.shareSlug, req.params.slug), eq(schema.artifacts.orgId, u.orgId))))[0], 'Đường dẫn')
    return { id: a.id }
  })

  // Nội dung để học: bản đã xuất bản (người soạn xem trước thì truyền ?draft=1)
  app.get('/a/:id', { schema: { params: P, querystring: z.object({ draft: z.string().optional() }) } }, async (req) => {
    const u = me(req)
    const a = await viewable(u, req.params.id)
    const draft = u.role === 'author' && (req.query.draft === '1' || !a.publishedVersion)
    const src = draft ? { title: a.title, summary: a.summary, version: 0, content: a.content as Json } : await publishedContent(a)
    const [p] = await db.select().from(schema.progress).where(and(eq(schema.progress.userId, u.id), eq(schema.progress.artifactId, a.id)))
    const [k] = await db.select({ title: schema.kits.title }).from(schema.kits).where(eq(schema.kits.id, a.kitId))
    if (u.role === 'learner') {
      await db.insert(schema.progress).values({ userId: u.id, artifactId: a.id }).onConflictDoUpdate({ target: [schema.progress.userId, schema.progress.artifactId], set: { sessions: (p?.sessions ?? 0) + 1, lastAt: new Date() } })
    }
    return { id: a.id, type: a.type, img: a.img, kitId: a.kitId, kitTitle: k?.title, title: src.title, summary: src.summary, version: src.version, draft, ...learnerView(src.content), progress: { done: p?.done ?? [], percent: p?.percent ?? 0 } }
  })

  // Đánh dấu đã học xong một phần (bài, chương, slide)
  app.post('/a/:id/progress', { schema: { params: P, body: z.object({ unit: z.string().max(80) }) } }, async (req) => {
    const u = me(req)
    const a = await viewable(u, req.params.id)
    if (u.role !== 'learner' || !a.publishedVersion) return { percent: 0, done: [] }
    const { content } = await publishedContent(a)
    const units = unitsOf(a.type, content)
    if (!units.includes(req.body.unit)) return { percent: 0, done: [] }
    // khóa dòng tiến độ để hai lần đánh dấu cùng lúc không ghi đè nhau
    const r = await db.transaction(async (tx) => {
      await tx.insert(schema.progress).values({ userId: u.id, artifactId: a.id }).onConflictDoNothing()
      const [p] = await tx.select().from(schema.progress).where(and(eq(schema.progress.userId, u.id), eq(schema.progress.artifactId, a.id))).for('update')
      const done = [...new Set([...(p?.done ?? []), req.body.unit])].filter((x) => units.includes(x))
      const percent = Math.round((100 * done.length) / Math.max(1, units.length))
      const completedAt = percent >= 100 ? (p?.completedAt ?? new Date()) : null
      await tx.update(schema.progress).set({ done, percent, completedAt, lastAt: new Date() }).where(and(eq(schema.progress.userId, u.id), eq(schema.progress.artifactId, a.id)))
      return { done, percent }
    })
    const { done, percent } = r
    return { percent, done }
  })
}
