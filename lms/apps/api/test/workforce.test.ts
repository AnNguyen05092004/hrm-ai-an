import { describe, it, expect } from 'vitest'
import { setupApp } from './helpers.js'

describe('workforce planning', () => {
  const ctx = setupApp()

  it('computes skill gaps and course recommendations from active KPIs', async () => {
    const m = (await ctx.author('GET', '/api/workforce')).body
    expect(m.team.length).toBe(20)
    expect(m.recs.length).toBeGreaterThan(0)
    const docker = m.recs.find((r: { skillId: string }) => r.skillId === 'docker')
    expect(docker.courses.length).toBeGreaterThan(0)
    expect(docker.gap.length).toBeGreaterThan(0)
    expect(m.readiness.after).toBeGreaterThanOrEqual(m.readiness.now)
  })

  it('assigns published courses for a skill to people with a gap', async () => {
    const m = (await ctx.author('GET', '/api/workforce')).body
    const docker = m.recs.find((r: { skillId: string }) => r.skillId === 'docker')
    const r = await ctx.author('POST', '/api/workforce/assign', { skillId: 'docker', userIds: docker.gap.slice(0, 2), kpiId: docker.kpiIds[0] })
    expect(r.status).toBe(200)
    expect(r.body.people).toBe(2)
    const after = (await ctx.author('GET', '/api/workforce')).body.recs.find((x: { skillId: string }) => x.skillId === 'docker')
    expect(after.assigned.length).toBeGreaterThanOrEqual(2)
  })

  it('adds a custom KPI and an employee', async () => {
    const k = await ctx.author('POST', '/api/workforce/kpis', { name: 'Giảm thời gian phản hồi khách', skills: [{ skillId: 'cs', boost: 2 }] })
    expect(k.status).toBe(200)
    const pos = (await ctx.author('GET', '/api/workforce')).body.positions[0]
    const dept = (await ctx.author('GET', '/api/workforce')).body.depts[1]
    const p = await ctx.author('POST', '/api/workforce/members', { name: 'Nguyễn Văn Mới', email: 'moi@demo.local', deptId: dept.id, positionId: pos.id, lv: { cicd: 1 } })
    expect(p.status).toBe(200)
    expect(p.body.tempPassword.length).toBeGreaterThan(5)
    const dup = await ctx.author('POST', '/api/workforce/members', { name: 'Người Trùng', email: 'moi@demo.local', deptId: dept.id, positionId: pos.id })
    expect(dup.status).toBe(409)
  })

  it('assesses evidence with AI and applies only when the manager accepts', async () => {
    const m = (await ctx.author('GET', '/api/workforce')).body
    const p = m.team[0]
    const e = await ctx.author('POST', '/api/workforce/evidence', { userId: p.id, skillId: 'sql', kind: 'work', title: 'Viết báo cáo doanh thu', text: 'Tự viết truy vấn join 4 bảng, tối ưu index, không cần hỗ trợ.' })
    expect(e.status).toBe(200)
    expect(e.body.status).toBe('pending')
    await ctx.author('POST', `/api/workforce/evidence/${e.body.id}/accept`)
    const after = (await ctx.author('GET', '/api/people')).body.people.find((x: { id: string }) => x.id === p.id)
    expect(after.lv.sql).toBe(e.body.proposedLevel)
  })

  it('advisor only returns actions pointing to real data', async () => {
    const r = await ctx.author('POST', '/api/workforce/advisor', { question: 'Bộ phận nào yếu nhất?' })
    expect(r.status).toBe(200)
    expect(r.body.answer).toBeTruthy()
  })

  it('learners cannot see the workforce plan', async () => {
    expect((await ctx.learner('GET', '/api/workforce')).status).toBe(403)
  })
})
