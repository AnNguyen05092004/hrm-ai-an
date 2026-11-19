// Chọn ảnh: ảnh có sẵn, ảnh của công ty (đã tải lên hoặc AI tạo), tải ảnh mới, AI tạo ảnh từ mô tả.
// Giá trị trả về: khóa ảnh có sẵn (vd "desk") hoặc đường dẫn "/api/images/<id>".
import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ImagePlus, Sparkles, Trash2, Upload } from 'lucide-react'
import { IMG } from './data'
import { Modal, Spinner, Thumb } from './ui'
import { useStore } from './store'
import { api, del, get, post } from './api'

const TABS = [['preset', 'Ảnh có sẵn'], ['org', 'Ảnh của công ty'], ['upload', 'Tải ảnh lên'], ['ai', 'AI tạo ảnh']]
const IDEAS = ['Nhóm kỹ sư thảo luận trước bảng trắng sơ đồ hệ thống', 'Màn hình laptop hiển thị bảng điều khiển giám sát máy chủ', 'Nhân viên chăm sóc khách hàng đeo tai nghe tại bàn làm việc']

function Tile({ img, on, onClick, children }) {
  return (
    <button onClick={onClick} className={`group relative overflow-hidden rounded-lg text-left outline-none ring-offset-2 ${on ? 'ring-2 ring-sky-500' : 'hover:ring-2 hover:ring-neutral-300'}`}>
      <Thumb img={img} className="aspect-[3/2]" />
      {on && <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-sky-500 text-white"><Check size={14} /></span>}
      {children}
    </button>
  )
}

export function ImagePicker({ open, onClose, onPick, value, title = 'Chọn ảnh' }) {
  const { say } = useStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('preset')
  const [sel, setSel] = useState(value)
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const file = useRef()
  // mở lại thì chọn sẵn ảnh hiện tại, đúng thẻ chứa nó
  useEffect(() => { if (open) { setSel(value); setTab(value?.startsWith?.('/api/images/') ? 'org' : 'preset') } }, [open, value])
  const org = useQuery({ queryKey: ['images'], queryFn: () => get('/images'), enabled: open })
  const added = (img) => { qc.invalidateQueries({ queryKey: ['images'] }); setSel(img.url); setTab('org') }
  const upload = async (f) => {
    if (!f) return
    if (f.size > 8 * 1024 * 1024) { say('Ảnh tối đa 8 MB'); return }
    setBusy(true)
    try { const form = new FormData(); form.append('file', f); added(await api('/images', { method: 'POST', form })); say('Đã tải ảnh lên') } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  const generate = async () => {
    setBusy(true)
    try { added(await post('/images/generate', { prompt })); say('AI đã tạo ảnh, ảnh được lưu vào Ảnh của công ty') } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  const remove = async (e, x) => {
    e.stopPropagation()
    try { await del(`/images/${x.id}`); qc.invalidateQueries({ queryKey: ['images'] }); if (sel === x.url) setSel(null) } catch (err) { say(err.message) }
  }
  return (
    <Modal open={open} onClose={onClose} w={820} title={title}
      footer={<><span className="mr-auto text-[13px] text-neutral-500">Ảnh tải lên và ảnh AI tạo chỉ người trong công ty xem được.</span><button className="btn-line h-10" onClick={onClose}>Hủy</button><button className="btn-dark h-10" disabled={!sel || sel === value} onClick={() => { onPick(sel); onClose() }}>Dùng ảnh này</button></>}>
      <div className="mb-4 flex gap-1 border-b border-line">{TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-3 py-2.5 text-[14px] ${tab === k ? 'border-ink font-semibold' : 'border-transparent text-neutral-500 hover:text-ink'}`}>{l}{k === 'org' && org.data?.length ? <span className="ml-1.5 text-neutral-400">{org.data.length}</span> : null}</button>)}</div>
      <div className="scroll-thin h-[420px] overflow-y-auto pr-1">
        {tab === 'preset' && <div className="grid grid-cols-4 gap-3">{Object.keys(IMG).map((k) => <Tile key={k} img={k} on={sel === k} onClick={() => setSel(k)} />)}</div>}
        {tab === 'org' && (org.isLoading ? <Spinner size={22} w={2} /> : !org.data?.length
          ? <div className="grid h-full place-items-center text-center text-[14px] text-neutral-500"><div><ImagePlus size={28} className="mx-auto mb-2 text-neutral-400" />Chưa có ảnh nào. Tải ảnh lên hoặc để AI tạo ảnh.</div></div>
          : <div className="grid grid-cols-4 gap-3">{org.data.map((x) => (
            <Tile key={x.id} img={x.url} on={sel === x.url} onClick={() => setSel(x.url)}>
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 text-[11px] text-white">{x.kind === 'ai' && <Sparkles size={11} />}<span className="truncate">{x.name}</span></span>
              <span role="button" title="Xóa ảnh khỏi thư viện" onClick={(e) => remove(e, x)} className="absolute left-1.5 top-1.5 hidden h-6 w-6 place-items-center rounded-full bg-white/90 text-neutral-600 hover:text-red-600 group-hover:grid"><Trash2 size={13} /></span>
            </Tile>))}</div>)}
        {tab === 'upload' && (
          <div onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files?.[0]) }}
            className={`grid h-full place-items-center rounded-2xl border-2 border-dashed text-center ${drag ? 'border-sky-500 bg-sky-50' : 'border-line bg-neutral-50'}`}>
            {busy ? <Spinner /> : <div><Upload size={28} className="mx-auto text-neutral-500" /><div className="mt-3 text-[16px] font-semibold">Kéo thả ảnh vào đây</div><div className="mt-1 text-[13px] text-neutral-500">PNG, JPG, WEBP hoặc GIF, tối đa 8 MB</div>
              <button className="btn-line btn-sm mt-4" onClick={() => file.current?.click()}>Chọn tệp</button>
              <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} /></div>}
          </div>)}
        {tab === 'ai' && (
          <div>
            <label className="mb-1.5 block text-[14px] font-medium">Mô tả ảnh cần tạo</label>
            <textarea className="field h-24 resize-none" maxLength={1000} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ví dụ: kỹ sư kiểm tra tủ máy chủ trong phòng dữ liệu, ánh sáng xanh dịu" />
            <div className="mt-2 flex flex-wrap gap-1.5">{IDEAS.map((x) => <button key={x} onClick={() => setPrompt(x)} className="rounded-lg border border-line px-2 py-1 text-[12px] hover:bg-neutral-50">{x}</button>)}</div>
            <p className="mt-3 text-[13px] text-neutral-500">AI tạo ảnh minh họa không chữ, không logo hay thương hiệu thật. Mỗi ảnh mất khoảng 20–40 giây và tính vào hạn mức AI.</p>
            <button className="btn-dark mt-4 h-10" disabled={busy || prompt.trim().length < 3} onClick={generate}>{busy ? <><Spinner size={18} w={2} />Đang tạo ảnh…</> : <><Sparkles size={16} />Tạo ảnh</>}</button>
          </div>)}
      </div>
    </Modal>
  )
}
