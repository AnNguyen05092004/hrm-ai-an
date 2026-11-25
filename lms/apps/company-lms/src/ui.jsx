// Thành phần giao diện dùng chung của cổng đào tạo demo
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { STATUS } from './store'
import { onToast } from './toast'

export function Badge({ status }) {
  const s = STATUS[status] ?? STATUS['not attempted']
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${s.cls}`}>{s.label}</span>
}

export function Avatar({ person, size = 32 }) {
  return <span className="grid shrink-0 place-items-center rounded-full bg-co-100 font-semibold text-co-800" style={{ width: size, height: size, fontSize: size * 0.38 }}>{person.initials}</span>
}

function useEsc(open, onClose) {
  useEffect(() => {
    if (!open) return undefined
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
}

export function Modal({ open, onClose, title, children, w = 620 }) {
  useEsc(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-2xl" style={{ maxWidth: w }}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4"><h2 className="text-[17px] font-semibold">{title}</h2><button className="btn-ghost w-9 px-0" onClick={onClose} aria-label="Đóng"><X size={18} /></button></div>
        <div className="scroll-thin overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function Drawer({ open, onClose, title, children, w = 600 }) {
  useEsc(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-30 bg-slate-900/30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={title} className="absolute inset-y-0 right-0 flex flex-col bg-white shadow-2xl" style={{ width: `min(${w}px, 100vw)` }}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4"><h2 className="text-[17px] font-semibold">{title}</h2><button className="btn-ghost w-9 px-0" onClick={onClose} aria-label="Đóng"><X size={18} /></button></div>
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  )
}

export function Toaster() {
  const [items, setItems] = useState([])
  useEffect(() => {
    onToast((text) => {
      const id = Math.random()
      setItems((xs) => [...xs, { id, text }])
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4000)
    })
  }, [])
  return <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">{items.map((t) => <div key={t.id} role="status" className="rounded-lg bg-slate-900 px-4 py-2.5 text-[14px] font-medium text-white shadow-lg">{t.text}</div>)}</div>
}
