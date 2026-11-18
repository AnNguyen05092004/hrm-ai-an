import path from 'node:path'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { me, requireAuthor, requireUser } from '../../lib/auth.js'
import { badRequest, conflict, notFound } from '../../lib/errors.js'
import { enqueue } from '../../lib/jobs.js'
import { uid } from '../../lib/ids.js'
import { getArtifact } from '../artifacts/routes.js'
import { viewable } from '../learn/access.js'
import './render.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
const FILE = /^video-\d+\.(mp4|vtt)$/

export const videoRoutes: FastifyPluginAsyncZod = async (app) => {
  // Dựng (hoặc dựng lại) video từ slide và lời đọc
  app.post('/artifacts/:id/render', { preHandler: requireAuthor, schema: { params: z.object({ id: z.string() }) } }, async (req) => {
    const u = me(req)
    const a = await getArtifact(u.orgId, req.params.id)
    const c = a.content as Json
    if (a.type !== 'video' || !c.slides?.length) throw badRequest('Chỉ dựng được video tạo từ slide')
    if (c.render?.status === 'rendering') throw conflict('Video đang được dựng')
    await db.update(schema.artifacts).set({ content: { ...c, render: { ...(c.render ?? {}), status: 'rendering' } } }).where(eq(schema.artifacts.id, a.id))
    const job = await enqueue(u.orgId, 'video.render', { artifactId: a.id }, u.id)
    return { jobId: job.id }
  })

  // Tạo video từ bộ slide: lời đọc lấy từ ghi chú người trình bày
  app.post('/artifacts/:id/to-video', { preHandler: requireAuthor, schema: { params: z.object({ id: z.string() }) } }, async (req) => {
    const u = me(req)
    const deck = await getArtifact(u.orgId, req.params.id)
    const slides = ((deck.content as Json).slides ?? []) as Json[]
    if (deck.type !== 'deck' || !slides.length) throw badRequest('Cần một bộ slide có nội dung')
    if (!slides.some((s) => String(s.notes ?? '').trim())) throw badRequest('Thêm ghi chú người trình bày cho slide: đó là lời đọc của video')
    const content = { ai: true, voice: 'Giọng đọc AI có sẵn (alloy)', slides: slides.map((s) => ({ ...s, id: uid('s') })), chapters: slides.map((s, i) => ({ t: i * 30, title: s.title })), transcript: [], checkpoints: [], duration: slides.length * 30, render: { status: 'rendering' }, plan: { type: 'video', title: `Video: ${deck.title}`, summary: deck.summary } }
    const [v] = await db.insert(schema.artifacts).values({ orgId: u.orgId, kitId: deck.kitId, type: 'video', title: `Video: ${deck.title}`, summary: 'Video do AI tạo từ bộ slide và giọng đọc AI, đã chép lời và chia chương.', img: 'video', content }).returning()
    await enqueue(u.orgId, 'video.render', { artifactId: v.id }, u.id)
    return { id: v.id }
  })

  // Phát video/phụ đề: chỉ người được xem tài liệu mới tải được
  app.get('/media/:artifactId/:file', { preHandler: requireUser, schema: { params: z.object({ artifactId: z.string(), file: z.string() }) } }, async (req, reply) => {
    if (!FILE.test(req.params.file)) throw notFound('Tệp')
    const a = await viewable(me(req), req.params.artifactId)
    return reply.sendFile(path.posix.join('videos', a.id, req.params.file))
  })
}
