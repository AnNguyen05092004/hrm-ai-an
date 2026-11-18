import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { me, requireAuthor } from '../../lib/auth.js'
import { badRequest } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { initials } from '../../lib/text.js'
import { getArtifact } from '../artifacts/routes.js'

export const peopleRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireAuthor)

  app.get('/people', async (req) => {
    const u = me(req)
    const [people, depts, positions, skills] = await Promise.all([
      db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role, title: schema.users.title, color: schema.users.color, deptId: schema.users.deptId, positionId: schema.users.positionId, joinedAt: schema.users.joinedAt, deptName: schema.departments.name })
        .from(schema.users).leftJoin(schema.departments, eq(schema.departments.id, schema.users.deptId))
        .where(and(eq(schema.users.orgId, u.orgId), eq(schema.users.active, true))).orderBy(schema.departments.sort, schema.users.name),
      db.select().from(schema.departments).where(eq(schema.departments.orgId, u.orgId)).orderBy(schema.departments.sort),
      db.select().from(schema.positions).where(eq(schema.positions.orgId, u.orgId)),
      db.select({ userId: schema.userSkills.userId, skillId: schema.userSkills.skillId, level: schema.userSkills.level, source: schema.userSkills.source })
        .from(schema.userSkills).innerJoin(schema.users, eq(schema.users.id, schema.userSkills.userId)).where(eq(schema.users.orgId, u.orgId)),
    ])
    const lv = new Map<string, Record<string, number>>()
    for (const s of skills) lv.set(s.userId, { ...(lv.get(s.userId) ?? {}), [s.skillId]: s.level })
    return { people: people.map((p) => ({ ...p, initials: initials(p.name), lv: lv.get(p.id) ?? {} })), depts, positions }
  })

  app.get('/assignments', { schema: { querystring: z.object({ artifactId: z.string().optional() }) } }, async (req) => {
    const u = me(req)
    const where = [eq(schema.assignments.orgId, u.orgId)]
    if (req.query.artifactId) where.push(eq(schema.assignments.artifactId, req.query.artifactId))
    return db.select().from(schema.assignments).where(and(...where))
  })

  app.post('/assignments', {
    schema: { body: z.object({
      artifactId: z.string(), userIds: z.array(z.string()).min(1).max(500), due: z.string().date().optional(),
      reason: z.string().max(200).default(''), kpiId: z.string().optional(), skillId: z.string().optional(),
    }) },
  }, async (req) => {
    const u = me(req)
    const a = await getArtifact(u.orgId, req.body.artifactId)
    if (a.status !== 'published') throw badRequest('Chỉ giao được tài liệu đã xuất bản')
    const valid = (await db.select({ id: schema.users.id }).from(schema.users).where(and(eq(schema.users.orgId, u.orgId), inArray(schema.users.id, req.body.userIds)))).map((x) => x.id)
    const due = req.body.due ? new Date(`${req.body.due}T23:59:00+07:00`) : null
    const rows = await db.insert(schema.assignments).values(valid.map((userId) => ({
      orgId: u.orgId, artifactId: a.id, userId, due, reason: req.body.reason, kpiId: req.body.kpiId, skillId: req.body.skillId, assignedBy: u.id,
    }))).onConflictDoNothing().returning({ id: schema.assignments.id })
    await audit(u, 'assignment.create', a.id, { users: rows.length })
    return { created: rows.length, skipped: valid.length - rows.length }
  })

  app.delete('/assignments/:id', { schema: { params: z.object({ id: z.string() }) } }, async (req) => {
    const u = me(req)
    await db.delete(schema.assignments).where(and(eq(schema.assignments.id, req.params.id), eq(schema.assignments.orgId, u.orgId)))
    return { ok: true }
  })
}
