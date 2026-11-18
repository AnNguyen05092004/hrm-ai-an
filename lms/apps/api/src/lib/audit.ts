import { db, schema } from '../db/client.js'
import type { AuthUser } from './auth.js'

export async function audit(u: AuthUser, action: string, target = '', meta: Record<string, unknown> = {}): Promise<void> {
  await db.insert(schema.auditLogs).values({ orgId: u.orgId, userId: u.id, action, target, meta })
}
