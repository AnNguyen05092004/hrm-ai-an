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

  it('draws background images, inserted images, shapes and element opacity in the rendered frame', () => {
    const pic = 'data:image/png;base64,AAAA'
    const s = {
      layout: 'bullets', title: 'Tiêu đề', items: ['Ý một'], bgImg: 'desk', bgTone: 'dark', st: { title: { u: true } },
      boxes: [
        { id: 'p', kind: 'img', img: 'desk', x: 10, y: 10, w: 20, h: 30, r: true },
        { id: 'r', kind: 'shape', shape: 'round', x: 40, y: 10, w: 20, h: 20, fill: '#fde68a', stroke: '#111827', sw: 4, op: 0.5 },
        { id: 'c', kind: 'shape', shape: 'circle', x: 70, y: 10, w: 10, h: 18, fill: '#bbf7d0' },
        { id: 'a', kind: 'shape', shape: 'arrow', x: 10, y: 70, w: 40, stroke: '#2563eb', sw: 3 },
        { id: 'x', kind: 'shape', shape: 'rect', x: 0, y: 0, w: 5, h: 5, fill: '"/><script>' },
      ],
    }
    const svg = slideSvg(s, 1, 1, '#ff6119', null, { bg: pic, 'el:p': pic })
    expect(svg.match(/<image /g)).toHaveLength(2) // ảnh nền + ảnh chèn
    expect(svg).toContain('fill="#0f172a" fill-opacity="0.6"') // lớp phủ tối
    expect(svg).toContain('fill="#f8fafc"') // chữ mặc định chuyển sáng trên nền tối
    expect(svg).toContain('text-decoration="underline"')
    expect(svg).toContain('<g opacity="0.5">')
    expect(svg).toContain('<ellipse')
    expect(svg).toContain('<polygon') // đầu mũi tên
    expect(svg).not.toContain('<script>')
    // ảnh chưa tải được thì bỏ qua phần tử, không làm hỏng khung hình; slide cũ không có phần tử mới vẫn dựng như trước
    expect(slideSvg({ ...s, boxes: [s.boxes[0]] }, 1, 1).match(/<image /g)).toBeNull()
    expect(slideSvg({ layout: 'bullets', title: 'x', items: ['a'] }, 1, 1)).not.toContain('fill-opacity')
  })

  it('rotates elements around their centre and applies chosen fonts', () => {
    const svg = slideSvg({ layout: 'bullets', title: 'Tiêu đề', items: ['Ý'], font: 'lora', st: { title: { font: 'mono' } },
      boxes: [{ id: 'r', kind: 'shape', shape: 'rect', x: 10, y: 10, w: 20, h: 20, fill: '#fde68a', rot: 45 }, { id: 't', x: 50, y: 50, w: 30, text: 'Chữ', font: 'script', rot: -30 }, { id: 'z', kind: 'shape', shape: 'rect', x: 0, y: 0, w: 5, h: 5, rot: '1)"/><script>' }] }, 1, 1)
    expect(svg).toContain('rotate(45 256.0 144.0)') // tâm hình: x 10%+10% của 1280, y 10%+10% của 720
    expect(svg).toMatch(/rotate\(-30 /)
    expect(svg).toMatch(/<svg[^>]*font-family="Lora, Georgia, serif"/)
    expect(svg).toContain(`font-family="'Roboto Mono', 'Courier New', monospace"`)
    expect(svg).toContain(`font-family="'Dancing Script'`)
    expect(svg).not.toContain('<script>')
    // font lạ bị bỏ qua
    expect(slideSvg({ layout: 'bullets', title: 'x', items: [], font: 'x" onload="' }, 1, 1)).not.toContain('onload')
    expect(slideSvg({ layout: 'bullets', title: 'x', items: [], font: 'toString' }, 1, 1)).toContain('font-family="Arial, Helvetica, sans-serif"')
  })

  it('voice preview needs real AI and an author', async () => {
    expect((await ctx.author('POST', '/api/tts', { text: 'Xin chào' })).status).toBe(400)
    expect((await ctx.learner('POST', '/api/tts', { text: 'Xin chào' })).status).toBe(403)
  })
})
