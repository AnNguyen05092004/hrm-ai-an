// Xuất bản cả khóa và tạo đề kiểm tra riêng của khóa.
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { me } from '../../lib/auth.js'
import { audit } from '../../lib/audit.js'
import { enqueue } from '../../lib/jobs.js'
import { publishIssues } from '../artifacts/validate.js'
import { hasUnpublishedChanges, publishArtifact } from '../artifacts/publish.js'
import { createArtifact, getKit, isBank } from './service.js'
import { requireLocked } from './master.js'
import { ExamSpec, examPlan } from './exam.js'

const P = z.object({ id: z.string() })

export const kitPublishRoutes: FastifyPluginAsyncZod = async (app) => {
  // Tình trạng xuất bản của cả khóa: từng tài liệu xuất bản chưa, có thay đổi chưa xuất bản, có gì chặn
  app.get('/:id/publish-status', { schema: { params: P } }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    const arts = await db.select().from(schema.artifacts).where(eq(schema.artifacts.kitId, k.id)).orderBy(schema.artifacts.createdAt)
    return {
      items: await Promise.all(arts.filter((a) => a.type !== 'master').map(async (a) => ({
        id: a.id, type: a.type, title: a.title, status: a.status, publishedVersion: a.publishedVersion,
        changed: a.status !== 'generating' && await hasUnpublishedChanges(a), issues: publishIssues(a),
      }))),
    }
  })

  // Xuất bản mọi tài liệu sẵn sàng và có thay đổi; tài liệu bị chặn thì báo lý do
  app.post('/:id/publish-all', { schema: { params: P, body: z.object({ note: z.string().max(500).default(''), ids: z.array(z.string()).max(100).optional() }) } }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    const arts = await db.select().from(schema.artifacts).where(eq(schema.artifacts.kitId, k.id)).orderBy(schema.artifacts.createdAt)
    const published: string[] = [], unchanged: string[] = [], skipped: { id: string; title: string; reasons: string[] }[] = []
    // nội dung gốc chốt riêng (Chốt nội dung), không xuất bản cùng các định dạng
    for (const a of arts.filter((x) => x.type !== 'master' && (!req.body.ids || req.body.ids.includes(x.id)))) {
      const issues = publishIssues(a)
      if (issues.blocking.length) { skipped.push({ id: a.id, title: a.title, reasons: issues.blocking }); continue }
      if (!(await hasUnpublishedChanges(a))) { unchanged.push(a.id); continue }
      await publishArtifact(u, a, req.body.note || 'Xuất bản cả khóa')
      published.push(a.id)
    }
    await audit(u, 'kit.publish_all', k.id, { published: published.length, skipped: skipped.length })
    return { published, unchanged, skipped }
  })

  // Đề kiểm tra riêng: AI soạn ngân hàng câu theo mức (chạy nền), từ nội dung gốc đã chốt
  app.post('/:id/exams', { schema: { params: P, body: ExamSpec } }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    if (!isBank(k)) await requireLocked(k.id)
    const a = await createArtifact(k, examPlan(k, req.body))
    const job = await enqueue(u.orgId, 'exam.generate', { artifactId: a.id }, u.id)
    await audit(u, 'exam.create', a.id, { levels: req.body.levels })
    return { id: a.id, jobId: job.id }
  })
}
