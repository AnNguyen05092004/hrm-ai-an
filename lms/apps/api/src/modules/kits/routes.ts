import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { me, requireEditor } from '../../lib/auth.js'
import { badRequest, conflict } from '../../lib/errors.js'
import { enqueue } from '../../lib/jobs.js'
import { audit } from '../../lib/audit.js'
import { GEN_TYPES, suggestPlanItem } from './ai.js'
import { sourceChanges } from './source-changes.js'
import { kitPublishRoutes } from './publish.js'
import { scormRoutes } from './scorm.js'
import { examExportRoutes } from './qti.js'
import { briefOf, createArtifact, getKit, kitDto, listKits, patchKit, type PlanItem } from './service.js'
import { MASTER_TITLE, masterFromQr, masterOf, requireLocked } from './master.js'

const P = z.object({ id: z.string() })
// giao diện khóa: màu nhấn và bộ font
const Theme = z.object({ accent: z.string().regex(/^#[0-9a-f]{6}$/i), font: z.enum(['classic', 'modern', 'clean']) })

async function assertSkill(orgId: string, id: string): Promise<void> {
  const [s] = await db.select({ id: schema.skills.id }).from(schema.skills).where(and(eq(schema.skills.id, id), eq(schema.skills.orgId, orgId)))
  if (!s) throw badRequest('Kỹ năng không tồn tại')
}
const planItem = z.object({ type: z.enum(GEN_TYPES), title: z.string().max(200), summary: z.string().max(2000), outline: z.record(z.string(), z.unknown()).optional() })

export const kitRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireEditor)
  await app.register(kitPublishRoutes)
  await app.register(scormRoutes)
  await app.register(examExportRoutes)

  app.get('/', async (req) => listKits(me(req).orgId))
  app.get('/:id', { schema: { params: P } }, async (req) => kitDto(await getKit(me(req).orgId, req.params.id)))

  // Tạo bộ từ mô tả mục tiêu + tài liệu nguồn: AI soạn chi tiết ở job nền
  app.post('/', {
    schema: { body: z.object({
      goal: z.string().trim().min(5).max(5000), sourceIds: z.array(z.string()).max(20).default([]),
      skillId: z.string().optional(), level: z.number().int().min(1).max(3).optional(),
    }) },
  }, async (req) => {
    const u = me(req)
    if (req.body.skillId) await assertSkill(u.orgId, req.body.skillId)
    const ids = req.body.sourceIds.length
      ? (await db.select({ id: schema.sources.id }).from(schema.sources).where(and(eq(schema.sources.orgId, u.orgId), inArray(schema.sources.id, req.body.sourceIds)))).map((s) => s.id)
      : []
    const [k] = await db.insert(schema.kits).values({
      orgId: u.orgId, title: req.body.goal.slice(0, 60), goal: req.body.goal, sourceIds: ids, createdBy: u.id,
      skillId: req.body.skillId ?? null, level: req.body.level ?? null,
      details: { goalText: req.body.goal, plan: [] },
    }).returning()
    const job = await enqueue(u.orgId, 'kit.draft', { kitId: k.id }, u.id)
    await patchKit(k.id, {}, { job: job.id })
    await audit(u, 'kit.create', k.id)
    return { id: k.id, jobId: job.id }
  })

  app.patch('/:id', {
    schema: { params: P, body: z.object({
      title: z.string().max(200).optional(), desc: z.string().max(3000).optional(), audience: z.string().max(3000).optional(),
      goals: z.array(z.string().max(500)).max(20).optional(), takeaways: z.array(z.string().max(500)).max(20).optional(), metrics: z.array(z.string().max(500)).max(20).optional(),
      practice: z.enum(['less', 'balanced', 'more']).optional(), delivery: z.enum(['self', 'live', 'both']).optional(),
      skill: z.string().nullable().optional(), level: z.number().int().min(1).max(3).optional(),
      plan: z.array(planItem).max(8).optional(), sourceIds: z.array(z.string()).max(20).optional(), warnings: z.array(z.string()).optional(),
      theme: Theme.optional(), img: z.string().max(300).optional(),
    }) },
  }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    const b = req.body
    if (b.skill === '') b.skill = null
    if (b.skill) await assertSkill(u.orgId, b.skill)
    let sourceIds = k.sourceIds
    if (b.sourceIds) sourceIds = (await db.select({ id: schema.sources.id }).from(schema.sources).where(and(eq(schema.sources.orgId, u.orgId), inArray(schema.sources.id, b.sourceIds.length ? b.sourceIds : ['-'])))).map((s) => s.id)
    const details = Object.fromEntries(Object.entries({ theme: b.theme, audience: b.audience, goals: b.goals, takeaways: b.takeaways, metrics: b.metrics, practice: b.practice, delivery: b.delivery, plan: b.plan, warnings: b.warnings }).filter(([, v]) => v !== undefined))
    await patchKit(k.id, {
      ...(b.title !== undefined ? { title: b.title } : {}), ...(b.desc !== undefined ? { goal: b.desc } : {}),
      ...(b.skill !== undefined ? { skillId: b.skill } : {}), ...(b.img !== undefined ? { img: b.img } : {}), ...(b.level !== undefined ? { level: b.level } : {}), sourceIds,
    }, details)
    return kitDto(await getKit(u.orgId, k.id))
  })

  app.get('/:id/source-changes', { schema: { params: P } }, async (req) => sourceChanges((await getKit(me(req).orgId, req.params.id)).id))

  app.delete('/:id', { schema: { params: P } }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    await db.delete(schema.kits).where(eq(schema.kits.id, k.id))
    await audit(u, 'kit.delete', k.id, { title: k.title })
    return { ok: true }
  })

  app.post('/:id/outline', { schema: { params: P } }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    if (!((k.details as { plan?: unknown[] }).plan?.length)) throw badRequest('Kế hoạch chưa có tài liệu nào')
    const job = await enqueue(u.orgId, 'kit.outline', { kitId: k.id }, u.id)
    await patchKit(k.id, {}, { job: job.id })
    return { jobId: job.id }
  })

  // AI đặt tên và mục đích cho tài liệu người soạn muốn thêm
  app.post('/:id/plan-item', { schema: { params: P, body: z.object({ type: z.enum(GEN_TYPES), instruction: z.string().trim().min(3).max(5000) }) } }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    const r = await suggestPlanItem(u.orgId, await briefOf(k), req.body.type, req.body.instruction)
    return { type: req.body.type, ...r }
  })

  // Tạo các tài liệu theo dàn ý; mỗi tài liệu một job
  // Khóa tạo trước khi có bước nội dung gốc: tạo nội dung gốc (bản nháp) từ Tài liệu nhanh đang có, không có thì tạo bản trống
  app.post('/:id/master', { schema: { params: P } }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    if (await masterOf(k.id)) throw conflict('Khóa đã có nội dung gốc')
    const [qr] = await db.select().from(schema.artifacts).where(and(eq(schema.artifacts.kitId, k.id), eq(schema.artifacts.type, 'qr'))).limit(1)
    const a = await createArtifact(k, { type: 'master', title: MASTER_TITLE, summary: k.goal }, 'draft', qr ? masterFromQr(qr.content as Record<string, unknown>) : { lessons: [] })
    await audit(u, 'master.create', a.id, { from: qr?.id ?? null })
    return { id: a.id }
  })

  // Soạn nội dung gốc theo dàn ý (một job)
  app.post('/:id/generate', { schema: { params: P } }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    // khóa nguyên tử: hai lần bấm cùng lúc chỉ một lần được tạo
    const [locked] = await db.update(schema.kits).set({ stage: 'generating', updatedAt: new Date() })
      .where(and(eq(schema.kits.id, k.id), inArray(schema.kits.stage, ['details', 'outline']))).returning({ id: schema.kits.id })
    if (!locked) throw conflict('Khóa này đã được tạo nội dung')
    const plan = ((k.details as { plan?: PlanItem[] }).plan ?? [])
    if (!plan.length) { await patchKit(k.id, { stage: k.stage }); throw badRequest('Kế hoạch chưa có tài liệu nào') }
    const ids: string[] = []
    for (const p of plan) {
      const a = await createArtifact(k, p)
      await enqueue(u.orgId, 'artifact.generate', { artifactId: a.id }, u.id)
      ids.push(a.id)
    }
    await patchKit(k.id, { stage: 'ready' })
    await audit(u, 'kit.generate', k.id, { artifacts: ids.length })
    return { artifactIds: ids }
  })

  // Thêm định dạng cho người học: AI soạn ngay từ nội dung gốc đã chốt
  app.post('/:id/artifacts', { schema: { params: P, body: planItem } }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    await requireLocked(k.id)
    const a = await createArtifact(k, req.body)
    const job = await enqueue(u.orgId, 'artifact.generate', { artifactId: a.id }, u.id)
    return { id: a.id, jobId: job.id }
  })
}
