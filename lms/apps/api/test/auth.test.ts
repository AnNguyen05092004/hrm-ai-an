import { describe, it, expect } from 'vitest'
import { setupApp, client } from './helpers.js'
import { demoMode, env } from '../src/env.js'

describe('auth', () => {
  const ctx = setupApp()

  it('rejects wrong password', async () => {
    const r = await client(ctx.app)('POST', '/api/auth/login', { email: 'an@demo.local', password: 'sai' })
    expect(r.status).toBe(401)
    expect(r.body.error.code).toBe('bad_credentials')
  })

  it('returns current user for a valid session', async () => {
    const r = await ctx.author('GET', '/api/auth/me')
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ role: 'author', orgName: 'Công ty demo' })
  })

  it('requires login for /me', async () => {
    const r = await client(ctx.app)('GET', '/api/auth/me')
    expect(r.status).toBe(401)
  })

  it('blocks writes without the CSRF header', async () => {
    const r = await ctx.app.inject({ method: 'POST', url: '/api/auth/logout' })
    expect(r.statusCode).toBe(403)
  })

  it('logout invalidates the session', async () => {
    const r0 = await ctx.app.inject({ method: 'POST', url: '/api/auth/login', headers: { 'x-lms': '1' }, payload: { email: 'ha@demo.local', password: 'demo1234' } })
    const cookie = `lms_session=${r0.cookies[0].value}`
    const c = client(ctx.app, cookie)
    expect((await c('POST', '/api/auth/logout')).status).toBe(200)
    expect((await c('GET', '/api/auth/me')).status).toBe(401)
  })

  it('demo mode switches role without a password, only to the demo accounts', async () => {
    const list = await client(ctx.app)('GET', '/api/auth/demo')
    expect(list.body.map((u: { role: string }) => u.role)).toEqual(['author', 'learner'])
    const r = await ctx.app.inject({ method: 'POST', url: '/api/auth/demo', headers: { 'x-lms': '1' }, payload: { email: 'ha@demo.local' } })
    expect(r.statusCode).toBe(200)
    const c = client(ctx.app, `lms_session=${r.cookies[0].value}`)
    expect((await c('GET', '/api/auth/me')).body).toMatchObject({ role: 'learner', demo: true })
    const other = await client(ctx.app)('POST', '/api/auth/demo', { email: 'minh.duc@demo.local' })
    expect(other.status).toBe(400)
  })

  it('demo mode is off in production unless turned on explicitly', () => {
    expect(demoMode({ ...env, NODE_ENV: 'production', DEMO_MODE: undefined })).toBe(false)
    expect(demoMode({ ...env, NODE_ENV: 'production', DEMO_MODE: 'true' })).toBe(true)
    expect(demoMode({ ...env, NODE_ENV: 'development', DEMO_MODE: 'false' })).toBe(false)
  })
})
