import { z } from 'zod'
import { eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../db/client.js'
import { COOKIE, checkPassword, createSession, destroySession, me, requireUser, setSessionCookie } from '../lib/auth.js'
import { AppError } from '../lib/errors.js'

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
      title: schema.users.title, color: schema.users.color, orgName: schema.orgs.name, deptId: schema.users.deptId,
    }).from(schema.users).innerJoin(schema.orgs, eq(schema.orgs.id, schema.users.orgId)).where(eq(schema.users.id, u.id))
    return row
  })
}
