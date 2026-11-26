import { describe, it, expect } from 'vitest'
import { loginAs, setupApp } from './helpers.js'

type Kit = { id: string; title: string; artifacts: { id: string; type: string }[]; review: { total: number; pending: number; approved: number; changes: number; open: number } | null }

describe('Review khóa học', () => {
  const ctx = setupApp()
  const kitBy = async (prefix: string): Promise<Kit> => ((await ctx.author('GET', '/api/kits')).body as Kit[]).find((k) => k.title.startsWith(prefix))!

  it('reviewer chỉ thấy khóa được mời, không vào được API soạn', async () => {
    const inbox = (await ctx.reviewer('GET', '/api/reviews')).body as { title: string; status: string }[]
    expect(inbox.map((x) => x.title).sort()).toEqual(['An toàn thông tin cho mọi nhân viên', 'Nghỉ phép cho nhân viên mới'])
    const docker = await kitBy('Docker')
    expect((await ctx.reviewer('GET', `/api/reviews/kits/${docker.id}`)).status).toBe(403)
    expect((await ctx.reviewer('GET', `/api/view/${docker.artifacts[0].id}`)).status).toBe(403)
    expect((await ctx.reviewer('PATCH', `/api/kits/${docker.id}`, { title: 'x' })).status).toBe(403)
    const sec = await kitBy('An toàn')
    const view = await ctx.reviewer('GET', `/api/view/${sec.artifacts[0].id}`)
    expect(view.status).toBe(200)
    expect(view.body.draft).toBe(true)
  })

  it('người soạn mời reviewer: chỉ người có vai reviewer, không mời trùng', async () => {
    const sql = await kitBy('SQL')
    const detail = (await ctx.author('GET', `/api/reviews/kits/${sql.id}`)).body
    expect(detail.candidates.map((c: { role: string }) => c.role).every((r: string) => r === 'reviewer')).toBe(true)
    expect((await ctx.author('POST', `/api/reviews/kits/${sql.id}/invite`, { reviewerIds: [ctx.ids.authorId] })).status).toBe(400)
    const r = await ctx.author('POST', `/api/reviews/kits/${sql.id}/invite`, { reviewerIds: [ctx.ids.reviewerId, ctx.ids.reviewer2Id], message: 'Xem giúp câu lệnh JOIN', due: '2026-12-31' })
    expect(r.body).toEqual({ invited: 2, skipped: 0 })
    expect((await ctx.author('POST', `/api/reviews/kits/${sql.id}/invite`, { reviewerIds: [ctx.ids.reviewerId] })).body).toEqual({ invited: 0, skipped: 1 })
    expect((await ctx.reviewer('POST', `/api/reviews/kits/${sql.id}/invite`, { reviewerIds: [ctx.ids.reviewer2Id] })).status).toBe(403)
    expect((await kitBy('SQL')).review).toMatchObject({ total: 2, pending: 2 })
  })

  it('góp ý gắn tài liệu và vị trí, người soạn trả lời và đánh dấu đã xử lý', async () => {
    const sec = await kitBy('An toàn')
    const qr = sec.artifacts.find((a) => a.type === 'qr')!
    const c = await ctx.reviewer('POST', `/api/reviews/kits/${sec.id}/comments`, { body: 'Thiếu bước báo cho bộ phận IT', artifactId: qr.id, anchor: { key: 'lesson:x', label: 'Bài 3: Lỡ bấm rồi thì làm gì' } })
    expect(c.status).toBe(200)
    // tài liệu của khóa khác thì không gắn được
    const docker = await kitBy('Docker')
    expect((await ctx.reviewer('POST', `/api/reviews/kits/${sec.id}/comments`, { body: 'x', artifactId: docker.artifacts[0].id })).status).toBe(404)
    expect((await ctx.author('POST', `/api/reviews/kits/${sec.id}/comments`, { body: 'Đã thêm bước báo IT', parentId: c.body.id })).status).toBe(200)
    expect((await ctx.reviewer('DELETE', `/api/reviews/comments/${c.body.id}`)).status).toBe(400) // đã có trả lời
    expect((await ctx.author('PATCH', `/api/reviews/comments/${c.body.id}`, { resolved: true })).status).toBe(200)
    const d = (await ctx.reviewer('GET', `/api/reviews/kits/${sec.id}`)).body
    const top = d.comments.find((x: { id: string }) => x.id === c.body.id)
    expect(top).toMatchObject({ artifactId: qr.id, anchor: { label: 'Bài 3: Lỡ bấm rồi thì làm gì' }, resolvedBy: 'Nguyễn An' })
    expect(top.replies[0].body).toBe('Đã thêm bước báo IT')
    expect(d.candidates).toEqual([]) // reviewer không thấy danh sách để mời
  })

  it('kết luận Cần sửa phải nói rõ cần sửa gì; gửi lại thì mở vòng mới', async () => {
    const leave = await kitBy('Nghỉ phép')
    // Hà đã duyệt khóa này ở dữ liệu mẫu và không còn góp ý mở
    expect((await ctx.reviewer('POST', `/api/reviews/kits/${leave.id}/decision`, { status: 'changes' })).status).toBe(400)
    expect((await ctx.reviewer('POST', `/api/reviews/kits/${leave.id}/decision`, { status: 'changes', note: 'Cập nhật số ngày phép năm 2027' })).status).toBe(200)
    expect((await ctx.author('POST', `/api/reviews/kits/${leave.id}/decision`, { status: 'approved' })).status).toBe(403)
    expect((await ctx.author('POST', `/api/reviews/kits/${leave.id}/request-again`, { message: 'Đã cập nhật số ngày phép' })).body).toEqual({ reviewers: 1 })
    const mine = (await ctx.reviewer('GET', `/api/reviews/kits/${leave.id}`)).body.mine
    expect(mine).toMatchObject({ status: 'pending', round: 2, message: 'Đã cập nhật số ngày phép' })
    expect((await ctx.reviewer('POST', `/api/reviews/kits/${leave.id}/decision`, { status: 'approved', note: 'Ổn' })).body).toEqual({ status: 'approved' })
    const log = (await ctx.admin('GET', '/api/audit')).body as { action: string }[]
    expect(log.filter((x) => x.action === 'review.decision').length).toBeGreaterThanOrEqual(2)
  })

  it('bỏ reviewer khỏi khóa thì người đó mất quyền xem khóa', async () => {
    const sql = await kitBy('SQL')
    const nam = await loginAs(ctx.app, 'nam.lh@demo.local')
    expect((await nam('GET', `/api/reviews/kits/${sql.id}`)).status).toBe(200)
    const r = (await ctx.author('GET', `/api/reviews/kits/${sql.id}`)).body.reviewers.find((x: { user: { id: string } }) => x.user.id === ctx.ids.reviewer2Id)
    expect((await ctx.author('DELETE', `/api/reviews/kits/${sql.id}/reviewers/${r.id}`)).status).toBe(200)
    expect((await nam('GET', `/api/reviews/kits/${sql.id}`)).status).toBe(403)
  })
})
