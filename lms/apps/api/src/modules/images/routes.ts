// Ảnh của tổ chức: tải lên, AI tạo, thư viện, phục vụ cho người trong tổ chức.
import { z } from 'zod'
import { and, desc, eq } from 'drizzle-orm'
import { Resvg } from '@resvg/resvg-js'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { me, requireEditor, requireUser } from '../../lib/auth.js'
import { badRequest, must } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { imageGen } from '../../lib/ai/index.js'
import { getFile, putFile } from '../../lib/storage.js'

const MAX_IMAGE = 8 * 1024 * 1024
const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }

/** Nhận diện định dạng theo byte đầu tệp, không tin phần mở rộng hay mime trình duyệt gửi */
export function sniffImage(b: Buffer): string | null {
  if (b.length < 12) return null
  if (b[0] === 0x89 && b.subarray(1, 4).toString() === 'PNG') return 'image/png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'image/webp'
  if (b.subarray(0, 6).toString() === 'GIF87a' || b.subarray(0, 6).toString() === 'GIF89a') return 'image/gif'
  return null
}

const keyOf = (img: { id: string; orgId: string; mime: string }): string => `images/${img.orgId}/${img.id}.${EXT[img.mime]}`
/** Đọc ảnh của tổ chức theo id (dùng khi dựng video) */
export async function loadImage(orgId: string, id: string): Promise<{ mime: string; data: Buffer } | null> {
  const [img] = await db.select().from(schema.images).where(and(eq(schema.images.id, id), eq(schema.images.orgId, orgId)))
  if (!img) return null
  return { mime: img.mime, data: await getFile(keyOf(img)) }
}
export const imageUrl = (id: string): string => `/api/images/${id}`
const dto = (x: typeof schema.images.$inferSelect): Record<string, unknown> => ({ id: x.id, url: imageUrl(x.id), name: x.name, kind: x.kind, prompt: x.prompt, createdAt: x.createdAt })

/** Ảnh thay thế khi chạy AI giả lập: nền chuyển màu và mô tả ngắn */
function placeholder(prompt: string): Buffer {
  const esc = prompt.slice(0, 60).replace(/[<>&"]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#64748b"/></linearGradient></defs><rect width="1536" height="1024" fill="url(#g)"/><text x="96" y="900" font-family="Arial" font-size="48" fill="#e2e8f0">${esc}</text></svg>`
  return new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng()
}

async function save(orgId: string, userId: string, name: string, mime: string, data: Buffer, kind: 'upload' | 'ai', prompt?: string): Promise<typeof schema.images.$inferSelect> {
  const [row] = await db.insert(schema.images).values({ orgId, name: name.slice(0, 200), mime, size: data.length, kind, prompt, createdBy: userId }).returning()
  await putFile(keyOf(row), data)
  return row
}

export const imageRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/images', { preHandler: requireEditor }, async (req) => {
    const rows = await db.select().from(schema.images).where(eq(schema.images.orgId, me(req).orgId)).orderBy(desc(schema.images.createdAt)).limit(200)
    return rows.map(dto)
  })

  app.post('/images', { preHandler: requireEditor }, async (req) => {
    const u = me(req)
    const file = await req.file()
    if (!file) throw badRequest('Chưa chọn ảnh')
    const buf = await file.toBuffer()
    if (buf.length > MAX_IMAGE) throw badRequest('Ảnh tối đa 8 MB')
    const mime = sniffImage(buf)
    if (!mime) throw badRequest('Chỉ nhận ảnh PNG, JPG, WEBP hoặc GIF')
    const row = await save(u.orgId, u.id, file.filename || 'anh', mime, buf, 'upload')
    await audit(u, 'image.upload', row.id, { size: buf.length })
    return dto(row)
  })

  app.post('/images/generate', { preHandler: requireEditor, schema: { body: z.object({ prompt: z.string().trim().min(3).max(1000) }) } }, async (req) => {
    const u = me(req)
    const png = (await imageGen(u.orgId, req.body.prompt)) ?? placeholder(req.body.prompt)
    const row = await save(u.orgId, u.id, req.body.prompt.slice(0, 80), 'image/png', png, 'ai', req.body.prompt)
    await audit(u, 'image.generate', row.id)
    return dto(row)
  })

  app.delete('/images/:id', { preHandler: requireEditor, schema: { params: z.object({ id: z.string() }) } }, async (req) => {
    const u = me(req)
    await db.delete(schema.images).where(and(eq(schema.images.id, req.params.id), eq(schema.images.orgId, u.orgId)))
    return { ok: true }
  })

  // Ảnh chỉ người trong cùng tổ chức xem được (tài liệu chứa ảnh có thể là nội bộ)
  app.get('/images/:id', { preHandler: requireUser, schema: { params: z.object({ id: z.string() }) } }, async (req, reply) => {
    const u = me(req)
    const img = must((await db.select().from(schema.images).where(and(eq(schema.images.id, req.params.id), eq(schema.images.orgId, u.orgId))))[0], 'Ảnh')
    reply.header('cache-control', 'private, max-age=31536000, immutable')
    return reply.type(img.mime).sendFile(keyOf(img))
  })
}
