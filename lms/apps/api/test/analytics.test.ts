import { describe, it, expect } from 'vitest'
import { setupApp } from './helpers.js'

type Person = { userId: string; name: string; docs: number; doneDocs: number; percent: number; started: boolean; overdue: boolean; exam: { attempts: number } }
type KitRow = { kitId: string; people: Person[]; started: number; done: number; avgPercent: number | null }

describe('analytics by course and by person', () => {
  const ctx = setupApp()
  const kits = async (): Promise<Record<string, KitRow>> => (await ctx.author('GET', '/api/analytics')).body.kits

  it('counts people per course (not assignments) and lists who they are', async () => {
    const all = await kits()
    const withHa = Object.values(all).filter((k) => k.people.some((p) => p.userId === ctx.ids.learnerId))
    expect(withHa.length).toBeGreaterThan(0)
    for (const k of Object.values(all)) {
      expect(new Set(k.people.map((p) => p.userId)).size).toBe(k.people.length)
      expect(k.started).toBeLessThanOrEqual(k.people.length)
    }
    // Hà được giao 2 tài liệu của khóa An toàn thông tin: một dòng người, 2 tài liệu
    const sec = withHa.find((k) => k.people.find((p) => p.userId === ctx.ids.learnerId)!.docs >= 2)!
    expect(sec.people.find((p) => p.userId === ctx.ids.learnerId)!.docs).toBeGreaterThanOrEqual(2)
  })

  it('reflects learner progress in the course row and the person detail', async () => {
    const items = (await ctx.learner('GET', '/api/learn/my')).body.items as { id: string; type: string; kitId: string }[]
    const qr = items.find((x) => x.type === 'qr')!
    const a = (await ctx.learner('GET', `/api/learn/a/${qr.id}`)).body
    await ctx.learner('POST', `/api/learn/a/${qr.id}/progress`, { unit: a.lessons[0].id })
    const me = (await kits())[qr.kitId].people.find((p) => p.userId === ctx.ids.learnerId)!
    expect(me.started).toBe(true)
    expect(me.percent).toBeGreaterThan(0)

    const d = await ctx.author('GET', `/api/analytics/kits/${qr.kitId}/people/${ctx.ids.learnerId}`)
    expect(d.status).toBe(200)
    expect(d.body.user.name).toBe('Phạm Thu Hà')
    const it = d.body.items.find((x: { id: string }) => x.id === qr.id)
    expect(it).toMatchObject({ assigned: true, steps: 1 })
    expect(it.percent).toBeGreaterThan(0)
    expect(d.body.summary.percent).toBe(me.percent)
    // xem dữ liệu học tập của một người được ghi nhật ký
    const log = (await ctx.author('GET', '/api/audit')).body as { action: string; target: string }[]
    expect(log.some((x) => x.action === 'analytics.person_view' && x.target === ctx.ids.learnerId)).toBe(true)
  })

  it('shows exam attempts and the assignment in the person detail', async () => {
    const list = (await ctx.author('GET', '/api/grading')).body as { id: string; who: string; artifactId: string }[]
    const khanh = list.find((x) => x.who === 'Hoàng Gia Khánh')!
    const art = (await ctx.author('GET', `/api/artifacts/${khanh.artifactId}`)).body
    const g = (await ctx.author('GET', `/api/grading/${khanh.id}`)).body
    const d = (await ctx.author('GET', `/api/analytics/kits/${art.kitId}/people/${g.userId}`)).body
    expect(d.attempts[0]).toMatchObject({ id: khanh.id, status: 'grading', mode: 'official' })
    expect(d.items.find((x: { id: string }) => x.id === khanh.artifactId)).toMatchObject({ assigned: true, reason: 'Bắt buộc hằng năm · An toàn thông tin' })
    expect(d.summary).toMatchObject({ started: true, exam: { attempts: 1, grading: 1 } })
  })

  it('is for authors only and rejects unknown courses', async () => {
    expect((await ctx.learner('GET', '/api/analytics')).status).toBe(403)
    const k = Object.keys(await kits())[0]
    expect((await ctx.learner('GET', `/api/analytics/kits/${k}/people/${ctx.ids.learnerId}`)).status).toBe(403)
    expect((await ctx.author('GET', `/api/analytics/kits/khong-co/people/${ctx.ids.learnerId}`)).status).toBe(404)
  })
})
