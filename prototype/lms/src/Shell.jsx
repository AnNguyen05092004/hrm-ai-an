import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, FolderOpen, BarChart3, Settings, PanelLeft, ClipboardCheck, RotateCcw, Check, ChevronsUpDown, GraduationCap, Target } from 'lucide-react'
import { useState } from 'react'
import { Logo, Avatar } from './ui'
import { useStore, useRole } from './store'
import { ROLES } from './data'

export default function Shell() {
  const { S, set, say, reset } = useStore()
  const nav = useNavigate()
  const [mini, setMini] = useState(false)
  const { role, me } = useRole()
  const [menu, setMenu] = useState(false)
  const pending = S.submissions.filter((x) => x.status === 'grading').length
  const items = {
    author: [['/', 'Trang chủ', Home], ['/library', 'Thư viện', FolderOpen], ['/workforce', 'Năng lực đội ngũ', Target], ['/analytics', 'Phân tích', BarChart3], ['/grading', 'Chấm bài', ClipboardCheck, pending], ['/settings', 'Cài đặt', Settings]],
    learner: [['/learn', 'Khóa học của tôi', GraduationCap]],
  }[role]
  const switchTo = (r) => { set((d) => { d.role = r }); setMenu(false); nav(ROLES[r].home); say(`Đang xem với vai ${ROLES[r].title.split(' · ')[0].toLowerCase()}`) }
  return (
    <div className="flex h-full">
      <aside className={`${mini ? 'w-[76px]' : 'w-[264px]'} scroll-thin flex shrink-0 flex-col overflow-y-auto border-r border-line bg-white px-4 pb-5 transition-all`}>
        <div className="flex h-16 items-center gap-3 px-1">
          <button onClick={() => nav(me.home)}><Logo /></button>
          {!mini && <><span className="h-7 w-px bg-line" /><span className="flex-1 text-[17px] text-neutral-600">LMS</span></>}
          {!mini && <button className="icon-btn" onClick={() => setMini(true)}><PanelLeft size={20} /></button>}
        </div>
        {mini && <button className="icon-btn mx-auto mb-2" onClick={() => setMini(false)}><PanelLeft size={20} /></button>}
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
          <button onClick={() => setMenu(!menu)} className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left hover:bg-neutral-50" title="Đổi vai trò">
            <Avatar text={me.initials} size={36} color={me.color} />
            {!mini && <><div className="min-w-0 flex-1 leading-tight"><div className="truncate text-[15px] font-medium">{me.name}</div><div className="truncate text-[12px] text-neutral-500">{me.title}</div></div><ChevronsUpDown size={16} className="shrink-0 text-neutral-500" /></>}
          </button>
          {menu && (
            <div className="fade absolute inset-x-0 bottom-full z-40 mb-2 rounded-xl border border-line bg-white p-2 shadow-pop">
              <div className="px-2 pb-1.5 pt-1 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">Xem với vai trò</div>
              {Object.entries(ROLES).map(([k, r]) => (
                <button key={k} onClick={() => switchTo(k)} className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-neutral-50 ${k === role ? 'bg-neutral-50' : ''}`}>
                  <Avatar text={r.initials} size={30} color={r.color} />
                  <div className="min-w-0 flex-1 leading-tight"><div className="text-[14px] font-medium">{r.name}</div><div className="text-[12px] text-neutral-500">{r.title}</div></div>
                  {k === role && <Check size={16} className="text-sky-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
        {!mini && (
          <button onClick={reset} className="mt-3 flex items-center gap-1.5 px-1 text-[12px] text-neutral-500 underline-offset-2 hover:underline"><RotateCcw size={12} />Đặt lại dữ liệu mẫu</button>
        )}
      </aside>
      <main className="scroll-thin relative flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export const TopOrg = ({ children }) => { const { S } = useStore(); return (
  <div className="sticky top-0 z-20 flex h-16 items-center border-b border-line/70 bg-white/80 px-10 backdrop-blur">
    <span className="text-[16px] font-medium">{S.user.org}</span>
    <div className="flex-1" />{children}
  </div>
) }
