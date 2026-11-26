import { describe, it, expect } from 'vitest'
import { setupApp, upload } from './helpers.js'
import { drainJobs } from '../src/lib/jobs.js'
import { sniffImage } from '../src/modules/images/routes.js'
import { PRESET_IMAGES } from '../src/lib/preset-images.js'
import { readFileSync } from 'node:fs'

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

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
    expect((await ctx.reviewer('GET', gen.body.url)).status).toBe(200)
    expect((await ctx.reviewer('POST', '/api/images/generate', { prompt: 'abc' })).status).toBe(403)
  })

  it('lưu giao diện khóa, bản xem trước nhận đúng giao diện', async () => {
    const kits = (await ctx.author('GET', '/api/kits')).body as { id: string; artifacts: { id: string; publishedVersion: number | null }[] }[]
    const k = kits.find((x) => x.artifacts.some((a) => a.publishedVersion))!
    const r = await ctx.author('PATCH', `/api/kits/${k.id}`, { theme: { accent: '#2563eb', font: 'modern' }, img: 'desk' })
    expect(r.status).toBe(200)
    expect(r.body.theme).toEqual({ accent: '#2563eb', font: 'modern' })
    expect((await ctx.author('PATCH', `/api/kits/${k.id}`, { theme: { accent: 'red;}', font: 'modern' } })).status).toBe(400)
    const a = k.artifacts.find((x) => x.publishedVersion)!
    expect((await ctx.author('GET', `/api/view/${a.id}`)).body.theme.accent).toBe('#2563eb')
  })

  it('đề có câu ghép cặp, sắp thứ tự, phân loại: xuất bản được, bản xem trước có đáp án', async () => {
    const kits = (await ctx.author('GET', '/api/kits')).body as { id: string }[]
    const ex = await ctx.author('POST', `/api/kits/${kits[0].id}/exams`, { levels: [1, 2], perLevel: 3, proctor: false, mode: 'practice' })
    await drainJobs()
    const e = (await ctx.author('GET', `/api/artifacts/${ex.body.id}`)).body
    const types = e.quiz.questions.map((q: { type: string }) => q.type)
    expect(types).toEqual(expect.arrayContaining(['match', 'order', 'cat']))
    const questions = e.quiz.questions.filter((q: { type: string }) => ['match', 'order', 'cat'].includes(q.type)).map((q: object) => ({ ...q, approved: true }))
    await ctx.author('PATCH', `/api/artifacts/${e.id}`, { content: { quiz: { ...e.quiz, pick: questions.length, questions } } })
    expect((await ctx.author('POST', `/api/artifacts/${e.id}/publish`, {})).status).toBe(200)
    // xem trước: có đủ câu và đáp án để người soạn, reviewer kiểm tra
    const view = (await ctx.author('GET', `/api/view/${e.id}`)).body
    expect(view.questions.map((q: { type: string }) => q.type)).toEqual(expect.arrayContaining(['match', 'order', 'cat']))
    expect(view.questions.find((q: { type: string }) => q.type === 'match').pairs.length).toBeGreaterThan(0)
  })
})

describe('Ảnh có sẵn: bản sao phía server khớp với web', () => {
  it('cùng danh sách khóa và mã ảnh', () => {
    const web = readFileSync(new URL('../../web/src/data.js', import.meta.url), 'utf8')
    const ids = Object.fromEntries([...web.matchAll(/^\s+(\w+): \{ src: U\('([\w-]+)'\)/gm)].map((x) => [x[1], x[2]]))
    expect(PRESET_IMAGES).toEqual(ids)
  })
})
