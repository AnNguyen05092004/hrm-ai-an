// Bài luyện tập trong gói SCORM: chấm ngay trên trình duyệt (chỉ có ở bài luyện tập, không có đề thi chính thức).
import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { MatchBoard, OrderBoard, CatBoard } from '../arrange'

const shuffle = (xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().trim()

/** Điểm 0..1 cho một câu, cách chấm giống máy chủ */
export function gradeLocal(q, a) {
  if (q.type === 'mc' || q.type === 'mr') {
    const picked = new Set([].concat(a ?? []).map(Number))
    const ok = q.choices.map((c, i) => (c.ok ? i : -1)).filter((i) => i >= 0)
    return picked.size === ok.length && ok.every((i) => picked.has(i)) ? 1 : 0
  }
  if (q.type === 'fill') return String(q.answer ?? '').split('|').map(fold).includes(fold(a)) ? 1 : 0
  if (q.type === 'match') return q.pairs.filter((p, i) => (a ?? {})[i] === p.r).length / q.pairs.length
  if (q.type === 'order') return q.items.filter((x, i) => (a ?? [])[i] === x).length / q.items.length
  const owner = Object.fromEntries(q.groups.flatMap((g) => g.items.map((x) => [x, g.name])))
  return Object.keys(owner).filter((x) => (a ?? {})[x] === owner[x]).length / Object.keys(owner).length
}

export function OfflineQuiz({ art, onDone, onBack }) {
  const quiz = art.offlineQuiz
  const qs = useMemo(() => quiz.questions.map((q) => ({
    ...q, choices: q.choices ? shuffle(q.choices) : q.choices,
    left: q.pairs?.map((p) => p.l), opts: q.type === 'match' ? shuffle(q.pairs.map((p) => p.r)) : q.type === 'order' ? shuffle(q.items) : q.type === 'cat' ? shuffle(q.groups.flatMap((g) => g.items)) : undefined,
    groupNames: q.groups?.map((g) => g.name),
  })), [quiz])
  const [ans, setAns] = useState({})
  const [result, setResult] = useState(null)
  const set = (id, v) => setAns((x) => ({ ...x, [id]: v }))
  const submit = () => {
    const per = Object.fromEntries(qs.map((q) => [q.id, gradeLocal(q, ans[q.id] ?? (q.type === 'order' ? q.opts : undefined))]))
    const score = (100 * Object.values(per).reduce((n, x) => n + x, 0)) / qs.length
    setResult({ per, score, passed: score >= quiz.passScore })
    onDone(score, score >= quiz.passScore)
    window.scrollTo(0, 0)
  }
  return (
    <div className="mx-auto max-w-[760px] px-6 py-12">
      <div className="text-[13px] font-bold uppercase tracking-wider text-brand">Bài luyện tập · {art.title}</div>
      {result ? (
        <div className="mt-4 rounded-2xl border border-line p-6">
          <div className={`font-lato text-[44px] font-bold ${result.passed ? 'text-emerald-700' : 'text-red-600'}`}>{Math.round(result.score)}%</div>
          <div className="text-[15px] text-neutral-600">{result.passed ? 'Bạn đã đạt bài luyện tập.' : `Chưa đạt (cần ${quiz.passScore}%). Xem lại bài học rồi làm lại.`}</div>
          <div className="mt-4 space-y-1.5">{qs.map((q, i) => <div key={q.id} className="flex items-center gap-2 text-[14px]">{result.per[q.id] >= 1 ? <Check size={16} className="text-emerald-600" /> : <X size={16} className="text-red-500" />}<span className="text-neutral-500">Câu {i + 1}</span><span className="truncate">{q.q}</span></div>)}</div>
          <div className="mt-6 flex gap-3"><button onClick={onBack} className="rounded-full border-2 border-ink px-8 py-2.5 font-lato font-bold">Về khóa học</button>{!result.passed && <button onClick={() => { setAns({}); setResult(null) }} className="rounded-full bg-brand px-8 py-2.5 font-lato font-bold text-white">Làm lại</button>}</div>
        </div>
      ) : (<>
        <h1 className="mt-2 font-lato text-[32px] font-black">Bài luyện tập</h1>
        <p className="mt-2 font-serif text-[16px] text-neutral-600">{qs.length} câu · đạt từ {quiz.passScore}%</p>
        {qs.map((q, i) => (
          <div key={q.id} className="mt-8 border-t border-line pt-8">
            <div className="text-[13px] text-neutral-500">Câu {i + 1}/{qs.length}</div>
            <div className="mt-2 font-lato text-[20px] font-bold">{q.q}</div>
            {(q.type === 'mc' || q.type === 'mr') && <div className="mt-4 space-y-2.5">{q.choices.map((c, j) => { const on = q.type === 'mr' ? [].concat(ans[q.id] ?? []).includes(j) : ans[q.id] === j; return (
              <button key={j} onClick={() => set(q.id, q.type === 'mr' ? (on ? [].concat(ans[q.id] ?? []).filter((x) => x !== j) : [...[].concat(ans[q.id] ?? []), j]) : j)} className={`flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left font-serif text-[15px] ${on ? 'border-brand bg-brand/5' : 'border-line'}`}>
                <span className={`h-4 w-4 shrink-0 border-2 ${q.type === 'mr' ? 'rounded' : 'rounded-full'} ${on ? 'border-brand bg-brand' : 'border-neutral-400'}`} />{c.t}</button>) })}</div>}
            {q.type === 'fill' && <input className="field mt-4" value={ans[q.id] ?? ''} onChange={(e) => set(q.id, e.target.value)} placeholder="Nhập đáp án" />}
            {q.type === 'match' && <div className="mt-4"><MatchBoard left={q.left} opts={q.opts} value={ans[q.id]} onChange={(v) => set(q.id, v)} /></div>}
            {q.type === 'order' && <div className="mt-4"><OrderBoard opts={q.opts} value={ans[q.id]} onChange={(v) => set(q.id, v)} /></div>}
            {q.type === 'cat' && <div className="mt-4"><CatBoard groups={q.groupNames} opts={q.opts} value={ans[q.id]} onChange={(v) => set(q.id, v)} /></div>}
          </div>))}
        <div className="mt-10 flex gap-3"><button onClick={onBack} className="rounded-full border-2 border-ink px-8 py-2.5 font-lato font-bold">Quay lại</button><button onClick={submit} className="rounded-full bg-brand px-10 py-2.5 font-lato font-bold text-white">Nộp bài</button></div>
      </>)}
    </div>
  )
}
