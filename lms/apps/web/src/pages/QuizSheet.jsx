// Câu hỏi kèm đáp án, giải thích và tiêu chí chấm: người soạn xem trước, reviewer kiểm tra trước khi xuất đề.
import { Check, X } from 'lucide-react'

export const QUESTION_KIND = { mc: 'Một đáp án', mr: 'Nhiều đáp án', fill: 'Điền chỗ trống', match: 'Ghép cặp', order: 'Sắp thứ tự', cat: 'Phân loại', essay: 'Tự luận', code: 'Bài code' }

/** Khóa vị trí dùng cho góp ý review: mỗi câu một vị trí */
export const questionAnchor = (q, i) => ({ key: `q:${q.id}`, label: `Câu ${i + 1}: ${(q.q ?? '').slice(0, 80)}` })

function Answer({ q }) {
  if (q.type === 'mc' || q.type === 'mr') return (
    <ul className="mt-2 space-y-1.5">
      {(q.choices ?? []).map((c, i) => (
        <li key={i} className={`rounded-lg border px-3 py-2 ${c.ok ? 'border-emerald-300 bg-emerald-50' : 'border-line'}`}>
          <div className="flex items-start gap-2">{c.ok ? <Check size={16} className="mt-0.5 shrink-0 text-emerald-700" /> : <X size={16} className="mt-0.5 shrink-0 text-neutral-400" />}<span className={c.ok ? 'font-medium' : ''}>{c.t}</span></div>
          {c.fb && <div className="ml-6 mt-0.5 text-[13px] text-neutral-600">{c.fb}</div>}
        </li>
      ))}
    </ul>
  )
  if (q.type === 'fill') return <p className="mt-2">Đáp án chấp nhận: <b>{String(q.answer ?? '').split('|').join(' · ')}</b></p>
  if (q.type === 'match') return <ul className="mt-2 space-y-1">{(q.pairs ?? []).map((p, i) => <li key={i} className="flex gap-2"><span className="font-medium">{p.l}</span><span className="text-neutral-400">→</span><span>{p.r}</span></li>)}</ul>
  if (q.type === 'order') return <ol className="mt-2 list-decimal space-y-1 pl-5">{(q.items ?? q.order ?? []).map((x, i) => <li key={i}>{x}</li>)}</ol>
  if (q.type === 'cat') return <div className="mt-2 grid gap-2 sm:grid-cols-2">{(q.groups ?? []).map((g) => <div key={g.name} className="rounded-lg border border-line px-3 py-2"><div className="font-medium">{g.name}</div><div className="mt-0.5 text-[13px] text-neutral-600">{g.items.join(' · ')}</div></div>)}</div>
  if (q.type === 'essay') return <><div className="mt-2 text-[13px] font-medium text-neutral-500">Tiêu chí chấm</div><ul className="mt-1 list-disc space-y-1 pl-5">{(q.rubric ?? []).map((r) => <li key={r}>{r}</li>)}</ul></>
  if (q.type === 'code') return (<>
    {q.starter && <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-50 p-3 font-mono text-[12px]">{q.starter}</pre>}
    <div className="mt-2 text-[13px] font-medium text-neutral-500">Test case</div>
    <ul className="mt-1 space-y-1 font-mono text-[12px]">{(q.tests ?? []).map((t, i) => <li key={i}>{t.name}: solve(...{t.args}) → {t.expected}</li>)}</ul>
  </>)
  return null
}

/** Danh sách câu hỏi; `aside(q, i)` gắn thêm thao tác ở mỗi câu (ví dụ nút góp ý) */
export function QuizSheet({ questions, aside }) {
  if (!questions?.length) return <p className="text-[14px] text-neutral-600">Chưa có câu hỏi nào.</p>
  return (
    <ol className="space-y-4">
      {questions.map((q, i) => (
        <li key={q.id ?? i} className="rounded-xl border border-line bg-white p-4 text-[14px] leading-relaxed">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-neutral-500">
            <span className="font-semibold text-ink">Câu {i + 1}</span><span>{QUESTION_KIND[q.type] ?? q.type}</span>{q.level && <span>· Mức {q.level}</span>}
            <span className={`rounded-full px-2 py-0.5 ${q.approved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{q.approved ? 'Đã duyệt' : 'Chưa duyệt'}</span>
            <span className="flex-1" />{aside?.(q, i)}
          </div>
          <div className="mt-1.5 text-[15px] font-medium">{q.q}</div>
          <Answer q={q} />
          {q.src && <div className="mt-2 text-[12px] text-neutral-500">Nguồn: {q.src}</div>}
        </li>
      ))}
    </ol>
  )
}
