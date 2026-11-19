// Gửi kết quả học sang hệ thống ngoài của công ty:
// - xAPI 1.0.3 tới LRS (hệ thống LMS/LRS nội bộ nhận statement)
// - Webhook JSON có chữ ký HMAC tới hệ thống nội bộ bất kỳ
// Sự kiện được ghi vào outbox cùng lúc với nghiệp vụ, phần gửi chạy nền và thử lại khi lỗi.
import crypto from 'node:crypto'
import { and, asc, eq, inArray, isNull, lte, sql } from 'drizzle-orm'
import { db, schema } from '../db/client.js'
import { env } from '../env.js'

type Json = Record<string, unknown>
export type Target = 'xapi' | 'webhook'
export const TARGETS: Target[] = ['xapi', 'webhook']
const MAX_ATTEMPTS = 8
const TIMEOUT_MS = 10_000

export interface LearningEvent {
  type: 'artifact.completed' | 'exam.finished' | 'course.completed' | 'test'
  user: { id: string; name: string; email: string }
  kit: { id: string; title: string }
  artifact?: { id: string; type: string; title: string }
  result?: { score?: number | null; passed?: boolean; mode?: string }
  at?: string
}

const activity = (kind: string, id: string): string => `${env.WEB_ORIGIN.replace(/\/$/, '')}/xapi/activities/${kind}/${id}`
const ACT_TYPE: Record<string, string> = {
  course: 'http://adlnet.gov/expapi/activities/course', exam: 'http://adlnet.gov/expapi/activities/assessment',
  qr: 'http://adlnet.gov/expapi/activities/lesson', deck: 'http://adlnet.gov/expapi/activities/media', video: 'http://activitystrea.ms/schema/1.0/video',
  scenario: 'http://adlnet.gov/expapi/activities/simulation', guide: 'http://adlnet.gov/expapi/activities/lesson',
}
const VERB = {
  completed: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'vi-VN': 'đã hoàn thành', 'en-US': 'completed' } },
  passed: { id: 'http://adlnet.gov/expapi/verbs/passed', display: { 'vi-VN': 'đã đạt', 'en-US': 'passed' } },
  failed: { id: 'http://adlnet.gov/expapi/verbs/failed', display: { 'vi-VN': 'chưa đạt', 'en-US': 'failed' } },
}

/** Statement xAPI cho một sự kiện học */
export function toStatement(e: LearningEvent): Json {
  const course = { objectType: 'Activity', id: activity('course', e.kit.id), definition: { name: { 'vi-VN': e.kit.title }, type: ACT_TYPE.course } }
  const object = e.artifact
    ? { objectType: 'Activity', id: activity(e.artifact.type, e.artifact.id), definition: { name: { 'vi-VN': e.artifact.title }, type: ACT_TYPE[e.artifact.type] ?? ACT_TYPE.qr } }
    : course
  const verb = e.type === 'exam.finished' ? (e.result?.passed ? VERB.passed : VERB.failed) : VERB.completed
  const score = e.result?.score
  return {
    id: crypto.randomUUID(),
    actor: { objectType: 'Agent', name: e.user.name, mbox: `mailto:${e.user.email}` },
    verb, object, timestamp: e.at ?? new Date().toISOString(),
    result: { completion: true, ...(e.result?.passed !== undefined ? { success: e.result.passed } : {}), ...(score != null ? { score: { scaled: Math.round(score) / 100, raw: Math.round(score), min: 0, max: 100 } } : {}) },
    context: { platform: 'LMS', language: 'vi-VN', ...(e.artifact ? { contextActivities: { parent: [course] } } : {}), extensions: e.result?.mode ? { [`${env.WEB_ORIGIN}/xapi/ext/mode`]: e.result.mode } : undefined },
  }
}

const webhookBody = (e: LearningEvent): Json => ({ event: e.type, at: e.at ?? new Date().toISOString(), user: e.user, course: e.kit, item: e.artifact ?? null, result: e.result ?? null })

async function config(orgId: string): Promise<Record<string, Json>> {
  const [o] = await db.select({ i: schema.orgs.integrations }).from(schema.orgs).where(eq(schema.orgs.id, orgId))
  return (o?.i ?? {}) as Record<string, Json>
}

/** Ghi sự kiện vào outbox cho mỗi kết nối đang bật. dedupe: khóa để không gửi trùng (vd hoàn thành khóa) */
export async function emit(orgId: string, e: LearningEvent, dedupe?: string): Promise<void> {
  const cfg = await config(orgId)
  const on = TARGETS.filter((t) => cfg[t]?.enabled)
  if (!on.length) return
  if (dedupe) {
    const [dup] = await db.select({ id: schema.outbox.id }).from(schema.outbox).where(and(eq(schema.outbox.orgId, orgId), inArray(schema.outbox.topic, on), sql`${schema.outbox.payload}->>'dedupe' = ${dedupe}`)).limit(1)
    if (dup) return
  }
  const at = new Date().toISOString()
  await db.insert(schema.outbox).values(on.map((t) => ({ orgId, topic: t, payload: { dedupe: dedupe ?? null, body: t === 'xapi' ? toStatement({ ...e, at }) : webhookBody({ ...e, at }) } })))
}

/** Gửi một bản tin tới đích; trả lỗi dạng chữ để lưu và hiển thị */
async function send(target: Target, cfg: Json, body: Json): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    let res: Response
    if (target === 'xapi') {
      const url = `${String(cfg.endpoint).replace(/\/$/, '')}/statements`
      const auth = Buffer.from(`${cfg.username ?? ''}:${cfg.password ?? ''}`).toString('base64')
      res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-experience-api-version': '1.0.3', authorization: `Basic ${auth}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) })
    } else {
      const raw = JSON.stringify(body)
      const sig = crypto.createHmac('sha256', String(cfg.secret ?? '')).update(raw).digest('hex')
      res = await fetch(String(cfg.url), { method: 'POST', headers: { 'content-type': 'application/json', 'x-lms-event': String(body.event ?? ''), 'x-lms-signature': `sha256=${sig}` }, body: raw, signal: AbortSignal.timeout(TIMEOUT_MS) })
    }
    if (res.ok) return { ok: true, status: res.status }
    return { ok: false, status: res.status, error: `${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.slice(0, 200) : 'Lỗi kết nối' }
  }
}

/** Gửi thử ngay (nút "Gửi thử" ở Cài đặt) */
export async function sendTest(orgId: string, target: Target, user: LearningEvent['user']): Promise<{ ok: boolean; status?: number; error?: string }> {
  const cfg = (await config(orgId))[target]
  if (!cfg || !(target === 'xapi' ? cfg.endpoint : cfg.url)) return { ok: false, error: 'Chưa nhập địa chỉ' }
  const e: LearningEvent = { type: 'test', user, kit: { id: 'test', title: 'Kiểm tra kết nối' }, at: new Date().toISOString() }
  return send(target, cfg, target === 'xapi' ? toStatement(e) : webhookBody(e))
}

/** Gửi các bản tin đến hạn; lỗi thì hẹn lại sau 1, 2, 4… phút (tối đa 1 giờ), quá 8 lần thì dừng */
export async function deliverOutbox(limit = 20): Promise<{ sent: number; failed: number }> {
  const rows = await db.select().from(schema.outbox)
    .where(and(inArray(schema.outbox.topic, TARGETS), isNull(schema.outbox.deliveredAt), lte(schema.outbox.nextAt, new Date()), sql`${schema.outbox.attempts} < ${MAX_ATTEMPTS}`))
    .orderBy(asc(schema.outbox.createdAt)).limit(limit)
  let sent = 0, failed = 0
  const cfgs = new Map<string, Record<string, Json>>()
  for (const r of rows) {
    if (!cfgs.has(r.orgId)) cfgs.set(r.orgId, await config(r.orgId))
    const cfg = cfgs.get(r.orgId)?.[r.topic]
    const res = cfg?.enabled ? await send(r.topic as Target, cfg, (r.payload as Json).body as Json) : { ok: false, error: 'Kết nối đang tắt' }
    if (res.ok) { sent++; await db.update(schema.outbox).set({ deliveredAt: new Date(), attempts: r.attempts + 1, lastError: null }).where(eq(schema.outbox.id, r.id)); continue }
    failed++
    const wait = Math.min(60, 2 ** r.attempts) * 60_000
    await db.update(schema.outbox).set({ attempts: r.attempts + 1, lastError: res.error ?? 'Lỗi', nextAt: new Date(Date.now() + wait) }).where(eq(schema.outbox.id, r.id))
  }
  return { sent, failed }
}

let timer: NodeJS.Timeout | null = null
export function startOutbox(everyMs = 15_000): void {
  if (timer) return
  timer = setInterval(() => { deliverOutbox().catch(() => { /* thử lại ở vòng sau */ }) }, everyMs)
  timer.unref()
}

// ---------- Dựng sự kiện từ dữ liệu ----------
async function people(userId: string): Promise<LearningEvent['user']> {
  const [u] = await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email }).from(schema.users).where(eq(schema.users.id, userId))
  return u
}
async function itemOf(artifactId: string): Promise<{ a: { id: string; type: string; title: string; kitId: string; orgId: string }; kit: { id: string; title: string } }> {
  const [a] = await db.select({ id: schema.artifacts.id, type: schema.artifacts.type, title: schema.artifacts.title, kitId: schema.artifacts.kitId, orgId: schema.artifacts.orgId }).from(schema.artifacts).where(eq(schema.artifacts.id, artifactId))
  const [k] = await db.select({ id: schema.kits.id, title: schema.kits.title }).from(schema.kits).where(eq(schema.kits.id, a.kitId))
  return { a, kit: k }
}

/** Người học đã xong mọi tài liệu được giao trong khóa (tài liệu học: 100%, đề kiểm tra: đạt) */
async function courseDone(userId: string, kitId: string): Promise<boolean> {
  const arts = await db.select({ id: schema.artifacts.id, type: schema.artifacts.type }).from(schema.artifacts)
    .innerJoin(schema.assignments, and(eq(schema.assignments.artifactId, schema.artifacts.id), eq(schema.assignments.userId, userId)))
    .where(eq(schema.artifacts.kitId, kitId))
  if (!arts.length) return false
  const ids = arts.map((x) => x.id)
  const [prog, passed] = await Promise.all([
    db.select({ artifactId: schema.progress.artifactId }).from(schema.progress).where(and(eq(schema.progress.userId, userId), inArray(schema.progress.artifactId, ids), sql`${schema.progress.completedAt} is not null`)),
    db.select({ artifactId: schema.attempts.artifactId }).from(schema.attempts).where(and(eq(schema.attempts.userId, userId), inArray(schema.attempts.artifactId, ids), eq(schema.attempts.status, 'passed'))),
  ])
  const ok = new Set([...prog, ...passed].map((x) => x.artifactId))
  return arts.every((x) => ok.has(x.id))
}

/** Gọi sau khi một tài liệu được học xong hoặc một lượt thi có kết quả */
export async function onLearning(kind: 'completed' | 'exam', userId: string, artifactId: string, result?: LearningEvent['result']): Promise<void> {
  const { a, kit } = await itemOf(artifactId)
  const cfg = await config(a.orgId)
  if (!TARGETS.some((t) => cfg[t]?.enabled)) return
  const user = await people(userId)
  const artifact = { id: a.id, type: a.type, title: a.title }
  await emit(a.orgId, { type: kind === 'exam' ? 'exam.finished' : 'artifact.completed', user, kit, artifact, result })
  if ((kind === 'completed' || result?.passed) && await courseDone(userId, kit.id)) await emit(a.orgId, { type: 'course.completed', user, kit }, `course:${kit.id}:${userId}`)
}
