import { describe, it, expect } from 'vitest'
import { setupApp } from './helpers.js'

describe('AI edit of a block / slide', () => {
  const ctx = setupApp()

  it('returns edited content and keeps id, type, source and slide formatting', async () => {
    const deck = ((await ctx.author('GET', '/api/artifacts')).body as { id: string; type: string }[]).find((a) => a.type === 'deck')!
    const slide = { id: 's-1', layout: 'bullets', title: 'Tiêu đề', items: ['Ý một'], notes: 'Lời đọc', st: { title: { color: '#2563eb' } }, boxes: [{ id: 'b', x: 1, y: 1, w: 20, text: 'Hộp' }], src: 'file · mục' }
    const r = await ctx.author('POST', `/api/artifacts/${deck.id}/ai-edit`, { kind: 'slide', value: slide, instruction: 'Viết ngắn gọn hơn' })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ id: 's-1', layout: 'bullets', src: 'file · mục', st: { title: { color: '#2563eb' } } })
    expect(r.body.boxes).toHaveLength(1)
  })

  it('rejects learners', async () => {
    const deck = ((await ctx.author('GET', '/api/artifacts')).body as { id: string; type: string }[]).find((a) => a.type === 'deck')!
    expect((await ctx.learner('POST', `/api/artifacts/${deck.id}/ai-edit`, { kind: 'block', value: { t: 'para', p: 'x' }, instruction: 'Sửa' })).status).toBe(403)
  })
})
