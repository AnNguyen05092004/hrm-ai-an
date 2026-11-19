import { describe, it, expect } from 'vitest'
import { setupApp } from './helpers.js'
import { drainJobs } from '../src/lib/jobs.js'
import { slideSvg } from '../src/modules/video/render.js'

describe('AI video from slides', () => {
  const ctx = setupApp()
  let videoId = ''

  it('creates a video from a deck and renders it with captions', async () => {
    const decks = ((await ctx.author('GET', '/api/artifacts')).body as { id: string; type: string }[]).filter((a) => a.type === 'deck')
    const r = await ctx.author('POST', `/api/artifacts/${decks[0].id}/to-video`)
    expect(r.status).toBe(200)
    videoId = r.body.id
    await drainJobs()
    const v = (await ctx.author('GET', `/api/artifacts/${videoId}`)).body
    expect(v.render.status).toBe('done')
    expect(v.chapters.length).toBe(v.slides.length)
    expect(v.transcript.length).toBeGreaterThan(0)
    const vtt = await ctx.app.inject({ method: 'GET', url: v.render.vtt, headers: { cookie: ctx.authorCookie } })
    expect(vtt.statusCode).toBe(200)
    expect(vtt.body.startsWith('WEBVTT')).toBe(true)
  }, 60000)

  it('re-render reuses unchanged segments', async () => {
    const v = (await ctx.author('GET', `/api/artifacts/${videoId}`)).body
    const { slides } = v
    slides[0].notes = 'Lời đọc mới cho đoạn mở đầu.'
    await ctx.author('PATCH', `/api/artifacts/${videoId}`, { content: { ...v, slides } })
    expect((await ctx.author('POST', `/api/artifacts/${videoId}/render`)).status).toBe(200)
    await drainJobs()
    const after = (await ctx.author('GET', `/api/artifacts/${videoId}`)).body
    expect(after.render.reused).toBe(slides.length - 1)
  }, 60000)

  it('blocks media for users who cannot view the artifact', async () => {
    const v = (await ctx.author('GET', `/api/artifacts/${videoId}`)).body
    const r = await ctx.learner('GET', v.render.url)
    expect(r.status).toBe(403)
    const bad = await ctx.author('GET', `/api/media/${videoId}/..%2F..%2Fsecret.mp4`)
    expect(bad.status).toBe(404)
  })

  it('applies slide formatting (move, size, color, text boxes, background) to the rendered frame', () => {
    const svg = slideSvg({ layout: 'bullets', title: 'Tiêu đề', items: ['Ý một'], bg: '#fff7ed', st: { title: { color: '#2563eb', size: 1.5, x: 10 } }, boxes: [{ id: 'b', x: 50, y: 60, w: 30, text: 'Hộp chữ', fill: '#111827', color: '#ffffff' }] }, 1, 1)
    expect(svg).toContain('fill="#fff7ed"')
    expect(svg).toContain('fill="#2563eb"')
    expect(svg).toMatch(/scale\(1\.5\)/)
    expect(svg).toContain('Hộp chữ')
    // màu không hợp lệ bị bỏ qua, không chèn được vào SVG
    expect(slideSvg({ layout: 'bullets', title: 'x', items: [], bg: '"/><script>' }, 1, 1)).not.toContain('<script>')
  })

  it('voice preview needs real AI and an author', async () => {
    expect((await ctx.author('POST', '/api/tts', { text: 'Xin chào' })).status).toBe(400)
    expect((await ctx.learner('POST', '/api/tts', { text: 'Xin chào' })).status).toBe(403)
  })
})
