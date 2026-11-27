// Kho đề: mọi đề kiểm tra của công ty ở một chỗ. Tạo đề từ một khóa học (ra đề từ nội dung gốc đã chốt của khóa)
// hoặc thẳng từ tài liệu nguồn (đề đứng riêng, nằm trong một khóa ẩn chỉ chứa đề đó để dùng chung luồng soạn, review, xuất).
import { z } from 'zod'
import { and, desc, eq, inArray } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { me, requireEditor } from '../../lib/auth.js'
import { badRequest } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { enqueue } from '../../lib/jobs.js'
import { artifactMeta, createArtifact, getKit, isBank } from './service.js'
import { ExamSpec, examPlan } from './exam.js'
import { requireLocked } from './master.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const NewExam = z.discriminatedUnion('from', [
  ExamSpec.extend({ from: z.literal('kit'), kitId: z.string().max(64) }),
  ExamSpec.extend({ from: z.literal('sources'), sourceIds: z.array(z.string().max(64)).min(1).max(20), title: z.string().trim().min(3).max(200) }),
])

export const examBankRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireEditor)

  app.get('/', async (req) => {
    const u = me(req)
    const rows = await db.select({ a: schema.artifacts, k: { id: schema.kits.id, title: schema.kits.title, details: schema.kits.details, sourceIds: schema.kits.sourceIds } })
      .from(schema.artifacts).innerJoin(schema.kits, eq(schema.kits.id, schema.artifacts.kitId))
      .where(and(eq(schema.artifacts.orgId, u.orgId), eq(schema.artifacts.type, 'exam'))).orderBy(desc(schema.artifacts.updatedAt))
    const ids = [...new Set(rows.flatMap((r) => (isBank(r.k) ? r.k.sourceIds : [])))]
    const names = new Map((ids.length ? await db.select({ id: schema.sources.id, name: schema.sources.name }).from(schema.sources).where(inArray(schema.sources.id, ids)) : []).map((s) => [s.id, s.name]))
    return rows.map(({ a, k }) => {
      const qs = (((a.content as Json).quiz?.questions ?? []) as Json[])
      return {
        ...artifactMeta(a), questions: qs.length, approved: qs.filter((q) => q.approved).length,
        origin: isBank(k) ? { kind: 'sources', names: k.sourceIds.map((id) => names.get(id)).filter(Boolean) } : { kind: 'kit', kitId: k.id, title: k.title },
      }
    })
  })

  app.post('/', { schema: { body: NewExam } }, async (req) => {
    const u = me(req)
    const b = req.body
    let kit
    if (b.from === 'kit') {
      kit = await getKit(u.orgId, b.kitId)
      if (isBank(kit)) throw badRequest('Chọn một khóa học')
      await requireLocked(kit.id)
    } else {
      const ids = (await db.select({ id: schema.sources.id }).from(schema.sources)
        .where(and(eq(schema.sources.orgId, u.orgId), eq(schema.sources.status, 'ready'), inArray(schema.sources.id, b.sourceIds)))).map((s) => s.id)
      if (!ids.length) throw badRequest('Chọn ít nhất một tài liệu nguồn đã xử lý xong')
      ;[kit] = await db.insert(schema.kits).values({
        orgId: u.orgId, title: b.title, goal: b.focus || b.title, sourceIds: ids, createdBy: u.id, stage: 'ready', img: 'desk', details: { bank: true },
      }).returning()
    }
    const a = await createArtifact(kit, examPlan(kit, b))
    const job = await enqueue(u.orgId, 'exam.generate', { artifactId: a.id }, u.id)
    await audit(u, 'exam.create', a.id, { from: b.from, levels: b.levels })
    return { id: a.id, kitId: kit.id, jobId: job.id }
  })
}
