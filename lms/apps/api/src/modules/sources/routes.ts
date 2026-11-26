import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { me, requireEditor } from '../../lib/auth.js'
import { badRequest, must } from '../../lib/errors.js'
import { kindOf } from '../../lib/extract.js'
import { putFile } from '../../lib/storage.js'
import { enqueue } from '../../lib/jobs.js'
import { audit } from '../../lib/audit.js'
import { fileKey, listSources } from './service.js'

export const sourceRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireEditor)

  app.get('/', async (req) => listSources(me(req).orgId))

  app.get('/:id', { schema: { params: z.object({ id: z.string() }) } }, async (req) => {
    const u = me(req)
    const s = must((await db.select().from(schema.sources).where(and(eq(schema.sources.id, req.params.id), eq(schema.sources.orgId, u.orgId))))[0], 'Tài liệu')
    const chunks = await db.select({ id: schema.sourceChunks.id, section: schema.sourceChunks.section, text: schema.sourceChunks.text })
      .from(schema.sourceChunks).where(and(eq(schema.sourceChunks.sourceId, s.id), eq(schema.sourceChunks.version, s.version))).orderBy(schema.sourceChunks.ord)
    return { ...s, text: undefined, chunks }
  })

  // Tải tài liệu mới, hoặc bản mới của tài liệu đã có (?replace=<id>)
  app.post('/', { schema: { querystring: z.object({ replace: z.string().optional() }) } }, async (req) => {
    const u = me(req)
    const file = await req.file()
    if (!file) throw badRequest('Chưa chọn tệp')
    const kind = kindOf(file.filename, file.mimetype)
    const buf = await file.toBuffer()
    if (!buf.length) throw badRequest('Tệp rỗng')
    const name = file.filename.replace(/[\\/]/g, '_').slice(0, 160)
    let src
    if (req.query.replace) {
      const old = must((await db.select().from(schema.sources).where(and(eq(schema.sources.id, req.query.replace), eq(schema.sources.orgId, u.orgId))))[0], 'Tài liệu')
      ;[src] = await db.update(schema.sources).set({ version: old.version + 1, name, mime: `application/${kind}`, status: 'processing', error: null, updatedAt: new Date() }).where(eq(schema.sources.id, old.id)).returning()
    } else {
      ;[src] = await db.insert(schema.sources).values({ orgId: u.orgId, name, mime: `application/${kind}`, uploadedBy: u.id }).returning()
    }
    await putFile(fileKey(src), buf)
    const job = await enqueue(u.orgId, 'source.process', { sourceId: src.id, previousVersion: req.query.replace ? src.version - 1 : null }, u.id)
    await audit(u, req.query.replace ? 'source.new_version' : 'source.upload', src.id, { name, version: src.version })
    return { source: { id: src.id, name: src.name, version: src.version, status: src.status }, jobId: job.id }
  })

  app.delete('/:id', { schema: { params: z.object({ id: z.string() }) } }, async (req) => {
    const u = me(req)
    await db.delete(schema.sources).where(and(eq(schema.sources.id, req.params.id), eq(schema.sources.orgId, u.orgId)))
    return { ok: true }
  })
}
