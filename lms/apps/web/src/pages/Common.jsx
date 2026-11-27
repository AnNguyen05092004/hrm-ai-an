import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, ChevronDown, Box, Pencil, Laptop, Tablet, Smartphone, RectangleHorizontal, MonitorSmartphone, History, RotateCcw, AlertTriangle, Check } from 'lucide-react'
import { useStore } from '../store'
import { FORMATS } from '../data'
import { Logo, Modal, Tip, Status, FormatGlyph, Avatar, Spinner } from '../ui'
import { get, post } from '../api'

/** Xuất bản: chụp nội dung hiện tại thành một phiên bản. Gói xuất (SCORM, đề QTI) dùng bản đã xuất bản */
export function PublishModal({ open, onClose, art, onChanged }) {
  const { say } = useStore()
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const check = useQuery({ queryKey: ['check', art?.id, art?.updated], queryFn: () => get(`/artifacts/${art.id}/check`), enabled: open && !!art })
  const full = useQuery({ queryKey: ['artifact-meta', art?.id], queryFn: () => get(`/artifacts/${art.id}`), enabled: open && !!art })
  if (!art) return null
  const published = (full.data?.status ?? art.status) === 'published'
  const refresh = () => { qc.invalidateQueries({ queryKey: ['artifact-meta', art.id] }); qc.invalidateQueries({ queryKey: ['kits'] }); qc.invalidateQueries({ queryKey: ['kit'] }); onChanged?.() }
  const act = async (fn, msg) => { setBusy(true); try { await fn(); refresh(); say(msg) } catch (e) { say(e.message) } finally { setBusy(false) } }
  const blocking = check.data?.blocking ?? [], warnings = check.data?.warnings ?? [], spots = check.data?.spots ?? []
  const master = art.type === 'master'
  const goTo = (x) => { onClose(); nav(`/edit/${art.id}?l=${x.lesson}&b=${x.block}`) }
  return (
    <Modal open={open} onClose={onClose} w={620} title={master ? 'Chốt nội dung' : 'Xuất bản'}
      footer={<>
        {published && !master && <button className="btn-line h-10" disabled={busy} onClick={() => act(() => post(`/artifacts/${art.id}/unpublish`), 'Đã ngừng xuất bản')}>Ngừng xuất bản</button>}
        <button className="btn-dark h-10" disabled={busy || blocking.length > 0} onClick={() => act(() => post(`/artifacts/${art.id}/publish`, { note }), master ? `Đã chốt nội dung${published ? ' (phiên bản mới)' : ''}` : published ? 'Đã xuất bản phiên bản mới' : 'Đã xuất bản')}>{busy ? <Spinner size={18} w={2} /> : master ? (published ? 'Chốt phiên bản mới' : 'Chốt nội dung') : published ? 'Xuất bản phiên bản mới' : 'Xuất bản'}</button>
      </>}>
      <div className="flex items-center gap-2 border-b border-line pb-3 text-[13px]"><FormatGlyph type={art.type} size={14} /><b>{FORMATS[art.type].name}</b>{art.title !== FORMATS[art.type].name && <><span className="h-3 w-px bg-line" /><span className="truncate">{art.title}</span></>}<div className="flex-1" /><Status s={full.data?.status ?? art.status} master={master} /></div>
      <p className="mt-3 text-[14px]">{master ? 'Chốt lưu nội dung hiện tại thành một phiên bản. Tài liệu nhanh, slide, video, tình huống, đề kiểm tra chỉ soạn từ bản đã chốt. Sửa nội dung sau khi chốt thì chốt lại; các định dạng soạn từ bản cũ sẽ được đánh dấu để soạn lại.' : 'Xuất bản chụp lại nội dung hiện tại thành một phiên bản. Gói SCORM và đề QTI chỉ lấy bản đã xuất bản; bạn vẫn sửa bản nháp mà không ảnh hưởng gói đã xuất.'}</p>
      {check.isLoading ? <div className="mt-4"><Spinner size={20} w={2} /></div> : <>
        {blocking.map((x) => <div key={x} className="mt-3 flex gap-2 rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-700"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{x}</div>)}
        {warnings.map((x) => <div key={x} className="mt-3 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[14px] text-amber-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{x}</div>)}
        {spots.length > 0 && <div className="mt-2 max-h-[220px] divide-y divide-line overflow-y-auto rounded-lg border border-line">
          {spots.map((x) => (
            <div key={x.block} className="flex items-center gap-3 px-3 py-2 text-[13px]">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className={`chip ${x.kind === 'gap' ? 'bg-amber-50 text-amber-800' : 'bg-neutral-100 text-neutral-700'}`}>{x.kind === 'gap' ? 'Thiếu căn cứ' : 'Chưa có nguồn'}</span><span className="truncate font-medium">{x.lessonTitle}</span></div>
                {x.text && <div className="mt-0.5 truncate text-neutral-600" title={x.text}>{x.text}</div>}
              </div>
              <button className="btn-line btn-sm h-8 shrink-0" onClick={() => goTo(x)}>Sửa chỗ này</button>
            </div>))}
        </div>}
        {!blocking.length && !warnings.length && <div className="mt-3 flex items-center gap-2 text-[14px] text-emerald-700"><Check size={16} />{master ? 'Sẵn sàng chốt.' : 'Sẵn sàng xuất bản.'}</div>}
      </>}
      <label className="mb-1.5 mt-4 block text-[14px] font-medium">Ghi chú phiên bản</label>
      <input className="field py-2" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={master ? 'Ví dụ: Đã duyệt với chuyên gia an toàn thông tin' : 'Ví dụ: Cập nhật theo góp ý review'} />
    </Modal>
  )
}

/** Lịch sử phiên bản đã xuất bản, khôi phục vào bản nháp */
export function Snapshots({ art, onRestored }) {
  const { say, confirmBox } = useStore()
  const [o, setO] = useState(false)
  const v = useQuery({ queryKey: ['versions', art.id], queryFn: () => get(`/artifacts/${art.id}/versions`), enabled: o })
  const restore = async (n) => {
    if (!(await confirmBox(`Thay bản nháp hiện tại bằng nội dung phiên bản ${n}?`, { ok: 'Khôi phục' }))) return
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
      <Status s={art.status} master={art.type === 'master'} />
      {saveText && <span className="whitespace-nowrap text-[13px] italic text-neutral-500">{saveText}</span>}
      <div className="min-w-2 flex-1" />
      {right}
      <Tip label="Xem trước" onClick={onPreview}><Eye size={19} /></Tip>
      <button className="btn-dark btn-sm ml-1 h-9 shrink-0 whitespace-nowrap px-4" onClick={onShare}>{art.type === 'master' ? 'Chốt nội dung' : 'Xuất bản'}</button>
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
  if (art.type === 'master') return <div className="flex items-center gap-3 border-b border-line bg-neutral-50 px-6 py-2 text-[14px]"><Pencil size={15} className="text-neutral-500" /><span className="flex-1"><b>Nội dung.</b> Bản nội dung đầy đủ để duyệt, không xuất cho người học. Bấm <b>Chốt nội dung</b> rồi mới tạo Tài liệu nhanh, slide, video, tình huống, đề kiểm tra từ bản đã chốt.</span></div>
  if (art.status === 'published') return null
  return <div className="flex items-center gap-3 border-b border-line bg-neutral-50 px-6 py-2 text-[14px]"><Pencil size={15} className="text-neutral-500" /><span className="flex-1"><b>Bản nháp.</b> Rà lại nội dung và nguồn trích. Reviewer thấy bản nháp này; gói xuất chỉ lấy nội dung sau khi bạn bấm Xuất bản.</span></div>
}

export { Avatar, Eye }
