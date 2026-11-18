import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, FolderOpen, BarChart3, Settings, PanelLeft, ClipboardCheck, GraduationCap, Target, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Logo, Avatar } from './ui'
import { useMe } from './store'
import { get, post } from './api'

export default function Shell() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const [mini, setMini] = useState(false)
  const { me, role } = useMe()
  const [menu, setMenu] = useState(false)
  const pending = useQuery({ queryKey: ['grading-count'], queryFn: () => get('/grading/count'), enabled: role === 'author', refetchInterval: 30_000 }).data?.n ?? 0
  const items = {
    author: [['/', 'Trang chủ', Home], ['/library', 'Thư viện', FolderOpen], ['/workforce', 'Năng lực đội ngũ', Target], ['/analytics', 'Phân tích', BarChart3], ['/grading', 'Chấm bài', ClipboardCheck, pending], ['/settings', 'Cài đặt', Settings]],
    learner: [['/learn', 'Khóa học của tôi', GraduationCap]],
  }[role] ?? []
  const logout = async () => { await post('/auth/logout'); qc.clear(); nav('/login', { replace: true }) }
  return (
    <div className="flex h-full">
      <aside className={`${mini ? 'w-[76px]' : 'w-[264px]'} scroll-thin flex shrink-0 flex-col overflow-y-auto border-r border-line bg-white px-4 pb-5 transition-all`}>
        <div className="flex h-16 items-center gap-3 px-1">
          <button onClick={() => nav(me.home)} aria-label="Trang chính"><Logo /></button>
          {!mini && <><span className="h-7 w-px bg-line" /><span className="flex-1 text-[17px] text-neutral-600">LMS</span></>}
          {!mini && <button className="icon-btn" onClick={() => setMini(true)} aria-label="Thu gọn"><PanelLeft size={20} /></button>}
        </div>
        {mini && <button className="icon-btn mx-auto mb-2" onClick={() => setMini(false)} aria-label="Mở rộng"><PanelLeft size={20} /></button>}
        <nav className="mt-2 space-y-0.5">
          {items.map(([to, label, I, badge]) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] transition ${isActive ? 'bg-navsel font-medium text-navtxt' : 'text-ink hover:bg-neutral-50'}`}>
              <I size={20} strokeWidth={1.8} />{!mini && <span className="flex-1">{label}</span>}
              {!mini && badge > 0 && <span className="rounded-full bg-brand px-2 text-[12px] font-semibold text-white">{badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="relative mt-3 border-t border-line pt-3">
          <button onClick={() => setMenu(!menu)} className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left hover:bg-neutral-50">
            <Avatar text={me.initials} size={36} color={me.color} />
            {!mini && <div className="min-w-0 flex-1 leading-tight"><div className="truncate text-[15px] font-medium">{me.name}</div><div className="truncate text-[12px] text-neutral-500">{me.title}</div></div>}
          </button>
          {menu && (
            <div className="fade absolute inset-x-0 bottom-full z-40 mb-2 rounded-xl border border-line bg-white p-2 shadow-pop">
              <div className="px-2 pb-2 pt-1 text-[13px] text-neutral-500">{me.email}</div>
              <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[14px] hover:bg-neutral-50"><LogOut size={16} />Đăng xuất</button>
            </div>
          )}
        </div>
      </aside>
      <main className="scroll-thin relative flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export const TopOrg = ({ children }) => { const { me } = useMe(); return (
  <div className="sticky top-0 z-20 flex h-16 items-center border-b border-line/70 bg-white/80 px-10 backdrop-blur">
    <span className="text-[16px] font-medium">{me?.orgName}</span>
    <div className="flex-1" />{children}
  </div>
) }
