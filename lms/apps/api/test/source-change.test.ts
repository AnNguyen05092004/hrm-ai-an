import { describe, it, expect } from 'vitest'
import { setupApp, upload } from './helpers.js'
import { drainJobs } from '../src/lib/jobs.js'

const V3 = `## mục 1
Volume lưu bền nhưng vẫn có thể mất khi máy chủ hỏng hoặc chạy nhầm lệnh xóa. Sao lưu định kỳ giúp khôi phục nhanh.

## mục 2
Không cần dừng ghi nếu dùng snapshot của ổ đĩa. Chạy container tạm gắn volume, nén bằng tar, kiểm tra file sao lưu.

## mục 2.3
docker run --rm -v pgdata:/data -v $(pwd):/backup busybox tar czf /backup/pgdata.tar.gz /data
`

describe('source document changes (F05)', () => {
  const ctx = setupApp()

  it('lists lessons that cite changed sections after a new version is uploaded', async () => {
    const kits = (await ctx.author('GET', '/api/kits')).body as { id: string; title: string }[]
    const docker = kits.find((k) => k.title.includes('Docker'))!
    expect((await ctx.author('GET', `/api/kits/${docker.id}/source-changes`)).body).toEqual([])
    const src = ((await ctx.author('GET', '/api/sources')).body as { id: string; name: string }[]).find((s) => s.name.startsWith('Runbook'))!
    const r = await upload(ctx.app, ctx.authorCookie, `/api/sources?replace=${src.id}`, 'Runbook-Backup-v3.md', V3, 'text/markdown')
    expect(r.body.source.version).toBe(2)
    await drainJobs()
    const ch = (await ctx.author('GET', `/api/kits/${docker.id}/source-changes`)).body
    expect(ch.length).toBe(1)
    expect(ch[0]).toMatchObject({ from: 1, to: 2 })
    const where = ch[0].parts.map((p: { where: string }) => p.where).join(' | ')
    expect(where).toContain('Bài 3')
    expect(where).not.toContain('mục 2.3')
  })
})
