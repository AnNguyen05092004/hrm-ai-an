import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, BarChart3, ChevronDown, Box, Link2, Users, Copy, Pencil, Laptop, Tablet, Smartphone, RectangleHorizontal, MonitorSmartphone, History, RotateCcw, AlertTriangle, Check, Search } from 'lucide-react'
import { useStore } from '../store'
import { FORMATS } from '../data'
import { Logo, Modal, Tip, Status, FormatGlyph, Avatar, Spinner } from '../ui'
import { get, post } from '../api'

const shareUrl = (slug) => `${location.origin}/s/${slug}`

/** Chia sẻ: xuất bản phiên bản mới, tạo đường dẫn trong công ty, giao cho người hoặc phòng ban */
export function ShareModal({ open, onClose, art, onChanged }) {
  const { say } = useStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('publish')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const check = useQuery({ queryKey: ['check', art?.id, art?.updated], queryFn: () => get(`/artifacts/${art.id}/check`), enabled: open && !!art })
  const full = useQuery({ queryKey: ['artifact-meta', art?.id], queryFn: () => get(`/artifacts/${art.id}`), enabled: open && !!art })
  if (!art) return null
  const slug = full.data?.shareSlug
  const published = (full.data?.status ?? art.status) === 'published'
  const refresh = () => { qc.invalidateQueries({ queryKey: ['artifact-meta', art.id] }); qc.invalidateQueries({ queryKey: ['kits'] }); qc.invalidateQueries({ queryKey: ['kit'] }); onChanged?.() }
  const act = async (fn, msg) => { setBusy(true); try { await fn(); refresh(); say(msg) } catch (e) { say(e.message) } finally { setBusy(false) } }
  const blocking = check.data?.blocking ?? [], warnings = check.data?.warnings ?? []
  return (
    <Modal open={open} onClose={onClose} w={820} pad={false} title="Chia sẻ">
      <div className="mx-6 flex items-center gap-2 border-b border-line pb-3 text-[13px]"><FormatGlyph type={art.type} size={14} /><b>{FORMATS[art.type].name}</b><span className="h-3 w-px bg-line" />{art.title}<div className="flex-1" /><Status s={full.data?.status ?? art.status} /></div>
      <div className="grid grid-cols-[170px_1fr] gap-6 px-6 py-4">
        <div className="space-y-1">
          {[['publish', 'Xuất bản', Check], ['quick', 'Đường dẫn', Link2], ['assign', 'Giao khóa', Users]].map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[14px] ${tab === k ? 'bg-navsel font-medium text-navtxt' : 'hover:bg-neutral-50'}`}><I size={15} />{l}</button>
          ))}
        </div>
        <div className="min-h-[300px] border-l border-line pl-6">
          {tab === 'publish' && (<>
            <p className="text-[14px]">Xuất bản chụp lại nội dung hiện tại thành một phiên bản. Người học và AI Tutor chỉ dùng bản đã xuất bản; bạn vẫn sửa bản nháp mà không ảnh hưởng người đang học.</p>
            {check.isLoading ? <div className="mt-4"><Spinner size={20} w={2} /></div> : <>
              {blocking.map((x) => <div key={x} className="mt-3 flex gap-2 rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-700"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{x}</div>)}
              {warnings.map((x) => <div key={x} className="mt-3 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[14px] text-amber-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{x}</div>)}
              {!blocking.length && !warnings.length && <div className="mt-3 flex items-center gap-2 text-[14px] text-emerald-700"><Check size={16} />Sẵn sàng xuất bản.</div>}
            </>}
            <label className="mb-1.5 mt-4 block text-[14px] font-medium">Ghi chú phiên bản</label>
            <input className="field py-2" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: Cập nhật bước sao lưu theo runbook v3" />
            <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
              {published && <button className="btn-line" disabled={busy} onClick={() => act(() => post(`/artifacts/${art.id}/unpublish`), 'Đã ngừng xuất bản')}>Ngừng xuất bản</button>}
              <button className="btn-dark" disabled={busy || blocking.length > 0} onClick={() => act(() => post(`/artifacts/${art.id}/publish`, { note }), published ? 'Đã xuất bản phiên bản mới' : 'Đã xuất bản')}>{busy ? <Spinner size={18} w={2} /> : published ? 'Xuất bản phiên bản mới' : 'Xuất bản'}</button>
            </div>
          </>)}
          {tab === 'quick' && (<>
            <p className="text-[14px]">Đường dẫn mở được với mọi người trong công ty đã đăng nhập. Tiến độ và kết quả được ghi theo tài khoản.</p>
            <div className={`mt-3 flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-[14px] ${slug ? 'bg-white' : 'bg-neutral-50 text-neutral-500'}`}>
              <Link2 size={16} />{slug ? <span className="flex-1 truncate font-medium text-ink">{shareUrl(slug)}</span> : <span className="flex-1">{published ? 'Chưa có đường dẫn' : 'Xuất bản tài liệu trước khi tạo đường dẫn'}</span>}
              {slug && <button onClick={() => { navigator.clipboard?.writeText(shareUrl(slug)); say('Đã sao chép đường dẫn') }} className="flex items-center gap-1 font-medium text-ink"><Copy size={14} />Sao chép</button>}
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
              {slug && <button className="btn-line" disabled={busy} onClick={() => act(() => post(`/artifacts/${art.id}/share`, { on: false }), 'Đã tắt đường dẫn')}>Tắt đường dẫn</button>}
              {!slug && <button className="btn-dark" disabled={busy || !published} onClick={() => act(() => post(`/artifacts/${art.id}/share`, { on: true }), 'Đã tạo đường dẫn chia sẻ')}><Link2 size={16} />Tạo đường dẫn</button>}
            </div>
          </>)}
          {tab === 'assign' && <AssignForm art={art} published={published} onDone={onClose} />}
        </div>
      </div>
    </Modal>
  )
}

function AssignForm({ art, published, onDone }) {
  const { say } = useStore()
  const qc = useQueryClient()
  const people = useQuery({ queryKey: ['people'], queryFn: () => get('/people') })
  const current = useQuery({ queryKey: ['assignees', art.id], queryFn: () => get(`/assignments?artifactId=${art.id}`) })
  const [pick, setPick] = useState(new Set())
  const [due, setDue] = useState(() => new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const assigned = new Set((current.data ?? []).map((x) => x.userId))
  const depts = useMemo(() => {
    const m = new Map()
    for (const p of people.data?.people ?? []) if (p.role === 'learner') m.set(p.deptName ?? 'Khác', [...(m.get(p.deptName ?? 'Khác') ?? []), p])
    return [...m.entries()]
  }, [people.data])
  const toggle = (ids, on) => setPick((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n })
  const submit = async () => {
    setBusy(true)
    try {
      const r = await post('/assignments', { artifactId: art.id, userIds: [...pick], due, reason })
      qc.invalidateQueries({ queryKey: ['assignees', art.id] })
      say(`Đã giao cho ${r.created} người${r.skipped ? `, ${r.skipped} người đã được giao trước đó` : ''}`)
      onDone()
    } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  if (!published) return <p className="text-[14px] text-neutral-600">Xuất bản tài liệu trước khi giao cho người học.</p>
  const match = (p) => !q || p.name.toLowerCase().includes(q.toLowerCase())
  return (
    <div>
      <p className="text-[14px]">Chọn người học và hạn hoàn thành. Người được giao thấy khóa trong "Khóa học của tôi".</p>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-line px-3"><Search size={15} className="text-neutral-400" /><input className="h-9 flex-1 text-[14px] outline-none" placeholder="Tìm theo tên" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="scroll-thin mt-2 max-h-[260px] overflow-y-auto rounded-xl border border-line">
        {people.isLoading && <div className="p-4"><Spinner size={20} w={2} /></div>}
        {depts.map(([d, ps]) => { const list = ps.filter(match); if (!list.length) return null; const free = list.filter((p) => !assigned.has(p.id)); const all = free.length > 0 && free.every((p) => pick.has(p.id)); return (
          <div key={d} className="border-b border-line last:border-0">
            <label className="flex items-center gap-2 bg-neutral-50 px-3 py-2 text-[13px] font-semibold"><input type="checkbox" checked={all} disabled={!free.length} onChange={(e) => toggle(free.map((p) => p.id), e.target.checked)} />{d}<span className="font-normal text-neutral-500">· {list.length} người</span></label>
            {list.map((p) => (
              <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-[14px]">
                <input type="checkbox" disabled={assigned.has(p.id)} checked={assigned.has(p.id) || pick.has(p.id)} onChange={(e) => toggle([p.id], e.target.checked)} />
                <Avatar text={p.initials} size={22} color={p.color} /><span className="flex-1">{p.name}</span><span className="text-[12px] text-neutral-500">{assigned.has(p.id) ? 'Đã giao' : p.title}</span>
              </label>
            ))}
          </div>) })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-[14px]">
        <label>Hạn hoàn thành<input type="date" className="field mt-1 py-1.5" value={due} onChange={(e) => setDue(e.target.value)} /></label>
        <label>Lý do giao (người học thấy)<input className="field mt-1 py-1.5" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: Bắt buộc hằng năm" /></label>
      </div>
      <div className="mt-4 flex justify-end"><button className="btn-dark" disabled={busy || !pick.size} onClick={submit}>{busy ? <Spinner size={18} w={2} /> : `Giao cho ${pick.size} người`}</button></div>
    </div>
  )
}

/** Lịch sử phiên bản đã xuất bản, khôi phục vào bản nháp */
export function Snapshots({ art, onRestored }) {
  const { say } = useStore()
  const [o, setO] = useState(false)
  const v = useQuery({ queryKey: ['versions', art.id], queryFn: () => get(`/artifacts/${art.id}/versions`), enabled: o })
  const restore = async (n) => {
    if (!confirm(`Thay bản nháp hiện tại bằng nội dung phiên bản ${n}?`)) return
    try { await post(`/artifacts/${art.id}/versions/${n}/restore`); setO(false); say(`Đã khôi phục phiên bản ${n} vào bản nháp`); onRestored?.() } catch (e) { say(e.message) }
  }
  return (
    <div className="relative">
      <button onClick={() => setO(!o)} className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[14px] font-semibold hover:bg-neutral-100"><History size={15} />Phiên bản<ChevronDown size={15} /></button>
      {o && <div className="fade absolute left-0 top-9 z-40 w-[360px] rounded-xl border border-line bg-white py-2 shadow-pop">
        <div className="mx-2 flex gap-3 rounded-lg bg-sky-50 p-3"><Pencil size={15} className="mt-0.5" /><div><div className="text-[14px] font-semibold">Bản nháp hiện tại</div><div className="text-[12px] text-neutral-600">Tự lưu khi bạn sửa. Xuất bản để tạo phiên bản mới.</div></div></div>
        <div className="px-4 pb-1 pt-3 text-[12px] text-neutral-500">Đã xuất bản</div>
        {v.isLoading && <div className="px-4 py-2"><Spinner size={18} w={2} /></div>}
        {v.data?.length === 0 && <div className="px-4 py-2 text-[13px] text-neutral-500">Chưa xuất bản lần nào.</div>}
        {v.data?.map((x) => (
          <div key={x.version} className="group flex gap-3 px-4 py-2 hover:bg-neutral-50">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-neutral-400" />
            <div className="flex-1"><div className="text-[14px] font-medium">Phiên bản {x.version}{x.note && ` · ${x.note}`}</div><div className="text-[12px] text-neutral-500">{new Date(x.createdAt).toLocaleString('vi-VN')} · {x.by}</div></div>
            <button onClick={() => restore(x.version)} className="hidden items-center gap-1 text-[12px] font-medium text-sky-700 group-hover:flex"><RotateCcw size={13} />Khôi phục</button>
          </div>
        ))}
      </div>}
    </div>
  )
}

export function ArtifactTop({ art, kit, right, onPreview, onShare, saveText, onRestored }) {
  const nav = useNavigate()
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white px-5">
      <button onClick={() => nav('/')} className="shrink-0" aria-label="Trang chủ"><Logo size={26} /></button>
      <button onClick={() => nav(`/kit/${kit.id}`)} className="flex min-w-0 shrink items-center gap-1.5 text-[15px] text-neutral-500 hover:text-ink" title={kit.title}><Box size={15} className="shrink-0 text-emerald-600" /><span className="truncate">{kit.title}</span></button>
      <span className="text-neutral-300">/</span>
      <span className="flex min-w-0 shrink-[2] items-center gap-1.5 text-[15px] font-medium" title={art.title}><span className="shrink-0"><FormatGlyph type={art.type} size={15} /></span><span className="truncate">{art.title}</span></span>
      <Snapshots art={art} onRestored={onRestored} />
      <Status s={art.status} />
      {saveText && <span className="whitespace-nowrap text-[13px] italic text-neutral-500">{saveText}</span>}
      <div className="min-w-2 flex-1" />
      {right}
      <Tip label="Xem trước" onClick={onPreview}><Eye size={19} /></Tip>
      <Tip label="Phân tích" onClick={() => nav(`/analytics?artifact=${art.id}`)}><BarChart3 size={19} /></Tip>
      <button className="btn-dark btn-sm ml-1 h-9 shrink-0 whitespace-nowrap px-4" onClick={onShare}>Chia sẻ</button>
    </header>
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

export function DraftBar({ art }) {
  if (art.status === 'published') return null
  return <div className="flex items-center gap-3 border-b border-line bg-neutral-50 px-6 py-2 text-[14px]"><Pencil size={15} className="text-neutral-500" /><span className="flex-1"><b>Bản nháp.</b> Rà lại nội dung và nguồn trích. Người học chỉ thấy sau khi bạn bấm Chia sẻ → Xuất bản.</span></div>
}

export { Avatar, Eye }
