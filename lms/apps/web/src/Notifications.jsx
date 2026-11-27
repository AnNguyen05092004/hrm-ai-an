// Chuông thông báo ở góc trên bên phải mỗi trang chính.
// Reviewer: được mời review, mời lại, nhắc hạn. Người soạn: kết luận review, góp ý mới (gộp theo người), kết quả gửi sang LMS công ty.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, ClipboardCheck, MessageSquare, AlarmClock, Send, AlertTriangle, BadgeCheck } from 'lucide-react'
import { get, post } from './api'

const POLL_MS = 30_000
const KIND_ICON = {
  'review.invited': [ClipboardCheck, 'text-sky-700 bg-sky-50'],
  'review.again': [ClipboardCheck, 'text-sky-700 bg-sky-50'],
  'review.reminder': [AlarmClock, 'text-amber-700 bg-amber-50'],
  'review.decided': [BadgeCheck, 'text-emerald-700 bg-emerald-50'],
  'review.comment': [MessageSquare, 'text-violet-700 bg-violet-50'],
  'lms.sent': [Send, 'text-emerald-700 bg-emerald-50'],
  'lms.failed': [AlertTriangle, 'text-red-600 bg-red-50'],
}

/** "vừa xong", "5 phút trước", "3 giờ trước", "hôm qua", "27/11" */
export function ago(iso, now = Date.now()) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  if (s < 2 * 86400) return 'hôm qua'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function NotificationBell() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const box = useRef()
  const q = useQuery({ queryKey: ['notifications'], queryFn: () => get('/notifications'), refetchInterval: POLL_MS, refetchOnWindowFocus: true })
  const unread = q.data?.unread ?? 0
  const items = q.data?.items ?? []
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  const markRead = async (ids) => { try { await post('/notifications/read', ids ? { ids } : {}) } finally { qc.invalidateQueries({ queryKey: ['notifications'] }) } }
  const openItem = (n) => {
    setOpen(false)
    if (!n.read) markRead([n.id])
    // đến trang khóa / review: làm mới dữ liệu để thấy ngay thay đổi vừa được báo
    qc.invalidateQueries({ queryKey: ['reviews'] })
    if (n.link) nav(n.link)
  }
  return (
    <div ref={box} className="relative shrink-0">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog" aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`} title="Thông báo"
        className={`icon-btn relative ${open ? 'bg-neutral-100' : ''}`}>
        <Bell size={20} strokeWidth={1.8} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Thông báo" className="fade fixed inset-x-4 top-16 z-50 rounded-xl border border-line bg-white shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px]">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <span className="flex-1 text-[15px] font-semibold">Thông báo</span>
            {unread > 0 && <button className="flex items-center gap-1 text-[13px] font-medium text-sky-700 hover:underline" onClick={() => markRead()}><CheckCheck size={15} />Đánh dấu đã đọc hết</button>}
          </div>
          <div className="scroll-thin max-h-[min(440px,calc(100vh-140px))] overflow-y-auto">
            {q.isLoading && <div className="px-4 py-6 text-center text-[14px] text-neutral-500">Đang tải…</div>}
            {!q.isLoading && !items.length && <div className="px-4 py-10 text-center text-[14px] text-neutral-500">Chưa có thông báo nào.</div>}
            {items.map((n) => { const [I, cls] = KIND_ICON[n.kind] ?? [Bell, 'text-neutral-600 bg-neutral-100']; return (
              <button key={n.id} onClick={() => openItem(n)} className={`flex w-full gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-neutral-50 ${n.read ? '' : 'bg-sky-50/40'}`}>
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cls}`}><I size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[14px] leading-snug ${n.read ? 'text-neutral-700' : 'font-semibold text-ink'}`}>{n.title}</span>
                  {n.body && <span className="mt-0.5 line-clamp-2 block whitespace-pre-line text-[13px] text-neutral-500">{n.count > 1 ? `Mới nhất: ${n.body}` : n.body}</span>}
                  <span className="mt-1 block text-[12px] text-neutral-400">{ago(n.at)}{n.count > 1 && ` · ${n.count} góp ý`}</span>
                </span>
                {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-600" aria-label="Chưa đọc" />}
              </button>) })}
          </div>
        </div>
      )}
    </div>
  )
}
