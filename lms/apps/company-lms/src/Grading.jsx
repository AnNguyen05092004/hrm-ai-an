// Chấm bài trên cổng đào tạo: câu tự luận/code của đề QTI chấm theo tiêu chí có trong gói.
// Cổng có AI thì đưa lời nhắc (câu hỏi + tiêu chí + bài làm) cho AI chấm nháp; người chấm xác nhận điểm cuối.
import { useState } from 'react'
import { CheckCircle2, ClipboardCopy, XCircle } from 'lucide-react'
import { aiPromptFor } from './qti'
import { ADMIN, LEARNERS, attemptsOf, recKey, saveAttempt, useData } from './store'
import { Avatar, Badge, Drawer } from './ui'
import { fmtDateTime } from './format'
import { toast } from './toast'

const learnerOf = (id) => LEARNERS.find((l) => l.id === id)
const MANUAL = new Set(['text', 'code'])

/** Mọi lượt thi đề QTI, lượt chờ chấm lên đầu */
export function useAttempts() {
  const { packages, records } = useData()
  return packages.filter((p) => p.kind === 'qti').flatMap((p) => p.assigned.flatMap((a) => attemptsOf(records[recKey(p.id, a.userId)] ?? {}).filter((t) => t.status !== 'in_progress').map((t) => ({ pkg: p, learner: learnerOf(a.userId), t }))))
    .sort((a, b) => Number(b.t.status === 'grading') - Number(a.t.status === 'grading') || b.t.end - a.t.end)
}

export function GradingQueue() {
  const rows = useAttempts()
  const [open, setOpen] = useState(null)
  const cur = rows.find((r) => r.t.id === open)
  if (!rows.length) return <div className="card px-6 py-12 text-center text-ink-muted">Chưa có bài thi nào. Nhập gói đề QTI, giao cho nhân viên; bài nộp có câu tự luận/code sẽ vào đây.</div>
  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead><tr><th className="th">Học viên</th><th className="th">Đề</th><th className="th">Nộp lúc</th><th className="th">Trạng thái</th><th className="th">Điểm</th><th className="th"> </th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ pkg, learner, t }) => (
              <tr key={t.id} className="cursor-pointer hover:bg-canvas" onClick={() => setOpen(t.id)}>
                <td className="td"><div className="flex items-center gap-2"><Avatar person={learner} size={28} /><span className="font-medium">{learner.name}</span></div></td>
                <td className="td">{pkg.title}</td>
                <td className="td">{fmtDateTime(t.end)}</td>
                <td className="td"><Badge status={t.status} /></td>
                <td className="td">{t.score ?? <span className="text-ink-subtle">trắc nghiệm {t.autoScore}</span>}</td>
                <td className="td text-right"><button className={t.status === 'grading' ? 'btn-dark btn-sm' : 'btn-line btn-sm'}>{t.status === 'grading' ? 'Chấm bài' : 'Xem bài'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cur && <AttemptReview {...cur} onClose={() => setOpen(null)} />}
    </>
  )
}

function AttemptReview({ pkg, learner, t, onClose }) {
  const exam = pkg.exam
  const qs = Object.fromEntries(exam.questions.map((q) => [q.id, q]))
  const manual = t.drawn.filter((d) => MANUAL.has(qs[d.id]?.kind))
  const [marks, setMarks] = useState(() => Object.fromEntries(manual.map((d) => [d.id, t.manual?.[d.id]?.met ?? qs[d.id].rubric.map(() => false)])))
  const editable = t.status === 'grading'
  const scoreOf = (qid) => { const m = marks[qid] ?? []; return m.length ? m.filter(Boolean).length / m.length : 0 }
  const total = Math.round((100 * (Object.values(t.auto).reduce((s, x) => s + x, 0) + manual.reduce((s, d) => s + scoreOf(d.id), 0))) / t.drawn.length)
  const pass = total >= (exam.passScore ?? 0)
  const confirmGrade = () => {
    const graded = { ...t, manual: Object.fromEntries(manual.map((d) => [d.id, { met: marks[d.id], score: scoreOf(d.id) }])), score: total, status: pass ? 'passed' : 'failed', gradedBy: ADMIN.id, gradedAt: Date.now() }
    saveAttempt(pkg, learner.id, graded)
    toast(`Đã chấm: ${learner.name} ${total} điểm · ${pass ? 'đạt' : 'chưa đạt'}`); onClose()
  }
  const copy = async (q) => {
    try { await navigator.clipboard.writeText(aiPromptFor(exam, q, t.answers[q.id] ?? '')); toast('Đã sao chép lời nhắc: dán vào AI của cổng để chấm nháp') } catch { toast('Trình duyệt chặn sao chép') }
  }
  return (
    <Drawer open onClose={onClose} title={`${learner.name} · ${pkg.title}`} w={720}>
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-muted"><Badge status={t.status} />Nộp {fmtDateTime(t.end)} · {t.drawn.length} câu · trắc nghiệm {Object.keys(t.auto).length} câu tự chấm</div>
      <h3 className="overline mt-6">Câu chấm tay theo tiêu chí ({manual.length})</h3>
      <div className="mt-2 grid gap-4">
        {manual.map((d, i) => {
          const q = qs[d.id], ans = t.answers[d.id] ?? (q.kind === 'code' ? q.placeholder : '')
          return (
            <section key={d.id} className="rounded-xl border border-line p-4">
              <div className="flex items-start gap-2"><span className="text-[12px] text-ink-subtle">Câu {i + 1} · {q.kind === 'code' ? 'Code' : 'Tự luận'}</span><span className="ml-auto text-[13px] font-semibold">{Math.round(scoreOf(d.id) * 100) / 100}/1 điểm</span></div>
              <div className="mt-1 text-[14px] font-medium leading-6">{q.prompt}</div>
              <div className="mt-3 text-[12px] font-medium text-ink-muted">Bài làm</div>
              <pre className={`mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-canvas p-3 text-[13px] leading-5 ${q.kind === 'code' ? 'font-mono' : 'font-sans'}`}>{ans || '(bỏ trống)'}</pre>
              <div className="mt-3 text-[12px] font-medium text-ink-muted">{q.kind === 'code' ? 'Test case trong gói (đánh dấu test đạt)' : 'Tiêu chí trong gói (đánh dấu tiêu chí đạt)'}</div>
              <ul className="mt-1.5 grid gap-1.5">
                {q.rubric.map((c, ci) => (
                  <li key={ci}><label className="flex items-start gap-2 text-[13px] leading-5">
                    <input type="checkbox" className="mt-0.5" disabled={!editable} checked={!!marks[d.id]?.[ci]} onChange={(e) => setMarks((m) => ({ ...m, [d.id]: m[d.id].map((x, k) => (k === ci ? e.target.checked : x)) }))} />
                    <span className={q.kind === 'code' ? 'font-mono text-[12px]' : ''}>{c}</span>
                  </label></li>
                ))}
              </ul>
              {q.kind === 'text' && editable && <button className="btn-ghost btn-sm mt-2 -ml-3" onClick={() => copy(q)}><ClipboardCopy size={14} />Sao chép lời nhắc cho AI chấm nháp</button>}
            </section>
          )
        })}
      </div>
      <h3 className="overline mt-6">Câu tự chấm</h3>
      <ul className="mt-2 grid gap-1.5">
        {t.drawn.filter((d) => !MANUAL.has(qs[d.id]?.kind)).map((d) => (
          <li key={d.id} className="flex items-start gap-2 text-[13px] leading-5">{t.auto[d.id] >= 1 ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" /> : <XCircle size={15} className="mt-0.5 shrink-0 text-danger-text" />}<span className="flex-1">{qs[d.id]?.prompt || `${qs[d.id]?.before} ___ ${qs[d.id]?.after}`}</span><span className="text-ink-subtle">{Math.round(t.auto[d.id] * 100) / 100}</span></li>
        ))}
      </ul>
      <div className="sticky -bottom-5 -mx-6 -mb-5 mt-6 flex flex-wrap items-center gap-3 border-t border-line bg-white px-6 py-4">
        <div className="mr-auto"><div className="font-display text-[22px] font-medium leading-7">{editable ? total : t.score}<span className="text-[14px] text-ink-subtle">/100</span></div><div className="text-[12px] text-ink-muted">Đạt từ {exam.passScore}% · {(editable ? pass : t.status === 'passed') ? 'Đạt' : 'Chưa đạt'}</div></div>
        {editable ? <button className="btn-dark" onClick={confirmGrade}>Xác nhận điểm</button> : <span className="text-[13px] text-ink-muted">Chấm lúc {fmtDateTime(t.gradedAt ?? t.end)}</span>}
      </div>
    </Drawer>
  )
}

/** Quản trị xem đề và đáp án đọc từ gói */
export function ExamPreview({ pkg, onClose }) {
  const label = { mc: 'Một đáp án', mr: 'Nhiều đáp án', fill: 'Điền chỗ trống', match: 'Ghép cặp / phân loại', order: 'Sắp thứ tự', text: 'Tự luận', code: 'Code' }
  return (
    <Drawer open onClose={onClose} title={`Đề và đáp án · ${pkg.title}`} w={720}>
      <p className="text-[13px] text-ink-muted">Ngân hàng {pkg.exam.questions.length} câu, mỗi lượt rút {pkg.exam.pick} câu. Chỉ quản trị thấy đáp án.</p>
      <ol className="mt-4 grid gap-3">
        {pkg.exam.questions.map((q, i) => {
          const text = (id) => [...(q.choices ?? []), ...(q.left ?? []), ...(q.right ?? [])].find((c) => c.id === id)?.text ?? id
          return (
            <li key={q.id} className="rounded-xl border border-line p-4 text-[13px] leading-5">
              <div className="text-[12px] text-ink-subtle">Câu {i + 1} · {label[q.kind]}</div>
              <div className="mt-1 text-[14px] font-medium leading-6">{q.prompt || `${q.before} ___ ${q.after}`}</div>
              <div className="mt-2 text-ink-muted">
                {(q.kind === 'mc' || q.kind === 'mr') && <>Đáp án: {q.correct.map(text).join(' · ')}</>}
                {q.kind === 'fill' && <>Chấp nhận: {q.accepted.join(' · ')}</>}
                {q.kind === 'match' && <ul>{q.correct.map((p) => { const [l, r] = p.split(' '); return <li key={p}>{text(l)} → {text(r)}</li> })}</ul>}
                {q.kind === 'order' && <ol className="list-decimal pl-5">{q.correct.map((id) => <li key={id}>{text(id)}</li>)}</ol>}
                {MANUAL.has(q.kind) && <ul className="list-disc pl-5">{q.rubric.map((c) => <li key={c}>{c}</li>)}</ul>}
              </div>
            </li>
          )
        })}
      </ol>
    </Drawer>
  )
}
