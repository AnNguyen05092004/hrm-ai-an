import { describe, it, expect } from 'vitest'
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

  it('tạo đề từ khóa học: ra đề từ nội dung gốc đã chốt, chỉ các dạng được chọn', async () => {
    const kits = (await ctx.author('GET', '/api/kits')).body as { id: string; title: string }[]
    const docker = kits.find((k) => k.title.startsWith('Docker'))!
    const r = await ctx.author('POST', '/api/exams', { from: 'kit', kitId: docker.id, levels: [1], perLevel: 4, types: ['tf', 'mr'] })
    expect(r.status).toBe(200)
    await drainJobs()
    const e = (await ctx.author('GET', `/api/artifacts/${r.body.id}`)).body
    expect(new Set(e.quiz.questions.map((q: { type: string }) => q.type))).toEqual(new Set(['tf', 'mr']))
    expect(e.plan.basedOn).toBe(1)
    const tf = e.quiz.questions.find((q: { type: string }) => q.type === 'tf')
    expect(tf.choices.map((c: { t: string }) => c.t)).toEqual(['Đúng', 'Sai'])
  })

  it('tạo đề thẳng từ tài liệu nguồn: đề đứng riêng, không hiện thành khóa học', async () => {
    const sources = (await ctx.author('GET', '/api/sources')).body as { id: string; name: string }[]
    const r = await ctx.author('POST', '/api/exams', { from: 'sources', sourceIds: [sources[0].id], title: 'Đề nhanh từ quy định', levels: [1, 2], perLevel: 2 })
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

  it('tạo đề từ khóa chưa chốt nội dung gốc thì bị chặn', async () => {
    const c = await ctx.author('POST', '/api/kits', { goal: 'Khóa mới chưa có nội dung gốc' })
    await drainJobs()
    const r = await ctx.author('POST', '/api/exams', { from: 'kit', kitId: c.body.id, levels: [1] })
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
