import { describe, it, expect } from 'vitest'
import { setupApp } from './helpers.js'
import { seedGrading } from '../src/db/seed-grading.js'

describe('exams and grading', () => {
  const ctx = setupApp()
  let aid = ''
  let attemptId = ''

  it('seeds two demo attempts waiting for a grader, once', async () => {
    const list = (await ctx.author('GET', '/api/grading')).body as { id: string; who: string; essays: number; flags: number }[]
    const demo = list.filter((x) => ['Hoàng Gia Khánh', 'Nguyễn Hải Yến'].includes(x.who))
    expect(demo).toHaveLength(2)
    expect(demo.every((x) => x.essays === 2)).toBe(true)
    expect(demo.find((x) => x.who === 'Nguyễn Hải Yến')!.flags).toBe(2)
    const g = (await ctx.author('GET', `/api/grading/${demo[0].id}`)).body
    expect(g.passScore).toBe(80)
    expect(g.grades['sec-q5'].ai.criteria).toHaveLength(4)
    expect(await seedGrading(ctx.ids.orgId, ctx.ids.authorId)).toBe(0)
    // hai người thi mẫu cũng là người được giao đề
    const kits = (await ctx.author('GET', '/api/analytics')).body.kits as Record<string, { people: { name: string }[] }>
    const names = Object.values(kits).flatMap((k) => k.people.map((p) => p.name))
    expect(names).toEqual(expect.arrayContaining(['Hoàng Gia Khánh', 'Nguyễn Hải Yến']))
  })

  it('requires consent for proctored official exams', async () => {
    const items = (await ctx.learner('GET', '/api/learn/my')).body.items as { id: string; title: string; type: string }[]
    aid = items.find((x) => x.type === 'qr' && x.title.includes('Docker'))!.id
    const info = await ctx.learner('GET', `/api/exams/a/${aid}`)
    expect(info.body).toMatchObject({ mode: 'official', proctor: true, used: 0 })
    const r = await ctx.learner('POST', `/api/exams/a/${aid}/start`, { consent: false })
    expect(r.status).toBe(400)
    expect(r.body.error.code).toBe('consent_required')
  })

  it('builds a personal paper from approved questions without leaking answers', async () => {
    const r = await ctx.learner('POST', `/api/exams/a/${aid}/start`, { consent: true })
    expect(r.status).toBe(200)
    attemptId = r.body.id
    const again = await ctx.learner('POST', `/api/exams/a/${aid}/start`, { consent: true })
    expect(again.body).toMatchObject({ id: attemptId, resumed: true })
    const a = (await ctx.learner('GET', `/api/exams/attempts/${attemptId}`)).body
    expect(a.questions.length).toBe(3)
    const raw = JSON.stringify(a.questions)
    expect(raw).not.toContain('"ok"')
    expect(raw).not.toContain('rubric')
  })

  it('turns the tutor off during an official exam', async () => {
    const r = await ctx.learner('POST', `/api/tutor/${aid}/ask`, { question: 'bind mount là gì' })
    expect(r.body.off).toBe(true)
  })

  it('records proctoring flags and waits for a grader', async () => {
    await ctx.learner('POST', `/api/exams/attempts/${attemptId}/flags`, { kind: 'tab' })
    const a = (await ctx.learner('GET', `/api/exams/attempts/${attemptId}`)).body
    const answers: Record<string, unknown> = {}
    for (const q of a.questions) answers[q.id] = q.type === 'essay' ? 'Dùng named volume cho cơ sở dữ liệu vì lưu bền, bind mount cho web app khi phát triển vì sửa là thấy ngay' : 0
    expect((await ctx.learner('PATCH', `/api/exams/attempts/${attemptId}`, { answers })).status).toBe(200)
    const before = (await ctx.author('GET', '/api/grading/count')).body.n
    const s = await ctx.learner('POST', `/api/exams/attempts/${attemptId}/submit`)
    expect(s.body.status).toBe('grading')
    expect(s.body.score).toBeNull()
    expect((await ctx.author('GET', '/api/grading/count')).body.n).toBe(before + 1)
  })

  it('grader must resolve flags, then the official pass raises the skill level', async () => {
    const g = (await ctx.author('GET', `/api/grading/${attemptId}`)).body
    const scores = Object.fromEntries(g.questions.map((q: { id: string }) => [q.id, 1]))
    const blocked = await ctx.author('POST', `/api/grading/${attemptId}/confirm`, { scores })
    expect(blocked.status).toBe(400)
    const r = await ctx.author('POST', `/api/grading/${attemptId}/confirm`, { scores, flags: { 0: 'ok' } })
    expect(r.status).toBe(200)
    expect(r.body.status).toBe('passed')
    expect(r.body.skill.to).toBe(2)
    const my = await ctx.learner('GET', '/api/learn/my')
    expect(my.body.skills.find((s: { skillId: string }) => s.skillId === 'docker').level).toBe(2)
  })

  it('learners cannot grade', async () => {
    expect((await ctx.learner('GET', '/api/grading')).status).toBe(403)
  })
})
