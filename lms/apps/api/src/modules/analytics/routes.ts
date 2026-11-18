import { z } from 'zod'
import { and, eq, gte, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { me, requireAuthor } from '../../lib/auth.js'
import { monthUsage } from '../../lib/ai/index.js'
import { audit } from '../../lib/audit.js'
import { artifactMeta } from '../kits/service.js'
import { unanswered } from '../tutor/tutor.js'

export const analyticsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireAuthor)

  app.get('/analytics', async (req) => {
    const u = me(req)
    const [arts, asg, prog, atts, tq, qStats] = await Promise.all([
      db.select().from(schema.artifacts).where(eq(schema.artifacts.orgId, u.orgId)),
      db.select({ artifactId: schema.assignments.artifactId, n: sql<number>`count(*)::int`, late: sql<number>`count(*) filter (where ${schema.assignments.due} < now())::int` }).from(schema.assignments).where(eq(schema.assignments.orgId, u.orgId)).groupBy(schema.assignments.artifactId),
      db.select({ artifactId: schema.progress.artifactId, started: sql<number>`count(*)::int`, done: sql<number>`count(*) filter (where ${schema.progress.percent} >= 100)::int`, sessions: sql<number>`sum(${schema.progress.sessions})::int` })
        .from(schema.progress).innerJoin(schema.users, eq(schema.users.id, schema.progress.userId)).where(and(eq(schema.users.orgId, u.orgId), eq(schema.users.role, 'learner'))).groupBy(schema.progress.artifactId),
      db.select({ artifactId: schema.attempts.artifactId, n: sql<number>`count(*)::int`, passed: sql<number>`count(*) filter (where ${schema.attempts.status} = 'passed')::int`, avg: sql<number>`avg(${schema.attempts.score}) filter (where ${schema.attempts.status} in ('passed','failed'))` })
        .from(schema.attempts).where(and(eq(schema.attempts.orgId, u.orgId), sql`${schema.attempts.status} <> 'in_progress'`)).groupBy(schema.attempts.artifactId),
      db.select({ artifactId: schema.tutorMessages.artifactId, n: sql<number>`count(*)::int`, missed: sql<number>`count(*) filter (where not ${schema.tutorMessages.found})::int` }).from(schema.tutorMessages).where(eq(schema.tutorMessages.orgId, u.orgId)).groupBy(schema.tutorMessages.artifactId),
      // Câu bị sai nhiều bất thường (biên #4): tỷ lệ sai ≥ 60% với ít nhất 3 lượt
      db.execute<{ artifact_id: string; qid: string; q: string; n: number; wrong: number }>(sql`
        select a.artifact_id, q->>'id' as qid, q->>'q' as q, count(*)::int as n,
          count(*) filter (where coalesce((a.grades->(q->>'id')->>'final')::float, (a.grades->(q->>'id')->>'score')::float, 0) < 1)::int as wrong
        from attempts a, jsonb_array_elements(a.questions) q
        where a.org_id = ${u.orgId} and a.status in ('passed','failed','grading')
        group by 1, 2, 3 having count(*) >= 3`),
    ])
    const by = <T extends { artifactId: string }>(xs: T[], id: string) => xs.find((x) => x.artifactId === id)
    const rows = arts.map((a) => {
      const p = by(prog, a.id), t = by(atts, a.id), g = by(asg, a.id), m = by(tq, a.id)
      return { ...artifactMeta(a), assigned: g?.n ?? 0, started: p?.started ?? 0, completed: p?.done ?? 0, sessions: p?.sessions ?? 0, attempts: t?.n ?? 0, passed: t?.passed ?? 0, avgScore: t?.avg == null ? null : Math.round(Number(t.avg)), tutorAsked: m?.n ?? 0, tutorMissed: m?.missed ?? 0 }
    })
    const hard = qStats.filter((x) => x.wrong / x.n >= 0.6).map((x) => ({ artifactId: x.artifact_id, title: arts.find((a) => a.id === x.artifact_id)?.title, q: x.q, n: x.n, wrong: x.wrong }))
    return { rows, unanswered: await unanswered(u.orgId), hardQuestions: hard }
  })

  app.get('/settings/ai', async (req) => {
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

  app.patch('/settings/ai', { schema: { body: z.object({ quota: z.number().int().min(10_000).max(1_000_000_000) }) } }, async (req) => {
    const u = me(req)
    await db.update(schema.orgs).set({ aiMonthlyTokens: req.body.quota }).where(eq(schema.orgs.id, u.orgId))
    await audit(u, 'settings.ai_quota', u.orgId, { quota: req.body.quota })
    return { ok: true }
  })

  app.get('/audit', async (req) => {
    const u = me(req)
    return db.select({ id: schema.auditLogs.id, action: schema.auditLogs.action, target: schema.auditLogs.target, meta: schema.auditLogs.meta, at: schema.auditLogs.createdAt, who: schema.users.name })
      .from(schema.auditLogs).leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.userId))
      .where(eq(schema.auditLogs.orgId, u.orgId)).orderBy(sql`${schema.auditLogs.createdAt} desc`).limit(100)
  })
}
