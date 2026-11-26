// Khung ứng dụng theo kiểu Teal: thanh icon hẹp bên trái, tên mục hiện khi rê chuột; ảnh đại diện ở đáy mở menu chế độ demo.
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Briefcase, Users, Columns3, SlidersHorizontal, EyeOff, House, FileText, ChevronsRight, Search, Sparkles, Grip, GraduationCap, ArrowLeft } from 'lucide-react'
import { useStore, displayName } from './store.jsx'
import { Segmented, Toast, cx } from './ui.jsx'

function AiSearchIcon({ size = 20 }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <Search size={size - 3} strokeWidth={2.1} className="absolute bottom-0 left-0" />
      <Sparkles size={size * 0.5} strokeWidth={2.2} className="absolute -right-0.5 -top-0.5" />
    </span>
  )
}

const RECRUITER_NAV = [
  { to: '/jobs', label: 'Tin tuyển dụng', icon: Briefcase },
  { to: '/candidates', label: 'Kho hồ sơ', icon: Users },
  { to: '/compare', label: 'So sánh hồ sơ', icon: Columns3 },
  { to: '/rules', label: 'Quy tắc chấm điểm', icon: SlidersHorizontal },
]
// Thứ tự giống thanh bên của Teal: Trang chủ | Trình tạo CV · Theo dõi việc làm · Tìm việc · Tìm việc bằng AI · Tất cả công cụ.
const CANDIDATE_HOME = { to: '/me/home', label: 'Trang chủ', icon: House }
const CANDIDATE_NAV = [
  { to: '/me/resume', label: 'Trình tạo CV', icon: FileText },
  { to: '/me/tracker', label: 'Theo dõi việc làm', icon: ChevronsRight },
  { to: '/me/jobs', label: 'Tìm việc', icon: Search },
  { to: '/me/ai', label: 'Tìm việc bằng AI', icon: AiSearchIcon },
  { to: '/me/tools', label: 'Tất cả công cụ', icon: Grip },
]
export const DEMO_CANDIDATES = ['cv-19', 'cv-17', 'cv-02', 'cv-21', 'cv-24']
export const UPLOADED_ID = 'cv-me'

/** Logo chữ "TM" (Talent Match) — không dùng dấu tích để khỏi nhầm với trạng thái "đã xong". */
export function Logo({ size = 40 }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-xl bg-brand-600 font-bold tracking-tight text-white" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden>TM</span>
  )
}

function RailItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink to={to} end={end} aria-label={label}
      className={({ isActive }) => cx('group relative flex h-10 w-10 items-center justify-center rounded-lg transition',
        isActive ? 'bg-[#e9eceb] text-ink' : 'text-ink/80 hover:bg-soft hover:text-ink')}>
      <Icon size={20} strokeWidth={2} aria-hidden />
      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-white group-hover:block group-focus-visible:block">{label}</span>
    </NavLink>
  )
}

function DemoMenu({ placement }) {
  const s = useStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', esc)
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc) }
  }, [open])
  const me = s.role === 'candidate' ? s.cv(s.meId) : null
  const initial = me ? me.name.split(' ').slice(-1)[0][0] : 'T'
  const switchRole = (role) => { s.setRole(role); setOpen(false); navigate(role === 'candidate' ? '/me/home' : '/jobs') }
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((x) => !x)} aria-expanded={open} aria-label="Tài khoản và chế độ demo"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/60 text-sm font-medium text-ink hover:bg-soft">{initial}</button>
      {open && (
        <div className={cx('absolute z-50 w-72 rounded-lg border border-line bg-white p-4 shadow-pop', placement === 'top' ? 'bottom-0 left-full ml-3' : 'right-0 top-full mt-2')}>
          <p className="text-sm font-semibold">{me ? me.name : 'Nhà tuyển dụng'}</p>
          <p className="text-xs text-mute">{me ? me.headline : 'Tài khoản demo'}</p>
          <div className="mt-3 border-t border-line pt-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-mute">Chế độ demo</p>
            <Segmented value={s.role} onChange={switchRole} options={[{ value: 'recruiter', label: 'Nhà tuyển dụng' }, { value: 'candidate', label: 'Ứng viên' }]} />
            {s.role === 'candidate' && <div className="mt-3"><MeSelect /></div>}
            {s.role === 'recruiter' && s.masked && <p className="mt-3 flex items-center gap-1.5 text-xs text-mute"><EyeOff size={13} aria-hidden />Đang ẩn danh khi sàng lọc</p>}
          </div>
          <Link to="/" onClick={() => setOpen(false)} className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-sm text-brand-600 hover:underline"><ArrowLeft size={14} aria-hidden />Về trang giới thiệu</Link>
        </div>
      )}
    </div>
  )
}

export default function Shell() {
  const s = useStore()
  const { pathname } = useLocation()
  const isCandidatePath = pathname.startsWith('/me')
  const shared = pathname === '/rules'
  if (s.role === 'candidate' && !isCandidatePath && !shared) return <Navigate to="/me/home" replace />
  if (s.role === 'recruiter' && isCandidatePath) return <Navigate to="/jobs" replace />

  const isCandidate = s.role === 'candidate'
  const top = isCandidate ? CANDIDATE_HOME : null
  const nav = isCandidate ? CANDIDATE_NAV : RECRUITER_NAV
  const mobileNav = top ? [top, ...nav] : nav

  return (
    <div className="min-h-screen bg-white lg:pl-16">
      <aside aria-label="Thanh bên" className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col items-center border-r border-line bg-white py-4 lg:flex">
        <Link to={isCandidate ? '/me/home' : '/jobs'} aria-label="Talent Match – trang đầu" title="Talent Match"><Logo size={36} /></Link>
        <nav className="mt-6 flex flex-col items-center gap-2" aria-label="Điều hướng chính">
          {top && <RailItem {...top} />}
          {top && <span className="my-1.5 h-px w-8 bg-line" aria-hidden />}
          {nav.map((item) => <RailItem key={item.to} {...item} />)}
        </nav>
        <div className="mt-auto flex flex-col items-center gap-3">
          {isCandidate && <RailItem to="/rules" label="Cách chấm điểm" icon={GraduationCap} />}
          <DemoMenu placement="top" />
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-white lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <Link to={isCandidate ? '/me/home' : '/jobs'} className="flex items-center gap-2"><Logo size={32} /><span className="text-[15px] font-semibold">Talent Match</span></Link>
          <DemoMenu placement="bottom" />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Điều hướng chính">
          {mobileNav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cx('flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium',
              isActive ? 'bg-[#e9eceb] text-ink' : 'text-mute hover:bg-soft')}>
              <Icon size={16} aria-hidden />{label}
            </NavLink>
          ))}
        </nav>
      </header>

      {isCandidatePath
        ? <main><Outlet /></main>
        : <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><Outlet /></main>}
      <Toast toast={s.toast} />
    </div>
  )
}

export function MeSelect() {
  const s = useStore()
  return (
    <label className="block text-xs text-mute">
      Xem với hồ sơ của
      <select value={s.meId} onChange={(e) => s.setMe(e.target.value)}
        className="mt-1 block w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/40">
        {[...(s.cv(UPLOADED_ID) ? [UPLOADED_ID] : []), ...DEMO_CANDIDATES].map((id) => (
          <option key={id} value={id}>{displayName(s.cv(id), false)} — {id === UPLOADED_ID ? 'CV bạn tải lên' : s.cv(id).headline}</option>
        ))}
      </select>
    </label>
  )
}
