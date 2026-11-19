import { describe, it, expect } from 'vitest'
import { setupApp, loginAs, type Client } from './helpers.js'
import { drainJobs } from '../src/lib/jobs.js'

type Art = { id: string; type: string; status: string; publishedVersion: number | null }
type Kit = { id: string; title: string; artifacts: Art[] }

describe('Share a whole kit, separate exam, learner course view', () => {
  const ctx = setupApp()
  let kit: Kit
  let other: Client
  let otherId = ''
  let examId = ''

  it('setup: pick a kit and a learner with no assignments in it', async () => {
    const kits = (await ctx.author('GET', '/api/kits')).body as Kit[]
    kit = kits.find((k) => k.artifacts.length >= 2 && k.artifacts.some((a) => a.type === 'qr'))!
    expect(kit).toBeTruthy()
    const { people } = (await ctx.author('GET', '/api/people')).body as { people: { id: string; email: string; role: string }[] }
    const p = people.find((x) => x.role === 'learner' && x.email !== 'ha@demo.local')!
    otherId = p.id
    other = await loginAs(ctx.app, p.email)
  })

  it('creates a separate exam with AI-drafted questions per level', async () => {
    const r = await ctx.author('POST', `/api/kits/${kit.id}/exams`, { levels: [1, 2], perLevel: 3, minutes: 20, passScore: 70 })
    expect(r.status).toBe(200)
    examId = r.body.id
    await drainJobs()
    const e = (await ctx.author('GET', `/api/artifacts/${examId}`)).body
    expect(e.type).toBe('exam')
    expect(e.status).toBe('draft')
    expect(e.quiz.questions).toHaveLength(6)
    expect(e.quiz).toMatchObject({ mode: 'official', minutes: 20, passScore: 70, proctor: true })
    // chưa duyệt câu nào thì không xuất bản được
    expect((await ctx.author('POST', `/api/artifacts/${examId}/publish`, {})).status).toBe(400)
    const questions = e.quiz.questions.map((q: Record<string, unknown>) => ({ ...q, approved: true }))
    expect((await ctx.author('PATCH', `/api/artifacts/${examId}`, { content: { quiz: { ...e.quiz, questions } } })).status).toBe(200)
  })

  it('publishes the whole kit at once and reports what was skipped', async () => {
    const st = (await ctx.author('GET', `/api/kits/${kit.id}/share`)).body
    expect(st.items.length).toBeGreaterThanOrEqual(3)
    const r = await ctx.author('POST', `/api/kits/${kit.id}/publish-all`, {})
    expect(r.status).toBe(200)
    expect(r.body.published).toContain(examId)
    // lần hai không có gì đổi
    const again = (await ctx.author('POST', `/api/kits/${kit.id}/publish-all`, {})).body
    expect(again.published).toHaveLength(0)
  })

  it('learner without assignment cannot open the course until it is assigned or linked', async () => {
    expect((await other('GET', `/api/learn/kit/${kit.id}`)).status).toBe(403)
    const a = await ctx.author('POST', `/api/kits/${kit.id}/assign`, { userIds: [otherId] })
    expect(a.status).toBe(200)
    expect(a.body.artifacts).toBeGreaterThanOrEqual(2)
    const c = (await other('GET', `/api/learn/kit/${kit.id}`)).body
    expect(c.items.length).toBe(a.body.artifacts)
    expect(c.items[c.items.length - 1].type).toBe('exam') // kiểm tra nằm cuối khóa
    const my = (await other('GET', '/api/learn/my')).body
    expect(my.items.filter((x: { kitId: string }) => x.kitId === kit.id)).toHaveLength(a.body.artifacts)
    // thi đề riêng bằng luồng thi chung
    const info = (await other('GET', `/api/exams/a/${examId}`)).body
    expect(info.count).toBeGreaterThan(0)
  })

  it('kit link lets any colleague open every published item', async () => {
    const ha = ctx.learner
    const r = await ctx.author('POST', `/api/kits/${kit.id}/share`, { on: true })
    expect(r.body.shareSlug).toBeTruthy()
    const { id } = (await ha('GET', `/api/learn/k/${r.body.shareSlug}`)).body
    expect(id).toBe(kit.id)
    expect((await ha('GET', `/api/learn/kit/${kit.id}`)).status).toBe(200)
    await ctx.author('POST', `/api/kits/${kit.id}/share`, { on: false })
    expect((await ha('GET', `/api/learn/k/${r.body.shareSlug}`)).status).toBe(404)
  })

  it('exam questions never leak into learner content', async () => {
    const c = (await other('GET', `/api/learn/a/${examId}`)).body
    expect(JSON.stringify(c)).not.toContain('"ok"')
    expect(c.quiz.questions).toBeUndefined()
  })
})
