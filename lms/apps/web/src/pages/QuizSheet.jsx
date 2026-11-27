// Câu hỏi kèm đáp án, giải thích và tiêu chí chấm: người soạn xem trước, reviewer kiểm tra trước khi xuất đề.
import { Check, X, Plus, Trash2 } from 'lucide-react'
import { QTYPES, DIFFS, diffName } from '../data'

/** Khóa vị trí dùng cho góp ý review: mỗi câu một vị trí */
export const questionAnchor = (q, i) => ({ key: `q:${q.id}`, label: `Câu ${i + 1}: ${(q.q ?? '').slice(0, 80)}` })

function Answer({ q }) {
  if (q.type === 'mc' || q.type === 'mr' || q.type === 'tf') return (
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
            <span className="font-semibold text-ink">Câu {i + 1}</span><span>{QTYPES[q.type] ?? q.type}</span>{q.level && <span>· {diffName(q.level)}</span>}
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

/** Chọn các dạng câu muốn AI soạn; không chọn dạng nào thì AI tự chọn theo mức */
export function TypePicker({ value, onChange }) {
  const toggle = (k) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k])
  return (
    <div className="flex flex-wrap gap-1.5">{Object.entries(QTYPES).map(([k, l]) => { const on = value.includes(k); return (
      <button key={k} type="button" aria-pressed={on} onClick={() => toggle(k)} className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[13px] ${on ? 'border-ink bg-ink text-white' : 'border-line hover:bg-neutral-50'}`}>{on && <Check size={13} />}{l}</button>) })}</div>
  )
}

const cellKey = (c) => `${c.type}:${c.level}`
/** Ô còn trống đầu tiên (dạng × độ khó chưa có trong ma trận) */
const freeCell = (rows) => {
  for (const level of [1, 2, 3]) for (const type of Object.keys(QTYPES)) if (!rows.some((r) => r.type === type && r.level === level)) return { type, level, count: 1 }
  return null
}

/**
 * Ma trận đề: mỗi dòng là một dạng câu ở một độ khó và số câu có trong mỗi lượt thi.
 * have: hàm (dòng) → số câu đã duyệt khớp ô đó, để thấy ô nào còn thiếu câu.
 */
export function MatrixEditor({ value, onChange, have }) {
  const total = value.reduce((s, c) => s + c.count, 0)
  const keys = value.map(cellKey)
  const dup = (c) => keys.filter((k) => k === cellKey(c)).length > 1
  const set = (i, patch) => onChange(value.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  const next = freeCell(value)
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-[14px]">
        <thead className="bg-neutral-50 text-left text-[12px] font-semibold text-neutral-600"><tr><th className="px-3 py-2">Dạng câu</th><th className="px-3 py-2">Độ khó</th><th className="w-[110px] px-3 py-2 text-right">Câu mỗi đề</th>{have && <th className="w-[96px] px-3 py-2 text-right">Đã duyệt</th>}<th className="w-10" /></tr></thead>
        <tbody>{value.map((c, i) => { const n = have?.(c); return (
          <tr key={i} className={`border-t border-line ${dup(c) ? 'bg-red-50' : ''}`}>
            <td className="px-2 py-1.5"><select aria-label="Dạng câu" className="field py-1.5" value={c.type} onChange={(e) => set(i, { type: e.target.value })}>{Object.entries(QTYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
            <td className="px-2 py-1.5"><div className="flex rounded-lg bg-neutral-100 p-0.5 text-[13px]" role="radiogroup" aria-label="Độ khó">{DIFFS.map((d) => <button key={d.v} type="button" role="radio" aria-checked={c.level === d.v} onClick={() => set(i, { level: d.v })} className={`flex-1 whitespace-nowrap rounded-md px-2 py-1 ${c.level === d.v ? 'bg-white font-semibold shadow-card' : 'text-neutral-600'}`}>{d.name}</button>)}</div></td>
            <td className="px-2 py-1.5"><input type="number" aria-label="Câu mỗi đề" min={1} max={20} className="field py-1.5 text-right" value={c.count} onChange={(e) => set(i, { count: Math.max(1, Math.min(20, +e.target.value || 1)) })} /></td>
            {have && <td className={`px-3 py-1.5 text-right ${n < c.count ? 'font-semibold text-amber-700' : 'text-neutral-600'}`}>{n}</td>}
            <td className="px-1 py-1.5"><button type="button" title="Xóa dòng" disabled={value.length < 2} onClick={() => onChange(value.filter((_, j) => j !== i))} className="icon-btn h-8 w-8 disabled:opacity-30"><Trash2 size={15} /></button></td>
          </tr>) })}</tbody>
      </table>
      <div className="flex items-center gap-3 border-t border-line px-3 py-2 text-[13px]">
        <button type="button" disabled={!next} onClick={() => onChange([...value, next])} className="flex items-center gap-1 font-semibold disabled:opacity-40"><Plus size={14} />Thêm dòng</button>
        <div className="flex-1" />
        {keys.length !== new Set(keys).size && <span className="text-red-700">Có dòng trùng dạng câu và độ khó</span>}
        <span className="text-neutral-600">Mỗi lượt thi: <b className="text-ink">{total} câu</b></span>
      </div>
    </div>
  )
}

export const matrixOk = (rows) => rows.length > 0 && new Set(rows.map(cellKey)).size === rows.length
