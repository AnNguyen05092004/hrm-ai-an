import crypto from 'node:crypto'
import http from 'node:http'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'
import { setupApp } from './helpers.js'
import { deliverOutbox } from '../src/lib/integrations.js'
import { quizSkipReason } from '../src/modules/kits/scorm.js'

type Hit = { url: string; headers: http.IncomingHttpHeaders; body: string }

describe('Tích hợp: xAPI, webhook, SCORM', () => {
  const ctx = setupApp()
  const hits: Hit[] = []
  let fail = false
  let server: http.Server
  let base = ''

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = ''
      req.on('data', (c) => { body += c })
      req.on('end', () => { hits.push({ url: req.url ?? '', headers: req.headers, body }); res.statusCode = fail ? 500 : 200; res.end('{}') })
    })
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  })
  afterAll(() => { server.close() })

  it('lưu cài đặt, không trả mật khẩu về trình duyệt, gửi thử được', async () => {
    const r = await ctx.author('PATCH', '/api/settings/integrations', {
      xapi: { enabled: true, endpoint: `${base}/xapi`, username: 'lms', password: 's3cret' },
      webhook: { enabled: true, url: `${base}/hook`, secret: 'k3y' },
    })
    expect(r.status).toBe(200)
    expect(JSON.stringify(r.body)).not.toContain('s3cret')
    expect(JSON.stringify(r.body)).not.toContain('k3y')
    expect((await ctx.author('PATCH', '/api/settings/integrations', { webhook: { enabled: true, url: 'ftp://x', secret: '' } })).status).toBe(400)
    expect((await ctx.learner('GET', '/api/settings/integrations')).status).toBe(403)
    const t = await ctx.author('POST', '/api/settings/integrations/test', { target: 'xapi' })
    expect(t.body.ok).toBe(true)
    const sent = hits.at(-1)!
    expect(sent.url).toBe('/xapi/statements')
    expect(sent.headers['x-experience-api-version']).toBe('1.0.3')
    expect(sent.headers.authorization).toBe(`Basic ${Buffer.from('lms:s3cret').toString('base64')}`)
  })

  it('người học xong một phần: gửi statement xAPI và webhook có chữ ký đúng', async () => {
    hits.length = 0
    const my = (await ctx.learner('GET', '/api/learn/my')).body.items as { id: string; type: string; percent: number }[]
    const deck = my.find((x) => x.percent < 100 && ['deck', 'qr', 'video'].includes(x.type))!
    const a = (await ctx.learner('GET', `/api/learn/a/${deck.id}`)).body
    const units: string[] = a.type === 'deck' ? a.slides.map((s: { id: string }) => s.id) : a.type === 'qr' ? a.lessons.filter((l: { kind: string }) => l.kind === 'lesson').map((l: { id: string }) => l.id) : a.type === 'video' ? a.chapters.map((c: { t: number }) => `t${c.t}`) : ['end']
    for (const unit of units) await ctx.learner('POST', `/api/learn/a/${deck.id}/progress`, { unit })
    const r = await deliverOutbox()
    expect(r.sent).toBeGreaterThanOrEqual(2)
    const st = JSON.parse(hits.find((h) => h.url === '/xapi/statements')!.body)
    expect(st.verb.id).toBe('http://adlnet.gov/expapi/verbs/completed')
    expect(st.actor.mbox).toBe('mailto:ha@demo.local')
    expect(st.object.definition.name['vi-VN']).toBe(a.title)
    const hook = hits.find((h) => h.url === '/hook')!
    expect(JSON.parse(hook.body).event).toBe('artifact.completed')
    expect(hook.headers['x-lms-signature']).toBe(`sha256=${crypto.createHmac('sha256', 'k3y').update(hook.body).digest('hex')}`)
  })

  it('đích lỗi: ghi lỗi và hẹn thử lại, không mất sự kiện', async () => {
    fail = true
    await ctx.author('POST', '/api/settings/integrations/test', { target: 'webhook' })
    const my = (await ctx.learner('GET', '/api/learn/my')).body.items as { id: string; type: string; percent: number }[]
    const other = my.find((x) => x.percent < 100 && x.type !== 'scenario' && x.type !== 'exam')
    if (other) {
      const a = (await ctx.learner('GET', `/api/learn/a/${other.id}`)).body
      const units: string[] = a.type === 'deck' ? a.slides.map((s: { id: string }) => s.id) : a.type === 'qr' ? a.lessons.filter((l: { kind: string }) => l.kind === 'lesson').map((l: { id: string }) => l.id) : a.type === 'video' ? a.chapters.map((c: { t: number }) => `t${c.t}`) : (a.steps ?? []).map((_: unknown, i: number) => `s${i}`)
      for (const unit of units) await ctx.learner('POST', `/api/learn/a/${other.id}/progress`, { unit })
      const r = await deliverOutbox()
      expect(r.failed).toBeGreaterThan(0)
      const log = (await ctx.author('GET', '/api/settings/integrations/log')).body as { deliveredAt: string | null; attempts: number; error: string | null }[]
      const bad = log.find((x) => !x.deliveredAt)!
      expect(bad.attempts).toBe(1)
      expect(bad.error).toContain('500')
      expect((await deliverOutbox()).failed).toBe(0) // chưa tới hạn thử lại
    }
    fail = false
  })

  it('xuất SCORM 1.2: có manifest, dữ liệu bản đã xuất bản, không có đề kiểm tra chính thức', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'scorm-'))
    mkdirSync(path.join(dir, 'assets'))
    writeFileSync(path.join(dir, 'scorm.html'), '<!doctype html><script src="./course.js"></script>')
    writeFileSync(path.join(dir, 'assets', 'player.js'), 'console.log(1)')
    process.env.SCORM_PLAYER_DIR = dir
    const kits = (await ctx.author('GET', '/api/kits')).body as { id: string; title: string; artifacts: { type: string; title: string; publishedVersion: number | null }[] }[]
    const k = kits.find((x) => x.artifacts.filter((a) => a.publishedVersion).length >= 2)!
    const info = (await ctx.author('GET', `/api/kits/${k.id}/export/scorm/info`)).body
    expect(info.included.length).toBeGreaterThan(0)
    const res = await ctx.app.inject({ method: 'GET', url: `/api/kits/${k.id}/export/scorm`, headers: { cookie: ctx.authorCookie } })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/zip')
    const files = unzipSync(new Uint8Array(res.rawPayload))
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['imsmanifest.xml', 'index.html', 'course.js', 'assets/player.js']))
    const manifest = strFromU8(files['imsmanifest.xml'])
    expect(manifest).toContain('<schemaversion>1.2</schemaversion>')
    expect(manifest).toContain('adlcp:scormtype="sco"')
    const course = JSON.parse(strFromU8(files['course.js']).replace(/^window\.COURSE = /, '').replace(/;\s*$/, ''))
    expect(course.items.length).toBe(info.included.length)
    expect(course.items.some((x: { type: string }) => x.type === 'exam')).toBe(false)
    delete process.env.SCORM_PLAYER_DIR
  })

  it('nói đúng lý do bài kiểm tra trong Tài liệu nhanh không vào gói SCORM', () => {
    expect(quizSkipReason({ mode: 'official', questions: [] })).toMatch(/chính thức/)
    expect(quizSkipReason({ mode: 'practice', questions: [{ type: 'mc', approved: false }] })).toMatch(/Chưa duyệt/)
    expect(quizSkipReason({ mode: 'practice', questions: [{ type: 'essay', approved: true }] })).toMatch(/tự luận/)
  })
})
