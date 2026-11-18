import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { me, requireAuthor, requireUser } from '../../lib/auth.js'
import { viewable } from '../learn/access.js'
import { askTutor, unanswered } from './tutor.js'

export const tutorRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post('/:id/ask', {
    preHandler: requireUser,
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({ question: z.string().trim().min(1).max(1000), history: z.array(z.object({ role: z.enum(['user', 'tutor']), text: z.string().max(2000) })).max(10).default([]) }),
    },
  }, async (req) => {
    const u = me(req)
    const a = await viewable(u, req.params.id)
    return askTutor(u, a.id, req.body.question, req.body.history)
  })

  app.get('/unanswered', { preHandler: requireAuthor }, async (req) => unanswered(me(req).orgId))

  app.post('/unanswered/:id/resolve', { preHandler: requireAuthor, schema: { params: z.object({ id: z.string() }) } }, async (req) => {
    await db.update(schema.tutorMessages).set({ resolved: true }).where(and(eq(schema.tutorMessages.id, req.params.id), eq(schema.tutorMessages.orgId, me(req).orgId)))
    return { ok: true }
  })
}
