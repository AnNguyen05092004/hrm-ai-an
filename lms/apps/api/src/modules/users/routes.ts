// Quản trị: tài khoản và vai (admin, author, reviewer), hạn mức AI, nhật ký thao tác.
import crypto from 'node:crypto'
import { z } from 'zod'
import { and, asc, eq, gte, ne, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { ROLES } from '../../db/schema.js'
import { hashPassword, me, requireAdmin, requireEditor } from '../../lib/auth.js'
import { badRequest, conflict, must } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { monthUsage } from '../../lib/ai/index.js'

const COLORS = ['#8b88c9', '#5b9bd5', '#4caf8e', '#e0a043', '#d9706b', '#7a8b99']
// mật khẩu tạm 12 ký tự, bỏ các ký tự dễ nhầm (0/O, 1/l/I)
const tempPassword = (): string => Array.from(crypto.randomBytes(12), (b) => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 56]).join('')
const row = { id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role, title: schema.users.title, color: schema.users.color, active: schema.users.active, createdAt: schema.users.createdAt }

/** Còn ít nhất một quản trị đang hoạt động ngoài người này không */
async function otherAdmins(orgId: string, exceptId: string): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users)
    .where(and(eq(schema.users.orgId, orgId), eq(schema.users.role, 'admin'), eq(schema.users.active, true), ne(schema.users.id, exceptId)))
  return r.n
}

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/users', { preHandler: requireAdmin }, async (req) =>
    db.select(row).from(schema.users).where(eq(schema.users.orgId, me(req).orgId)).orderBy(asc(schema.users.name)))

  app.post('/users', {
    preHandler: requireAdmin,
    schema: { body: z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().toLowerCase().email().max(200), role: z.enum(ROLES), title: z.string().trim().max(120).default('') }) },
  }, async (req) => {
    const u = me(req)
    const b = req.body
    const [dup] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, b.email))
    if (dup) throw conflict('Email này đã có tài khoản')
    const temp = tempPassword()
    const [n] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(eq(schema.users.orgId, u.orgId))
    const [created] = await db.insert(schema.users).values({ orgId: u.orgId, name: b.name, email: b.email, role: b.role, title: b.title, color: COLORS[n.n % COLORS.length], passwordHash: await hashPassword(temp) }).returning(row)
    await audit(u, 'user.create', created.id, { role: b.role })
    // mật khẩu tạm chỉ trả về một lần để quản trị gửi cho người dùng
    return { ...created, tempPassword: temp }
  })

  app.patch('/users/:id', {
    preHandler: requireAdmin,
    schema: { params: z.object({ id: z.string().max(64) }), body: z.object({ role: z.enum(ROLES).optional(), active: z.boolean().optional(), name: z.string().trim().min(2).max(120).optional(), title: z.string().trim().max(120).optional() }) },
  }, async (req) => {
    const u = me(req)
    const t = must((await db.select().from(schema.users).where(and(eq(schema.users.id, req.params.id), eq(schema.users.orgId, u.orgId))))[0], 'Người dùng')
    const b = req.body
    const demote = b.role !== undefined && b.role !== 'admin' && t.role === 'admin'
    const disable = b.active === false && t.active
    if (t.id === u.id && (demote || disable)) throw badRequest('Không tự đổi vai hoặc khóa tài khoản của chính mình')
    if (t.role === 'admin' && (demote || disable) && !(await otherAdmins(u.orgId, t.id))) throw badRequest('Cần giữ ít nhất một quản trị đang hoạt động')
    const [r] = await db.update(schema.users).set(b).where(eq(schema.users.id, t.id)).returning(row)
    // khóa tài khoản hoặc đổi vai: đăng xuất mọi phiên để quyền mới có hiệu lực ngay
    if (disable || (b.role !== undefined && b.role !== t.role)) await db.delete(schema.sessions).where(eq(schema.sessions.userId, t.id))
    // không còn là reviewer thì bỏ các lời mời review đang có
    if (b.role !== undefined && b.role !== 'reviewer' && t.role === 'reviewer') await db.delete(schema.kitReviews).where(eq(schema.kitReviews.reviewerId, t.id))
    await audit(u, 'user.update', t.id, Object.fromEntries(Object.entries(b).filter(([k]) => k === 'role' || k === 'active')))
    return r
  })

  app.post('/users/:id/reset-password', { preHandler: requireAdmin, schema: { params: z.object({ id: z.string().max(64) }) } }, async (req) => {
    const u = me(req)
    const t = must((await db.select().from(schema.users).where(and(eq(schema.users.id, req.params.id), eq(schema.users.orgId, u.orgId))))[0], 'Người dùng')
    const temp = tempPassword()
    await db.update(schema.users).set({ passwordHash: await hashPassword(temp) }).where(eq(schema.users.id, t.id))
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, t.id))
    await audit(u, 'user.reset_password', t.id)
    return { tempPassword: temp }
  })

  // Hạn mức AI: người soạn xem được mức đã dùng, chỉ quản trị đổi hạn mức
  app.get('/settings/ai', { preHandler: requireEditor }, async (req) => {
    const u = me(req)
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0)
    const [[org], byFeature, used] = await Promise.all([
      db.select().from(schema.orgs).where(eq(schema.orgs.id, u.orgId)),
      db.select({ feature: schema.aiUsage.feature, tokens: sql<number>`sum(${schema.aiUsage.inputTokens} + ${schema.aiUsage.outputTokens})::int`, calls: sql<number>`count(*)::int` })
        .from(schema.aiUsage).where(and(eq(schema.aiUsage.orgId, u.orgId), gte(schema.aiUsage.createdAt, start))).groupBy(schema.aiUsage.feature),
      monthUsage(u.orgId),
    ])
    return { quota: org.aiMonthlyTokens, used, byFeature }
  })

  app.patch('/settings/ai', { preHandler: requireAdmin, schema: { body: z.object({ quota: z.number().int().min(10_000).max(1_000_000_000) }) } }, async (req) => {
    const u = me(req)
    await db.update(schema.orgs).set({ aiMonthlyTokens: req.body.quota }).where(eq(schema.orgs.id, u.orgId))
    await audit(u, 'settings.ai_quota', u.orgId, { quota: req.body.quota })
    return { ok: true }
  })

  app.get('/audit', { preHandler: requireAdmin }, async (req) => {
    const u = me(req)
    return db.select({ id: schema.auditLogs.id, action: schema.auditLogs.action, target: schema.auditLogs.target, meta: schema.auditLogs.meta, at: schema.auditLogs.createdAt, who: schema.users.name })
      .from(schema.auditLogs).leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.userId))
      .where(eq(schema.auditLogs.orgId, u.orgId)).orderBy(sql`${schema.auditLogs.createdAt} desc`).limit(100)
  })
}
