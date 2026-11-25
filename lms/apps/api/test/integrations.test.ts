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
import { itemXml } from '../src/modules/kits/qti.js'

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

  it('xuất đề kiểm tra kèm đáp án và tiêu chí chấm (QTI 2.1 + exam.json) cho LMS công ty', async () => {
    const kits = (await ctx.author('GET', '/api/kits')).body as { id: string; artifacts: { id: string; type: string; publishedVersion: number | null }[] }[]
    const k = kits.find((x) => x.artifacts.some((a) => a.type === 'exam' && a.publishedVersion))!
    const info = (await ctx.author('GET', `/api/kits/${k.id}/export/scorm/info`)).body
    const ex = info.exams[0] as { id: string; questions: number; manual: number }
    expect(ex.questions).toBeGreaterThan(0)
    const res = await ctx.app.inject({ method: 'GET', url: `/api/kits/${k.id}/export/exam/${ex.id}`, headers: { cookie: ctx.authorCookie } })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-disposition']).toContain('qti21-co-dap-an.zip')
    const files = unzipSync(new Uint8Array(res.rawPayload))
    const items = Object.keys(files).filter((f) => f.startsWith('items/'))
    expect(items.length).toBe(ex.questions)
    expect(strFromU8(files['imsmanifest.xml'])).toContain('type="imsqti_test_xmlv2p1"')
    const test = strFromU8(files['test.xml'])
    expect(test).toMatch(/<selection select="\d+"/)
    expect(test).toContain('PASS_SCORE')
    const exam = JSON.parse(strFromU8(files['exam.json']))
    expect(exam.questions.length).toBe(ex.questions)
    // trắc nghiệm có đáp án đúng, tự luận có tiêu chí và được đánh dấu chấm ngoài
    const mc = exam.questions.find((q: { type: string }) => q.type === 'mc')
    expect(mc.choices.some((c: { correct: boolean }) => c.correct)).toBe(true)
    const essay = exam.questions.find((q: { type: string }) => q.type === 'essay')
    if (essay) {
      expect(essay.rubric.length).toBeGreaterThan(0)
      const xml = strFromU8(files[`items/${essay.id}.xml`])
      expect(xml).toContain('externalScored="human"')
      expect(xml).toContain('<rubricBlock view="scorer">')
    }
    expect(strFromU8(files['huong-dan-cham.md'])).toContain('{{rubric}}')
    // gói có đáp án: ghi nhật ký, người học không tải được
    const log = (await ctx.author('GET', '/api/audit')).body as { action: string; target: string }[]
    expect(log.some((x) => x.action === 'kit.export_exam' && x.target === ex.id)).toBe(true)
    expect((await ctx.learner('GET', `/api/kits/${k.id}/export/exam/${ex.id}`)).status).toBe(403)
    expect((await ctx.author('GET', `/api/kits/${k.id}/export/exam/khong-co`)).status).toBe(404)
  })

  it('QTI chấm từng phần cho ghép cặp và sắp thứ tự, thoát ký tự đặc biệt', () => {
    const m = itemXml({ id: 'q1', type: 'match', q: 'A & B <x>', pairs: [{ l: 'a', r: '1' }, { l: 'b', r: '2' }] })
    expect(m).toContain('<mapEntry mapKey="L0 R0" mappedValue="0.5"/>')
    expect(m).toContain('A &amp; B &lt;x&gt;')
    const o = itemXml({ id: 'q2', type: 'order', q: 'Thứ tự', items: ['x', 'y', 'z'] })
    expect(o).toContain('cardinality="ordered"')
    expect((o.match(/<index n=/g) ?? []).length).toBe(3)
    const f = itemXml({ id: 'q3', type: 'fill', q: 'Điền ____ vào', answer: 'StateGraph|state graph' })
    expect(f).toContain('<p>Điền <textEntryInteraction')
    expect((f.match(/caseSensitive="false"/g) ?? []).length).toBe(2)
  })
})
