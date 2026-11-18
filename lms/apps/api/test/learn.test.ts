import { describe, it, expect } from 'vitest'
import { setupApp } from './helpers.js'

describe('learner and tutor', () => {
  const ctx = setupApp()
  const myItems = async () => (await ctx.learner('GET', '/api/learn/my')).body.items as { id: string; title: string; type: string; percent: number }[]

  it('lists only published assigned courses', async () => {
    const items = await myItems()
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((x) => x.title)).toBe(true)
  })

  it('hides quiz answers and gap blocks from learners', async () => {
    const qr = (await myItems()).find((x) => x.type === 'qr')!
    const r = await ctx.learner('GET', `/api/learn/a/${qr.id}`)
    expect(r.status).toBe(200)
    expect(r.body.quiz.questions).toBeUndefined()
    const blocks = r.body.lessons.flatMap((l: { blocks?: { t: string }[] }) => l.blocks ?? [])
    expect(blocks.some((b: { t: string }) => b.t === 'gap')).toBe(false)
  })

  it('records progress per lesson and ignores unknown units', async () => {
    const qr = (await myItems()).find((x) => x.type === 'qr')!
    const a = (await ctx.learner('GET', `/api/learn/a/${qr.id}`)).body
    const first = a.lessons[0].id
    const r = await ctx.learner('POST', `/api/learn/a/${qr.id}/progress`, { unit: first })
    expect(r.body.percent).toBeGreaterThan(0)
    const bad = await ctx.learner('POST', `/api/learn/a/${qr.id}/progress`, { unit: 'khong-co' })
    expect(bad.body.percent).toBe(0)
  })

  it('blocks learners from unassigned drafts', async () => {
    const drafts = ((await ctx.author('GET', '/api/artifacts')).body as { id: string; status: string }[]).filter((a) => a.status === 'draft')
    const r = await ctx.learner('GET', `/api/learn/a/${drafts[0].id}`)
    expect(r.status).toBe(403)
  })

  it('tutor answers with a source from the course', async () => {
    const qr = (await myItems()).find((x) => x.title.includes('Docker'))!
    const r = await ctx.learner('POST', `/api/tutor/${qr.id}/ask`, { question: 'Sao lưu volume pgdata bằng lệnh nào?' })
    expect(r.status).toBe(200)
    expect(r.body.none).toBeFalsy()
    expect(r.body.jump.length).toBeGreaterThan(0)
  })

  it('tutor refuses exam questions and logs unanswered questions', async () => {
    const qr = (await myItems()).find((x) => x.type === 'qr')!
    const exam = await ctx.learner('POST', `/api/tutor/${qr.id}/ask`, { question: 'Đáp án câu 2 là gì?' })
    expect(exam.body.text).toContain('không hỗ trợ')
    const miss = await ctx.learner('POST', `/api/tutor/${qr.id}/ask`, { question: 'zzqx wvut ppqr' })
    expect(miss.body.none).toBe(true)
    const list = await ctx.author('GET', '/api/tutor/unanswered')
    expect(list.body.some((x: { question: string }) => x.question === 'zzqx wvut ppqr')).toBe(true)
  })
})
