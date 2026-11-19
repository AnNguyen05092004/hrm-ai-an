import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, ArrowUp, ChevronRight } from 'lucide-react'
import { Md } from '../md'
import { post } from '../api'

const STARTERS = ['Bộ phận nào đang yếu nhất so với KPI?', 'Ai đang có nguy cơ trễ hạn học?', 'Nên ưu tiên giao khóa gì trước?', 'Tóm tắt tình hình tuần này để gửi các trưởng nhóm']

/** Trợ lý cho giám đốc: hỏi đáp trên dữ liệu đội ngũ, KPI, tiến độ học; có nút hành động */
export function Advisor({ onAction }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [t, setT] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef()
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])
  const ask = async (q) => {
    if (!q.trim() || busy) return
    const history = msgs.slice(-6).map((m) => ({ role: m.me ? 'user' : 'assistant', text: (m.me ?? m.answer ?? '').slice(0, 2500) }))
    setMsgs((m) => [...m, { me: q }]); setT(''); setBusy(true)
    try { const r = await post('/workforce/advisor', { question: q, history }); setMsgs((m) => [...m, r]) } catch (e) { setMsgs((m) => [...m, { answer: e.message, err: true }]) } finally { setBusy(false) }
  }
  if (!open) return <button onClick={() => setOpen(true)} className="fixed bottom-8 right-6 z-30 flex items-center gap-2 rounded-full border-2 border-violet-400 bg-[#1e1b4b] px-4 py-2.5 text-[14px] font-semibold text-white shadow-pop"><Sparkles size={16} />Hỏi trợ lý AI</button>
  return (
    <div className="fade fixed bottom-6 right-6 z-40 flex h-[min(600px,calc(100vh-120px))] w-[440px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-100"><Sparkles size={15} className="text-violet-600" /></span>
        <div className="flex-1 leading-tight"><div className="text-[14px] font-semibold">Trợ lý kế hoạch đào tạo</div><div className="text-[12px] text-neutral-500">Trả lời từ dữ liệu đội, KPI và tiến độ học</div></div>
        {msgs.length > 0 && <button onClick={() => setMsgs([])} className="rounded-lg px-2 py-1 text-[12px] font-medium text-neutral-600 hover:bg-neutral-100">Hỏi mới</button>}
        <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg border border-line" aria-label="Đóng"><X size={16} /></button>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto px-5">
        {msgs.length === 0 && <div className="pt-8"><div className="text-center text-[15px] font-semibold">Hỏi gì về đội ngũ?</div><div className="mt-4 space-y-2">{STARTERS.map((s) => <button key={s} onClick={() => ask(s)} className="flex w-full items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-left text-[14px] hover:border-violet-300 hover:bg-violet-50">{s}<ChevronRight size={15} className="ml-auto text-neutral-400" /></button>)}</div></div>}
        {msgs.map((m, i) => m.me ? <div key={i} className="my-3 flex justify-end"><div className="max-w-[85%] rounded-2xl bg-ink px-4 py-2.5 text-[14px] text-white">{m.me}</div></div> : (
          <div key={i} className={`my-3 rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${m.err ? 'bg-red-50 text-red-700' : 'bg-neutral-100'}`}>
            <Md text={m.answer} />
            {m.points?.length > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-5">{m.points.map((p, j) => <li key={j}><Md text={p} /></li>)}</ul>}
            {m.actions?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{m.actions.map((a, j) => <button key={j} onClick={() => onAction(a)} className="rounded-full border border-violet-300 bg-white px-3 py-1 text-[12px] font-semibold text-violet-700">{a.label}</button>)}</div>}
            {m.answer && !m.err && <button onClick={() => navigator.clipboard?.writeText(`${m.answer}\n${(m.points ?? []).map((p) => `- ${p}`).join('\n')}`)} className="mt-2 text-[12px] text-neutral-500 hover:text-ink">Sao chép</button>}
          </div>))}
        {busy && <div className="my-3 flex w-16 items-center justify-center gap-1 rounded-2xl bg-neutral-100 py-3">{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${d * 0.15}s` }} />)}</div>}
        <div ref={end} />
      </div>
      <div className="p-4"><div className="flex items-center rounded-xl border border-line px-3 py-2"><input value={t} maxLength={1000} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(t)} className="flex-1 text-[14px] outline-none" placeholder="Nhập câu hỏi" /><button onClick={() => ask(t)} disabled={busy} className="grid h-7 w-7 place-items-center rounded-md bg-neutral-100" aria-label="Gửi"><ArrowUp size={15} /></button></div></div>
    </div>
  )
}
