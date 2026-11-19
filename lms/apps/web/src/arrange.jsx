// Kéo thả dùng chung: ghép cặp, sắp thứ tự, phân loại.
// Hai cách thao tác: kéo thả bằng chuột, hoặc bấm chọn một mục rồi bấm vào chỗ đặt (dùng được trên điện thoại, bàn phím).
// mark (tùy chọn): hiện đúng/sai sau khi kiểm tra.
import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, GripVertical, X } from 'lucide-react'

const chipCls = (on, mark) => `inline-flex max-w-full items-center gap-1.5 rounded-lg border px-3 py-2 text-left text-[14px] leading-snug transition ${
  mark === true ? 'border-emerald-500 bg-emerald-50' : mark === false ? 'border-red-400 bg-red-50' : on ? 'border-brand bg-brand/10 ring-2 ring-brand/30' : 'border-line bg-white hover:border-neutral-400'}`

function Chip({ text, on, mark, disabled, onPick, onDragStart }) {
  return (
    <button type="button" draggable={!disabled} disabled={disabled && mark === undefined} aria-pressed={on}
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', text); onDragStart?.() }} onClick={onPick} className={chipCls(on, mark)}>
      {!disabled && <GripVertical size={14} className="shrink-0 text-neutral-400" />}<span>{text}</span>
      {mark === true && <Check size={15} className="shrink-0 text-emerald-600" />}{mark === false && <X size={15} className="shrink-0 text-red-500" />}
    </button>
  )
}

function Drop({ onDrop, onClick, active, children, className = '' }) {
  const [over, setOver] = useState(false)
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); onDrop(e.dataTransfer.getData('text/plain')) }}
      className={`rounded-xl border-2 border-dashed transition ${over || active ? 'border-brand bg-brand/5' : 'border-line'} ${className}`}>{children}</div>
  )
}

/** Ghép cặp: mỗi vế trái một ô; value = { [chỉ số vế trái]: vế phải } */
export function MatchBoard({ left, opts, value = {}, onChange, disabled, mark }) {
  const [sel, setSel] = useState(null)
  const used = new Set(Object.values(value))
  const put = (i, text) => { if (!text || disabled) return; const v = Object.fromEntries(Object.entries(value).filter(([, t]) => t !== text)); onChange({ ...v, [i]: text }); setSel(null) }
  const take = (i) => { if (disabled) return; const v = { ...value }; delete v[i]; onChange(v) }
  return (
    <div>
      <div className="space-y-2.5">{left.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_1.2fr] items-center gap-3">
          <div className="rounded-lg bg-neutral-100 px-3 py-2.5 text-[14px] font-medium">{l}</div>
          <Drop active={sel != null && !value[i]} onDrop={(t) => put(i, t)} onClick={() => (sel != null ? put(i, sel) : value[i] && take(i))} className="min-h-[46px] p-1">
            {value[i] ? <Chip text={value[i]} disabled={disabled} mark={mark?.[i]} onPick={(e) => { e.stopPropagation(); take(i) }} /> : <span className="block px-2 py-2 text-[13px] text-neutral-400">{sel != null ? 'Bấm để đặt vào đây' : 'Kéo vế phù hợp vào đây'}</span>}
          </Drop>
        </div>))}</div>
      {!disabled && <div className="mt-4 flex flex-wrap gap-2 rounded-xl bg-neutral-50 p-3">{opts.filter((t) => !used.has(t)).map((t) => <Chip key={t} text={t} on={sel === t} onPick={() => setSel(sel === t ? null : t)} />)}{opts.every((t) => used.has(t)) && <span className="text-[13px] text-neutral-500">Đã ghép hết. Bấm vào một vế đã ghép để gỡ ra.</span>}</div>}
    </div>
  )
}

/** Sắp thứ tự: kéo thả hoặc nút lên/xuống; value = mảng theo thứ tự người học xếp */
export function OrderBoard({ opts, value, onChange, disabled, mark }) {
  const list = value?.length === opts.length ? value : opts
  const [drag, setDrag] = useState(null)
  const move = (from, to) => { if (disabled || to < 0 || to >= list.length || from === to) return; const n = [...list]; const [x] = n.splice(from, 1); n.splice(to, 0, x); onChange(n) }
  return (
    <ol className="space-y-2">{list.map((t, i) => (
      <li key={t} draggable={!disabled} onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { move(drag, i); setDrag(null) }}
        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[14px] ${mark?.[i] === true ? 'border-emerald-500 bg-emerald-50' : mark?.[i] === false ? 'border-red-400 bg-red-50' : 'border-line bg-white'} ${!disabled ? 'cursor-grab' : ''}`}>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-neutral-100 text-[12px] font-semibold">{i + 1}</span>
        {!disabled && <GripVertical size={15} className="shrink-0 text-neutral-400" />}<span className="flex-1">{t}</span>
        {!disabled && <><button type="button" aria-label="Lên" disabled={i === 0} onClick={() => move(i, i - 1)} className="icon-btn h-7 w-7 disabled:opacity-30"><ArrowUp size={15} /></button><button type="button" aria-label="Xuống" disabled={i === list.length - 1} onClick={() => move(i, i + 1)} className="icon-btn h-7 w-7 disabled:opacity-30"><ArrowDown size={15} /></button></>}
        {mark?.[i] === true && <Check size={16} className="text-emerald-600" />}{mark?.[i] === false && <X size={16} className="text-red-500" />}
      </li>))}</ol>
  )
}

/** Phân loại: kéo từng mục vào đúng nhóm; value = { [mục]: tên nhóm } */
export function CatBoard({ groups, opts, value = {}, onChange, disabled, mark }) {
  const [sel, setSel] = useState(null)
  const put = (g, t) => { if (!t || disabled) return; onChange({ ...value, [t]: g }); setSel(null) }
  const back = (t) => { if (disabled) return; const v = { ...value }; delete v[t]; onChange(v) }
  const pool = opts.filter((t) => !value[t])
  return (
    <div>
      {!disabled && <Drop onDrop={back} onClick={() => sel && back(sel)} className="mb-3 flex min-h-[54px] flex-wrap gap-2 bg-neutral-50 p-3">
        {pool.map((t) => <Chip key={t} text={t} on={sel === t} onPick={(e) => { e.stopPropagation(); setSel(sel === t ? null : t) }} />)}
        {!pool.length && <span className="text-[13px] text-neutral-500">Đã xếp hết. Kéo một mục về đây để xếp lại.</span>}
      </Drop>}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(groups.length, 3)}, minmax(0, 1fr))` }}>{groups.map((g) => (
        <Drop key={g} active={!!sel} onDrop={(t) => put(g, t)} onClick={() => put(g, sel)} className="min-h-[120px] p-3">
          <div className="mb-2 font-lato text-[15px] font-bold">{g}</div>
          <div className="flex flex-wrap gap-2">{opts.filter((t) => value[t] === g).map((t) => <Chip key={t} text={t} disabled={disabled} mark={mark?.[t]} on={sel === t} onPick={(e) => { e.stopPropagation(); setSel(sel === t ? null : t) }} />)}</div>
        </Drop>))}</div>
    </div>
  )
}

/** Có trả lời đủ chưa (để nhắc trước khi nộp) */
export const arrangeDone = (q, v) => (q.type === 'match' ? Object.keys(v ?? {}).length === q.left.length : q.type === 'cat' ? Object.keys(v ?? {}).length === q.opts.length : Array.isArray(v))
