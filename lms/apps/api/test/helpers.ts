import { beforeAll, afterAll } from 'vitest'
import type { FastifyInstance, InjectOptions } from 'fastify'
import { buildApp } from '../src/app.js'
import { runMigrations } from '../src/db/migrate.js'
import { seed, ADMIN_EMAIL, AUTHOR_EMAIL, REVIEWER_EMAIL, DEMO_PASSWORD } from '../src/db/seed.js'

// admin, author (người soạn) và reviewer (Phạm Thu Hà, được mời sẵn vào khóa An toàn thông tin và Nghỉ phép)
export interface Ctx { app: FastifyInstance; ids: Awaited<ReturnType<typeof seed>>; admin: Client; author: Client; reviewer: Client; authorCookie: string }
export type Client = (method: InjectOptions['method'], url: string, body?: unknown) => Promise<{ status: number; body: any }> // eslint-disable-line @typescript-eslint/no-explicit-any

export function client(app: FastifyInstance, cookie = ''): Client {
  return async (method, url, body) => {
    const r = await app.inject({ method, url, headers: { cookie, 'x-lms': '1' }, ...(body !== undefined ? { payload: body as InjectOptions['payload'] } : {}) })
    return { status: r.statusCode, body: r.body && String(r.headers['content-type'] ?? '').includes('json') ? JSON.parse(r.body) : r.body ? r.body : null }
  }
}

export async function sessionCookie(app: FastifyInstance, email: string): Promise<string> {
  const r = await app.inject({ method: 'POST', url: '/api/auth/login', headers: { 'x-lms': '1' }, payload: { email, password: DEMO_PASSWORD } })
  if (r.statusCode !== 200) throw new Error(`login failed ${r.body}`)
  const c = r.cookies.find((x) => x.name === 'lms_session')!
  return `lms_session=${c.value}`
}

export const loginAs = async (app: FastifyInstance, email: string): Promise<Client> => client(app, await sessionCookie(app, email))

/** Dựng app + seed dữ liệu mẫu cho mỗi file test */
export function setupApp(): Ctx {
  const ctx = {} as Ctx
  beforeAll(async () => {
    await runMigrations()
    ctx.ids = await seed()
    ctx.app = await buildApp()
    ctx.authorCookie = await sessionCookie(ctx.app, AUTHOR_EMAIL)
    ctx.author = client(ctx.app, ctx.authorCookie)
    ctx.admin = await loginAs(ctx.app, ADMIN_EMAIL)
    ctx.reviewer = await loginAs(ctx.app, REVIEWER_EMAIL)
  })
  afterAll(async () => { await ctx.app?.close() })
  return ctx
}

/** Gửi tệp dạng multipart */
export async function upload(app: FastifyInstance, cookie: string, url: string, filename: string, content: string | Buffer, mime = 'text/plain'): Promise<{ status: number; body: any }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const boundary = '----lmstest'
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`),
    Buffer.isBuffer(content) ? content : Buffer.from(content), Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  const r = await app.inject({ method: 'POST', url, payload, headers: { cookie, 'x-lms': '1', 'content-type': `multipart/form-data; boundary=${boundary}` } })
  return { status: r.statusCode, body: JSON.parse(r.body) }
}
