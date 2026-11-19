// Trình học trong gói SCORM: cùng giao diện học của LMS, dữ liệu lấy từ course.js trong gói,
// tiến độ và điểm ghi về LMS nhận gói qua SCORM 1.2.
import { StrictMode, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, ChevronLeft, Info } from 'lucide-react'
import '../index.css'
import { IMG, FORMATS } from '../data'
import { StoreProvider, queryClient } from '../store'
import { Thumb, FormatGlyph } from '../ui'
import { ThemeScope } from '../theme'
import { OfflineCtx } from '../offline'
import { ApiError } from '../api'
import { Player } from '../pages/Preview'
import { OfflineQuiz } from './Quiz'
import { connect } from './scorm'

const C = window.COURSE
// ảnh có sẵn đã được đóng vào gói: dùng tệp trong gói thay cho đường dẫn ngoài
for (const [k, src] of Object.entries(C.presets ?? {})) if (IMG[k]) IMG[k] = { ...IMG[k], src }

/** Các phần cần học của một tài liệu (giống máy chủ) */
function unitsOf(a) {
  if (a.type === 'qr') return (a.lessons ?? []).filter((l) => l.kind === 'lesson').map((l) => l.id)
  if (a.type === 'video') return (a.chapters ?? []).map((x) => `t${x.t}`)
  if (a.type === 'deck') return (a.slides ?? []).map((s) => s.id)
  if (a.type === 'scenario') return ['end']
  if (a.type === 'guide') return (a.steps ?? []).map((_, i) => `s${i}`)
  return []
}

const lms = connect(C.course.id)
const saved = lms.load()
// tiến độ lưu gọn theo chỉ số để vừa giới hạn 4096 ký tự của SCORM 1.2
const state = {
  done: C.items.map((a, i) => (saved.p?.[i] ?? []).map((j) => unitsOf(a)[j]).filter(Boolean)),
  quiz: saved.q ?? {},
}
const pct = (i) => { const u = unitsOf(C.items[i]); return u.length ? Math.round((100 * state.done[i].length) / u.length) : 100 }
const itemDone = (i) => pct(i) >= 100 && (!C.items[i].offlineQuiz || state.quiz[i] >= C.items[i].offlineQuiz.passScore)

function persist() {
  lms.save({ p: C.items.map((a, i) => state.done[i].map((u) => unitsOf(a).indexOf(u)).filter((j) => j >= 0)), q: state.quiz })
  const all = C.items.every((_, i) => itemDone(i))
  const scores = Object.values(state.quiz)
  const score = scores.length ? scores.reduce((n, x) => n + x, 0) / scores.length : null
  const hasQuiz = C.items.some((a) => a.offlineQuiz)
  lms.report({ status: all ? (hasQuiz ? 'passed' : 'completed') : 'incomplete', score })
  window.dispatchEvent(new Event('lms-progress'))
}

// Trình học dùng chung gọi API; trong gói chỉ có ghi tiến độ là xử lý cục bộ
window.__LMS_OFFLINE__ = async (path, { method, body }) => {
  const m = /^\/learn\/a\/([^/]+)\/progress$/.exec(path)
  if (m && method === 'POST') {
    const i = C.items.findIndex((a) => a.id === m[1])
    if (i < 0) return { done: [], percent: 0 }
    const units = unitsOf(C.items[i])
    if (units.includes(body.unit) && !state.done[i].includes(body.unit)) { state.done[i] = [...state.done[i], body.unit]; persist() }
    return { done: state.done[i], percent: pct(i) }
  }
  throw new ApiError(0, 'offline', 'Tính năng này cần kết nối tới LMS gốc')
}
window.addEventListener('pagehide', () => lms.finish(C.items.every((_, i) => itemDone(i))))

function useTick() {
  const [, set] = useState(0)
  useEffect(() => { const h = () => set((x) => x + 1); window.addEventListener('lms-progress', h); return () => window.removeEventListener('lms-progress', h) }, [])
}

function Home({ onOpen }) {
  useTick()
  const total = Math.round(C.items.reduce((n, _, i) => n + (itemDone(i) ? 100 : pct(i)), 0) / C.items.length)
  const next = C.items.findIndex((_, i) => !itemDone(i))
  return (
    <div className="mx-auto max-w-[880px] px-6 pb-20 pt-8">
      <Thumb img={C.course.img} className="h-48 rounded-2xl"><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-6 bottom-5 text-white"><div className="text-[13px] font-semibold uppercase tracking-wider text-white/80">Khóa học · {C.items.length} phần</div><h1 className="mt-1 font-lato text-[32px] font-black leading-tight">{C.course.title}</h1></div></Thumb>
      {C.course.desc && <p className="mt-5 font-serif text-[17px] leading-relaxed text-neutral-800">{C.course.desc}</p>}
      <div className="mt-5 flex items-center gap-4 rounded-2xl border border-line px-5 py-4">
        <div className="flex flex-1 items-center gap-3"><div className="h-2 flex-1 rounded-full bg-neutral-200"><div className="h-2 rounded-full bg-brand" style={{ width: `${total}%` }} /></div><span className="text-[14px] font-semibold">{total}%</span></div>
        {next >= 0 && <button onClick={() => onOpen(next)} className="btn-dark h-10 shrink-0">{pct(next) > 0 ? 'Học tiếp' : 'Bắt đầu'}: {FORMATS[C.items[next].type].name}<ArrowRight size={16} /></button>}
      </div>
      <div className="mt-6 divide-y divide-line rounded-2xl border border-line">
        {C.items.map((a, i) => { const ok = itemDone(i); return (
          <button key={a.id} onClick={() => onOpen(i)} className="group flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-neutral-50">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>{ok ? <CheckCircle2 size={16} /> : i + 1}</span>
            <Thumb img={a.img} className="h-[72px] w-[128px] shrink-0 rounded-lg"><span className="absolute bottom-1.5 left-1.5 grid h-6 w-6 place-items-center rounded-md bg-white/95 shadow-sm"><FormatGlyph type={a.type} size={14} /></span></Thumb>
            <div className="min-w-0 flex-1"><div className="text-[13px] font-medium text-neutral-500">{FORMATS[a.type].name}</div><div className="truncate text-[16px] font-semibold group-hover:underline">{a.title}</div>{a.summary && <div className="truncate text-[13px] text-neutral-500">{a.summary}</div>}</div>
            <span className={`w-28 shrink-0 text-right text-[13px] ${ok ? 'text-emerald-700' : pct(i) ? 'text-sky-700' : 'text-neutral-500'}`}>{ok ? 'Đã xong' : pct(i) ? `Đã học ${pct(i)}%` : 'Chưa học'}</span>
          </button>) })}
      </div>
      {C.skipped?.length > 0 && <div className="mt-4 flex gap-2 rounded-xl bg-neutral-50 px-4 py-3 text-[13px] text-neutral-600"><Info size={15} className="mt-0.5 shrink-0" /><div>{C.skipped.map((s) => <div key={s.title}><b>{s.title}</b>: {s.reason}.</div>)}</div></div>}
      {!lms.connected && <p className="mt-4 text-[12px] text-neutral-400">Đang mở ngoài LMS: tiến độ lưu tạm trên trình duyệt này.</p>}
    </div>
  )
}

function App() {
  const [open, setOpen] = useState(null)
  const [quiz, setQuiz] = useState(false)
  const top = useRef(null)
  const art = useMemo(() => (open == null ? null : { ...C.items[open], progress: { done: state.done[open], percent: pct(open) } }), [open])
  const back = () => { setOpen(null); setQuiz(false) }
  useEffect(() => { top.current?.scrollTo(0, 0) }, [open, quiz])
  const ctx = useMemo(() => ({ onQuiz: () => setQuiz(true), onExit: back }), [])
  return (
    <ThemeScope theme={C.course.theme} className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-4">
        {open != null && <button className="icon-btn" onClick={() => (quiz ? setQuiz(false) : back())} aria-label="Quay lại"><ChevronLeft size={20} /></button>}
        <span className="truncate text-[15px] font-semibold">{open == null ? C.course.title : art.title}</span>
      </header>
      <div ref={top} className="scroll-thin flex-1 overflow-y-auto bg-white">
        <OfflineCtx.Provider value={ctx}>
          {open == null ? <Home onOpen={setOpen} />
            : quiz && art.offlineQuiz ? <OfflineQuiz art={art} onBack={() => setQuiz(false)} onDone={(score) => { state.quiz[open] = Math.max(state.quiz[open] ?? 0, Math.round(score)); persist() }} />
              : <Player key={open} art={art} />}
        </OfflineCtx.Provider>
      </div>
    </ThemeScope>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode><QueryClientProvider client={queryClient}><StoreProvider><MemoryRouter><App /></MemoryRouter></StoreProvider></QueryClientProvider></StrictMode>,
)
