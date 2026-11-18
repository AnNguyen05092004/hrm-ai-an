import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../db/client.js'
import { me, requireUser } from '../lib/auth.js'
import { must } from '../lib/errors.js'

export const miscRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireUser)

  app.get('/jobs/:id', { schema: { params: z.object({ id: z.string() }) } }, async (req) => {
    const u = me(req)
    const j = must((await db.select().from(schema.jobs).where(and(eq(schema.jobs.id, req.params.id), eq(schema.jobs.orgId, u.orgId))))[0], 'Việc')
    return { id: j.id, kind: j.kind, status: j.status, progress: j.progress, message: j.message, error: j.error, result: j.result }
  })

  app.get('/skills', async (req) => db.select({ id: schema.skills.id, name: schema.skills.name, group: schema.skills.group }).from(schema.skills).where(eq(schema.skills.orgId, me(req).orgId)).orderBy(schema.skills.group, schema.skills.name))
}
