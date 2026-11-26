import { z } from 'zod'
import { and, desc, eq, inArray } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { me, requireEditor } from '../../lib/auth.js'
import { badRequest, conflict, must } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { enqueue } from '../../lib/jobs.js'
import { artifactDto, artifactMeta, getKit } from '../kits/service.js'
import { aiBlock, aiEditBlock, generateQuestions } from './ai-edit.js'
import { publishIssues } from './validate.js'
import { publishArtifact } from './publish.js'

const P = z.object({ id: z.string() })
const MAX_CONTENT = 2_000_000

export const getArtifact = async (orgId: string, id: string): Promise<typeof schema.artifacts.$inferSelect> =>
  must((await db.select().from(schema.artifacts).where(and(eq(schema.artifacts.id, id), eq(schema.artifacts.orgId, orgId))))[0], 'Tài liệu')

export const artifactRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireEditor)

  app.get('/', async (req) => {
    const rows = await db.select().from(schema.artifacts).where(eq(schema.artifacts.orgId, me(req).orgId)).orderBy(desc(schema.artifacts.updatedAt))
    return rows.map(artifactMeta)
  })

  app.get('/:id', { schema: { params: P } }, async (req) => {
    const a = await getArtifact(me(req).orgId, req.params.id)
    return artifactDto(a)
  })

  // Lưu tự động từ màn soạn: tên, tóm tắt, ảnh và toàn bộ cây nội dung
  app.patch('/:id', {
    schema: { params: P, body: z.object({ title: z.string().max(300).optional(), summary: z.string().max(3000).optional(), img: z.string().max(40).optional(), content: z.record(z.string(), z.unknown()).optional() }) },
  }, async (req) => {
    const u = me(req)
    const a = await getArtifact(u.orgId, req.params.id)
    if (a.status === 'generating') throw badRequest('Tài liệu đang được AI soạn, chờ xong rồi sửa')
    const { content, ...rest } = req.body
    if (content && JSON.stringify(content).length > MAX_CONTENT) throw badRequest('Nội dung quá lớn')
    // plan và render do server quản lý, không để bản lưu từ trình duyệt ghi đè
    const { plan, render } = a.content as Record<string, unknown>
    const [r] = await db.update(schema.artifacts).set({ ...rest, ...(content ? { content: { ...content, plan, ...(render ? { render } : {}) } } : {}), updatedAt: new Date() }).where(eq(schema.artifacts.id, a.id)).returning()
    return { ok: true, updated: artifactMeta(r).updated }
  })

  app.delete('/:id', { schema: { params: P } }, async (req) => {
    const u = me(req)
    const a = await getArtifact(u.orgId, req.params.id)
    await db.delete(schema.artifacts).where(eq(schema.artifacts.id, a.id))
    await audit(u, 'artifact.delete', a.id, { title: a.title })
    return { ok: true }
  })

  app.get('/:id/check', { schema: { params: P } }, async (req) => publishIssues(await getArtifact(me(req).orgId, req.params.id)))

  // Xuất bản: chụp bản hiện tại thành phiên bản mới; gói xuất (SCORM, đề QTI) dùng bản này
  app.post('/:id/publish', { schema: { params: P, body: z.object({ note: z.string().max(500).default('') }) } }, async (req) => {
    const u = me(req)
    const a = await getArtifact(u.orgId, req.params.id)
    const r = await publishArtifact(u, a, req.body.note)
    return artifactMeta(r)
  })

  app.post('/:id/unpublish', { schema: { params: P } }, async (req) => {
    const u = me(req)
    const a = await getArtifact(u.orgId, req.params.id)
    const [r] = await db.update(schema.artifacts).set({ status: 'draft', publishedVersion: null, updatedAt: new Date() }).where(eq(schema.artifacts.id, a.id)).returning()
    await audit(u, 'artifact.unpublish', a.id)
    return artifactMeta(r)
  })

  app.get('/:id/versions', { schema: { params: P } }, async (req) => {
    const a = await getArtifact(me(req).orgId, req.params.id)
    return db.select({ version: schema.artifactVersions.version, note: schema.artifactVersions.note, createdAt: schema.artifactVersions.createdAt, by: schema.users.name })
      .from(schema.artifactVersions).leftJoin(schema.users, eq(schema.users.id, schema.artifactVersions.publishedBy))
      .where(eq(schema.artifactVersions.artifactId, a.id)).orderBy(desc(schema.artifactVersions.version))
  })

  // Khôi phục nội dung một phiên bản cũ vào bản nháp
  app.post('/:id/versions/:v/restore', { schema: { params: z.object({ id: z.string(), v: z.coerce.number() }) } }, async (req) => {
    const u = me(req)
    const a = await getArtifact(u.orgId, req.params.id)
    const v = must((await db.select().from(schema.artifactVersions).where(and(eq(schema.artifactVersions.artifactId, a.id), eq(schema.artifactVersions.version, req.params.v))))[0], 'Phiên bản')
    await db.update(schema.artifacts).set({ title: v.title, summary: v.summary, content: v.content, updatedAt: new Date() }).where(eq(schema.artifacts.id, a.id))
    return { ok: true }
  })

  // Sửa bằng AI một khối / slide / câu hỏi
  app.post('/:id/ai-edit', {
    schema: { params: P, body: z.object({ kind: z.enum(['block', 'slide', 'question', 'lesson']), value: z.record(z.string(), z.unknown()), instruction: z.string().trim().min(2).max(2000) }) },
  }, async (req) => {
    const u = me(req)
    const a = await getArtifact(u.orgId, req.params.id)
    const k = await getKit(u.orgId, a.kitId)
    return aiEditBlock(u.orgId, k.sourceIds, req.body.kind, req.body.value, req.body.instruction)
  })

  app.post('/:id/ai-block', { schema: { params: P, body: z.object({ instruction: z.string().trim().min(3).max(1000) }) } }, async (req) => {
    const u = me(req)
    const a = await getArtifact(u.orgId, req.params.id)
    return aiBlock(await getKit(u.orgId, a.kitId), req.body.instruction)
  })

  app.post('/:id/questions/generate', {
    schema: { params: P, body: z.object({ level: z.number().int().min(1).max(3), count: z.number().int().min(1).max(10), focus: z.string().max(300).default('') }) },
  }, async (req) => {
    const u = me(req)
    const a = await getArtifact(u.orgId, req.params.id)
    const existing = (((a.content as { quiz?: { questions?: { q: string }[] } }).quiz?.questions) ?? []).map((q) => q.q)
    return { questions: await generateQuestions(await getKit(u.orgId, a.kitId), req.body.level, req.body.count, req.body.focus, existing) }
  })

  // Tạo lại nội dung từ đầu (khi soạn lỗi)
  app.post('/:id/regenerate', { schema: { params: P } }, async (req) => {
    const u = me(req)
    const a = await getArtifact(u.orgId, req.params.id)
    if (a.status === 'generating') throw conflict('AI đang soạn tài liệu này')
    if (a.publishedVersion) throw badRequest('Tài liệu đã xuất bản. Sửa trực tiếp hoặc dùng "Sửa bằng AI" cho từng phần.')
    await db.update(schema.artifacts).set({ status: 'generating', updatedAt: new Date() }).where(eq(schema.artifacts.id, a.id))
    const job = await enqueue(u.orgId, a.type === 'exam' ? 'exam.generate' : 'artifact.generate', { artifactId: a.id }, u.id)
    return { jobId: job.id }
  })
}
