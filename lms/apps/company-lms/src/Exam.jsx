// Làm bài đề QTI trên cổng đào tạo: cổng tự rút câu, tính giờ, chấm câu khách quan; tự luận/code chờ người chấm.
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, Clock, Send } from 'lucide-react'
import { gradeItem } from './qti'
import { attemptsOf, getRecord, saveAttempt } from './store'
import { Badge, Modal } from './ui'

const shuffle = (xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const MANUAL = new Set(['text', 'code'])
const newId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

/** Rút đề cho một lượt: chọn ngẫu nhiên pick câu, xáo lựa chọn nếu gói cho phép */
function draw(exam) {
  return shuffle(exam.questions).slice(0, exam.pick).map((q) => ({
    id: q.id,
    order: q.kind === 'order' ? shuffle(q.choices.map((c) => c.id)) : undefined,
    choices: (q.kind === 'mc' || q.kind === 'mr') && q.shuffle ? shuffle(q.choices.map((c) => c.id)) : undefined,
  }))
}

/** Chấm lượt thi: câu khách quan chấm ngay, câu chấm tay để trống chờ người chấm */
export function finish(exam, attempt) {
  const qs = Object.fromEntries(exam.questions.map((q) => [q.id, q]))
  const auto = {}
  for (const d of attempt.drawn) { const q = qs[d.id]; if (q && !MANUAL.has(q.kind)) auto[d.id] = gradeItem(q, attempt.answers[d.id] ?? (q.kind === 'order' ? d.order : undefined)) }
  const pending = attempt.drawn.filter((d) => MANUAL.has(qs[d.id]?.kind)).length
  const sum = Object.values(auto).reduce((s, x) => s + x, 0)
  const score = Math.round((100 * sum) / attempt.drawn.length)
  return { ...attempt, end: Date.now(), auto, status: pending ? 'grading' : score >= (exam.passScore ?? 0) ? 'passed' : 'failed', score: pending ? null : score, autoScore: score }
}

export default function ExamPlayer({ pkg, learner, onClose }) {
  const exam = pkg.exam
  const qs = useMemo(() => Object.fromEntries(exam.questions.map((q) => [q.id, q])), [exam])
  // lượt đang làm dở còn giờ thì làm tiếp; hết giờ thì nộp luôn phần đã làm
  const [attempt, setAttempt] = useState(() => {
    const open = attemptsOf(getRecord(pkg.id, learner.id)).find((a) => a.status === 'in_progress')
    return open && (!exam.minutes || Date.now() < open.start + exam.minutes * 60000) ? open : null
  })
  useEffect(() => {
    const open = attemptsOf(getRecord(pkg.id, learner.id)).find((a) => a.status === 'in_progress')
    if (open && exam.minutes && Date.now() >= open.start + exam.minutes * 60000) saveAttempt(pkg, learner.id, finish(exam, open))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [done, setDone] = useState(null)
  const [left, setLeft] = useState(null)
  const [asking, setAsking] = useState(false)
  const submitted = useRef(false)

  const start = () => {
    const a = { id: newId(), start: Date.now(), status: 'in_progress', drawn: draw(exam), answers: {} }
    saveAttempt(pkg, learner.id, a); setAttempt(a)
  }
  const answer = (qid, v) => { const next = { ...attempt, answers: { ...attempt.answers, [qid]: v } }; setAttempt(next); saveAttempt(pkg, learner.id, next) }
  const submit = () => {
    if (submitted.current) return
    submitted.current = true
    const r = finish(exam, attempt); saveAttempt(pkg, learner.id, r); setDone(r); setAttempt(null)
  }

  // đồng hồ đếm ngược; hết giờ tự nộp
  useEffect(() => {
    if (!attempt || !exam.minutes) return undefined
    const tick = () => { const ms = attempt.start + exam.minutes * 60000 - Date.now(); setLeft(Math.max(0, ms)); if (ms <= 0) submit() }
    tick(); const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [attempt?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const used = attemptsOf(getRecord(pkg.id, learner.id)).filter((a) => a.status !== 'in_progress').length
  const mm = left == null ? '' : `${String(Math.floor(left / 60000)).padStart(2, '0')}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`
  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-canvas">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-3 md:px-4">
        <button className="btn-ghost" onClick={onClose} disabled={!!attempt}><ChevronLeft size={18} />Thoát</button>
        <span className="h-6 w-px shrink-0 bg-line" aria-hidden />
        <div className="min-w-0 flex-1"><div className="truncate font-display text-[16px] font-medium tracking-[-0.02em]">{pkg.title}</div><div className="truncate text-[12px] text-ink-subtle">{learner.name} · Đề kiểm tra QTI 2.1 · cổng tự chấm</div></div>
        {attempt && exam.minutes > 0 && <span className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[14px] ${left < 60000 ? 'bg-danger-surface text-danger-text' : 'bg-muted'}`} aria-live="polite"><Clock size={15} />{mm}</span>}
        {attempt && <button className="btn-dark btn-sm" onClick={() => setAsking(true)}><Send size={15} />Nộp bài</button>}
      </header>
      <div className="scroll-thin flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[760px] px-4 py-8">
          {done ? <Result exam={exam} r={done} onClose={onClose} /> : attempt ? (
            <ol className="grid gap-4">
              {attempt.drawn.map((d, i) => <Question key={d.id} n={i + 1} total={attempt.drawn.length} q={qs[d.id]} d={d} value={attempt.answers[d.id]} onChange={(v) => answer(d.id, v)} />)}
              <li className="flex justify-end"><button className="btn-dark" onClick={() => setAsking(true)}><Send size={16} />Nộp bài</button></li>
            </ol>
          ) : (
            <div className="card p-6">
              <h1 className="text-[24px] leading-8">{pkg.title}</h1>
              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-[14px] sm:grid-cols-4">
                <div><dt className="text-ink-subtle">Số câu</dt><dd className="font-medium">{exam.pick}</dd></div>
                <div><dt className="text-ink-subtle">Thời gian</dt><dd className="font-medium">{exam.minutes ? `${exam.minutes} phút` : 'Không giới hạn'}</dd></div>
                <div><dt className="text-ink-subtle">Điểm đạt</dt><dd className="font-medium">{exam.passScore ?? '—'}%</dd></div>
                <div><dt className="text-ink-subtle">Lượt đã dùng</dt><dd className="font-medium">{used}/{exam.attempts}</dd></div>
              </dl>
              <p className="mt-4 text-[13px] text-ink-muted">Mỗi lượt rút ngẫu nhiên {exam.pick} câu. Hết giờ bài tự nộp. Câu trắc nghiệm chấm ngay; câu tự luận và code do người chấm của công ty chấm theo tiêu chí.</p>
              <div className="mt-5 flex gap-2">
                <button className="btn-line" onClick={onClose}>Để sau</button>
                <button className="btn-dark" onClick={start} disabled={used >= exam.attempts}>{used >= exam.attempts ? 'Đã hết lượt thi' : used ? 'Làm lại' : 'Bắt đầu làm bài'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Modal open={asking && !!attempt} onClose={() => setAsking(false)} title="Nộp bài?" w={440}>
        {attempt && (() => { const blank = attempt.drawn.filter((d) => { const v = attempt.answers[d.id]; return v == null || v === '' || (Array.isArray(v) && !v.length) }).length; return <p className="text-[14px] text-ink-muted">Sau khi nộp không sửa được bài.{blank ? ` Còn ${blank} câu chưa trả lời.` : ''}</p> })()}
        <div className="mt-5 flex justify-end gap-2"><button className="btn-line" onClick={() => setAsking(false)}>Làm tiếp</button><button className="btn-dark" onClick={() => { setAsking(false); submit() }}>Nộp bài</button></div>
      </Modal>
    </div>
  )
}

function Result({ exam, r, onClose }) {
  const manual = r.drawn.length - Object.keys(r.auto).length
  return (
    <div className="card p-6" role="status">
      <Badge status={r.status} />
      {r.status === 'grading' ? (<>
        <h1 className="mt-3 text-[24px] leading-8">Đã nộp bài, chờ chấm</h1>
        <p className="mt-2 text-ink-muted">Phần trắc nghiệm được {r.autoScore} điểm trên thang 100. Còn {manual} câu tự luận/code người chấm của công ty sẽ chấm theo tiêu chí; điểm cuối có sau khi chấm.</p>
      </>) : (<>
        <div className="mt-3 font-display text-[44px] font-medium leading-none">{r.score}<span className="text-[20px] text-ink-subtle">/100</span></div>
        <p className="mt-2 text-ink-muted">{r.status === 'passed' ? 'Bạn đã đạt.' : `Chưa đạt (cần ${exam.passScore}%).`}</p>
      </>)}
      <button className="btn-line mt-5" onClick={onClose}>Về khóa học của tôi</button>
    </div>
  )
}

function Question({ n, total, q, d, value, onChange }) {
  if (!q) return null
  const label = { mc: 'Chọn một đáp án', mr: 'Chọn mọi đáp án đúng', fill: 'Điền vào chỗ trống', match: 'Ghép mỗi mục bên trái với một lựa chọn', order: 'Sắp xếp đúng thứ tự', text: 'Tự luận', code: 'Viết code JavaScript' }[q.kind]
  const byId = Object.fromEntries((q.choices ?? []).map((c) => [c.id, c]))
  return (
    <li className="card p-5">
      <div className="text-[12px] text-ink-subtle">Câu {n}/{total} · {label}</div>
      {q.kind !== 'fill' && <div className="mt-1.5 text-[15px] font-medium leading-6">{q.prompt}</div>}
      {(q.kind === 'mc' || q.kind === 'mr') && (
        <div className="mt-3 grid gap-2">
          {(d.choices ?? q.choices.map((c) => c.id)).map((id) => {
            const on = q.kind === 'mr' ? [].concat(value ?? []).includes(id) : value === id
            return (
              <label key={id} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-[14px] ${on ? 'border-ink bg-muted' : 'border-line hover:bg-canvas'}`}>
                <input type={q.kind === 'mr' ? 'checkbox' : 'radio'} name={q.id} className="mt-1" checked={on} onChange={() => onChange(q.kind === 'mr' ? (on ? [].concat(value ?? []).filter((x) => x !== id) : [...[].concat(value ?? []), id]) : id)} />{byId[id]?.text}
              </label>
            )
          })}
        </div>
      )}
      {q.kind === 'fill' && <p className="mt-1.5 text-[15px] leading-8">{q.before} <input aria-label="Đáp án" className="field inline-block h-9 w-48 align-middle" value={value ?? ''} onChange={(e) => onChange(e.target.value)} /> {q.after}</p>}
      {q.kind === 'match' && (
        <div className="mt-3 grid gap-2">
          {q.left.map((l) => (
            <div key={l.id} className="grid items-center gap-2 sm:grid-cols-[1fr_1fr]">
              <span className="text-[14px]">{l.text}</span>
              <select aria-label={`Ghép cho: ${l.text}`} className="field h-10" value={(value ?? {})[l.id] ?? ''} onChange={(e) => onChange({ ...(value ?? {}), [l.id]: e.target.value })}>
                <option value="">Chọn…</option>{q.right.map((r) => <option key={r.id} value={r.id}>{r.text}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
      {q.kind === 'order' && (() => {
        const cur = value ?? d.order
        const move = (i, j) => { const a = [...cur]; [a[i], a[j]] = [a[j], a[i]]; onChange(a) }
        return (
          <ol className="mt-3 grid gap-2">
            {cur.map((id, i) => (
              <li key={id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[14px]">
                <span className="w-5 text-ink-subtle">{i + 1}.</span><span className="flex-1">{byId[id]?.text}</span>
                <button className="btn-ghost h-8 w-8 px-0" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Lên"><ArrowUp size={15} /></button>
                <button className="btn-ghost h-8 w-8 px-0" disabled={i === cur.length - 1} onClick={() => move(i, i + 1)} aria-label="Xuống"><ArrowDown size={15} /></button>
              </li>
            ))}
          </ol>
        )
      })()}
      {q.kind === 'text' && <textarea aria-label="Bài làm" className="field mt-3 h-40 py-2 leading-6" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}
      {q.kind === 'code' && <textarea aria-label="Mã JavaScript" spellCheck={false} className="field mt-3 h-56 py-2 font-mono text-[13px] leading-5" value={value ?? q.placeholder} onChange={(e) => onChange(e.target.value)} />}
    </li>
  )
}
