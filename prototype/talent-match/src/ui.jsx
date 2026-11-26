// Thành phần giao diện dùng chung.
import { CheckCircle2, CircleDashed, XCircle, AlertTriangle, Sparkles } from 'lucide-react'
import { GRADES, REQ } from './lib/match.js'

export const cx = (...a) => a.filter(Boolean).join(' ')

export const GRADE_TONE = {
  A: { chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200', ring: '#15803d', bar: 'bg-emerald-600' },
  B: { chip: 'bg-sky-50 text-sky-800 ring-sky-200', ring: '#0369a1', bar: 'bg-sky-600' },
  C: { chip: 'bg-amber-50 text-amber-800 ring-amber-200', ring: '#b45309', bar: 'bg-amber-500' },
  D: { chip: 'bg-slate-100 text-slate-600 ring-slate-200', ring: '#64748b', bar: 'bg-slate-400' },
}

/** Màu nhận diện 6 nhóm tiêu chí (luôn đi kèm nhãn chữ, không dùng màu đơn lẻ). */
export const GROUP_COLOR = { skills: '#1e3a8a', experience: '#2563eb', education: '#0e7490', language: '#7c3aed', soft: '#be185d', conditions: '#64748b' }

const BTN_BASE = 'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap'
const BTN_SIZES = { sm: 'h-8 px-3 text-[13px]', md: 'h-9 px-4 text-sm', lg: 'h-11 px-5 text-[15px]' }
const BTN_VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-white text-ink border border-line hover:bg-soft',
  ghost: 'text-ink hover:bg-soft',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  accent: 'bg-brand-600 text-white hover:bg-brand-700',
  'accent-subtle': 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  // Nút viền bo tròn (kiểu "Save Jobs", "Mark as Done").
  outline: '!rounded-full border border-brand-600 bg-white text-brand-600 hover:bg-brand-50',
  gold: 'bg-gold-500 text-ink hover:bg-gold-600',
}
/** Lớp CSS của nút — dùng cho cả <Link> trông như nút (tránh lồng <button> trong <a>). */
export const buttonCls = (variant = 'secondary', size = 'md', className) => cx(BTN_BASE, BTN_SIZES[size], BTN_VARIANTS[variant], className)

export function Button({ variant = 'secondary', size = 'md', className, children, ...rest }) {
  return <button type="button" className={buttonCls(variant, size, className)} {...rest}>{children}</button>
}

export function Card({ className, children, ...rest }) {
  return <div className={cx('relative rounded-lg border border-line bg-white', className)} {...rest}>{children}</div>
}

export function GradeChip({ grade, size = 'md', showLabel = false }) {
  const s = size === 'lg' ? 'h-8 min-w-8 text-base px-2' : size === 'sm' ? 'h-5 min-w-5 text-[11px] px-1' : 'h-6 min-w-6 text-xs px-1.5'
  return (
    <span className="inline-flex items-center gap-1.5" title={`Hạng ${grade} – ${GRADES[grade].label}`}>
      <span className={cx('inline-flex items-center justify-center rounded-md font-bold ring-1', s, GRADE_TONE[grade].chip)}>{grade}</span>
      {showLabel && <span className="text-sm text-mute">{GRADES[grade].label}</span>}
    </span>
  )
}

/** Vòng tròn điểm phần trăm, màu theo hạng. */
export function ScoreRing({ value, grade, size = 48, stroke = 5, label = true }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = GRADE_TONE[grade].ring
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Phù hợp ${value}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8ebf1" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: 'stroke-dashoffset .5s ease' }} />
      </svg>
      {label && (
        <span className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums text-ink" style={{ fontSize: size * 0.27 }}>
          {value}<span className="text-mute" style={{ fontSize: size * 0.17 }}>%</span>
        </span>
      )}
    </div>
  )
}

export function Bar({ value, className, tone = 'bg-ink' }) {
  return (
    <div className={cx('h-1.5 rounded-full bg-[#e8ebf1] overflow-hidden', className)}>
      <div className={cx('h-full rounded-full', tone)} style={{ width: `${Math.max(0, Math.min(100, value))}%`, transition: 'width .4s ease' }} />
    </div>
  )
}

export const toneOfShare = (s) => (s >= 0.85 ? 'bg-emerald-600' : s >= 0.6 ? 'bg-sky-600' : s >= 0.35 ? 'bg-amber-500' : 'bg-danger-500')

const STATUS = {
  met: { Icon: CheckCircle2, cls: 'text-emerald-600', label: 'Đạt' },
  partial: { Icon: CircleDashed, cls: 'text-amber-600', label: 'Một phần' },
  missing: { Icon: XCircle, cls: 'text-danger-600', label: 'Thiếu' },
}
export function StatusIcon({ status, size = 16, withLabel = false }) {
  const { Icon, cls, label } = STATUS[status]
  return (
    <span className={cx('inline-flex items-center gap-1', cls)} title={label}>
      <Icon size={size} strokeWidth={2.2} aria-hidden />
      {withLabel ? <span className="text-xs font-medium">{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  )
}

export function ReqBadge({ req }) {
  const tone = { must: 'bg-ink text-white', important: 'bg-[#e8ebf1] text-ink', bonus: 'bg-white text-mute ring-1 ring-line' }[req]
  return <span className={cx('inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded px-1.5 text-[11px] font-medium', tone)}>{REQ[req].label}</span>
}

export function Pill({ children, className, ...rest }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full bg-soft px-2.5 py-0.5 text-xs text-mute ring-1 ring-line/70', className)} {...rest}>{children}</span>
}

export function SkillChip({ status, children, title }) {
  const tone = {
    met: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    partial: 'bg-amber-50 text-amber-800 ring-amber-200',
    missing: 'bg-white text-danger-700 ring-danger-100',
  }[status]
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1', tone)}>
      <StatusIcon status={status} size={12} />
      {children}
    </span>
  )
}

export const SOURCE = {
  applied: { label: 'Ứng tuyển', cls: 'bg-brand-50 text-brand-700' },
  pool: { label: 'Kho hồ sơ', cls: 'bg-soft text-mute' },
  internal: { label: 'Nội bộ', cls: 'bg-indigo-50 text-indigo-700' },
  referral: { label: 'Giới thiệu', cls: 'bg-teal-50 text-teal-700' },
  upload: { label: 'Tự tải CV lên', cls: 'bg-accent-50 text-accent-800' },
}
export function SourceBadge({ source, appliedHere }) {
  const s = appliedHere ? { label: 'Ứng tuyển vị trí này', cls: SOURCE.applied.cls } : source === 'applied' ? { label: 'Ứng tuyển vị trí khác', cls: SOURCE.pool.cls } : SOURCE[source]
  return <span className={cx('inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium', s.cls)}>{s.label}</span>
}

export function Avatar({ name, masked, size = 36 }) {
  const initials = masked ? '?' : name.split(' ').slice(-2).map((w) => w[0]).join('')
  const hue = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7)
  const style = masked ? { width: size, height: size } : { width: size, height: size, background: `hsl(${hue} 45% 93%)`, color: `hsl(${hue} 45% 28%)` }
  return (
    <span className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', masked && 'bg-soft text-mute')} style={{ ...style, fontSize: size * 0.36 }} aria-hidden>
      {initials}
    </span>
  )
}

export function KnockoutNote({ items, compact }) {
  if (!items.length) return null
  const names = items.map((i) => i.label).join(', ')
  return (
    <span className={cx('inline-flex items-center gap-1 text-danger-700', compact ? 'text-xs' : 'text-sm')} title={`Tiêu chí bắt buộc đạt dưới 50%: ${names}`}>
      <AlertTriangle size={compact ? 13 : 15} aria-hidden />
      <span>Thiếu bắt buộc: {names}</span>
    </span>
  )
}

export function AiTag({ children = 'AI đề xuất' }) {
  return (
    <span className="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded bg-ai px-1.5 text-[11px] font-medium text-ink ring-1 ring-line">
      <Sparkles size={11} aria-hidden /> {children}
    </span>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cx('relative -mb-px whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition',
            value === t.id ? 'text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-600' : 'text-mute hover:text-ink')}>
          {t.label}{t.count != null && <span className="ml-1.5 rounded-full bg-soft px-1.5 text-xs text-mute">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Segmented({ options, value, onChange, size = 'md' }) {
  return (
    <div className="inline-flex rounded-full bg-soft p-0.5 ring-1 ring-line">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={cx('whitespace-nowrap rounded-full font-medium transition', size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-[13px]',
            value === o.value ? 'bg-white text-ink shadow-sm ring-1 ring-line' : 'text-mute hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {Icon && <Icon size={28} className="text-mute" aria-hidden />}
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="max-w-sm text-sm text-mute">{children}</p>}
    </div>
  )
}

export function Toast({ toast }) {
  if (!toast) return null
  return (
    <div key={toast.at} className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-pop" role="status">
      {toast.text}
    </div>
  )
}

export const fmtDate = (iso) => new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
export const daysSince = (iso) => Math.max(0, Math.round((new Date('2026-11-20') - new Date(iso)) / 86400000))

/** Thanh tiêu đề trang kiểu Teal: tiêu đề bên trái, thao tác bên phải, viền dưới. */
export function PageBar({ title, children }) {
  return (
    <div className="flex min-h-[60px] flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5 sm:px-8 lg:min-h-[64px]">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
