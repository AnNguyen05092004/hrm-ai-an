import { describe, it, expect } from 'vitest'
import { setupApp, upload } from './helpers.js'
import { drainJobs } from '../src/lib/jobs.js'
import { gradeArrange } from '../src/modules/exams/grade.js'
import { sniffImage } from '../src/modules/images/routes.js'
import { PRESET_IMAGES } from '../src/lib/preset-images.js'
import { readFileSync } from 'node:fs'

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

describe('Kéo thả: chấm từng phần', () => {
  it('match, order, cat cho điểm theo số vị trí đúng', () => {
    const m = { type: 'match', pairs: [{ l: 'a', r: '1' }, { l: 'b', r: '2' }, { l: 'c', r: '3' }, { l: 'd', r: '4' }] }
    expect(gradeArrange(m, { 0: '1', 1: '2', 2: '4', 3: '3' })).toMatchObject({ score: 0.5, correct: false })
    expect(gradeArrange(m, { 0: '1', 1: '2', 2: '3', 3: '4' })).toMatchObject({ score: 1, correct: true })
    const o = { type: 'order', items: ['x', 'y', 'z'], opts: ['z', 'y', 'x'] }
    expect(gradeArrange(o, ['x', 'y', 'z']).correct).toBe(true)
    expect(gradeArrange(o, undefined).score).toBeCloseTo(0.33, 2) // chưa kéo: thứ tự đang hiển thị là câu trả lời
    const c = { type: 'cat', groups: [{ name: 'A', items: ['1', '2'] }, { name: 'B', items: ['3'] }] }
    expect(gradeArrange(c, { 1: 'A', 2: 'B', 3: 'B' })).toMatchObject({ score: 0.67, correct: false })
    expect(gradeArrange(c, {}).score).toBe(0)
  })
})

describe('Ảnh, giao diện khóa, đề có câu kéo thả', () => {
  const ctx = setupApp()

  it('nhận diện ảnh theo byte đầu tệp, không theo đuôi tệp', () => {
    expect(sniffImage(PNG)).toBe('image/png')
    expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull()
  })

  it('tải ảnh lên, AI tạo ảnh (giả lập), chỉ người cùng công ty xem được', async () => {
    const up = await upload(ctx.app, ctx.authorCookie, '/api/images', 'logo.png', PNG, 'image/png')
    expect(up.status).toBe(200)
    expect(up.body.url).toMatch(/^\/api\/images\//)
    const fake = await upload(ctx.app, ctx.authorCookie, '/api/images', 'x.png', '<script>alert(1)</script>', 'image/png')
    expect(fake.status).toBe(400)
    const gen = await ctx.author('POST', '/api/images/generate', { prompt: 'Kỹ sư kiểm tra tủ máy chủ' })
    expect(gen.status).toBe(200)
    const list = (await ctx.author('GET', '/api/images')).body
    expect(list.map((x: { kind: string }) => x.kind).sort()).toEqual(['ai', 'upload'])
    expect((await ctx.learner('GET', gen.body.url)).status).toBe(200)
    expect((await ctx.learner('POST', '/api/images/generate', { prompt: 'abc' })).status).toBe(403)
  })

  it('lưu giao diện khóa, người học nhận đúng giao diện', async () => {
    const kits = (await ctx.author('GET', '/api/kits')).body as { id: string; artifacts: { id: string; publishedVersion: number | null }[] }[]
    const k = kits.find((x) => x.artifacts.some((a) => a.publishedVersion))!
    const r = await ctx.author('PATCH', `/api/kits/${k.id}`, { theme: { accent: '#2563eb', font: 'modern' }, img: 'desk' })
    expect(r.status).toBe(200)
    expect(r.body.theme).toEqual({ accent: '#2563eb', font: 'modern' })
    expect((await ctx.author('PATCH', `/api/kits/${k.id}`, { theme: { accent: 'red;}', font: 'modern' } })).status).toBe(400)
    const a = k.artifacts.find((x) => x.publishedVersion)!
    expect((await ctx.author('GET', `/api/learn/a/${a.id}`)).body.theme.accent).toBe('#2563eb')
  })

  it('đề có câu ghép cặp, sắp thứ tự, phân loại: không lộ đáp án, chấm tự động', async () => {
    const kits = (await ctx.author('GET', '/api/kits')).body as { id: string }[]
    const ex = await ctx.author('POST', `/api/kits/${kits[0].id}/exams`, { levels: [1, 2], perLevel: 3, proctor: false, mode: 'practice' })
    await drainJobs()
    const e = (await ctx.author('GET', `/api/artifacts/${ex.body.id}`)).body
    const types = e.quiz.questions.map((q: { type: string }) => q.type)
    expect(types).toEqual(expect.arrayContaining(['match', 'order', 'cat']))
    const questions = e.quiz.questions.filter((q: { type: string }) => ['match', 'order', 'cat'].includes(q.type)).map((q: object) => ({ ...q, approved: true }))
    await ctx.author('PATCH', `/api/artifacts/${e.id}`, { content: { quiz: { ...e.quiz, pick: questions.length, questions } } })
    expect((await ctx.author('POST', `/api/artifacts/${e.id}/publish`, {})).status).toBe(200)
    await ctx.author('POST', '/api/assignments', { artifactId: e.id, userIds: [ctx.ids.learnerId] })
    const st = await ctx.learner('POST', `/api/exams/a/${e.id}/start`, { consent: true })
    expect(st.status).toBe(200)
    const view = (await ctx.learner('GET', `/api/exams/attempts/${st.body.id}`)).body
    const raw = JSON.stringify(view.questions)
    expect(raw).not.toContain('"pairs"')
    expect(raw).not.toContain('"items"')
    const m = view.questions.find((q: { type: string }) => q.type === 'match')
    expect(m.left.length).toBe(m.opts.length)
    // trả lời đúng hết dựa trên đề gốc
    const src = Object.fromEntries(questions.map((q: { id: string }) => [q.id, q]))
    const answers = Object.fromEntries(view.questions.map((q: { id: string; type: string }) => {
      const s = src[q.id] as { pairs?: { r: string }[]; items?: string[]; groups?: { name: string; items: string[] }[] }
      if (q.type === 'match') return [q.id, Object.fromEntries((s.pairs ?? []).map((p, i) => [i, p.r]))]
      if (q.type === 'order') return [q.id, s.items]
      return [q.id, Object.fromEntries((s.groups ?? []).flatMap((g) => g.items.map((x) => [x, g.name])))]
    }))
    await ctx.learner('PATCH', `/api/exams/attempts/${st.body.id}`, { answers })
    const done = (await ctx.learner('POST', `/api/exams/attempts/${st.body.id}/submit`)).body
    expect(done.status).toBe('passed')
    expect(Math.round(done.score)).toBe(100)
  })
})

describe('Ảnh có sẵn: bản sao phía server khớp với web', () => {
  it('cùng danh sách khóa và mã ảnh', () => {
    const web = readFileSync(new URL('../../web/src/data.js', import.meta.url), 'utf8')
    const ids = Object.fromEntries([...web.matchAll(/^\s+(\w+): \{ src: U\('([\w-]+)'\)/gm)].map((x) => [x[1], x[2]]))
    expect(PRESET_IMAGES).toEqual(ids)
  })
})
