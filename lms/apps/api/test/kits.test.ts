import { describe, it, expect } from 'vitest'
import { setupApp, upload } from './helpers.js'
import { drainJobs } from '../src/lib/jobs.js'

const DOC = `# Quy trình triển khai

## 1. Chuẩn bị
Trước khi triển khai phải chạy toàn bộ test tự động và quality gate. Không bỏ qua bước này.

## 2. Rollback
Nếu lỗi sau triển khai, rollback trong vòng 15 phút bằng lệnh deploy rollback. Ghi lại sự cố vào sổ.
`

describe('kit authoring flow', () => {
  const ctx = setupApp()
  let sourceId = ''
  let kitId = ''

  it('uploads and processes a source document into chunks', async () => {
    const r = await upload(ctx.app, ctx.authorCookie, '/api/sources', 'trien-khai.md', DOC, 'text/markdown')
    expect(r.status).toBe(200)
    sourceId = r.body.source.id
    await drainJobs()
    const s = await ctx.author('GET', `/api/sources/${sourceId}`)
    expect(s.body.status).toBe('ready')
    expect(s.body.chunks.map((c: { section: string }) => c.section)).toContain('mục 2 Rollback')
  })

  it('rejects unsupported file types', async () => {
    const r = await upload(ctx.app, ctx.authorCookie, '/api/sources', 'virus.exe', 'MZ', 'application/octet-stream')
    expect(r.status).toBe(400)
  })

  it('learners cannot access authoring APIs', async () => {
    expect((await ctx.learner('GET', '/api/kits')).status).toBe(403)
    expect((await ctx.learner('POST', '/api/kits', { goal: 'Tạo khóa CI/CD' })).status).toBe(403)
  })

  it('drafts details, outline and content with source citations', async () => {
    const c = await ctx.author('POST', '/api/kits', { goal: 'Tạo khóa CI/CD cho dev mới: quy trình triển khai và rollback', sourceIds: [sourceId] })
    expect(c.status).toBe(200)
    kitId = c.body.id
    await drainJobs()
    let k = (await ctx.author('GET', `/api/kits/${kitId}`)).body
    expect(k.stage).toBe('details')
    expect(k.plan.length).toBeGreaterThan(0)
    expect(k.plan.some((p: { type: string }) => p.type === 'qr')).toBe(true)

    expect((await ctx.author('POST', `/api/kits/${kitId}/outline`)).status).toBe(200)
    await drainJobs()
    k = (await ctx.author('GET', `/api/kits/${kitId}`)).body
    expect(k.stage).toBe('outline')
    expect(k.plan[0].outline).toBeTruthy()

    const g = await ctx.author('POST', `/api/kits/${kitId}/generate`)
    expect(g.status).toBe(200)
    expect((await ctx.author('POST', `/api/kits/${kitId}/generate`)).status).toBe(409)
    await drainJobs()
    k = (await ctx.author('GET', `/api/kits/${kitId}`)).body
    expect(k.artifacts.every((a: { status: string }) => a.status === 'draft')).toBe(true)

    const qr = k.artifacts.find((a: { type: string }) => a.type === 'qr')
    const a = (await ctx.author('GET', `/api/artifacts/${qr.id}`)).body
    const blocks = a.lessons[0].blocks
    expect(blocks.some((b: { src?: string }) => b.src?.startsWith('trien-khai.md · '))).toBe(true)
    expect(a.quiz.questions.length).toBeGreaterThan(0)
    expect(a.quiz.questions.every((q: { approved: boolean }) => q.approved === false)).toBe(true)
  })

  it('autosaves edits and publishes a version indexed for the tutor', async () => {
    const k = (await ctx.author('GET', `/api/kits/${kitId}`)).body
    const qr = k.artifacts.find((a: { type: string }) => a.type === 'qr')
    const a = (await ctx.author('GET', `/api/artifacts/${qr.id}`)).body
    const { lessons, quiz } = a
    lessons[0].title = 'Bài đã sửa tay'
    quiz.questions[0].approved = true
    const p = await ctx.author('PATCH', `/api/artifacts/${qr.id}`, { title: 'CI/CD cho dev mới', content: { lessons, quiz } })
    expect(p.status).toBe(200)
    const pub = await ctx.author('POST', `/api/artifacts/${qr.id}/publish`, { note: 'Bản đầu' })
    expect(pub.status).toBe(200)
    expect(pub.body.publishedVersion).toBe(1)
    const v = await ctx.author('GET', `/api/artifacts/${qr.id}/versions`)
    expect(v.body[0]).toMatchObject({ version: 1, note: 'Bản đầu' })
  })

  it('cannot read another org kit', async () => {
    expect((await ctx.author('GET', '/api/kits/khong-ton-tai')).status).toBe(404)
  })
})
