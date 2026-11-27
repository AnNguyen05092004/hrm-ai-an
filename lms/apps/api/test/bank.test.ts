import { describe, it, expect } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'
import { setupApp } from './helpers.js'
import { drainJobs } from '../src/lib/jobs.js'
import { itemXml } from '../src/modules/kits/qti.js'
import { tfChoices } from '../src/modules/kits/service.js'

type Exam = { id: string; kitId: string; title: string; questions: number; approved: number; origin: { kind: string; title?: string; names?: string[] } }

describe('Kho đề và dạng câu hỏi', () => {
  const ctx = setupApp()

  it('kho đề liệt kê đề của mọi khóa, kèm nguồn gốc và số câu đã duyệt', async () => {
    const list = (await ctx.author('GET', '/api/exams')).body as Exam[]
    const sec = list.find((e) => e.title.startsWith('Đề kiểm tra: An toàn'))!
    expect(sec.origin).toMatchObject({ kind: 'kit', title: 'An toàn thông tin cho mọi nhân viên' })
    expect(sec.approved).toBe(sec.questions)
    expect((await ctx.reviewer('GET', '/api/exams')).status).toBe(403)
  })

  it('tạo đề theo ma trận: đúng dạng, độ khó, số câu dự phòng; QTI rút đúng số câu từng ô', async () => {
    const kits = (await ctx.author('GET', '/api/kits')).body as { id: string; title: string }[]
    const docker = kits.find((k) => k.title.startsWith('Docker'))!
    const matrix = [{ type: 'tf', level: 1, count: 2 }, { type: 'mr', level: 2, count: 1 }]
    const r = await ctx.author('POST', '/api/exams', { from: 'kit', kitId: docker.id, matrix, reserve: 2 })
    expect(r.status).toBe(200)
    await drainJobs()
    const e = (await ctx.author('GET', `/api/artifacts/${r.body.id}`)).body
    const qs = e.quiz.questions as { type: string; level: number; choices: { t: string }[] }[]
    expect(qs.filter((q) => q.type === 'tf' && q.level === 1)).toHaveLength(4)
    expect(qs.filter((q) => q.type === 'mr' && q.level === 2)).toHaveLength(2)
    expect(qs).toHaveLength(6)
    expect(e.quiz.matrix).toEqual(matrix)
    expect(e.quiz.pick).toBe(3)
    expect(e.plan.basedOn).toBe(1)
    expect(qs.find((q) => q.type === 'tf')!.choices.map((c) => c.t)).toEqual(['Đúng', 'Sai'])

    // duyệt 1 câu mr (ô cần 1) và 1 câu tf (ô cần 2): cảnh báo đúng ô còn thiếu
    const approve = (pred: (q: { type: string }, i: number) => boolean) => ({ quiz: { ...e.quiz, questions: e.quiz.questions.map((q: { type: string }, i: number) => ({ ...q, approved: pred(q, i) })) } })
    const firstTf = qs.findIndex((q) => q.type === 'tf'), firstMr = qs.findIndex((q) => q.type === 'mr')
    await ctx.author('PATCH', `/api/artifacts/${e.id}`, { content: approve((_, i) => i === firstTf || i === firstMr) })
    const chk = (await ctx.author('GET', `/api/artifacts/${e.id}/check`)).body as { warnings: string[] }
    expect(chk.warnings.some((w) => w.includes('Đúng / Sai · Dễ cần 2 câu') && w.includes('có 1 câu'))).toBe(true)
    expect(chk.warnings.some((w) => w.includes('Nhiều đáp án'))).toBe(false)

    // duyệt hết, xuất bản, tải gói QTI: mỗi ô một phần, rút đúng số câu của ô
    await ctx.author('PATCH', `/api/artifacts/${e.id}`, { content: approve(() => true) })
    expect((await ctx.author('POST', `/api/artifacts/${e.id}/publish`, {})).status).toBe(200)
    const res = await ctx.app.inject({ method: 'GET', url: `/api/kits/${docker.id}/export/exam/${e.id}`, headers: { cookie: ctx.authorCookie } })
    expect(res.statusCode).toBe(200)
    const files = unzipSync(new Uint8Array(res.rawPayload))
    const test = strFromU8(files['test.xml'])
    expect(test.match(/<assessmentSection /g)).toHaveLength(2)
    expect(test).toContain('title="Đúng / Sai · Dễ"')
    expect(test).toContain('<selection select="2"')
    expect(test).toContain('<selection select="1"')
    expect(test).toContain('<value>3</value></defaultValue></outcomeDeclaration>\n  <outcomeDeclaration identifier="PASS_SCORE"')
    const json = JSON.parse(strFromU8(files['exam.json']))
    expect(json.settings.matrix).toEqual([{ type: 'tf', difficulty: 1, difficultyName: 'Dễ', count: 2 }, { type: 'mr', difficulty: 2, difficultyName: 'Trung bình', count: 1 }])
    expect(strFromU8(files['huong-dan-cham.md'])).toContain('## Ma trận đề')
  })

  it('ma trận trùng ô hoặc quá nhiều câu thì bị từ chối, không tạo khóa ẩn thừa', async () => {
    const sources = (await ctx.author('GET', '/api/sources')).body as { id: string }[]
    const before = ((await ctx.author('GET', '/api/exams')).body as Exam[]).length
    const dup = await ctx.author('POST', '/api/exams', { from: 'sources', sourceIds: [sources[0].id], title: 'Đề trùng ô', matrix: [{ type: 'mc', level: 1, count: 2 }, { type: 'mc', level: 1, count: 3 }] })
    expect(dup.status).toBe(400)
    const big = await ctx.author('POST', '/api/exams', { from: 'sources', sourceIds: [sources[0].id], title: 'Đề quá lớn', matrix: [{ type: 'mc', level: 1, count: 20 }, { type: 'mc', level: 2, count: 20 }, { type: 'mc', level: 3, count: 20 }] })
    expect(big.status).toBe(400)
    expect(((await ctx.author('GET', '/api/exams')).body as Exam[]).length).toBe(before)
  })

  it('tạo đề thẳng từ tài liệu nguồn: đề đứng riêng, không hiện thành khóa học', async () => {
    const sources = (await ctx.author('GET', '/api/sources')).body as { id: string; name: string }[]
    const r = await ctx.author('POST', '/api/exams', { from: 'sources', sourceIds: [sources[0].id], title: 'Đề nhanh từ quy định', matrix: [{ type: 'mc', level: 1, count: 1 }, { type: 'fill', level: 2, count: 1 }] })
    expect(r.status).toBe(200)
    await drainJobs()
    const list = (await ctx.author('GET', '/api/exams')).body as Exam[]
    const mine = list.find((e) => e.id === r.body.id)!
    expect(mine.origin).toEqual({ kind: 'sources', names: [sources[0].name] })
    expect(mine.questions).toBe(4)
    const kits = (await ctx.author('GET', '/api/kits')).body as { id: string }[]
    expect(kits.some((k) => k.id === r.body.kitId)).toBe(false)
    expect((await ctx.author('GET', `/api/kits/${r.body.kitId}`)).body.bank).toBe(true)
    // xóa đề thì xóa luôn khóa ẩn chứa nó
    expect((await ctx.author('DELETE', `/api/artifacts/${r.body.id}`)).status).toBe(200)
    expect((await ctx.author('GET', `/api/kits/${r.body.kitId}`)).status).toBe(404)
  })

  it('tạo đề từ khóa chưa chốt nội dung thì bị chặn', async () => {
    const c = await ctx.author('POST', '/api/kits', { goal: 'Khóa mới chưa có nội dung' })
    await drainJobs()
    const r = await ctx.author('POST', '/api/exams', { from: 'kit', kitId: c.body.id, matrix: [{ type: 'mc', level: 1, count: 2 }] })
    expect(r.status).toBe(400)
    expect(r.body.error.code).toBe('master_not_locked')
  })

  it('câu Đúng/Sai: luôn 2 lựa chọn theo thứ tự, xuất QTI không xáo', () => {
    expect(tfChoices([{ t: 'Sai', ok: true, fb: 'Vì…' }, { t: 'Đúng', ok: false, fb: '' }])).toEqual([{ t: 'Đúng', ok: false, fb: '' }, { t: 'Sai', ok: true, fb: 'Vì…' }])
    const x = itemXml({ id: 'q1', type: 'tf', q: 'Mật khẩu được gửi qua email', choices: [{ t: 'Đúng', ok: false }, { t: 'Sai', ok: true }] })
    expect(x).toContain('shuffle="false" maxChoices="1"')
    expect(x).toContain('<value>C1</value>')
  })
})
