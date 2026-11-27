import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, FolderOpen, Settings, PanelLeft, ClipboardCheck, Users, LogOut, Check, ArrowLeftRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Logo, Avatar, Spinner } from './ui'
import { useMe, initials } from './store'
import { get, post } from './api'
import { useWide } from './hooks'
import NotificationBell from './Notifications'

export default function Shell() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const [collapsed, setCollapsed] = useState(false)
  // màn hẹp (điện thoại): thanh bên chỉ còn biểu tượng; bấm mở rộng thì trượt ra đè lên nội dung, chọn mục là đóng
  const wide = useWide()
  const [drawer, setDrawer] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setDrawer(false) }, [pathname, wide])
  const mini = wide ? collapsed : !drawer
  const setMini = (v) => (wide ? setCollapsed(v) : setDrawer(!v))
  const { me, role } = useMe()
  const [menu, setMenu] = useState(false)
  // reviewer: số khóa đang chờ mình review
  const pending = useQuery({ queryKey: ['reviews'], queryFn: () => get('/reviews'), enabled: role === 'reviewer', refetchInterval: 60_000 }).data?.filter((x) => x.status === 'pending').length ?? 0
  const editor = [['/', 'Trang chủ', Home], ['/library', 'Thư viện', FolderOpen]]
  const items = {
    admin: [...editor, ['/users', 'Người dùng', Users], ['/settings', 'Cài đặt', Settings]],
    author: [...editor, ['/settings', 'Cài đặt', Settings]],
    reviewer: [['/', 'Cần review', ClipboardCheck, pending], ['/settings', 'Cài đặt', Settings]],
  }[role] ?? []
  const logout = async () => { await post('/auth/logout'); qc.clear(); nav('/login', { replace: true }) }
  const demoUsers = useQuery({ queryKey: ['demo-users'], queryFn: () => get('/auth/demo'), enabled: !!me?.demo, staleTime: Infinity }).data ?? []
  const [switching, setSwitching] = useState('')
  const box = useRef()
  useEffect(() => {
    if (!menu) return
    const close = (e) => { if (!box.current?.contains(e.target)) setMenu(false) }
    const esc = (e) => { if (e.key === 'Escape') setMenu(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [menu])
  const switchTo = async (u) => {
    if (u.id === me.id) { setMenu(false); return }
    setSwitching(u.id)
    try { await post('/auth/demo', { email: u.email }); qc.clear(); setMenu(false); nav('/', { replace: true }) } finally { setSwitching('') }
  }
  return (
    <div className="flex h-full">
      {!wide && <div className="w-[76px] shrink-0" aria-hidden />}
      {!wide && drawer && <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setDrawer(false)} aria-hidden />}
      <aside className={`${mini ? 'w-[76px]' : 'w-[264px]'} ${wide ? '' : 'fixed inset-y-0 left-0 z-40'} ${!wide && drawer ? 'shadow-pop' : ''} scroll-thin flex shrink-0 flex-col overflow-y-auto border-r border-line bg-white px-4 pb-5 transition-all`}>
        <div className="flex h-16 items-center gap-3 px-1">
          <button onClick={() => nav(me.home)} aria-label="Trang chính"><Logo /></button>
          {!mini && <><span className="h-7 w-px bg-line" /><span className="flex-1 text-[17px] text-neutral-600">LMS</span></>}
          {!mini && <button className="icon-btn" onClick={() => setMini(true)} aria-label="Thu gọn"><PanelLeft size={20} /></button>}
        </div>
        {mini && <button className="icon-btn mx-auto mb-2" onClick={() => setMini(false)} aria-label="Mở rộng"><PanelLeft size={20} /></button>}
        <nav className="mt-2 space-y-0.5">
          {items.map(([to, label, I, badge]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setDrawer(false)} title={mini ? label : undefined}
              className={({ isActive }) => `flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] transition ${isActive ? 'bg-navsel font-medium text-navtxt' : 'text-ink hover:bg-neutral-50'}`}>
              <I size={20} strokeWidth={1.8} />{!mini && <span className="flex-1">{label}</span>}
              {!mini && badge > 0 && <span className="rounded-full bg-brand px-2 text-[12px] font-semibold text-white">{badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1" />
        <div ref={box} className="relative mt-3 border-t border-line pt-3">
          <button onClick={() => setMenu(!menu)} aria-expanded={menu} title={me.demo ? 'Đổi vai (bản demo)' : undefined} className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left hover:bg-neutral-50">
            <Avatar text={me.initials} size={36} color={me.color} />
            {!mini && <div className="min-w-0 flex-1 leading-tight"><div className="truncate text-[15px] font-medium">{me.name}</div><div className="truncate text-[12px] text-neutral-500">{me.title}</div></div>}
            {!mini && me.demo && <ArrowLeftRight size={15} className="shrink-0 text-neutral-400" />}
          </button>
          {menu && (
            <div className={`fade absolute bottom-full z-40 mb-2 rounded-xl border border-line bg-white p-2 shadow-pop ${mini ? 'left-0 w-[280px]' : 'inset-x-0'}`}>
              {me.demo ? <>
                <div className="px-2 pb-1.5 pt-1 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">Bản demo · đổi vai</div>
                {demoUsers.map((u) => { const on = u.id === me.id; return (
                  <button key={u.id} onClick={() => switchTo(u)} disabled={!!switching} aria-current={on} className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left ${on ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}>
                    <Avatar text={initials(u.name)} size={30} color={u.color} />
                    <span className="min-w-0 flex-1 leading-tight"><span className="block text-[14px] font-medium">{u.label}</span><span className="block truncate text-[12px] text-neutral-500">{u.name}</span></span>
                    {switching === u.id ? <Spinner size={16} w={2} /> : on && <Check size={16} className="text-emerald-600" />}
                  </button>) })}
              </> : <>
                <div className="px-2 pb-2 pt-1 text-[13px] text-neutral-500">{me.email}</div>
                <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[14px] hover:bg-neutral-50"><LogOut size={16} />Đăng xuất</button>
              </>}
            </div>
          )}
        </div>
      </aside>
      <main className="scroll-thin relative min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export const TopOrg = ({ children }) => { const { me } = useMe(); return (
  <div className="sticky top-0 z-20 flex h-16 items-center border-b border-line/70 bg-white/80 px-4 backdrop-blur md:px-10">
    <span className="text-[16px] font-medium">{me?.orgName}</span>
    <div className="flex-1" />
    <div className="flex items-center gap-2">{children}<NotificationBell /></div>
  </div>
) }
