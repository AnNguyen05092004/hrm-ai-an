import { sql } from 'drizzle-orm'
import type { FastifyBaseLogger } from 'fastify'
import { db } from '../db/client.js'

const DAY = 86_400_000

/** BR13: bản ghi giám sát tự xóa sau 30 ngày, trừ bài đang được xem xét */
export async function purgeProctorRecords(): Promise<number> {
  const r = await db.execute(sql`update attempts set flags = '[]'::jsonb
    where jsonb_array_length(flags) > 0 and status <> 'grading' and coalesce(submitted_at, started_at) < now() - interval '30 days' returning id`)
  return r.length
}

export function startRetention(log: FastifyBaseLogger): void {
  const run = () => purgeProctorRecords().then((n) => { if (n) log.info({ n }, 'purged proctor records') }).catch((e) => log.error(e))
  void run()
  setInterval(run, DAY)
}
