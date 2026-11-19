// Chia sẻ cả khóa học: xuất bản hàng loạt, giao cả khóa cho người học, đường dẫn cho cả khóa; tạo đề kiểm tra riêng.
import crypto from 'node:crypto'
import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { me } from '../../lib/auth.js'
import { badRequest } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { enqueue } from '../../lib/jobs.js'
import { publishIssues } from '../artifacts/validate.js'
import { hasUnpublishedChanges, publishArtifact } from '../artifacts/publish.js'
import { createArtifact, getKit } from './service.js'
import { ExamSpec, examPlan } from './exam.js'

const P = z.object({ id: z.string() })

export const kitShareRoutes: FastifyPluginAsyncZod = async (app) => {
  // Tình trạng chia sẻ của cả bộ: từng tài liệu xuất bản chưa, có gì chặn, đã giao cho bao nhiêu người
  app.get('/:id/share', { schema: { params: P } }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    const arts = await db.select().from(schema.artifacts).where(eq(schema.artifacts.kitId, k.id)).orderBy(schema.artifacts.createdAt)
    const assigned = arts.length ? await db.select({ artifactId: schema.assignments.artifactId, userId: schema.assignments.userId }).from(schema.assignments).where(inArray(schema.assignments.artifactId, arts.map((a) => a.id))) : []
    const items = await Promise.all(arts.map(async (a) => ({
      id: a.id, type: a.type, title: a.title, status: a.status, publishedVersion: a.publishedVersion,
      changed: a.status !== 'generating' && await hasUnpublishedChanges(a), issues: publishIssues(a),
      assigned: assigned.filter((x) => x.artifactId === a.id).length,
    })))
    // người đã được giao đủ mọi tài liệu đã xuất bản của khóa
    const pub = new Set(arts.filter((a) => a.publishedVersion).map((a) => a.id))
    const count = new Map<string, number>()
    for (const x of assigned) if (pub.has(x.artifactId)) count.set(x.userId, (count.get(x.userId) ?? 0) + 1)
    const fullyAssigned = [...count].filter(([, n]) => n === pub.size).map(([id]) => id)
    return { shareSlug: k.shareSlug, items, learners: count.size, fullyAssigned }
  })

  // Xuất bản mọi tài liệu sẵn sàng và có thay đổi; tài liệu bị chặn thì báo lý do
  app.post('/:id/publish-all', { schema: { params: P, body: z.object({ note: z.string().max(500).default(''), ids: z.array(z.string()).max(100).optional() }) } }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    const arts = await db.select().from(schema.artifacts).where(eq(schema.artifacts.kitId, k.id)).orderBy(schema.artifacts.createdAt)
    const published: string[] = [], unchanged: string[] = [], skipped: { id: string; title: string; reasons: string[] }[] = []
    for (const a of arts.filter((x) => !req.body.ids || req.body.ids.includes(x.id))) {
      const issues = publishIssues(a)
      if (issues.blocking.length) { skipped.push({ id: a.id, title: a.title, reasons: issues.blocking }); continue }
      if (!(await hasUnpublishedChanges(a))) { unchanged.push(a.id); continue }
      await publishArtifact(u, a, req.body.note || 'Xuất bản cả khóa')
      published.push(a.id)
    }
    await audit(u, 'kit.publish_all', k.id, { published: published.length, skipped: skipped.length })
    return { published, unchanged, skipped }
  })

  // Giao cả khóa: giao mọi tài liệu đã xuất bản cho từng người
  app.post('/:id/assign', {
    schema: { params: P, body: z.object({ userIds: z.array(z.string()).min(1).max(500), due: z.string().date().optional(), reason: z.string().max(200).default('') }) },
  }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    const arts = (await db.select({ id: schema.artifacts.id, publishedVersion: schema.artifacts.publishedVersion }).from(schema.artifacts).where(eq(schema.artifacts.kitId, k.id))).filter((a) => a.publishedVersion)
    if (!arts.length) throw badRequest('Khóa chưa có tài liệu nào được xuất bản')
    const users = (await db.select({ id: schema.users.id }).from(schema.users).where(and(eq(schema.users.orgId, u.orgId), inArray(schema.users.id, req.body.userIds)))).map((x) => x.id)
    const due = req.body.due ? new Date(`${req.body.due}T23:59:00+07:00`) : null
    const rows = await db.insert(schema.assignments).values(arts.flatMap((a) => users.map((userId) => ({
      orgId: u.orgId, artifactId: a.id, userId, due, reason: req.body.reason, skillId: k.skillId ?? undefined, assignedBy: u.id,
    })))).onConflictDoNothing().returning({ id: schema.assignments.id })
    await audit(u, 'kit.assign', k.id, { users: users.length, artifacts: arts.length, created: rows.length })
    return { artifacts: arts.length, users: users.length, created: rows.length }
  })

  // Đường dẫn cho cả khóa (trong công ty, cần đăng nhập)
  app.post('/:id/share', { schema: { params: P, body: z.object({ on: z.boolean() }) } }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    if (req.body.on) {
      const [pub] = await db.select({ id: schema.artifacts.id }).from(schema.artifacts).where(and(eq(schema.artifacts.kitId, k.id), eq(schema.artifacts.status, 'published'))).limit(1)
      if (!pub) throw badRequest('Xuất bản ít nhất một tài liệu trước khi tạo đường dẫn cho cả khóa')
    }
    const slug = req.body.on ? (k.shareSlug ?? crypto.randomBytes(6).toString('base64url')) : null
    await db.update(schema.kits).set({ shareSlug: slug }).where(eq(schema.kits.id, k.id))
    await audit(u, req.body.on ? 'kit.share' : 'kit.unshare', k.id)
    return { shareSlug: slug }
  })

  // Đề kiểm tra riêng: AI soạn ngân hàng câu theo mức (chạy nền)
  app.post('/:id/exams', { schema: { params: P, body: ExamSpec } }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    const a = await createArtifact(k, examPlan(k, req.body))
    const job = await enqueue(u.orgId, 'exam.generate', { artifactId: a.id }, u.id)
    await audit(u, 'exam.create', a.id, { levels: req.body.levels })
    return { id: a.id, jobId: job.id }
  })
}
