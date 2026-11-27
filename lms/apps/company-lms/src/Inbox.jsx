// Gói Studio gửi qua API: chờ người quản trị đào tạo xem và nhập vào cổng (LMS có bước duyệt riêng)
import { useEffect, useState } from 'react'
import { FileArchive, Inbox as InboxIcon, Loader2 } from 'lucide-react'
import { fmtSize } from './pkg'
import { fmtDateTime } from './format'

const POLL_MS = 5000

export async function fetchInboxFile(p) {
  const r = await fetch(`/lms-api/packages/${p.id}/file`)
  if (!r.ok) throw new Error('Không tải được gói')
  return new File([await r.blob()], `${p.title}.zip`, { type: 'application/zip' })
}

export const markImported = (id) => fetch(`/lms-api/packages/${id}/imported`, { method: 'POST' })

export default function Inbox({ onOpen }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState('')
  useEffect(() => {
    let live = true
    const load = () => fetch('/lms-api/packages').then((r) => (r.ok ? r.json() : [])).then((x) => { if (live) setList(x) }).catch(() => {})
    load()
    const t = setInterval(load, POLL_MS)
    return () => { live = false; clearInterval(t) }
  }, [])
  const waiting = list.filter((p) => !p.importedAt)
  if (!waiting.length) return null
  const open = async (p) => { setLoading(p.id); try { onOpen(await fetchInboxFile(p), p.id) } finally { setLoading('') } }
  return (
    <div className="card mb-5 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line bg-info-surface px-5 py-3"><InboxIcon size={17} /><span className="font-semibold">Gói nhận qua API từ LMS Studio</span><span className="text-[13px] text-ink-muted">· {waiting.length} gói chờ nhập</span></div>
      <ul className="divide-y divide-line">
        {waiting.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-5 py-3">
            <FileArchive size={18} className="shrink-0 text-ink-muted" />
            <div className="min-w-0 flex-1"><div className="truncate font-medium">{p.title}</div><div className="text-[12px] text-ink-subtle">{p.kind === 'qti' ? 'Đề kiểm tra · QTI 2.1 kèm đáp án' : 'Khóa học · SCORM 1.2'} · {fmtSize(p.size)} · nhận {fmtDateTime(p.receivedAt)} · mã {p.id}</div></div>
            <button className="btn-dark btn-sm" disabled={!!loading} onClick={() => open(p)}>{loading === p.id ? <Loader2 size={14} className="spin" /> : null}Xem và nhập</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
