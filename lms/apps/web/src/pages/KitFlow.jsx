import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, ArrowRight, Info, Trash2, FileText, Plus, Sparkles, Pencil, Link2, Check, ArrowLeft, AlertTriangle, RotateCw } from 'lucide-react'
import { useStore } from '../store'
import { FORMATS, LEVELS } from '../data'
import { Logo, FormatIcon, Modal, Segmented, Spinner, Avatar } from '../ui'
import { Editable, EditableList } from '../edit'
import { useDoc, useJob, saveLabel } from '../hooks'
import { get, post } from '../api'

export const GEN_FORMATS = ['qr', 'deck', 'scenario', 'video']
export const useSkills = () => useQuery({ queryKey: ['skills'], queryFn: () => get('/skills'), staleTime: 300_000 }).data ?? []

const KIT_FIELDS = ['title', 'desc', 'audience', 'goals', 'takeaways', 'metrics', 'practice', 'delivery', 'skill', 'level', 'plan', 'sourceIds', 'theme', 'img']
export const kitBody = (k) => Object.fromEntries(KIT_FIELDS.map((f) => [f, f === 'desc' ? k.desc : k[f]]).filter(([, v]) => v !== undefined && v !== null))
export const useKit = (id) => useDoc(['kit', id], `/kits/${id}`, kitBody)

export function KitHeader({ kit, step, saveText }) {
  const nav = useNavigate()
  return (
    <header className="sticky top-0 z-30 bg-white">
      <div className="flex h-14 items-center gap-4 border-b border-line px-6">
        <button onClick={() => nav('/')} aria-label="Trang chủ"><Logo size={26} /></button>
        <span className="text-[17px] font-semibold">{kit.title}</span>
        {saveText && <span className="text-[13px] italic text-neutral-500">{saveText}</span>}
        {kit.fromPlan && <button onClick={() => nav('/workforce')} className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[13px] font-medium text-violet-800 hover:bg-violet-100"><ArrowLeft size={14} />Về Năng lực đội ngũ</button>}
      </div>
      {step && (
        <div className="flex h-12 items-center justify-center gap-4 border-b border-line text-[15px]">
          {['Chi tiết', 'Dàn ý', 'Bản nháp'].map((s, i) => (
            <span key={s} className="flex items-center gap-4">
              <span className={i === step - 1 ? 'font-medium text-ink' : 'text-neutral-500'}>{s}</span>
              {i < 2 && <ChevronRight size={16} className="text-neutral-400" />}
            </span>
          ))}
        </div>
      )}
    </header>
  )
}

export function BottomBar({ children }) {
  return <div className="fixed bottom-0 left-0 right-0 z-30 flex h-[72px] items-center justify-end gap-2 border-t border-line bg-white px-5">{children}</div>
}

const STEPS = {
  details: ['Đọc tài liệu nguồn', 'Viết mục tiêu, đối tượng và kế hoạch tài liệu', 'Hoàn tất'],
  outline: ['Tìm đoạn nguồn liên quan', 'Lập dàn ý từng tài liệu', 'Hoàn tất'],
}

/** Màn chờ AI: theo dõi job thật, xong thì sang bước tiếp */
export function KitLoading() {
  const { id } = useParams(); const nav = useNavigate()
  const loc = useLocation()
  const qc = useQueryClient()
  const next = new URLSearchParams(loc.search).get('next') ?? 'details'
  const kit = useQuery({ queryKey: ['kit', id], queryFn: () => get(`/kits/${id}`) })
  const jobId = loc.state?.jobId ?? kit.data?.job
  const job = useJob(jobId, {
    onDone: async (j) => {
      if (j.status !== 'done') return
      await qc.invalidateQueries({ queryKey: ['kit', id] })
      nav(`/kit/${id}/${next}`, { replace: true })
    },
  })
  // Không còn việc đang chạy (vd. tải lại trang sau khi xong): đi thẳng
  useEffect(() => { if (kit.data && !jobId) nav(`/kit/${id}/${next}`, { replace: true }) }, [kit.data, jobId, id, next, nav])
  const steps = STEPS[next] ?? STEPS.details
  const p = job?.progress ?? 5
  const at = p >= 100 ? steps.length : p >= 40 ? 1 : 0
  const retry = async () => {
    const r = next === 'outline' ? await post(`/kits/${id}/outline`) : null
    if (r) nav(`/kit/${id}/loading?next=outline`, { replace: true, state: { jobId: r.jobId } })
  }
  return (
    <div className="grid h-full place-items-start justify-center pt-[14vh]">
      <div className="w-[480px]">
        {job?.status === 'failed' ? (
          <div className="text-center">
            <AlertTriangle size={44} className="mx-auto text-red-500" />
            <h2 className="mt-4 text-[22px] font-semibold">AI chưa soạn xong</h2>
            <p className="mt-2 text-[15px] text-neutral-600">{job.error || 'Có lỗi khi gọi AI.'}</p>
            <div className="mt-5 flex justify-center gap-3">
              <button className="btn-line" onClick={() => nav(`/kit/${id}/details`)}>Sửa chi tiết thủ công</button>
              {next === 'outline' && <button className="btn-dark" onClick={retry}><RotateCw size={16} />Thử lại</button>}
            </div>
          </div>
        ) : <>
          <div className="text-center"><Spinner size={56} w={3} /></div>
          <h2 className="mt-6 text-center text-[22px] font-semibold">{next === 'outline' ? 'Đang lập dàn ý…' : 'Đang soạn chi tiết khóa học…'}</h2>
          <p className="mt-2 text-center text-[15px] text-neutral-600">{job?.message || kit.data?.title}</p>
          <div className="mt-6 h-1.5 rounded-full bg-neutral-100"><div className="h-1.5 rounded-full bg-ink transition-all duration-500" style={{ width: `${Math.max(p, 6)}%` }} /></div>
          <div className="mt-6 space-y-2.5">
            {(kit.data?.sources?.length ? [`Đọc ${kit.data.sources.map((s) => s.name).join(', ')}`, ...steps.slice(1)] : steps).map((x, j) => (
              <div key={x} className={`flex items-center gap-3 text-[15px] transition ${j > at ? 'opacity-30' : ''}`}>
                {j < at ? <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white"><Check size={13} /></span> : j === at ? <Spinner size={20} w={2} /> : <span className="h-5 w-5 rounded-full border-2 border-neutral-300" />}
                {x}
              </div>
            ))}
          </div>
        </>}
      </div>
    </div>
  )
}

/** Thêm tài liệu vào kế hoạch: AI đặt tên và mục đích theo hướng dẫn */
export function AddArtifact({ open, onClose, onAdd, initial = 'deck', kitId }) {
  const [type, setType] = useState(initial)
  const [picking, setPicking] = useState(false)
  const [txt, setTxt] = useState('')
  const [busy, setBusy] = useState(false)
  const { say } = useStore()
  useEffect(() => { setType(initial); setTxt(''); setPicking(false); setBusy(false) }, [initial, open])
  const f = FORMATS[type]
  const add = async () => {
    setBusy(true)
    try { onAdd(await post(`/kits/${kitId}/plan-item`, { type, instruction: txt })) } catch (e) { say(e.message); setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title="Thêm tài liệu" sub="Chọn dạng và mô tả nội dung cần tạo." w={480}
      footer={<button className="btn-dark h-10" disabled={txt.trim().length < 3 || busy} onClick={add}>{busy ? <Spinner size={18} w={2} /> : 'Thêm'}</button>}>
      {picking ? (
        <div className="space-y-1.5">
          {GEN_FORMATS.map((k) => (
            <button key={k} onClick={() => { setType(k); setPicking(false) }} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${k === type ? 'border-ink' : 'border-line hover:bg-neutral-50'}`}>
              <FormatIcon type={k} size={32} r={8} /><div><div className="font-semibold">{FORMATS[k].name}</div><div className="text-[13px] text-neutral-600">{FORMATS[k].desc}</div></div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-line p-3">
          <FormatIcon type={type} size={34} r={8} />
          <div className="flex-1"><div className="text-[15px] font-semibold">{f.name}</div><div className="text-[13px] text-neutral-600">{f.desc}</div></div>
          <button className="text-[14px] font-medium text-sky-700" onClick={() => setPicking(true)}>Đổi</button>
        </div>
      )}
      <label className="mb-1.5 mt-4 block text-[14px] font-medium">Hướng dẫn cho AI</label>
      <textarea className="field h-24 resize-y" maxLength={5000} placeholder="Mô tả nội dung bạn muốn tạo" value={txt} onChange={(e) => setTxt(e.target.value)} />
      <div className="mt-1 text-right text-[12px] text-neutral-500">{txt.length} / 5.000</div>
    </Modal>
  )
}

const Loading = () => <div className="grid h-full place-items-center"><Spinner /></div>

export function KitDetails() {
  const { id } = useParams(); const nav = useNavigate()
  const { say } = useStore()
  const { doc: kit, up, saveState, flush, error } = useKit(id)
  const skills = useSkills()
  const [add, setAdd] = useState(null)
  const [busy, setBusy] = useState(false)
  if (error) return <div className="p-10">{error.message}</div>
  if (!kit) return <Loading />
  const lv = LEVELS.find((l) => l.v === kit.level) ?? LEVELS[0]
  const toOutline = async () => {
    setBusy(true)
    try { await flush(); const r = await post(`/kits/${id}/outline`); nav(`/kit/${id}/loading?next=outline`, { state: { jobId: r.jobId } }) } catch (e) { say(e.message); setBusy(false) }
  }

  return (
    <div className="min-h-full pb-28">
      <KitHeader kit={kit} step={1} saveText={saveLabel(saveState)} />
      <div className="grid grid-cols-[minmax(380px,460px)_1fr]">
        <section className="border-r border-line px-6 py-6">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-sky-600 text-[15px] font-semibold text-white">1</span>
          <h2 className="mt-4 text-[28px] font-semibold">Xác nhận chi tiết</h2>
          <p className="mt-2 text-[15px]">AI đã soạn từ mô tả và tài liệu của bạn. Bấm vào chữ để sửa.</p>
          {kit.warnings?.length > 0 && <div className="mt-4 space-y-2">{kit.warnings.map((w) => <div key={w} className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[14px] text-amber-900"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />{w}</div>)}</div>}
          <div className="mt-6"><label className="label">Tên khóa học</label><div className="field"><Editable value={kit.title} className="block" placeholder="Tên khóa học" onChange={(v) => up((x) => { x.title = v })} /></div></div>
          <div className="mt-6"><label className="label">Đối tượng học</label><div className="field min-h-[80px]"><Editable value={kit.audience} multiline className="block" placeholder="Ai học, họ đã biết gì" onChange={(v) => up((x) => { x.audience = v })} /></div></div>
          {[['Mục tiêu', 'goals'], ['Điều cần nhớ', 'takeaways'], ['Chỉ số thành công', 'metrics']].map(([l, k]) => (
            <div key={k} className="mt-6">
              <label className="label">{l}</label>
              <div className="field space-y-1"><EditableList items={kit[k]?.length ? kit[k] : ['']} placeholder="Nhập ý, Enter để thêm dòng" itemClass="block" onChange={(v) => up((x) => { x[k] = v })} render={(el) => <div className="flex gap-2"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" /><div className="flex-1">{el}</div></div>} /></div>
            </div>
          ))}
          <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
            <div className="flex items-center gap-2 text-[15px] font-semibold"><Link2 size={16} className="text-violet-600" />Gắn với khung năng lực</div>
            <p className="mt-1 text-[13px] text-neutral-600">Khóa được gắn sẵn kỹ năng và mức. Bài thi chính thức đạt sẽ cập nhật mức kỹ năng của người học, tối đa mức 3.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div><div className="mb-1 text-[13px] font-medium">Kỹ năng</div>
                <select className="field py-2" value={kit.skill ?? ''} onChange={(e) => up((x) => { x.skill = e.target.value || null })}><option value="">Chưa chọn</option>{skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><div className="mb-1 text-[13px] font-medium">Khóa đưa tới</div>
                <select className="field py-2" value={kit.level ?? 1} onChange={(e) => up((x) => { x.level = +e.target.value })}>{LEVELS.map((l) => <option key={l.v} value={l.v}>Mức {l.v}</option>)}</select></div>
            </div>
            <div className="mt-2 text-[13px] text-neutral-600">Dạng bài thi theo mức: <b>{lv.kinds}</b></div>
          </div>
          <div className="mt-6">
            <label className="label">Tài liệu nguồn được phép dùng</label>
            {kit.sources.length === 0 && <p className="text-[14px] text-amber-700">Chưa có tài liệu. AI chỉ dựng khung và đánh dấu chỗ cần bổ sung.</p>}
            {kit.sources.map((s) => <div key={s.id} className="mb-1.5 flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[14px]"><FileText size={15} className="text-sky-600" /><span className="flex-1">{s.name}</span>{s.sensitive && <span className="chip bg-amber-50 text-amber-700">Có thể chứa dữ liệu nhạy cảm</span>}<span className="text-neutral-500">v{s.version}</span></div>)}
          </div>
          <div className="mt-6">
            <label className="label flex items-center gap-2">Khóa này cần bao nhiêu phần luyện tập? <Info size={15} className="text-neutral-500" /></label>
            <Segmented value={kit.practice} onChange={(v) => up((x) => { x.practice = v })} options={[['less', 'Ít'], ['balanced', 'Cân bằng'], ['more', 'Nhiều']]} />
          </div>
          <div className="mt-6">
            <label className="label">Hình thức triển khai?</label>
            <Segmented value={kit.delivery} onChange={(v) => up((x) => { x.delivery = v })} options={[['self', 'Tự học'], ['live', 'Buổi trực tiếp'], ['both', 'Cả hai']]} />
          </div>
        </section>

        <section className="px-12 py-6">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-sky-600 text-[15px] font-semibold text-white">2</span>
          <h2 className="mt-4 text-[28px] font-semibold">Rà kế hoạch tài liệu</h2>
          <p className="mt-2 text-[15px]">Xem từng tài liệu và xác nhận mục đích, trọng tâm đúng với điều bạn muốn tạo.</p>
          <div className="mt-8 grid max-w-[780px] grid-cols-2 gap-4">
            {kit.plan.map((p, i) => (
              <div key={i} className="group card p-5">
                <div className="flex items-center gap-2.5">
                  <FormatIcon type={p.type} size={30} r={8} />
                  <span className="text-[14px] font-medium">{FORMATS[p.type].name}</span>
                  <div className="flex-1" />
                  <button onClick={() => up((x) => { x.plan.splice(i, 1) })} className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-600 opacity-0 transition group-hover:opacity-100" aria-label="Bỏ tài liệu"><Trash2 size={16} /></button>
                </div>
                <div className="mt-4 text-[17px] font-semibold leading-snug"><Editable value={p.title} className="block" placeholder="Tên tài liệu" onChange={(v) => up((x) => { x.plan[i].title = v })} /></div>
                <div className="mt-2 text-[14px] leading-relaxed"><Editable value={p.summary} multiline className="block" placeholder="Mục đích, trọng tâm" onChange={(v) => up((x) => { x.plan[i].summary = v })} /></div>
                <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[13px] text-neutral-600"><FileText size={14} />{kit.sources.length ? `${kit.sources.length} nguồn` : 'Không có nguồn'}</div>
              </div>
            ))}
          </div>
          <div className="my-8 h-px max-w-[780px] bg-line" />
          <div className="mb-3 text-[15px] font-semibold">Thêm tài liệu</div>
          <div className="grid max-w-[780px] grid-cols-4 gap-3">
            {GEN_FORMATS.map((k) => (
              <button key={k} onClick={() => setAdd(k)} className="card relative p-3.5 text-left transition hover:shadow-pop">
                <FormatIcon type={k} size={32} r={8} /><Plus size={18} className="absolute right-3 top-4 text-neutral-500" />
                <div className="mt-3 text-[15px] font-semibold leading-tight">{FORMATS[k].name}</div>
                <div className="mt-1 text-[12px] leading-snug text-neutral-600">{FORMATS[k].desc}</div>
              </button>
            ))}
          </div>
        </section>
      </div>
      <BottomBar>
        <button className="btn-dark h-12 px-6 text-[16px]" disabled={!kit.plan.length || busy} onClick={toOutline}>{busy ? <Spinner size={18} w={2} /> : <>Tạo dàn ý<ArrowRight size={18} /></>}</button>
      </BottomBar>
      <AddArtifact kitId={id} open={!!add} initial={add || 'deck'} onClose={() => setAdd(null)} onAdd={(item) => { setAdd(null); up((x) => { x.plan.push(item) }); say('Đã thêm tài liệu vào kế hoạch') }} />
    </div>
  )
}

// Dàn ý sửa tại chỗ: bấm vào dòng nào sửa dòng đó, Enter thêm ý, lưu ngay vào kế hoạch
function OutlineCard({ idx, type, title, summary, o, sel, onSel, onDel, onPatch }) {
  const f = FORMATS[type]
  const put = (outline) => onPatch({ outline })
  const secs = o.sections ?? []
  const setSecs = (fn) => put({ ...o, sections: fn(secs.map((x) => ({ ...x, items: [...x.items] }))) })
  const key = type === 'deck' ? 'slides' : 'chapters'
  const list = o[key] ?? []
  return (
    <div id={`o-${idx}`} className="group/card relative" onMouseDown={onSel}>
      <div className={`card ${sel ? 'ring-1 ring-violet-300' : ''}`}>
        <div className="flex gap-4 p-5">
          <FormatIcon type={type} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[15px] text-neutral-600">{f.name}<div className="flex-1" /><button onClick={onDel} title="Bỏ tài liệu này khỏi kế hoạch" className="icon-btn h-8 w-8 opacity-0 group-hover/card:opacity-100"><Trash2 size={16} /></button></div>
            <div className="mt-1 text-[19px] font-semibold"><Editable value={title} className="block" placeholder="Tên tài liệu" onChange={(v) => onPatch({ title: v })} /></div>
            <div className="mt-1 text-[15px] leading-relaxed"><Editable value={summary} multiline className="block" placeholder="Mục đích, trọng tâm của tài liệu" onChange={(v) => onPatch({ summary: v })} /></div>
            {type === 'qr' && <>
              {secs.map((s, i) => (
                <div key={i} className="group/l mt-4">
                  <div className="flex items-center gap-2 font-semibold"><span className="h-1 w-1 shrink-0 rounded-full bg-ink" /><Editable value={s.t} className="block flex-1" placeholder={`Tên bài ${i + 1}`} onChange={(v) => setSecs((x) => { x[i].t = v; return x })} />
                    <span className="flex opacity-0 transition group-hover/l:opacity-100">
                      <button disabled={i === 0} onClick={() => setSecs((x) => { const [y] = x.splice(i, 1); x.splice(i - 1, 0, y); return x })} className="icon-btn h-7 w-7 disabled:opacity-30" title="Lên"><ChevronDown size={15} className="rotate-180" /></button>
                      <button disabled={i === secs.length - 1} onClick={() => setSecs((x) => { const [y] = x.splice(i, 1); x.splice(i + 1, 0, y); return x })} className="icon-btn h-7 w-7 disabled:opacity-30" title="Xuống"><ChevronDown size={15} /></button>
                      <button disabled={secs.length === 1} onClick={() => setSecs((x) => x.filter((_, j) => j !== i))} className="icon-btn h-7 w-7 disabled:opacity-30" title="Xóa bài"><Trash2 size={15} /></button>
                    </span>
                  </div>
                  <div className="ml-2 mt-1.5 border-l-2 border-line pl-3"><EditableList items={s.items.length ? s.items : ['']} placeholder="Ý chính" itemClass="block py-1 text-[15px]" onChange={(v) => setSecs((x) => { x[i].items = v; return x })} render={(el) => el} /></div>
                </div>
              ))}
              {secs.length < 3 && <button onClick={() => setSecs((x) => [...x, { t: '', items: [''] }])} className="mt-4 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[14px] font-medium text-neutral-600 hover:bg-neutral-100 hover:text-ink"><Plus size={15} />Thêm bài</button>}
              <p className="mt-3 text-[14px] italic text-neutral-500">Tài liệu nhanh tối đa 3 bài. Bài kiểm tra được tạo từ nội dung, theo mức kỹ năng đã chọn. Ý nào không có trong tài liệu nguồn sẽ được đánh dấu thiếu căn cứ.</p>
            </>}
            {type === 'scenario' && <>
              <div className="mt-4 font-semibold">· Nhân vật</div><div className="ml-3 mt-1 flex items-center gap-2"><Avatar text={(o.character || '?')[0]} size={26} color="#475569" /><Editable value={o.character} className="font-semibold" placeholder="Tên · vai trò" onChange={(v) => put({ ...o, character: v })} /></div>
              <div className="mt-3 font-semibold">· Vai người học</div><div className="ml-2 mt-1 border-l-2 border-line pl-3 text-[15px]"><Editable value={o.learner} className="block" placeholder="Người học đóng vai ai" onChange={(v) => put({ ...o, learner: v })} /></div>
              <div className="mt-3 font-semibold">· Tình huống</div><div className="ml-2 mt-1 border-l-2 border-line pl-3 text-[15px]"><Editable value={o.situation} multiline className="block" placeholder="Bối cảnh tình huống" onChange={(v) => put({ ...o, situation: v })} /></div>
              <div className="mt-3 font-semibold">· Mục tiêu từng cảnh</div><div className="ml-2 mt-1 border-l-2 border-line pl-3"><EditableList items={o.goals?.length ? o.goals : ['']} placeholder="Mục tiêu của cảnh" itemClass="block py-0.5 text-[15px]" onChange={(v) => put({ ...o, goals: v })} render={(el) => el} /></div>
            </>}
            {(type === 'deck' || type === 'video') && (
              <div className="mt-3 grid grid-cols-2 gap-x-6"><EditableList items={list.length ? list : ['']} placeholder={key === 'slides' ? 'Tiêu đề slide' : 'Tên chương'} itemClass="block flex-1" onChange={(v) => put({ ...o, [key]: v })} render={(el, i) => <div className="flex gap-2 border-b border-line py-2 text-[15px]"><span className="w-5 shrink-0 text-neutral-400">{i + 1}</span>{el}</div>} /></div>
            )}
            {type === 'video' && <p className="mt-3 text-[14px] italic text-neutral-500">AI viết kịch bản dạng slide kèm lời đọc, rồi tạo video bằng giọng đọc AI có sẵn. Video ghi rõ "Nội dung do AI tạo, đã được chuyên gia duyệt".</p>}
            <div className="mt-4 flex items-center gap-1.5 text-[13px] text-neutral-500"><Pencil size={13} />Bấm vào chữ để sửa · Enter thêm dòng · Backspace ở dòng trống để xóa</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function KitOutline() {
  const { id } = useParams(); const nav = useNavigate()
  const { say } = useStore()
  const qc = useQueryClient()
  const { doc: kit, up, saveState, flush } = useKit(id)
  const skills = useSkills()
  const [sel, setSel] = useState(0)
  const [det, setDet] = useState(false)
  const [add, setAdd] = useState(null)
  const [busy, setBusy] = useState(false)
  if (!kit) return <Loading />
  const missing = kit.plan.filter((p) => !p.outline).length
  const gen = async () => {
    setBusy(true)
    try {
      await flush()
      if (missing) { const r = await post(`/kits/${id}/outline`); nav(`/kit/${id}/loading?next=outline`, { state: { jobId: r.jobId } }); return }
      await post(`/kits/${id}/generate`)
      qc.invalidateQueries({ queryKey: ['kits'] }); qc.invalidateQueries({ queryKey: ['kit', id] })
      nav(`/kit/${id}`)
    } catch (e) { say(e.message); setBusy(false) }
  }
  return (
    <div className="min-h-full pb-28">
      <KitHeader kit={kit} step={2} saveText={saveLabel(saveState)} />
      <div className="grid grid-cols-[280px_1fr]">
        <aside className="sticky top-[104px] self-start px-6 py-6">
          {kit.plan.map((p, i) => (
            <button key={i} onClick={() => { setSel(i); document.getElementById(`o-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }} className={`mb-1 flex w-full gap-3 rounded-xl border p-2.5 text-left ${sel === i ? 'border-neutral-400' : 'border-transparent hover:bg-neutral-50'}`}>
              <FormatIcon type={p.type} size={32} r={8} />
              <div><div className="text-[12px] text-neutral-500">{FORMATS[p.type].name}</div><div className="text-[15px] font-medium leading-snug">{p.title || 'Chưa đặt tên'}</div></div>
            </button>
          ))}
          <button onClick={() => setAdd('deck')} className="btn-line mt-4 h-11 w-full"><Plus size={18} />Thêm tài liệu</button>
        </aside>
        <section className="max-w-[780px] px-8 py-7">
          <h2 className="text-[28px] font-semibold">Rà dàn ý</h2>
          <p className="mt-1 text-[15px]">Xem từng dàn ý và sửa cho khớp với mục tiêu của bạn.</p>
          <div className="card mt-6">
            <button onClick={() => setDet(!det)} className="flex w-full items-center gap-3 px-5 py-3.5 text-[16px]">{det ? <ChevronDown size={18} /> : <ChevronRight size={18} />}Chi tiết đào tạo</button>
            {det && <div className="grid grid-cols-2 gap-4 border-t border-line px-5 py-4 text-[14px]">
              <div><b>Đối tượng</b><p className="mt-1">{kit.audience}</p></div>
              <div><b>Kỹ năng</b><p className="mt-1">{skills.find((s) => s.id === kit.skill)?.name ?? 'Chưa chọn'} · đưa tới mức {kit.level}</p></div>
              <div><b>Mục tiêu</b>{kit.goals.map((g) => <p key={g}>· {g}</p>)}</div>
              <div><b>Chỉ số thành công</b>{kit.metrics.map((g) => <p key={g}>· {g}</p>)}</div>
            </div>}
          </div>
          <div className="mt-8 space-y-8">
            {kit.plan.map((p, i) => p.outline
              ? <OutlineCard key={i} idx={i} {...p} o={p.outline} sel={sel === i} onSel={() => setSel(i)} onDel={() => up((x) => { x.plan.splice(i, 1) })} onPatch={(ch) => up((x) => { Object.assign(x.plan[i], ch) })} />
              : <div key={i} id={`o-${i}`} className="card flex items-center gap-4 p-5"><FormatIcon type={p.type} size={40} /><div className="flex-1"><div className="text-[17px] font-semibold">{p.title}</div><div className="text-[14px] text-neutral-500">Chưa có dàn ý. Bấm nút dưới để AI lập dàn ý cho tài liệu mới thêm.</div></div><button onClick={() => up((x) => { x.plan.splice(i, 1) })} className="icon-btn" aria-label="Bỏ"><Trash2 size={16} /></button></div>)}
          </div>
        </section>
      </div>
      <BottomBar>
        <button className="btn-dark h-12 px-6 text-[16px]" disabled={!kit.plan.length || busy} onClick={gen}>{busy ? <Spinner size={18} w={2} /> : <><Sparkles size={18} className="text-violet-300" />{missing ? `Lập dàn ý cho ${missing} tài liệu mới` : `Tạo ${kit.plan.length} tài liệu`}</>}</button>
      </BottomBar>
      <AddArtifact kitId={id} open={!!add} initial={add || 'deck'} onClose={() => setAdd(null)} onAdd={(item) => { setAdd(null); up((x) => { x.plan.push(item) }); say('Đã thêm, bấm "Lập dàn ý" để AI soạn dàn ý cho tài liệu này') }} />
    </div>
  )
}
