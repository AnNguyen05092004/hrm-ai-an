import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { and, eq, gt } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { db, schema } from '../db/client.js'
import { env } from '../env.js'
import { AppError, forbidden } from './errors.js'

export const COOKIE = 'lms_session'
export type Role = 'author' | 'learner'
export interface AuthUser { id: string; orgId: string; role: Role; name: string; email: string }

declare module 'fastify' {
  interface FastifyRequest { user?: AuthUser }
}

const sha = (t: string): string => crypto.createHash('sha256').update(t).digest('hex')

export const hashPassword = (p: string): Promise<string> => bcrypt.hash(p, 10)
export const checkPassword = (p: string, h: string): Promise<boolean> => bcrypt.compare(p, h)

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + env.SESSION_DAYS * 86400_000)
  await db.insert(schema.sessions).values({ tokenHash: sha(token), userId, expiresAt })
  return { token, expiresAt }
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha(token)))
}

export async function userFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null
  const [row] = await db.select({
    id: schema.users.id, orgId: schema.users.orgId, role: schema.users.role, name: schema.users.name,
    email: schema.users.email, active: schema.users.active,
  }).from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, sha(token)), gt(schema.sessions.expiresAt, new Date())))
  if (!row || !row.active) return null
  return { id: row.id, orgId: row.orgId, role: row.role, name: row.name, email: row.email }
}

export function setSessionCookie(reply: FastifyReply, token: string, expires: Date): void {
  reply.setCookie(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', expires, secure: env.NODE_ENV === 'production',
  })
}

/** preHandler: bắt buộc đăng nhập */
export async function requireUser(req: FastifyRequest): Promise<void> {
  const u = await userFromToken(req.cookies[COOKIE])
  if (!u) throw new AppError(401, 'unauthenticated', 'Bạn cần đăng nhập')
  req.user = u
}

/** preHandler: bắt buộc vai người tạo khóa học */
export async function requireAuthor(req: FastifyRequest): Promise<void> {
  await requireUser(req)
  if (req.user!.role !== 'author') throw forbidden()
}

export const me = (req: FastifyRequest): AuthUser => {
  if (!req.user) throw new AppError(401, 'unauthenticated', 'Bạn cần đăng nhập')
  return req.user
}
