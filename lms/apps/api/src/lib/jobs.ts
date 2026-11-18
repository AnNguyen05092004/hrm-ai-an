import { eq, sql } from 'drizzle-orm'
import type { FastifyBaseLogger } from 'fastify'
import { db, schema } from '../db/client.js'

export type Job = typeof schema.jobs.$inferSelect
export interface JobCtx {
  job: Job
  report: (progress: number, message: string) => Promise<void>
}
type Handler = (ctx: JobCtx) => Promise<Record<string, unknown> | void>

const handlers = new Map<string, Handler>()
const POLL_MS = 800
const MAX_ATTEMPTS = 2

export function defineJob(kind: string, h: Handler): void {
  handlers.set(kind, h)
}

export async function enqueue(orgId: string, kind: string, payload: Record<string, unknown>, createdBy?: string): Promise<Job> {
  const [j] = await db.insert(schema.jobs).values({ orgId, kind, payload, createdBy }).returning()
  return j
}

async function claim(): Promise<Job | null> {
  const rows = await db.execute<{ id: string }>(sql`
    update jobs set status = 'running', attempts = attempts + 1, updated_at = now()
    where id = (select id from jobs where status = 'queued' order by created_at limit 1 for update skip locked)
    returning id`)
  const idv = rows[0]?.id
  if (!idv) return null
  const [j] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, idv))
  return j ?? null
}

async function run(job: Job, log?: FastifyBaseLogger): Promise<void> {
  const h = handlers.get(job.kind)
  const set = (v: Partial<Job>) => db.update(schema.jobs).set({ ...v, updatedAt: new Date() }).where(eq(schema.jobs.id, job.id))
  if (!h) { await set({ status: 'failed', error: `Không có xử lý cho ${job.kind}` }); return }
  try {
    const result = await h({ job, report: (progress, message) => set({ progress, message }).then(() => undefined) })
    await set({ status: 'done', progress: 100, result: result ?? {} })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    log?.error({ err: e, job: job.id }, 'job failed')
    await set(job.attempts < MAX_ATTEMPTS ? { status: 'queued', message: 'Đang thử lại…' } : { status: 'failed', error: msg })
  }
}

/** Chạy hết hàng đợi (dùng trong test và cho worker) */
export async function drainJobs(log?: FastifyBaseLogger): Promise<number> {
  let n = 0
  for (let j = await claim(); j; j = await claim()) { await run(j, log); n++ }
  return n
}

const CONCURRENCY = 3

/** Việc không báo tiến độ quá 10 phút (máy chủ dừng giữa chừng) thì chạy lại hoặc đánh lỗi. Giả định một tiến trình API chạy worker. */
async function recoverStale(): Promise<void> {
  await db.execute(sql`update jobs set status = case when attempts >= ${MAX_ATTEMPTS} then 'failed' else 'queued' end,
    error = case when attempts >= ${MAX_ATTEMPTS} then 'Máy chủ dừng khi đang xử lý' else error end
    where status = 'running' and updated_at < now() - interval '10 minutes'`)
}

export function startWorker(log: FastifyBaseLogger): void {
  // việc đang chạy dở khi máy chủ tắt thì đưa lại vào hàng đợi
  void recoverStale()
  setInterval(() => void recoverStale().catch((e) => log.error(e)), 60_000)
  let running = 0
  setInterval(() => {
    while (running < CONCURRENCY) {
      running++
      claim().then(async (j) => { if (j) await run(j, log) })
        .catch((e) => log.error(e))
        .finally(() => { running-- })
    }
  }, POLL_MS)
}
