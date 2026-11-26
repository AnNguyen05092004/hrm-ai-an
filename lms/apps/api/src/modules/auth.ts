import { z } from 'zod'
import { eq, inArray } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../db/client.js'
import { COOKIE, checkPassword, createSession, destroySession, me, requireUser, setSessionCookie } from '../lib/auth.js'
import { AppError, notFound } from '../lib/errors.js'
import { demoMode } from '../env.js'
import { DEMO_ACCOUNTS } from '../db/demo-accounts.js'

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: { body: z.object({ email: z.string().email(), password: z.string().min(1).max(200) }) },
  }, async (req, reply) => {
    const [u] = await db.select().from(schema.users).where(eq(schema.users.email, req.body.email.toLowerCase()))
    const ok = u?.passwordHash && u.active ? await checkPassword(req.body.password, u.passwordHash) : false
    if (!u || !ok) throw new AppError(401, 'bad_credentials', 'Email hoặc mật khẩu không đúng')
    const s = await createSession(u.id)
    setSessionCookie(reply, s.token, s.expiresAt)
    return { id: u.id }
  })

  // ----- Bản demo: vào thẳng và đổi vai không cần mật khẩu (chỉ các tài khoản mẫu, tắt ở production) -----
  const DEMO = DEMO_ACCOUNTS
  const demoUsers = async () => {
    if (!demoMode()) throw notFound('Không có bản demo')
    const rows = await db.select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, title: schema.users.title, role: schema.users.role, color: schema.users.color, active: schema.users.active })
      .from(schema.users).where(inArray(schema.users.email, DEMO.map((d) => d.email)))
    return DEMO.flatMap((d) => { const u = rows.find((r) => r.email === d.email && r.active); return u ? [{ ...u, label: d.label }] : [] })
  }
  app.get('/demo', async () => (await demoUsers()).map(({ active: _a, ...u }) => u))
  app.post('/demo', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: { body: z.object({ email: z.string().email().optional() }) },
  }, async (req, reply) => {
    const list = await demoUsers()
    const u = req.body.email ? list.find((x) => x.email === req.body.email) : list[0]
    if (!u) throw new AppError(400, 'not_demo', 'Tài khoản này không thuộc bản demo')
    const old = req.cookies[COOKIE]
    if (old) await destroySession(old)
    const s = await createSession(u.id)
    setSessionCookie(reply, s.token, s.expiresAt)
    return { id: u.id, role: u.role }
  })

  app.post('/logout', async (req, reply) => {
    const t = req.cookies[COOKIE]
    if (t) await destroySession(t)
    reply.clearCookie(COOKIE, { path: '/' })
    return { ok: true }
  })

  app.get('/me', { preHandler: requireUser }, async (req) => {
    const u = me(req)
    const [row] = await db.select({
      id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role,
      title: schema.users.title, color: schema.users.color, orgName: schema.orgs.name,
    }).from(schema.users).innerJoin(schema.orgs, eq(schema.orgs.id, schema.users.orgId)).where(eq(schema.users.id, u.id))
    return { ...row, demo: demoMode() }
  })
}
