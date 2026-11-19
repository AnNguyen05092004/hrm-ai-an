import crypto from 'node:crypto'
import { z } from 'zod'
import { and, desc, eq, inArray } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { hashPassword, me, requireAuthor } from '../../lib/auth.js'
import { badRequest, conflict, must } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { initials } from '../../lib/text.js'
import { buildModel, trainingStats } from './model.js'
import { advisorContext, askAdvisor, assessEvidence, suggestKpiSkills } from './ai.js'

const ID = z.object({ id: z.string() })
const kpiSkill = z.object({ skillId: z.string(), why: z.string().max(300).optional(), boost: z.number().int().min(0).max(3).optional(), positions: z.array(z.string()).max(20).optional() })
const kpiFields = {
  name: z.string().trim().min(3).max(200), metric: z.string().max(100), current: z.string().max(60),
  target: z.string().max(60), due: z.string().max(30), skills: z.array(kpiSkill).max(6), active: z.boolean(),
}
const kpiBody = z.object({
  ...kpiFields, metric: kpiFields.metric.default(''), current: kpiFields.current.default(''), target: kpiFields.target.default(''),
  due: kpiFields.due.default(''), skills: kpiFields.skills.default([]), active: kpiFields.active.default(true),
})
// Sửa KPI: không có giá trị mặc định, nếu không thì bật/tắt KPI sẽ ghi đè kỹ năng, chỉ số, mục tiêu về rỗng (zod 4 vẫn điền default trong .partial())
const kpiPatch = z.object(kpiFields).partial()
const COLORS = ['#5b7bd5', '#3a9d8f', '#e07a3f', '#c2577a', '#6aa84f', '#7d5ba6', '#c98a2e', '#4f9bd1']

export const workforceRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireAuthor)

  app.get('/', async (req) => buildModel(me(req).orgId))

  // ---------- KPI ----------
  const validSkills = async (orgId: string, ids: string[]) => {
    if (!ids.length) return
    const ok = await db.select({ id: schema.skills.id }).from(schema.skills).where(and(eq(schema.skills.orgId, orgId), inArray(schema.skills.id, ids)))
    if (ok.length !== new Set(ids).size) throw badRequest('Có kỹ năng không tồn tại')
  }
  app.post('/kpis', { schema: { body: kpiBody } }, async (req) => {
    const u = me(req)
    await validSkills(u.orgId, req.body.skills.map((s) => s.skillId))
    const [k] = await db.insert(schema.kpis).values({ ...req.body, orgId: u.orgId }).returning()
    await audit(u, 'kpi.create', k.id, { name: k.name })
    return k
  })
  app.patch('/kpis/:id', { schema: { params: ID, body: kpiPatch } }, async (req) => {
    const u = me(req)
    if (req.body.skills) await validSkills(u.orgId, req.body.skills.map((s) => s.skillId))
    const [k] = await db.update(schema.kpis).set(req.body).where(and(eq(schema.kpis.id, req.params.id), eq(schema.kpis.orgId, u.orgId))).returning()
    must(k, 'KPI')
    await audit(u, 'kpi.update', k.id, { name: k.name, fields: Object.keys(req.body) })
    return k
  })
  app.delete('/kpis/:id', { schema: { params: ID } }, async (req) => {
    const u = me(req)
    await db.delete(schema.kpis).where(and(eq(schema.kpis.id, req.params.id), eq(schema.kpis.orgId, u.orgId)))
    return { ok: true }
  })
  app.post('/kpis/suggest-skills', { schema: { body: z.object({ name: z.string().trim().min(3).max(200), metric: z.string().max(100).default(''), target: z.string().max(60).default('') }) } }, async (req) => {
    const u = me(req)
    const [skills, positions] = await Promise.all([
      db.select({ id: schema.skills.id, name: schema.skills.name }).from(schema.skills).where(eq(schema.skills.orgId, u.orgId)),
      db.select({ id: schema.positions.id, name: schema.positions.name }).from(schema.positions).where(eq(schema.positions.orgId, u.orgId)),
    ])
    const r = await suggestKpiSkills(u.orgId, req.body, skills, positions)
    const posIds = new Set(positions.map((p) => p.id))
    return { skills: r.skills.filter((s) => skills.some((k) => k.id === s.skillId)).map((s) => ({ ...s, boost: Math.max(0, Math.min(3, s.boost)), positions: s.positions.filter((p) => posIds.has(p)) })) }
  })

  // ---------- Thành viên ----------
  app.post('/members', {
    schema: { body: z.object({ name: z.string().trim().min(2).max(100), email: z.string().email(), deptId: z.string(), positionId: z.string(), lv: z.record(z.string(), z.number().int().min(0).max(3)).default({}) }) },
  }, async (req) => {
    const u = me(req)
    const email = req.body.email.toLowerCase()
    const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email))
    if (exists) throw conflict('Email đã có tài khoản')
    const [pos] = await db.select().from(schema.positions).where(and(eq(schema.positions.id, req.body.positionId), eq(schema.positions.orgId, u.orgId)))
    const [dept] = await db.select().from(schema.departments).where(and(eq(schema.departments.id, req.body.deptId), eq(schema.departments.orgId, u.orgId)))
    if (!pos || !dept) throw badRequest('Vị trí hoặc bộ phận không hợp lệ')
    await validSkills(u.orgId, Object.keys(req.body.lv))
    // mật khẩu tạm hiện một lần cho người quản lý; người dùng đổi sau khi đăng nhập
    const temp = crypto.randomBytes(6).toString('base64url')
    const [p] = await db.insert(schema.users).values({
      orgId: u.orgId, email, name: req.body.name, passwordHash: await hashPassword(temp), role: 'learner', title: pos.name,
      deptId: dept.id, positionId: pos.id, managerId: u.id, color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }).returning()
    const lv = Object.entries(req.body.lv).filter(([, v]) => v > 0)
    if (lv.length) await db.insert(schema.userSkills).values(lv.map(([skillId, level]) => ({ userId: p.id, skillId, level, source: 'manager' as const })))
    await audit(u, 'member.create', p.id, { email })
    return { id: p.id, initials: initials(p.name), tempPassword: temp }
  })

  app.patch('/members/:id/skills', { schema: { params: ID, body: z.object({ skillId: z.string(), level: z.number().int().min(0).max(3), reason: z.string().max(200).default('Quản lý cập nhật') }) } }, async (req) => {
    const u = me(req)
    const [p] = await db.select().from(schema.users).where(and(eq(schema.users.id, req.params.id), eq(schema.users.orgId, u.orgId)))
    must(p, 'Nhân viên')
    await validSkills(u.orgId, [req.body.skillId])
    const [cur] = await db.select().from(schema.userSkills).where(and(eq(schema.userSkills.userId, p.id), eq(schema.userSkills.skillId, req.body.skillId)))
    const from = cur?.level ?? 0
    if (req.body.level === 0) await db.delete(schema.userSkills).where(and(eq(schema.userSkills.userId, p.id), eq(schema.userSkills.skillId, req.body.skillId)))
    else await db.insert(schema.userSkills).values({ userId: p.id, skillId: req.body.skillId, level: req.body.level, source: 'manager' })
      .onConflictDoUpdate({ target: [schema.userSkills.userId, schema.userSkills.skillId], set: { level: req.body.level, source: 'manager', updatedAt: new Date() } })
    if (from !== req.body.level) await db.insert(schema.skillEvents).values({ userId: p.id, skillId: req.body.skillId, from, to: req.body.level, reason: req.body.reason, byUserId: u.id })
    return { ok: true }
  })

  app.get('/members/:id', { schema: { params: ID } }, async (req) => {
    const u = me(req)
    const [p] = await db.select().from(schema.users).where(and(eq(schema.users.id, req.params.id), eq(schema.users.orgId, u.orgId)))
    must(p, 'Nhân viên')
    const [events, learning, attempts] = await Promise.all([
      db.select().from(schema.skillEvents).where(eq(schema.skillEvents.userId, p.id)).orderBy(desc(schema.skillEvents.createdAt)).limit(20),
      db.select({ id: schema.artifacts.id, title: schema.artifacts.title, type: schema.artifacts.type, due: schema.assignments.due, reason: schema.assignments.reason, percent: schema.progress.percent, lastAt: schema.progress.lastAt })
        .from(schema.assignments).innerJoin(schema.artifacts, eq(schema.artifacts.id, schema.assignments.artifactId))
        .leftJoin(schema.progress, and(eq(schema.progress.artifactId, schema.assignments.artifactId), eq(schema.progress.userId, schema.assignments.userId)))
        .where(eq(schema.assignments.userId, p.id)),
      db.select({ id: schema.attempts.id, title: schema.artifacts.title, status: schema.attempts.status, score: schema.attempts.score, mode: schema.attempts.mode, at: schema.attempts.submittedAt })
        .from(schema.attempts).innerJoin(schema.artifacts, eq(schema.artifacts.id, schema.attempts.artifactId)).where(eq(schema.attempts.userId, p.id)).orderBy(desc(schema.attempts.startedAt)).limit(10),
    ])
    return { events, learning, attempts }
  })

  // ---------- Giao khóa theo kế hoạch ----------
  app.post('/assign', {
    schema: { body: z.object({ skillId: z.string(), userIds: z.array(z.string()).min(1).max(200), due: z.string().date().optional(), kpiId: z.string().optional() }) },
  }, async (req) => {
    const u = me(req)
    const m = await buildModel(u.orgId)
    const r = m.recs.find((x) => x.skillId === req.body.skillId)
    const skillName = m.skills.find((s) => s.id === req.body.skillId)?.name ?? req.body.skillId
    const courses = r?.courses ?? []
    if (!courses.length) throw badRequest('Kỹ năng này chưa có khóa đã xuất bản. Tạo khóa bằng AI trước.')
    const valid = m.team.filter((p) => req.body.userIds.includes(p.id)).map((p) => p.id)
    const kpi = m.kpis.find((k) => k.id === req.body.kpiId)
    const due = req.body.due ? new Date(`${req.body.due}T23:59:00+07:00`) : null
    const reason = kpi ? `Kế hoạch năng lực · ${kpi.name}` : `Kế hoạch năng lực · ${skillName}`
    const rows = await db.insert(schema.assignments).values(courses.flatMap((c) => valid.map((userId) => ({
      orgId: u.orgId, artifactId: c.id, userId, due, reason, kpiId: req.body.kpiId, skillId: req.body.skillId, assignedBy: u.id,
    })))).onConflictDoNothing().returning({ id: schema.assignments.id })
    await audit(u, 'plan.assign', req.body.skillId, { people: valid.length, courses: courses.length })
    return { created: rows.length, people: valid.length, courses: courses.length }
  })

  // ---------- Đánh giá năng lực từ bằng chứng ----------
  app.get('/evidence', async (req) => {
    const u = me(req)
    return db.select({ e: schema.evidence, name: schema.users.name, title: schema.users.title, color: schema.users.color }).from(schema.evidence)
      .innerJoin(schema.users, eq(schema.users.id, schema.evidence.userId)).where(eq(schema.evidence.orgId, u.orgId)).orderBy(desc(schema.evidence.createdAt))
  })
  app.post('/evidence', {
    schema: { body: z.object({ userId: z.string(), skillId: z.string(), kind: z.enum(['code', 'work', 'review', 'exam']), title: z.string().trim().min(3).max(200), text: z.string().trim().min(10).max(6000) }) },
  }, async (req) => {
    const u = me(req)
    const [p] = await db.select().from(schema.users).where(and(eq(schema.users.id, req.body.userId), eq(schema.users.orgId, u.orgId)))
    must(p, 'Nhân viên')
    const [sk] = await db.select().from(schema.skills).where(and(eq(schema.skills.id, req.body.skillId), eq(schema.skills.orgId, u.orgId)))
    must(sk, 'Kỹ năng')
    const [cur] = await db.select().from(schema.userSkills).where(and(eq(schema.userSkills.userId, p.id), eq(schema.userSkills.skillId, sk.id)))
    const r = await assessEvidence(u.orgId, sk.name, cur?.level ?? 0, `${req.body.title}\n${req.body.text}`)
    const [e] = await db.insert(schema.evidence).values({ ...req.body, orgId: u.orgId, proposedLevel: Math.max(0, Math.min(3, r.level)), confidence: r.confidence, rationale: r.rationale }).returning()
    return e
  })
  app.post('/evidence/:id/:decision', { schema: { params: z.object({ id: z.string(), decision: z.enum(['accept', 'reject']) }) } }, async (req) => {
    const u = me(req)
    const [e] = await db.select().from(schema.evidence).where(and(eq(schema.evidence.id, req.params.id), eq(schema.evidence.orgId, u.orgId)))
    must(e, 'Bằng chứng')
    if (e.status !== 'pending') throw conflict('Đã xử lý')
    await db.update(schema.evidence).set({ status: req.params.decision === 'accept' ? 'accepted' : 'rejected' }).where(eq(schema.evidence.id, e.id))
    if (req.params.decision === 'accept' && e.proposedLevel != null) {
      const [cur] = await db.select().from(schema.userSkills).where(and(eq(schema.userSkills.userId, e.userId), eq(schema.userSkills.skillId, e.skillId)))
      const from = cur?.level ?? 0
      if (e.proposedLevel !== from) {
        await db.insert(schema.userSkills).values({ userId: e.userId, skillId: e.skillId, level: e.proposedLevel, source: 'evidence' })
          .onConflictDoUpdate({ target: [schema.userSkills.userId, schema.userSkills.skillId], set: { level: e.proposedLevel, source: 'evidence', updatedAt: new Date() } })
        await db.insert(schema.skillEvents).values({ userId: e.userId, skillId: e.skillId, from, to: e.proposedLevel, reason: `Đánh giá từ bằng chứng: ${e.title}`, refId: e.id, byUserId: u.id })
      }
    }
    await audit(u, `evidence.${req.params.decision}`, e.id)
    return { ok: true }
  })

  // ---------- Tác động lên KPI ----------
  app.get('/impact', async (req) => {
    const u = me(req)
    const kpis = await db.select().from(schema.kpis).where(and(eq(schema.kpis.orgId, u.orgId), eq(schema.kpis.active, true)))
    const total = await trainingStats(u.orgId)
    const per = await Promise.all(kpis.map(async (k) => ({ id: k.id, name: k.name, metric: k.metric, target: k.target, current: k.current, trend: k.trend, stats: await trainingStats(u.orgId, k.id) })))
    return { total, kpis: per }
  })
  app.post('/kpis/:id/trend', { schema: { params: ID, body: z.object({ m: z.string().min(1).max(20), v: z.number() }) } }, async (req) => {
    const u = me(req)
    const [k] = await db.select().from(schema.kpis).where(and(eq(schema.kpis.id, req.params.id), eq(schema.kpis.orgId, u.orgId)))
    must(k, 'KPI')
    const trend = [...k.trend.filter((t) => t.m !== req.body.m), req.body].slice(-24)
    await db.update(schema.kpis).set({ trend, current: String(req.body.v) }).where(eq(schema.kpis.id, k.id))
    return { trend }
  })

  // ---------- Trợ lý giám đốc ----------
  app.post('/advisor', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: { body: z.object({ question: z.string().trim().min(2).max(1000), history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(3000) })).max(10).default([]) }) },
  }, async (req) => {
    const u = me(req)
    const m = await buildModel(u.orgId)
    const learning = await db.select({ userId: schema.users.id, name: schema.users.name, title: schema.artifacts.title, percent: schema.progress.percent, due: schema.assignments.due, lastAt: schema.progress.lastAt })
      .from(schema.assignments).innerJoin(schema.users, eq(schema.users.id, schema.assignments.userId)).innerJoin(schema.artifacts, eq(schema.artifacts.id, schema.assignments.artifactId))
      .leftJoin(schema.progress, and(eq(schema.progress.userId, schema.assignments.userId), eq(schema.progress.artifactId, schema.assignments.artifactId)))
      .where(eq(schema.assignments.orgId, u.orgId))
    const r = await askAdvisor(u.orgId, advisorContext(m, learning.map((l) => ({ ...l, percent: l.percent ?? 0 }))), req.body.question, req.body.history)
    // chỉ giữ hành động trỏ tới dữ liệu có thật
    const ids = new Set([...m.team.map((p) => p.id), ...m.depts.map((d) => d.id), ...m.skills.map((s) => s.id), 'plan', 'team', 'assess', 'impact'])
    return { ...r, actions: r.actions.filter((a) => ids.has(a.target)).slice(0, 3) }
  })
}
