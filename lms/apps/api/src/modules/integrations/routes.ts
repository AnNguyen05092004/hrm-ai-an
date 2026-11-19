// Cài đặt kết nối hệ thống ngoài: xAPI (LRS) và webhook; gửi thử; nhật ký gửi.
import crypto from 'node:crypto'
import { z } from 'zod'
import { and, desc, eq, inArray } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { me, requireAuthor } from '../../lib/auth.js'
import { audit } from '../../lib/audit.js'
import { TARGETS, sendTest, type Target } from '../../lib/integrations.js'

type Json = Record<string, unknown>
const MASK = '••••••••'
const Url = z.string().trim().max(500).refine((x) => x === '' || /^https?:\/\/[^\s]+$/i.test(x), 'Địa chỉ phải bắt đầu bằng http:// hoặc https://')

/** Không trả mật khẩu/khóa bí mật về trình duyệt, chỉ cho biết đã đặt */
const masked = (i: Record<string, Json>): Json => ({
  xapi: { enabled: !!i.xapi?.enabled, endpoint: i.xapi?.endpoint ?? '', username: i.xapi?.username ?? '', password: i.xapi?.password ? MASK : '' },
  webhook: { enabled: !!i.webhook?.enabled, url: i.webhook?.url ?? '', secret: i.webhook?.secret ? MASK : '' },
})

export const integrationRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireAuthor)

  app.get('/settings/integrations', async (req) => {
    const [o] = await db.select({ i: schema.orgs.integrations }).from(schema.orgs).where(eq(schema.orgs.id, me(req).orgId))
    return masked((o?.i ?? {}) as Record<string, Json>)
  })

  app.patch('/settings/integrations', {
    schema: { body: z.object({
      xapi: z.object({ enabled: z.boolean(), endpoint: Url, username: z.string().max(300), password: z.string().max(500) }).optional(),
      webhook: z.object({ enabled: z.boolean(), url: Url, secret: z.string().max(300) }).optional(),
    }) },
  }, async (req) => {
    const u = me(req)
    const [o] = await db.select({ i: schema.orgs.integrations }).from(schema.orgs).where(eq(schema.orgs.id, u.orgId))
    const cur = (o?.i ?? {}) as Record<string, Json>
    const next = { ...cur }
    // để trống hoặc giữ dấu che thì giữ mật khẩu/khóa cũ
    if (req.body.xapi) next.xapi = { ...req.body.xapi, password: !req.body.xapi.password || req.body.xapi.password === MASK ? cur.xapi?.password ?? '' : req.body.xapi.password }
    if (req.body.webhook) next.webhook = { ...req.body.webhook, secret: req.body.webhook.secret && req.body.webhook.secret !== MASK ? req.body.webhook.secret : String(cur.webhook?.secret || crypto.randomBytes(24).toString('base64url')) }
    if (next.xapi?.enabled && !next.xapi.endpoint) next.xapi = { ...next.xapi, enabled: false }
    if (next.webhook?.enabled && !next.webhook.url) next.webhook = { ...next.webhook, enabled: false }
    await db.update(schema.orgs).set({ integrations: next }).where(eq(schema.orgs.id, u.orgId))
    await audit(u, 'settings.integrations', u.orgId, { xapi: !!next.xapi?.enabled, webhook: !!next.webhook?.enabled })
    return masked(next)
  })

  // Khóa ký webhook hiển thị một lần khi người soạn yêu cầu (để dán vào hệ thống nhận)
  app.post('/settings/integrations/webhook-secret', async (req) => {
    const u = me(req)
    const [o] = await db.select({ i: schema.orgs.integrations }).from(schema.orgs).where(eq(schema.orgs.id, u.orgId))
    const cur = (o?.i ?? {}) as Record<string, Json>
    const secret = crypto.randomBytes(24).toString('base64url')
    await db.update(schema.orgs).set({ integrations: { ...cur, webhook: { ...(cur.webhook ?? { enabled: false, url: '' }), secret } } }).where(eq(schema.orgs.id, u.orgId))
    await audit(u, 'settings.webhook_secret', u.orgId)
    return { secret }
  })

  app.post('/settings/integrations/test', { schema: { body: z.object({ target: z.enum(['xapi', 'webhook']) }) } }, async (req) => {
    const u = me(req)
    const [p] = await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email }).from(schema.users).where(eq(schema.users.id, u.id))
    return sendTest(u.orgId, req.body.target as Target, p)
  })

  app.get('/settings/integrations/log', async (req) => {
    const rows = await db.select().from(schema.outbox).where(and(eq(schema.outbox.orgId, me(req).orgId), inArray(schema.outbox.topic, TARGETS))).orderBy(desc(schema.outbox.createdAt)).limit(30)
    return rows.map((r) => {
      const b = ((r.payload as Json).body ?? {}) as Json
      const event = r.topic === 'xapi' ? `${((b.verb as Json)?.display as Json)?.['vi-VN'] ?? ''} · ${(((b.object as Json)?.definition as Json)?.name as Json)?.['vi-VN'] ?? ''}` : `${b.event} · ${((b.item ?? b.course) as Json)?.title ?? ''}`
      const who = r.topic === 'xapi' ? (b.actor as Json)?.name : (b.user as Json)?.name
      return { id: r.id, target: r.topic, event, who, at: r.createdAt, deliveredAt: r.deliveredAt, attempts: r.attempts, error: r.lastError }
    })
  })
}
