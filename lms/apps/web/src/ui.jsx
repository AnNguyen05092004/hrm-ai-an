import { createPortal } from 'react-dom'
import { X, BookOpen, Presentation, ListChecks, Network, Video, ClipboardCheck } from 'lucide-react'
import { FORMATS, IMG } from './data'
import { useStore } from './store'

export const Logo = ({ size = 28 }) => (
  <div className="grid place-items-center rounded-lg bg-ink text-white font-display font-bold" style={{ width: size, height: size, fontSize: size * 0.55 }}>V</div>
)

const FICON = { qr: BookOpen, deck: Presentation, guide: ListChecks, scenario: Network, video: Video, exam: ClipboardCheck }
export function FormatIcon({ type, size = 36, r = 10 }) {
  const f = FORMATS[type]; const I = FICON[type]
  return (
    <span className="grid shrink-0 place-items-center" style={{ width: size, height: size, borderRadius: r, background: f.bg, color: f.fg }}>
      <I size={size * 0.5} strokeWidth={2.2} fill={type === 'qr' || type === 'video' ? f.fg : 'none'} fillOpacity={type === 'qr' ? 0.25 : 1} />
    </span>
  )
}
export const FormatGlyph = ({ type, size = 16 }) => { const I = FICON[type]; return <I size={size} color={FORMATS[type].fg} strokeWidth={2.4} /> }

export const Avatar = ({ text = 'AN', size = 32, color = '#8b88c9' }) => (
  <span className="grid shrink-0 place-items-center rounded-full font-medium text-white" style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>{text}</span>
)

export function Thumb({ img = 'server', className = '', children, pos = 'center' }) {
  // khóa ảnh có sẵn, hoặc ảnh tải lên / AI tạo (/api/images/..., trong gói SCORM là media/...)
  const m = IMG[img] || (typeof img === 'string' && (img.startsWith('/api/images/') || img.startsWith('media/')) ? { src: img, grad: 'linear-gradient(135deg,#1f2a37,#8aa0b6)' } : IMG.server)
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: m.grad }}>
      <img src={m.src} alt="" loading="lazy" draggable={false} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: pos }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
      {children}
    </div>
  )
}

export function Modal({ open, onClose, title, sub, children, footer, w = 560, pad = true }) {
  if (!open) return null
  // portal ra body: không bị cha có opacity/overflow/transform ẩn hoặc cắt; sự kiện không lan về thẻ cha
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" onMouseDown={onClose} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <div className="fade relative max-h-[92vh] w-full overflow-hidden rounded-2xl bg-white shadow-pop flex flex-col" style={{ maxWidth: w }} onMouseDown={(e) => e.stopPropagation()}>
        {title !== undefined && (
          <div className="flex items-start justify-between px-6 pt-5 pb-1">
            <div>
              <h3 className="text-[20px] font-semibold">{title}</h3>
              {sub && <p className="mt-1 text-[15px] text-neutral-600">{sub}</p>}
            </div>
            <button className="icon-btn -mr-2" onClick={onClose} aria-label="Đóng"><X size={20} /></button>
          </div>
        )}
        <div className={`scroll-thin overflow-y-auto ${pad ? 'px-6 py-4' : ''}`}>{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 px-6 pb-5 pt-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Drawer({ open, onClose, title, children, side = 'left', w = 420 }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40" onMouseDown={onClose}>
      <div className={`fade absolute top-0 bottom-0 ${side === 'left' ? 'left-0 border-r' : 'right-0 border-l'} flex flex-col border-line bg-white shadow-pop`} style={{ width: w }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5">
          <h3 className="text-[18px] font-semibold">{title}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  )
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="flex rounded-xl bg-neutral-100 p-1">
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`flex-1 rounded-lg px-3 py-2 text-[15px] transition ${value === v ? 'bg-white font-semibold text-ink shadow-card' : 'text-neutral-600 hover:text-ink'}`}>{l}</button>
      ))}
    </div>
  )
}

export function Tip({ label, children, onClick, active, className = '', below = true }) {
  return (
    <button onClick={onClick} className={`group/tip relative icon-btn ${active ? 'bg-neutral-100' : ''} ${className}`} aria-label={label}>
      {children}
      <span className={`tip group-hover/tip:opacity-100 left-1/2 -translate-x-1/2 ${below ? 'top-11' : 'bottom-11'}`}>{label}</span>
    </button>
  )
}

export const Spinner = ({ size = 28, w = 3 }) => (
  <span className="spin inline-block rounded-full border-neutral-200 border-t-neutral-500" style={{ width: size, height: size, borderWidth: w }} />
)

export function Toggle({ on, onChange, disabled }) {
  return (
    <button disabled={disabled} onClick={() => onChange(!on)} className={`relative h-7 w-12 rounded-full border transition disabled:opacity-40 ${on ? 'border-ink bg-ink' : 'border-neutral-300 bg-neutral-200'}`}>
      <span className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

const ST = {
  draft: ['Bản nháp', 'bg-neutral-100 text-neutral-600'],
  generating: ['AI đang soạn', 'bg-violet-50 text-violet-700'],
  failed: ['Soạn lỗi', 'bg-red-50 text-red-700'],
  published: ['Đã xuất bản', 'bg-sky-50 text-sky-700'],
}
export const Status = ({ s }) => { const x = ST[s] ?? ST.draft; return <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-semibold ${x[1]}`}>{x[0]}</span> }

export function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  return <div className="fade fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-ink px-4 py-3 text-[14px] font-medium text-white shadow-pop">{toast}</div>
}

export const SrcChip = ({ src }) => src ? <span className="chip bg-sky-50 text-sky-700">Nguồn: {src}</span> : null
