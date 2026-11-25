import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Paperclip, HardDrive, ArrowRight, ChevronRight, Users, Target, FileText, X, FolderOpen, Sparkles, FileUp, Box, CornerDownRight, ChevronLeft, AlertTriangle, Check } from 'lucide-react'
import { useMe, useStore } from '../store'
import { FORMATS } from '../data'
import { FormatIcon, Modal, Thumb, FormatGlyph, Status, Avatar, Spinner } from '../ui'
import { ShareModal } from './Common'
import { TopOrg } from '../Shell'
import { EXAMPLES } from '../examples'
import { api, get, post } from '../api'

const ACCEPT = '.pdf,.docx,.txt,.md'
const MAX_MB = 25
const firstName = (n = '') => n.trim().split(/\s+/).pop()

function HowItWorks({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} w={560} title="Cách hoạt động" footer={<button className="btn-dark" onClick={onClose}>Đã hiểu</button>}>
      {[[Users, 'Ai học, vai trò của họ và họ đã biết đến đâu'], [Target, 'Người học cần hiểu hoặc làm được gì sau khóa'], [FileText, 'Tài liệu nội bộ được phép dùng (PDF, DOCX, TXT, MD)']].map(([I, t]) => (
        <div key={t} className="flex items-center gap-3 py-2 text-[16px]"><I size={18} />{t}</div>
      ))}
      <p className="mt-3 text-[15px] leading-relaxed text-neutral-700">AI đọc tài liệu, đề xuất chi tiết và dàn ý để bạn sửa, rồi soạn từng tài liệu. Mỗi đoạn nội dung ghi rõ trích từ tài liệu và mục nào; chỗ tài liệu không đủ căn cứ được đánh dấu để bạn bổ sung, AI không tự viết thêm.</p>
      <div className="mt-4 space-y-1">
        {Object.entries(FORMATS).filter(([k]) => k !== 'guide').map(([k, f]) => (
          <div key={k} className="flex gap-3 border-b border-line py-2.5 last:border-0">
            <FormatIcon type={k} size={28} r={7} />
            <div><div className="text-[15px] font-semibold">{f.name}{f.note && <span className="font-normal text-neutral-500"> · {f.note}</span>}</div><div className="text-[14px] text-neutral-600">{f.long}</div></div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

/** Chọn tài liệu đã tải lên trước đó */
function SourcePicker({ open, onClose, chosen, onPick }) {
  const q = useQuery({ queryKey: ['sources'], queryFn: () => get('/sources'), enabled: open })
  return (
    <Modal open={open} onClose={onClose} title="Kho tài liệu nội bộ" sub="Tài liệu đã tải lên trước đây. Chọn để AI dùng làm nguồn." w={560} footer={<button className="btn-dark" onClick={onClose}>Xong</button>}>
      {q.isLoading && <Spinner />}
      {q.data?.length === 0 && <p className="text-[14px] text-neutral-500">Chưa có tài liệu nào.</p>}
      {q.data?.map((s) => { const on = chosen.some((c) => c.id === s.id); return (
        <button key={s.id} disabled={s.status !== 'ready'} onClick={() => onPick(s, !on)} className={`mb-1.5 flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-[14px] disabled:opacity-50 ${on ? 'border-ink' : 'border-line hover:bg-neutral-50'}`}>
          <FileText size={16} className="text-sky-600" /><span className="flex-1">{s.name}</span>
          <span className="text-[12px] text-neutral-500">v{s.version}{s.status !== 'ready' && ` · ${s.status === 'failed' ? 'lỗi' : 'đang xử lý'}`}</span>
          {on && <Check size={16} />}
        </button>) })}
    </Modal>
  )
}

/** Tệp đang tải: hiện trạng thái xử lý (đọc chữ, chia đoạn) */
function FileChip({ f, onRemove }) {
  const job = useQuery({ queryKey: ['job', f.jobId], queryFn: () => get(`/jobs/${f.jobId}`), enabled: !!f.jobId, refetchInterval: (q) => (['done', 'failed'].includes(q.state.data?.status) ? false : 1000) })
  const src = useQuery({ queryKey: ['source', f.id], queryFn: () => get(`/sources/${f.id}`), enabled: job.data?.status === 'done' })
  const failed = f.error || job.data?.status === 'failed' || src.data?.status === 'failed'
  const ready = f.ready || src.data?.status === 'ready'
  return (
    <span className={`flex items-center gap-2 rounded-lg border bg-white py-1.5 pl-2.5 pr-1.5 text-[14px] ${failed ? 'border-red-300' : 'border-line'}`} title={failed ? (f.error || src.data?.error || job.data?.error) : undefined}>
      {failed ? <AlertTriangle size={15} className="text-red-500" /> : ready ? <FileUp size={15} className="text-sky-600" /> : <Spinner size={14} w={2} />}
      {f.name}
      {src.data?.sensitive && <span className="chip bg-amber-50 text-amber-700">Có thể chứa dữ liệu nhạy cảm</span>}
      {failed && <span className="text-[12px] text-red-600">{f.error || src.data?.error || 'Không đọc được'}</span>}
      <button className="rounded p-0.5 hover:bg-neutral-100" onClick={onRemove} aria-label="Bỏ tệp"><X size={14} /></button>
    </span>
  )
}

export default function Dashboard() {
  const { me } = useMe()
  const { say } = useStore()
  const qc = useQueryClient()
  const nav = useNavigate()
  const [goal, setGoal] = useState('')
  const [files, setFiles] = useState([])
  const [how, setHow] = useState(false)
  const [pick, setPick] = useState(false)
  const [drag, setDrag] = useState(false)
  const [starting, setStarting] = useState(false)
  const [share, setShare] = useState(null)
  const rowRef = useRef(null), inputRef = useRef(null)
  const kits = useQuery({ queryKey: ['kits'], queryFn: () => get('/kits') })

  const uploadFiles = async (list) => {
    for (const file of list) {
      if (file.size > MAX_MB * 1024 * 1024) { say(`${file.name} lớn hơn ${MAX_MB} MB`); continue }
      const tmp = { key: `${file.name}-${Date.now()}`, name: file.name }
      setFiles((x) => [...x, tmp])
      const form = new FormData(); form.append('file', file)
      try {
        const r = await api('/sources', { method: 'POST', form })
        setFiles((x) => x.map((y) => (y.key === tmp.key ? { ...y, id: r.source.id, jobId: r.jobId } : y)))
        qc.invalidateQueries({ queryKey: ['sources'] })
      } catch (e) { setFiles((x) => x.map((y) => (y.key === tmp.key ? { ...y, error: e.message } : y))) }
    }
  }
  const start = async () => {
    setStarting(true)
    try {
      const r = await post('/kits', { goal: goal.trim(), sourceIds: files.filter((f) => f.id && !f.error).map((f) => f.id) })
      qc.invalidateQueries({ queryKey: ['kits'] })
      nav(`/kit/${r.id}/loading`, { state: { jobId: r.jobId } })
    } catch (e) { say(e.message); setStarting(false) }
  }
  const uploading = files.some((f) => !f.id && !f.error)
  const list = kits.data ?? []
  const recent = list.flatMap((k) => [...k.artifacts.filter((a) => a.status !== 'generating').slice(0, 2).map((a) => ({ a, k })), { k }]).slice(0, 6)

  return (
    <div className="hero-bg min-h-full">
      <TopOrg />
      <div className="mx-auto max-w-[760px] px-6 pt-12">
        <h1 className="text-center text-[52px] font-semibold tracking-tight">Sẵn sàng khi bạn cần, {firstName(me?.name)}</h1>
        <p className="mt-2 text-center font-display text-[20px] font-medium">Biến tài liệu rời rạc thành bài đào tạo dùng được ngay</p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); uploadFiles([...e.dataTransfer.files]) }}
          className={`mt-10 rounded-2xl border-2 border-dashed transition ${drag ? 'border-violet-500 bg-violet-100' : 'border-[#a9a4ea] bg-[#f2f0fd]/80'}`}>
          <div className="px-6 pb-8 pt-10 text-center">
            <div className="text-[18px] font-semibold">Kéo thả hoặc chọn tệp</div>
            <div className="mt-1 text-[13px] text-neutral-500">PDF, DOCX, TXT, MD · tối đa {MAX_MB} MB mỗi tệp</div>
            <div className="mt-6 flex justify-center gap-5">
              {[[Paperclip, 'Tải tệp lên', () => inputRef.current?.click(), 'text-ink'], [HardDrive, 'Kho tài liệu nội bộ', () => setPick(true), 'text-emerald-600']].map(([I, l, fn, c]) => (
                <button key={l} onClick={fn} className="group/tip relative grid h-[68px] w-[68px] place-items-center rounded-2xl bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-pop" aria-label={l}>
                  <I size={28} strokeWidth={2} className={c} />
                  <span className="tip left-1/2 top-[76px] -translate-x-1/2 group-hover/tip:opacity-100">{l}</span>
                </button>
              ))}
              <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { uploadFiles([...e.target.files]); e.target.value = '' }} />
            </div>
            {files.length > 0 && <div className="mt-6 flex flex-wrap justify-center gap-2">{files.map((f) => <FileChip key={f.key} f={f} onRemove={() => setFiles((x) => x.filter((y) => y.key !== f.key))} />)}</div>}
          </div>
        </div>

        <div className="mt-9 flex items-end justify-between">
          <label className="text-[18px] font-semibold" htmlFor="goal">Mô tả mục tiêu đào tạo</label>
          <button className="text-[15px] text-neutral-600 underline underline-offset-4 hover:text-ink" onClick={() => setHow(true)}>Cách hoạt động</button>
        </div>
        <div className="mt-3 rounded-2xl border border-neutral-300 bg-white focus-within:border-sky-600 focus-within:ring-2 focus-within:ring-sky-100">
          <textarea id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} rows={4} maxLength={5000}
            placeholder="Ai cần học, điều gì đang thay đổi và họ cần làm gì tiếp theo…"
            className="w-full resize-none rounded-2xl bg-transparent px-5 pt-4 text-[16px] leading-relaxed outline-none placeholder:text-neutral-500" />
          <div className="flex items-center gap-2 px-4 pb-3 text-[12px] text-neutral-400"><div className="flex-1" />{goal.length} / 5.000</div>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-neutral-600"><Sparkles size={14} className="text-violet-600" />Thử nhanh với chủ đề mẫu<span className="font-normal text-neutral-400">· điền sẵn mô tả</span><div className="flex-1" />
            {[[ChevronLeft, -1], [ChevronRight, 1]].map(([I, d]) => <button key={d} onClick={() => rowRef.current?.scrollBy({ left: d * 360, behavior: 'smooth' })} className="grid h-7 w-7 place-items-center rounded-full border border-line bg-white hover:bg-neutral-50" aria-label={d < 0 ? 'Trước' : 'Sau'}><I size={15} /></button>)}</div>
          <div ref={rowRef} className="scroll-thin -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 pt-1">
            {EXAMPLES.map((p) => { const on = goal === p.goal; return (
              <button key={p.id} onClick={() => setGoal(p.goal)} className={`w-[170px] shrink-0 snap-start overflow-hidden rounded-xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-card ${on ? 'border-violet-500 ring-2 ring-violet-200' : 'border-line'}`}>
                <Thumb img={p.img} className="h-14" />
                <div className="px-2.5 py-2"><div className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">{p.tag}</div><div className="mt-0.5 text-[13px] font-medium leading-snug">{p.label}</div></div>
              </button>) })}
          </div>
        </div>
        <button disabled={goal.trim().length < 5 || starting || uploading} onClick={start} className="mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-ink text-[18px] font-semibold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300">
          {starting ? <Spinner size={22} w={2} /> : <><Sparkles size={19} className="text-violet-300" />Bắt đầu<ArrowRight size={20} /></>}
        </button>
        <p className="mt-3 text-center text-[13px] italic text-neutral-500">{uploading ? 'Đang tải tệp lên…' : 'Tiếp theo, bạn rà lại chi tiết và bổ sung chỗ thiếu trước khi AI tạo nội dung'}</p>
      </div>

      <div className="mx-auto mt-16 max-w-[1100px] px-8 pb-24">
        <div className="flex items-center justify-between">
          <h3 className="text-[19px] font-semibold">Tiếp tục công việc</h3>
          <button onClick={() => nav('/library')} className="flex items-center gap-2 text-[15px] font-semibold"><FolderOpen size={18} />Xem thư viện</button>
        </div>
        {kits.isLoading ? <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skel h-72 rounded-2xl" />)}</div> : recent.length === 0 ? (
          <div className="mt-5 grid h-56 place-items-center rounded-2xl border-2 border-dashed border-line text-center">
            <div><div className="text-[22px] font-medium text-neutral-500">Chưa có gì đang làm</div><p className="mt-2 text-neutral-500">Khóa học bạn bắt đầu sẽ hiện ở đây.</p></div>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map(({ a, k }) => {
              const go = () => nav(a ? `/edit/${a.id}` : k.stage === 'details' ? `/kit/${k.id}/details` : k.stage === 'outline' ? `/kit/${k.id}/outline` : `/kit/${k.id}`)
              return (
                <div key={a ? a.id : k.id} className="card flex flex-col overflow-hidden transition hover:shadow-pop">
                  <button onClick={go} className="text-left">
                    <Thumb img={(a || k.artifacts[0])?.img || k.img || 'office'} className="h-40"><span className="absolute left-3 top-3 rounded-full ring-2 ring-white/70"><Avatar text={me.initials} size={24} color={me.color} /></span></Thumb>
                    <div className="px-4 pt-4">
                      <div className="flex items-center gap-1.5 text-[13px] font-medium">
                        {a ? <><CornerDownRight size={14} className="text-neutral-400" /><FormatGlyph type={a.type} size={14} />{FORMATS[a.type].name}</> : <><Box size={14} className="text-emerald-600" />Khóa học<span className="font-normal text-neutral-500">· {k.stage !== 'ready' ? 'đang soạn' : `${k.artifacts.length} tài liệu`}</span></>}
                      </div>
                      <div className="mt-1.5 text-[15px] font-semibold leading-snug">{a ? a.title : k.title}</div>
                      <div className="mt-1 text-[13px] text-neutral-500">Cập nhật {(a || k).updated}</div>
                    </div>
                  </button>
                  <div className="flex-1" />
                  <div className="mt-4 min-h-[86px] border-t border-line px-4 pb-4 pt-3">
                    {a && <><Status s={a.status} /><button onClick={() => setShare(a)} className="btn-line mt-3 h-9 w-full">Chia sẻ</button></>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <HowItWorks open={how} onClose={() => setHow(false)} />
      <SourcePicker open={pick} onClose={() => setPick(false)} chosen={files} onPick={(s, on) => setFiles((x) => (on ? [...x, { key: s.id, id: s.id, name: s.name, ready: true }] : x.filter((y) => y.id !== s.id)))} />
      <ShareModal open={!!share} art={share} onClose={() => setShare(null)} />
    </div>
  )
}
