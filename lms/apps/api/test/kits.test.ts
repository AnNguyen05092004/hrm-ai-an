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

  it('reviewers cannot access authoring APIs', async () => {
    expect((await ctx.reviewer('GET', '/api/kits')).status).toBe(403)
    expect((await ctx.reviewer('POST', '/api/kits', { goal: 'Tạo khóa CI/CD' })).status).toBe(403)
  })

  it('soạn chi tiết, dàn ý rồi nội dung gốc có trích nguồn (chưa có định dạng nào)', async () => {
    const c = await ctx.author('POST', '/api/kits', { goal: 'Tạo khóa CI/CD cho dev mới: quy trình triển khai và rollback', sourceIds: [sourceId] })
    expect(c.status).toBe(200)
    kitId = c.body.id
    await drainJobs()
    let k = (await ctx.author('GET', `/api/kits/${kitId}`)).body
    expect(k.stage).toBe('details')
    expect(k.plan).toEqual([expect.objectContaining({ type: 'master', title: 'Nội dung gốc' })])

    expect((await ctx.author('POST', `/api/kits/${kitId}/outline`)).status).toBe(200)
    await drainJobs()
    k = (await ctx.author('GET', `/api/kits/${kitId}`)).body
    expect(k.stage).toBe('outline')
    expect(k.plan[0].outline.sections.length).toBeGreaterThan(3)

    const g = await ctx.author('POST', `/api/kits/${kitId}/generate`)
    expect(g.status).toBe(200)
    expect((await ctx.author('POST', `/api/kits/${kitId}/generate`)).status).toBe(409)
    await drainJobs()
    k = (await ctx.author('GET', `/api/kits/${kitId}`)).body
    expect(k.artifacts.map((a: { type: string }) => a.type)).toEqual(['master'])
    expect(k.master).toMatchObject({ lockedVersion: null })
    const m = (await ctx.author('GET', `/api/artifacts/${k.master.id}`)).body
    expect(m.lessons.length).toBeGreaterThan(3)
    expect(m.lessons[0].blocks.some((b: { src?: string }) => b.src?.startsWith('trien-khai.md · '))).toBe(true)
    expect(m.quiz).toBeUndefined()
  })

  it('chưa chốt nội dung gốc thì chưa tạo được định dạng; chốt xong mới soạn từ nội dung gốc', async () => {
    const k = (await ctx.author('GET', `/api/kits/${kitId}`)).body
    const item = { type: 'qr', title: 'CI/CD: những điều cần biết', summary: 'Tóm gọn' }
    const early = await ctx.author('POST', `/api/kits/${kitId}/artifacts`, item)
    expect(early.status).toBe(400)
    expect(early.body.error.code).toBe('master_not_locked')
    expect((await ctx.author('POST', `/api/kits/${kitId}/exams`, { levels: [1] })).status).toBe(400)

    expect((await ctx.author('POST', `/api/artifacts/${k.master.id}/publish`, { note: 'Chốt nội dung' })).status).toBe(200)
    expect((await ctx.author('POST', `/api/kits/${kitId}/artifacts`, item)).status).toBe(200)
    expect((await ctx.author('POST', `/api/kits/${kitId}/artifacts`, { type: 'deck', title: 'CI/CD trong 10 phút', summary: 'Slide' })).status).toBe(200)
    await drainJobs()
    const after = (await ctx.author('GET', `/api/kits/${kitId}`)).body
    expect(after.master).toMatchObject({ lockedVersion: 1, changed: false })
    const qr = after.artifacts.find((a: { type: string }) => a.type === 'qr')
    const deck = after.artifacts.find((a: { type: string }) => a.type === 'deck')
    expect(qr.basedOn).toBe(1)
    expect(deck.basedOn).toBe(1)
    const a = (await ctx.author('GET', `/api/artifacts/${qr.id}`)).body
    // định dạng soạn từ nội dung gốc vẫn trích đúng tài liệu nguồn gốc
    expect(a.lessons[0].blocks.some((b: { src?: string; srcRef?: { sourceId: string } }) => b.src?.startsWith('trien-khai.md · ') && b.srcRef?.sourceId === sourceId)).toBe(true)
    expect(a.quiz.questions.length).toBeGreaterThan(0)
    expect(a.quiz.questions.every((q: { approved: boolean }) => q.approved === false)).toBe(true)
    // nội dung gốc ở trang xuất: không xuất bản cùng cả khóa
    const st = (await ctx.author('GET', `/api/kits/${kitId}/publish-status`)).body
    expect(st.items.some((x: { type: string }) => x.type === 'master')).toBe(false)
  })

  it('sửa nội dung gốc sau khi chốt: báo có thay đổi; chốt lại thì định dạng cũ biết mình soạn từ bản trước', async () => {
    const k = (await ctx.author('GET', `/api/kits/${kitId}`)).body
    const m = (await ctx.author('GET', `/api/artifacts/${k.master.id}`)).body
    m.lessons[0].title = 'Chuẩn bị trước khi triển khai'
    await ctx.author('PATCH', `/api/artifacts/${m.id}`, { content: { lessons: m.lessons } })
    expect((await ctx.author('GET', `/api/kits/${kitId}`)).body.master).toMatchObject({ lockedVersion: 1, changed: true })
    await ctx.author('POST', `/api/artifacts/${m.id}/publish`, { note: 'Chốt lại' })
    const k2 = (await ctx.author('GET', `/api/kits/${kitId}`)).body
    expect(k2.master).toMatchObject({ lockedVersion: 2, changed: false })
    const qr = k2.artifacts.find((a: { type: string }) => a.type === 'qr')
    expect(qr.basedOn).toBe(1)
    expect((await ctx.author('POST', `/api/artifacts/${qr.id}/regenerate`, { force: true })).status).toBe(200)
    await drainJobs()
    expect((await ctx.author('GET', `/api/kits/${kitId}`)).body.artifacts.find((a: { id: string }) => a.id === qr.id).basedOn).toBe(2)
  })

  it('AI soạn thêm một bài học cho Tài liệu nhanh, căn cứ là nội dung gốc', async () => {
    const k = (await ctx.author('GET', `/api/kits/${kitId}`)).body
    const qr = k.artifacts.find((a: { type: string }) => a.type === 'qr')
    const r = await ctx.author('POST', `/api/artifacts/${qr.id}/lessons/generate`, { title: 'Rollback khi có sự cố', instruction: 'các bước và thời hạn' })
    expect(r.status).toBe(200)
    expect(r.body.lesson).toMatchObject({ kind: 'lesson', title: 'Rollback khi có sự cố' })
    expect(r.body.lesson.blocks.length).toBeGreaterThan(1)
    expect((await ctx.reviewer('POST', `/api/artifacts/${qr.id}/lessons/generate`, { title: 'x x' })).status).toBe(403)
  })

  it('autosaves edits and publishes a version', async () => {
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
