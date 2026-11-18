import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Palette, Settings2, MessageSquare, Eye, BarChart3, Sparkles, ChevronDown, Box, Link2, RefreshCw, Users, Minus, Plus, Lock, Copy, Check, X, ArrowUp, Eraser, ShieldCheck, Pencil, Laptop, Tablet, Smartphone, RectangleHorizontal, ChevronLeft, MonitorSmartphone, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useStore, useRole, tick } from '../store'
import { FORMATS } from '../data'
import { Logo, Modal, Tip, Toggle, Status, FormatGlyph, Avatar } from '../ui'

export function ShareModal({ open, onClose, art }) {
  const { set, say } = useStore()
  const [o, setO] = useState({ live: true, sso: true, aud: 40, pw: false })
  const [tab, setTab] = useState('quick')
  if (!art) return null
  const ok = true
  const upA = (fn) => set((d) => fn(d.artifacts[art.id]))
  return (
    <Modal open={open} onClose={onClose} w={820} pad={false} title="Chia sẻ">
      <div className="mx-6 flex items-center gap-2 border-b border-line pb-3 text-[13px]"><FormatGlyph type={art.type} size={14} /><b>{FORMATS[art.type].name}</b><span className="h-3 w-px bg-line" />{art.title}</div>
      <div className="grid grid-cols-[170px_1fr] gap-6 px-6 py-4">
        <div className="space-y-1">
          {[['quick', 'Chia sẻ nhanh', Link2], ['assign', 'Giao theo nhóm', Users]].map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[14px] ${tab === k ? 'bg-navsel font-medium text-navtxt' : 'hover:bg-neutral-50'}`}><I size={15} />{l}</button>
          ))}
        </div>
        <div className="border-l border-line pl-6">
          {tab === 'quick' ? (<>
            <p className="text-[14px]">Tạo đường dẫn để chia sẻ, rồi gửi cho nhóm để họ mở và hoàn thành.</p>
            <div className={`mt-3 flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-[14px] ${art.link ? 'bg-white' : 'bg-neutral-50 text-neutral-500'}`}>
              <Link2 size={16} />{art.link ? <span className="flex-1 font-medium text-ink">https://{art.link}</span> : <span className="flex-1">Chưa có đường dẫn. Tạo đường dẫn để bắt đầu chia sẻ</span>}
              {art.link ? <button onClick={() => say('Đã sao chép đường dẫn')} className="flex items-center gap-1 font-medium text-ink"><Copy size={14} />Sao chép</button> : <span className="text-[12px]">• Chưa phát hành</span>}
            </div>
            {[[RefreshCw, 'Đẩy cập nhật trực tiếp', 'Thay đổi hiện ngay cho người xem', 'live'], [Users, 'Đăng nhập tài khoản công ty', 'Người xem đăng nhập SSO để ghi nhận tiến độ và kết quả', 'sso']].map(([I, t, s, k]) => (
              <div key={k} className="flex items-center gap-4 border-b border-line py-4"><I size={20} /><div className="flex-1"><div className="text-[15px] font-semibold">{t}</div><div className="text-[13px] text-neutral-600">{s}</div></div><Toggle on={o[k]} onChange={(v) => setO({ ...o, [k]: v })} /></div>
            ))}
            <div className="flex items-center gap-4 border-b border-line py-4 pl-9"><BarChart3 size={18} /><div className="flex-1"><div className="text-[15px] font-semibold">Số người dự kiến</div><div className="text-[13px] text-neutral-600">Dùng để tính tỷ lệ hoàn thành</div></div>
              <div className="flex items-center rounded-full border border-line"><button className="px-3 py-1.5" onClick={() => setO({ ...o, aud: Math.max(0, o.aud - 5) })}><Minus size={14} /></button><span className="w-10 text-center text-[14px]">{o.aud}</span><button className="px-3 py-1.5" onClick={() => setO({ ...o, aud: o.aud + 5 })}><Plus size={14} /></button></div></div>
            <div className="flex items-center gap-4 py-4"><Lock size={20} /><div className="flex-1"><div className="text-[15px] font-semibold">Đặt mật khẩu</div><div className="text-[13px] text-neutral-600">Người xem cần mật khẩu để mở</div></div><Toggle on={o.pw} onChange={(v) => setO({ ...o, pw: v })} /></div>
            <div className="flex justify-end border-t border-line pt-4">
              <button className="btn-dark" disabled={!ok || !!art.link} onClick={() => { upA((a) => { a.status = 'published'; a.link = `learn.example.com/s/${a.id}` }); set((d) => tick(d, 5)); say('Đã tạo đường dẫn chia sẻ') }}><Link2 size={16} />{art.link ? 'Đã phát hành' : 'Tạo đường dẫn'}</button>
            </div>
          </>) : (
            <div>
              <p className="text-[14px]">Giao khóa cho nhóm nhân viên trên LMS, có hạn hoàn thành. Kết quả bài thi chính thức đạt được gửi sang Quản trị nhân tài.</p>
              {[['Kỹ sư phần mềm mới · đợt 11/2026', 14], ['Nhóm Hạ tầng', 9], ['Theo kế hoạch đào tạo "GenAI 2027"', 22]].map(([g, n], i) => (
                <label key={g} className="mt-3 flex items-center gap-3 rounded-xl border border-line p-3 text-[14px]"><input type="checkbox" defaultChecked={i === 0} /><span className="flex-1">{g}</span><span className="text-neutral-500">{n} người</span></label>
              ))}
              <div className="mt-3 flex items-center gap-3 text-[14px]">Hạn hoàn thành <input type="date" className="field w-44 py-1.5" defaultValue="2026-12-05" /></div>
              <div className="mt-4 flex justify-end"><button className="btn-dark" disabled={!ok} onClick={() => { say('Đã giao khóa cho 14 người'); onClose() }}>Giao khóa</button></div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export function AIPanel({ open, onClose, scope = 'tài liệu này' }) {
  const [msgs, setMsgs] = useState([])
  const [t, setT] = useState('')
  if (!open) return null
  const send = (x) => { const m = x || t; if (!m) return; setT(''); setMsgs((v) => [...v, ['me', m], ['ai', `Mình đã tìm được 6 chỗ cần đổi trong ${scope}. Xem từng đề xuất bên dưới rồi bấm Áp dụng.`]]) }
  return (
    <aside className="fade fixed right-0 top-0 bottom-0 z-40 flex w-[440px] flex-col border-l border-line bg-gradient-to-b from-violet-50/60 to-white shadow-pop">
      <div className="flex h-14 items-center justify-end gap-1 px-3"><Tip label="Xóa hội thoại" onClick={() => setMsgs([])}><Eraser size={17} /></Tip><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
      <div className="scroll-thin flex-1 overflow-y-auto px-6">
        {msgs.length === 0 ? (
          <div className="pt-16 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-white shadow-card"><Sparkles size={36} className="text-violet-500" /></div>
            <h3 className="mt-5 text-[20px] font-semibold">Sửa hàng loạt trong một tài liệu hoặc cả bộ đào tạo</h3>
            <p className="mt-2 text-[14px] text-neutral-600">Kiểm tra đề xuất trước khi áp dụng. Chưa hỗ trợ mọi thứ, AI sẽ nói rõ khi không làm được.</p>
          </div>
        ) : msgs.map(([who, m], i) => (
          <div key={i} className={`my-3 flex ${who === 'me' ? 'justify-end' : ''}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] ${who === 'me' ? 'bg-ink text-white' : 'bg-white shadow-card'}`}>{m}
              {who === 'ai' && <div className="mt-3 space-y-2">{['"docker volume" → "Docker volume" (4 chỗ)', '"mất data" → "mất dữ liệu" (2 chỗ)'].map((s) => <div key={s} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[13px]"><span className="flex-1">{s}</span><button className="font-semibold text-violet-700">Áp dụng</button></div>)}</div>}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 pb-4">
        <div className="mb-2 grid grid-cols-2 gap-2">{['Tìm và thay thuật ngữ', 'Đổi giọng văn', 'Viết đơn giản hơn', 'Bỏ biệt ngữ'].map((c) => <button key={c} onClick={() => send(c)} className="rounded-xl border border-line bg-white px-3 py-2.5 text-left text-[13px] hover:bg-neutral-50">{c}</button>)}</div>
        <div className="flex items-center rounded-2xl border border-line bg-white px-4 py-2.5"><input value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} className="flex-1 text-[14px] outline-none" placeholder="Nhập yêu cầu…" /><button onClick={() => send()} className="grid h-7 w-7 place-items-center rounded-full bg-neutral-200"><ArrowUp size={15} /></button></div>
      </div>
    </aside>
  )
}

export function ReviewBar({ art }) {
  const { set, say } = useStore()
  const up = (fn) => set((d) => fn(d.artifacts[art.id]))
  const bar = (tone, icon, text, actions) => <div className={`flex items-center gap-3 border-b px-6 py-2 text-[14px] ${tone}`}>{icon}<span className="flex-1">{text}</span>{actions}</div>
  if (art.status !== 'published') return bar('border-line bg-neutral-50', <Pencil size={15} className="text-neutral-500" />, <><b>Bản nháp AI tạo.</b> Rà lại nội dung và nguồn trích. Người học chỉ thấy sau khi bạn bấm Chia sẻ.</>, null)
  return null
}

export function Snapshots() {
  const [o, setO] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setO(!o)} className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[14px] font-semibold hover:bg-neutral-100">Phiên bản<ChevronDown size={15} /></button>
      {o && <div className="fade absolute left-0 top-9 z-40 w-[360px] rounded-xl border border-line bg-white py-2 shadow-pop">
        <div className="mx-2 flex gap-3 rounded-lg bg-sky-50 p-3"><Pencil size={15} className="mt-0.5" /><div><div className="text-[14px] font-semibold">Bản hiện tại</div><div className="text-[12px] text-neutral-600">Sửa nội dung để thêm vào lịch sử phiên bản</div></div></div>
        <div className="px-4 pt-3 pb-1 text-[12px] text-neutral-500">Ảnh chụp</div>
        {[['Đã chia sẻ', '18/11/2026 · Nguyễn An'], ['Bản AI tạo', '18/11/2026 · Nguyễn An']].map(([a, b]) => <div key={a} className="flex gap-3 px-4 py-2 hover:bg-neutral-50"><span className="mt-1.5 h-2 w-2 rounded-full bg-neutral-400" /><div><div className="text-[14px] font-medium">{a}</div><div className="text-[12px] text-neutral-500">{b}</div></div></div>)}
      </div>}
    </div>
  )
}

export function ArtifactTop({ art, kit, right, onPreview, onTheme, onSettings, onShare, onAI }) {
  const nav = useNavigate()
  const author = useRole().role === 'author'
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white px-5">
      <button onClick={() => nav('/')} className="shrink-0"><Logo size={26} /></button>
      <button onClick={() => nav(`/kit/${kit.id}`)} className="flex min-w-0 shrink items-center gap-1.5 text-[15px] text-neutral-500 hover:text-ink" title={kit.title}><Box size={15} className="shrink-0 text-emerald-600" /><span className="truncate">{kit.title}</span></button>
      <span className="text-neutral-300">/</span>
      <span className="flex min-w-0 shrink-[2] items-center gap-1.5 text-[15px] font-medium" title={art.title}><span className="shrink-0"><FormatGlyph type={art.type} size={15} /></span><span className="truncate">{art.title}</span></span>
      <Snapshots />
      <Status s={art.status} />
      <div className="min-w-2 flex-1" />
      {author && right}
      <Tip label="Giao diện" onClick={onTheme}><Palette size={19} /></Tip>
      {onSettings && <Tip label="Cài đặt" onClick={onSettings}><Settings2 size={19} /></Tip>}
      <Tip label="Bình luận"><MessageSquare size={19} /></Tip>
      <Tip label="Xem trước" onClick={onPreview}><Eye size={19} /></Tip>
      <Tip label="Phân tích" onClick={() => nav('/analytics')}><BarChart3 size={19} /></Tip>
      <Tip label="AI" onClick={onAI}><Sparkles size={19} /></Tip>
      {author && <>
        <button className="btn-dark btn-sm ml-1 h-9 shrink-0 whitespace-nowrap px-4" onClick={onShare}>Chia sẻ</button>
        <AIFeedback key={art.id} name={FORMATS[art.type].name.toLowerCase()} />
      </>}
    </header>
  )
}

// Hỏi nhanh "AI làm tốt không" như bản gốc, mỗi tài liệu hỏi một lần
export function AIFeedback({ name }) {
  const { say } = useStore()
  const [open, setOpen] = useState(true)
  if (!open) return null
  const done = (m) => { setOpen(false); say(m) }
  return (
    <div className="fade fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-xl bg-ink py-2.5 pl-4 pr-3 text-[14px] font-normal text-white shadow-pop">
      AI soạn {name} này thế nào?
      <button onClick={() => done('Cảm ơn góp ý của bạn')} className="grid h-7 w-7 place-items-center rounded-md bg-white text-ink" aria-label="Tốt"><ThumbsUp size={15} /></button>
      <button onClick={() => done('Cảm ơn, AI sẽ học từ góp ý này')} className="grid h-7 w-7 place-items-center rounded-md bg-white text-ink" aria-label="Chưa tốt"><ThumbsDown size={15} /></button>
      <button onClick={() => setOpen(false)} className="ml-1 text-white/70 hover:text-white" aria-label="Đóng"><X size={16} /></button>
    </div>
  )
}

export const DEVICES = [['desktop', 'Máy tính', Laptop, '100%'], ['tablet', 'Máy tính bảng dọc', Tablet, 820], ['tabletL', 'Máy tính bảng ngang', RectangleHorizontal, 1080], ['mobile', 'Điện thoại dọc', Smartphone, 400], ['mobileL', 'Điện thoại ngang', MonitorSmartphone, 760]]

export function DeviceBar({ device, setDevice, left, right, devices = true }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white px-4">
      {left}
      <div className="flex-1" />
      {devices && <div className="flex">{DEVICES.map(([k, l, I]) => <Tip key={k} label={l} onClick={() => setDevice(k)} active={device === k} className={`h-14 w-12 rounded-none ${device === k ? 'border-b-2 border-ink' : ''}`}><I size={20} /></Tip>)}</div>}
      {right}
    </header>
  )
}

export function ThemePanel({ open, onClose }) {
  const [device, setDevice] = useState('desktop')
  const [color, setColor] = useState('#ff6119')
  const [sec, setSec] = useState(null)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <DeviceBar device={device} setDevice={setDevice} left={<><button className="icon-btn" onClick={onClose}><ChevronLeft size={20} /></button><span className="text-[15px] font-medium">Giao diện</span></>} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[320px] border-r border-line px-6 py-6">
          <h3 className="text-[22px] font-semibold">Giao diện</h3>
          <div className="mt-4 h-36 rounded-xl p-5 text-white" style={{ background: color }}><div className="mt-10 text-[13px] font-bold">Tiêu đề khóa học</div><div className="mt-1 h-1 w-8 rounded bg-white/70" /></div>
          <div className="mt-3 flex items-center text-[14px]"><span className="font-medium">Thương hiệu mặc định</span><span className="mx-1">·</span><a className="underline">Áp dụng thương hiệu</a><div className="flex-1" /><button className="btn-line btn-sm">Sửa</button></div>
          <div className="mt-6 space-y-1">{['Đầu trang', 'Màu sắc', 'Phông chữ', 'Khối nội dung'].map((s) => (
            <div key={s}><button onClick={() => setSec(sec === s ? null : s)} className="w-full py-2 text-left text-[15px] font-medium">{s}</button>
              {sec === s && s === 'Màu sắc' && <div className="flex gap-2 pb-2">{['#ff6119', '#1d5f95', '#0f766e', '#7c3aed', '#111827'].map((c) => <button key={c} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-ink' : ''}`} style={{ background: c }} />)}</div>}
              {sec === s && s === 'Phông chữ' && <div className="pb-2 text-[13px] text-neutral-600">Tiêu đề: Lato · Nội dung: Merriweather</div>}
            </div>))}</div>
        </aside>
        <div className="flex-1 overflow-auto bg-neutral-100 p-6">
          <div className="mx-auto overflow-hidden bg-white shadow-card transition-all" style={{ width: DEVICES.find((d) => d[0] === device)[3] }}>
            <div className="px-10 py-16" style={{ background: color }}><h1 className="font-lato text-[38px] font-black text-ink">Sửa cấu hình làm mất dữ liệu</h1></div>
            <div className="p-10 font-serif text-[17px] leading-loose text-neutral-700">Trong tình huống này, một kỹ sư mới cùng kỹ sư cao cấp xử lý lỗi mất dữ liệu do cấu hình Docker volume sai.<div className="mt-6"><span className="inline-block rounded-full px-10 py-2.5 font-lato text-[14px] font-bold" style={{ background: color }}>Bắt đầu</span></div></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { Avatar }
