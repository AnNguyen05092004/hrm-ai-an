import { describe, it, expect } from 'vitest'
import { client, setupApp } from './helpers.js'

describe('Quản trị người dùng', () => {
  const ctx = setupApp()

  it('chỉ quản trị xem và quản lý người dùng, nhật ký', async () => {
    expect((await ctx.admin('GET', '/api/users')).body.map((u: { role: string }) => u.role).sort()).toEqual(['admin', 'author', 'reviewer', 'reviewer'])
    expect((await ctx.author('GET', '/api/users')).status).toBe(403)
    expect((await ctx.reviewer('GET', '/api/audit')).status).toBe(403)
    expect((await ctx.author('PATCH', '/api/settings/ai', { quota: 50_000 })).status).toBe(403)
    expect((await ctx.admin('PATCH', '/api/settings/ai', { quota: 50_000 })).status).toBe(200)
  })

  it('tạo tài khoản với mật khẩu tạm đăng nhập được, không trùng email', async () => {
    const r = await ctx.admin('POST', '/api/users', { name: 'Trần Mai', email: 'Mai.T@demo.local', role: 'reviewer', title: 'Chuyên gia pháp chế' })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ email: 'mai.t@demo.local', role: 'reviewer' })
    expect(r.body.tempPassword).toMatch(/^[A-Za-z2-9]{12}$/)
    const login = await ctx.app.inject({ method: 'POST', url: '/api/auth/login', headers: { 'x-lms': '1' }, payload: { email: 'mai.t@demo.local', password: r.body.tempPassword } })
    expect(login.statusCode).toBe(200)
    expect((await ctx.admin('POST', '/api/users', { name: 'Trùng', email: 'mai.t@demo.local', role: 'author' })).status).toBe(409)
    expect((await ctx.admin('GET', '/api/users')).body.some((u: { passwordHash?: string }) => 'passwordHash' in u)).toBe(false)
  })

  it('khóa tài khoản hoặc đổi vai thì phiên cũ hết hiệu lực; không tự hạ quyền mình', async () => {
    const users = (await ctx.admin('GET', '/api/users')).body as { id: string; email: string }[]
    const mai = users.find((u) => u.email === 'mai.t@demo.local')!
    const reset = await ctx.admin('POST', `/api/users/${mai.id}/reset-password`)
    const login = await ctx.app.inject({ method: 'POST', url: '/api/auth/login', headers: { 'x-lms': '1' }, payload: { email: mai.email, password: reset.body.tempPassword } })
    const mc = client(ctx.app, `lms_session=${login.cookies[0].value}`)
    expect((await mc('GET', '/api/reviews')).status).toBe(200)
    expect((await ctx.admin('PATCH', `/api/users/${mai.id}`, { role: 'author' })).body.role).toBe('author')
    expect((await mc('GET', '/api/auth/me')).status).toBe(401)
    expect((await ctx.admin('PATCH', `/api/users/${ctx.ids.adminId}`, { role: 'author' })).status).toBe(400)
    expect((await ctx.admin('PATCH', `/api/users/${ctx.ids.adminId}`, { active: false })).status).toBe(400)
  })

  it('đổi reviewer sang vai khác thì bỏ các lời mời review của người đó', async () => {
    const nam = ctx.ids.reviewer2Id
    expect((await ctx.admin('PATCH', `/api/users/${nam}`, { role: 'author' })).status).toBe(200)
    const kits = (await ctx.author('GET', '/api/kits')).body as { title: string; review: { total: number } | null }[]
    expect(kits.find((k) => k.title.startsWith('Docker'))!.review?.total ?? 0).toBe(0)
  })
})
