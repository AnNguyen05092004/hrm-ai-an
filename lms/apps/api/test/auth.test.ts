import { describe, it, expect } from 'vitest'
import { setupApp, client } from './helpers.js'

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
})
