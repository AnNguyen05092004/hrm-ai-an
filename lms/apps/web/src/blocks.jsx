import { useRef, useState } from 'react'
import { Plus, Minus, RotateCw, AlertTriangle, Check, X, Image as ImageIcon } from 'lucide-react'
import { ImagePicker } from './ImagePicker'
import { CatBoard } from './arrange'
import { Thumb, SrcChip } from './ui'
import { Editable, EditableList, MiniBtn } from './edit'

/** Nút "Đổi ảnh" đặt trên ảnh ở màn soạn */
export function ChangeImage({ value, onPick, className = 'absolute bottom-3 left-3' }) {
  const [o, setO] = useState(false)
  return <>
    <button onClick={() => setO(true)} className={`${className} flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-ink shadow-card hover:bg-white`}><ImageIcon size={14} />Đổi ảnh</button>
    <ImagePicker open={o} value={value} onClose={() => setO(false)} onPick={onPick} />
  </>
}

const Wrap = ({ children, wide }) => <div className={`mx-auto ${wide ? 'max-w-[760px]' : 'max-w-[680px]'} px-6`}>{children}</div>

function Flash({ c }) {
  const [f, setF] = useState(false)
  return (
    <button onClick={() => setF(!f)} className="relative h-48 rounded-md border border-line border-t-4 border-t-brand bg-white p-5 text-left shadow-card">
      <RotateCw size={16} className="absolute right-4 top-4 text-neutral-500" />
      <div className={`mt-6 font-lato ${f ? 'text-[15px] text-neutral-700' : 'text-[19px] font-bold'}`}>{f ? c.b : c.f}</div>
    </button>
  )
}

function Acc({ items }) {
  const [o, setO] = useState(-1)
  return (
    <div className="border border-line">
      {items.map((it, i) => (
        <div key={i} className="border-b border-line last:border-0">
          <button onClick={() => setO(o === i ? -1 : i)} className="flex w-full items-center px-7 py-6 text-left font-lato text-[18px] font-bold">{it.t}<div className="flex-1" />{o === i ? <Minus size={20} /> : <Plus size={20} className="text-neutral-500" />}</button>
          {o === i && <div className="px-7 pb-6 font-serif text-[16px] leading-relaxed text-neutral-700">{it.b}</div>}
        </div>
      ))}
    </div>
  )
}

function Tabs({ items }) {
  const [o, setO] = useState(0)
  const cur = items[o] ?? items[0]
  return (
    <div className="overflow-hidden rounded-md border border-line shadow-card">
      <div role="tablist" className="flex overflow-x-auto border-b border-line bg-neutral-50">{items.map((it, i) => (
        <button key={i} role="tab" aria-selected={o === i} onClick={() => setO(i)} className={`-mb-px shrink-0 border-b-[3px] px-6 py-4 font-lato text-[16px] font-bold ${o === i ? 'border-brand bg-white text-ink' : 'border-transparent text-neutral-500 hover:text-ink'}`}>{it.t}</button>))}</div>
      <div role="tabpanel" className="whitespace-pre-wrap px-7 py-6 font-serif text-[16px] leading-relaxed text-neutral-800">{cur?.b}</div>
    </div>
  )
}

function Timeline({ items }) {
  return (
    <ol className="relative ml-3 border-l-2 border-brand/30">{items.map((it, i) => (
      <li key={i} className="relative pb-8 pl-8 last:pb-0">
        <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-[3px] border-white bg-brand shadow" />
        {it.d && <div className="font-lato text-[13px] font-bold uppercase tracking-wider text-brand">{it.d}</div>}
        <div className="mt-0.5 font-lato text-[19px] font-bold">{it.t}</div>
        {it.b && <p className="mt-1.5 whitespace-pre-wrap font-serif text-[16px] leading-relaxed text-neutral-700">{it.b}</p>}
      </li>))}</ol>
  )
}

/** Ảnh có chú thích: bấm vào điểm trên ảnh để xem giải thích */
function Hotspots({ b }) {
  const [o, setO] = useState(null)
  return (
    <div className="relative">
      <Thumb img={b.img} className="aspect-[16/10] rounded-md">{(b.spots ?? []).map((sp, i) => (
        <button key={i} onClick={() => setO(o === i ? null : i)} aria-label={sp.t} style={{ left: `${sp.x}%`, top: `${sp.y}%` }} className="absolute -translate-x-1/2 -translate-y-1/2">
          <span className={`grid h-9 w-9 place-items-center rounded-full border-[3px] border-white font-lato text-[14px] font-bold text-white shadow-pop transition ${o === i ? 'scale-110 bg-ink' : 'bg-brand'}`}>{o === i ? <X size={15} /> : i + 1}</span>
          {o !== i && <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-brand/40" />}
        </button>))}
        {o != null && b.spots[o] && <div className="fade absolute z-10 w-[300px] rounded-xl bg-white p-4 text-left shadow-pop" style={{ left: `min(max(${b.spots[o].x}% - 150px, 12px), calc(100% - 312px))`, top: `calc(${b.spots[o].y}% + 26px)` }}>
          <div className="font-lato text-[16px] font-bold">{b.spots[o].t}</div><p className="mt-1 font-serif text-[14px] leading-relaxed text-neutral-700">{b.spots[o].b}</p></div>}
      </Thumb>
      <p className="mt-2 text-[13px] text-neutral-500">Bấm vào các điểm đánh số trên ảnh để xem giải thích.</p>
    </div>
  )
}

/** Soạn ảnh có chú thích: bấm lên ảnh để thêm điểm, kéo điểm để di chuyển */
function HotspotEdit({ b, onChange }) {
  const box = useRef()
  const [drag, setDrag] = useState(null)
  const spots = b.spots ?? []
  const set = (xs) => onChange({ ...b, spots: xs })
  const pos = (e) => { const r = box.current.getBoundingClientRect(); return { x: Math.round(Math.min(97, Math.max(3, ((e.clientX - r.left) / r.width) * 100))), y: Math.round(Math.min(95, Math.max(5, ((e.clientY - r.top) / r.height) * 100))) } }
  return (
    <div>
      <div ref={box} className="relative cursor-crosshair" onClick={(e) => { if (e.target.closest('[data-spot],button')) return; set([...spots, { ...pos(e), t: '', b: '' }]) }}
        onPointerMove={(e) => drag != null && set(spots.map((sp, i) => (i === drag ? { ...sp, ...pos(e) } : sp)))} onPointerUp={() => setDrag(null)}>
        <Thumb img={b.img} className="aspect-[16/10] rounded-md">
          {spots.map((sp, i) => <span key={i} data-spot onPointerDown={(e) => { e.preventDefault(); setDrag(i) }} style={{ left: `${sp.x}%`, top: `${sp.y}%` }} className="absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-move touch-none place-items-center rounded-full border-[3px] border-white bg-brand font-lato text-[14px] font-bold text-white shadow-pop">{i + 1}</span>)}
          <ChangeImage value={b.img} onPick={(v) => onChange({ ...b, img: v })} />
        </Thumb>
      </div>
      <p className="mt-2 text-[13px] text-neutral-500">Bấm lên ảnh để thêm điểm, kéo điểm để đổi vị trí.</p>
      <div className="mt-3 space-y-2">{spots.map((sp, i) => (
        <div key={i} className="group/s flex gap-3 rounded-md border border-line p-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand font-lato text-[13px] font-bold text-white">{i + 1}</span>
          <div className="flex-1"><div className="font-lato font-bold"><Editable value={sp.t} className="block" placeholder="Tên điểm" onChange={(v) => set(spots.map((x, j) => (j === i ? { ...x, t: v } : x)))} /></div>
            <div className="mt-1 font-serif text-[14px] text-neutral-700"><Editable value={sp.b} className="block" multiline placeholder="Giải thích khi người học bấm vào" onChange={(v) => set(spots.map((x, j) => (j === i ? { ...x, b: v } : x)))} /></div></div>
          <button onClick={() => set(spots.filter((_, j) => j !== i))} className="self-start text-neutral-400 opacity-0 hover:text-red-600 group-hover/s:opacity-100" title="Xóa điểm"><X size={15} /></button>
        </div>))}{!spots.length && <p className="text-[14px] text-neutral-500">Chưa có điểm nào.</p>}</div>
    </div>
  )
}

/** Luyện tập kéo thả mục vào nhóm, có kiểm tra ngay */
function Sorting({ b }) {
  const groups = (b.groups ?? []).map((g) => g.name)
  const [opts] = useState(() => shuffleOnce((b.groups ?? []).flatMap((g) => g.items ?? [])))
  const [v, setV] = useState({})
  const [checked, setChecked] = useState(false)
  const owner = Object.fromEntries((b.groups ?? []).flatMap((g) => (g.items ?? []).map((x) => [x, g.name])))
  const mark = checked ? Object.fromEntries(opts.map((x) => [x, v[x] === owner[x]])) : undefined
  const right = opts.filter((x) => v[x] === owner[x]).length
  return (
    <div className="rounded-md bg-neutral-50 p-6 shadow-card">
      <div className="mb-4 text-[12px] font-bold uppercase tracking-wider text-neutral-500">Luyện tập · kéo mỗi mục vào đúng nhóm</div>
      <CatBoard groups={groups} opts={opts} value={v} onChange={(x) => { setV(x); setChecked(false) }} disabled={checked} mark={mark} />
      <div className="mt-4 flex items-center gap-4">
        {!checked ? <button disabled={Object.keys(v).length < opts.length} onClick={() => setChecked(true)} className="rounded-full bg-brand px-8 py-2.5 font-lato text-[14px] font-bold text-white disabled:opacity-40">Kiểm tra</button>
          : <><span className={`font-serif text-[15px] ${right === opts.length ? 'text-emerald-700' : 'text-red-600'}`}>{right === opts.length ? 'Chính xác, bạn xếp đúng tất cả!' : `Đúng ${right}/${opts.length} mục. Xem các mục đánh dấu đỏ rồi thử lại.`}</span>{right < opts.length && <button onClick={() => { setChecked(false); setV(Object.fromEntries(Object.entries(v).filter(([x, g]) => owner[x] === g))) }} className="rounded-full border-2 border-ink px-6 py-2 font-lato text-[14px] font-bold">Thử lại</button>}</>}
      </div>
    </div>
  )
}
const shuffleOnce = (xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

function KC({ b }) {
  const [pick, setPick] = useState(null)
  const [done, setDone] = useState(false)
  return (
    <div className="rounded-md bg-neutral-50 p-8 shadow-card">
      <div className="text-[12px] font-bold uppercase tracking-wider text-neutral-500">Câu hỏi kiểm tra nhanh</div>
      <div className="mt-3 font-lato text-[20px] font-bold">{b.q}</div>
      <div className="mt-5 space-y-2.5">{b.choices.map((c, i) => (
        <button key={i} disabled={done} onClick={() => setPick(i)} className={`flex w-full items-center gap-3 rounded-md border bg-white px-4 py-3.5 text-left font-serif text-[15px] ${pick === i ? 'border-brand' : 'border-line'}`}>
          <span className={`h-4 w-4 rounded-full border-2 ${pick === i ? 'border-brand bg-brand' : 'border-neutral-400'}`} />{c}
          {done && i === b.correct && <Check size={18} className="ml-auto text-emerald-600" />}
          {done && pick === i && i !== b.correct && <X size={18} className="ml-auto text-red-500" />}
        </button>))}</div>
      <button disabled={pick === null || done} onClick={() => setDone(true)} className="mt-5 rounded-full bg-brand px-8 py-2.5 font-lato text-[14px] font-bold text-white disabled:opacity-40">Nộp</button>
      {done && <div className={`mt-4 font-serif text-[15px] ${pick === b.correct ? 'text-emerald-700' : 'text-red-600'}`}>{pick === b.correct ? 'Chính xác!' : 'Chưa đúng. Xem lại phần Hệ thống file tạm và volume lưu bền.'}</div>}
    </div>
  )
}

// Màn soạn (editor + onChange): mọi chữ trong khối sửa tại chỗ. Màn xem: hiển thị như người học thấy.
export function BlockView({ b, editor, onChange }) {
  const ed = editor && onChange
  const set = (k, v) => onChange({ ...b, [k]: v })
  const E = (k, cls, ph, multi) => ed ? <Editable value={b[k]} onChange={(v) => set(k, v)} className={cls} placeholder={ph} multiline={multi} /> : <span className={cls}>{b[k]}</span>
  const src = editor && b.src && <div className="mt-3"><SrcChip src={b.src} /></div>
  const add = (label, fn) => ed && <MiniBtn onClick={fn} className="mt-3"><Plus size={13} />{label}</MiniBtn>
  switch (b.t) {
    case 'image': return <figure><Thumb img={b.img} className="h-[380px]">{ed && <ChangeImage value={b.img} onPick={(v) => set('img', v)} />}</Thumb>
      {(editor || b.cap) && <figcaption className="mx-auto max-w-[680px] px-6 pt-3"><div className="border-b border-line pb-2 font-serif text-[14px] text-neutral-600">{E('cap', 'block', 'Nhập chú thích ảnh')}</div></figcaption>}</figure>
    case 'para': case 'text': return <Wrap><p className="font-serif text-[17px] leading-[1.9] text-neutral-800">{E('p', 'block', 'Nhập đoạn văn', true)}</p>{src}</Wrap>
    case 'heading': return <Wrap><h2 className="font-lato text-[30px] font-bold leading-tight">{E('h', 'block', 'Tiêu đề')}</h2><p className="mt-3 font-serif text-[17px] leading-[1.9] text-neutral-800">{E('p', 'block', 'Nhập đoạn văn', true)}</p>{src}</Wrap>
    case 'list': return <Wrap>{(b.intro || ed) && <p className="font-serif text-[17px]">{E('intro', 'block', 'Câu dẫn (có thể để trống)')}</p>}<ul className="mt-6 space-y-6">
      {ed ? <EditableList items={b.items} onChange={(v) => set('items', v)} render={(el) => <li className="flex gap-16 font-serif text-[17px] leading-relaxed"><span className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" /><span className="flex-1">{el}</span></li>} itemClass="block" />
        : b.items.map((x, i) => <li key={i} className="flex gap-16 font-serif text-[17px] leading-relaxed"><span className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />{x}</li>)}</ul>{src}</Wrap>
    case 'flash': return <Wrap wide><h2 className="font-lato text-[30px] font-bold">{E('h', 'block', 'Tiêu đề')}</h2><p className="mt-2 font-serif text-[17px] text-neutral-700">{E('p', 'block', 'Mô tả ngắn', true)}</p>
      <div className="mt-6 grid grid-cols-3 gap-6">{b.cards.map((c, i) => ed ? (
        <div key={i} className="group/c relative min-h-48 rounded-md border border-line border-t-4 border-t-brand bg-white p-5 shadow-card">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Mặt trước</div>
          <div className="mt-1 font-lato text-[18px] font-bold"><Editable value={c.f} className="block" placeholder="Mặt trước" onChange={(v) => set('cards', b.cards.map((x, j) => (j === i ? { ...x, f: v } : x)))} /></div>
          <div className="mt-3 border-t border-dashed border-line pt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Mặt sau</div>
          <div className="mt-1 font-lato text-[14px] text-neutral-700"><Editable value={c.b} className="block" multiline placeholder="Mặt sau" onChange={(v) => set('cards', b.cards.map((x, j) => (j === i ? { ...x, b: v } : x)))} /></div>
          {b.cards.length > 1 && <button onClick={() => set('cards', b.cards.filter((_, j) => j !== i))} className="absolute right-2 top-2 rounded p-1 text-neutral-400 opacity-0 hover:bg-neutral-100 group-hover/c:opacity-100" title="Xóa thẻ"><X size={14} /></button>}
        </div>) : <Flash key={i} c={c} />)}</div>
      {add('Thêm thẻ', () => set('cards', [...b.cards, { f: '', b: '' }]))}{src}</Wrap>
    case 'accordion': return <Wrap><h2 className="font-lato text-[30px] font-bold">{E('h', 'block', 'Tiêu đề')}</h2><p className="mb-6 mt-3 font-serif text-[17px] leading-[1.9] text-neutral-800">{E('p', 'block', 'Mô tả', true)}</p>
      {ed ? <div className="border border-line">{b.items.map((it, i) => (
        <div key={i} className="border-b border-line px-7 py-5 last:border-0">
          <div className="font-lato text-[18px] font-bold"><Editable value={it.t} className="block" placeholder="Tiêu đề mục" onChange={(v) => set('items', b.items.map((x, j) => (j === i ? { ...x, t: v } : x)))} /></div>
          <div className="mt-2 font-serif text-[16px] leading-relaxed text-neutral-700"><Editable value={it.b} className="block" multiline placeholder="Nội dung mục" onChange={(v) => set('items', b.items.map((x, j) => (j === i ? { ...x, b: v } : x)))} /></div>
        </div>))}</div> : <Acc items={b.items} />}
      {add('Thêm mục', () => set('items', [...b.items, { t: '', b: '' }]))}{src}</Wrap>
    case 'kc': return <Wrap>{ed ? (
      <div className="rounded-md bg-neutral-50 p-8 shadow-card">
        <div className="text-[12px] font-bold uppercase tracking-wider text-neutral-500">Câu hỏi kiểm tra nhanh · bấm vòng tròn để chọn đáp án đúng</div>
        <div className="mt-3 font-lato text-[20px] font-bold"><Editable value={b.q} className="block" placeholder="Câu hỏi" onChange={(v) => set('q', v)} /></div>
        <div className="mt-5 space-y-2.5">{b.choices.map((c, i) => (
          <div key={i} className={`group/o flex items-center gap-3 rounded-md border bg-white px-4 py-3.5 font-serif text-[15px] ${i === b.correct ? 'border-emerald-500' : 'border-line'}`}>
            <button onClick={() => set('correct', i)} title="Đặt làm đáp án đúng" className={`h-4 w-4 shrink-0 rounded-full border-2 ${i === b.correct ? 'border-emerald-600 bg-emerald-500' : 'border-neutral-400'}`} />
            <Editable value={c} className="block flex-1" placeholder={`Lựa chọn ${i + 1}`} onChange={(v) => set('choices', b.choices.map((x, j) => (j === i ? v : x)))} />
            {b.choices.length > 2 && <button onClick={() => onChange({ ...b, choices: b.choices.filter((_, j) => j !== i), correct: b.correct > i ? b.correct - 1 : b.correct === i ? 0 : b.correct })} className="text-neutral-400 opacity-0 group-hover/o:opacity-100" title="Xóa lựa chọn"><X size={15} /></button>}
          </div>))}</div>
        {add('Thêm lựa chọn', () => set('choices', [...b.choices, '']))}
      </div>) : <KC b={b} />}</Wrap>
    case 'table': return <Wrap><table className="w-full overflow-hidden rounded-md text-left font-serif text-[15px] shadow-card"><thead className="bg-brand font-lato text-white"><tr>{b.head.map((h, j) => <th key={j} className="px-4 py-3">{ed ? <Editable value={h} className="block" placeholder="Cột" onChange={(v) => set('head', b.head.map((x, k) => (k === j ? v : x)))} /> : h}</th>)}</tr></thead>
      <tbody>{b.rows.map((r, i) => <tr key={i} className="group/r border-t border-line">{r.map((c, j) => <td key={j} className="relative px-4 py-3">{ed ? <Editable value={c} className="block" placeholder="…" onChange={(v) => set('rows', b.rows.map((x, k) => (k === i ? x.map((y, m) => (m === j ? v : y)) : x)))} /> : c}
        {ed && j === r.length - 1 && b.rows.length > 1 && <button onClick={() => set('rows', b.rows.filter((_, k) => k !== i))} className="absolute -right-7 top-3 text-neutral-400 opacity-0 group-hover/r:opacity-100" title="Xóa dòng"><X size={15} /></button>}</td>)}</tr>)}</tbody></table>
      {add('Thêm dòng', () => set('rows', [...b.rows, b.head.map(() => '')]))}{src}</Wrap>
    case 'code': return <Wrap><div className="mb-3 font-lato text-[20px] font-bold">{E('h', 'block', 'Tiêu đề')}</div><pre className="overflow-x-auto rounded-md bg-[#1e1e2e] p-5 font-mono text-[14px] leading-relaxed text-[#e5e7eb]">{E('code', 'block', 'Mã nguồn', true)}</pre>{src}</Wrap>
    case 'process': return <Wrap><h2 className="font-lato text-[30px] font-bold">{E('h', 'block', 'Tiêu đề')}</h2><div className="mt-6 space-y-3">
      {ed ? <EditableList items={b.steps.map((x) => (typeof x === 'string' ? x : x.t))} onChange={(v) => set('steps', v)} placeholder="Bước" itemClass="block flex-1" render={(el, i) => <div className="flex items-center gap-4 rounded-md border border-line p-4 font-serif text-[16px]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand font-lato font-bold text-white">{i + 1}</span>{el}</div>} />
        : b.steps.map((s, i) => <div key={i} className="flex items-center gap-4 rounded-md border border-line p-4 font-serif text-[16px]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand font-lato font-bold text-white">{i + 1}</span>{typeof s === 'string' ? s : s.t}</div>)}</div>{src}</Wrap>
    case 'tabs': return <Wrap wide><h2 className="font-lato text-[30px] font-bold">{E('h', 'block', 'Tiêu đề')}</h2>{(b.p || ed) ? <p className="mb-6 mt-3 font-serif text-[17px] leading-[1.9] text-neutral-800">{E('p', 'block', 'Mô tả (tùy chọn)', true)}</p> : <div className="mb-6" />}
      {ed ? <div className="space-y-3">{b.items.map((it, i) => (
        <div key={i} className="group/t relative rounded-md border border-line p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Tab {i + 1}</div>
          <div className="mt-1 font-lato text-[17px] font-bold"><Editable value={it.t} className="block" placeholder="Tên tab" onChange={(v) => set('items', b.items.map((x, j) => (j === i ? { ...x, t: v } : x)))} /></div>
          <div className="mt-2 font-serif text-[15px] text-neutral-700"><Editable value={it.b} className="block" multiline placeholder="Nội dung tab" onChange={(v) => set('items', b.items.map((x, j) => (j === i ? { ...x, b: v } : x)))} /></div>
          {b.items.length > 2 && <button onClick={() => set('items', b.items.filter((_, j) => j !== i))} className="absolute right-2 top-2 rounded p-1 text-neutral-400 opacity-0 hover:bg-neutral-100 group-hover/t:opacity-100" title="Xóa tab"><X size={14} /></button>}
        </div>))}</div> : <Tabs items={b.items} />}
      {b.items.length < 6 && add('Thêm tab', () => set('items', [...b.items, { t: '', b: '' }]))}{src}</Wrap>
    case 'timeline': return <Wrap><h2 className="mb-8 font-lato text-[30px] font-bold">{E('h', 'block', 'Tiêu đề')}</h2>
      {ed ? <div className="space-y-3">{b.items.map((it, i) => (
        <div key={i} className="group/t relative grid grid-cols-[140px_1fr] gap-4 rounded-md border border-line p-4">
          <div className="font-lato text-[13px] font-bold uppercase tracking-wider text-brand"><Editable value={it.d} className="block" placeholder="Mốc (năm, bước…)" onChange={(v) => set('items', b.items.map((x, j) => (j === i ? { ...x, d: v } : x)))} /></div>
          <div><div className="font-lato text-[17px] font-bold"><Editable value={it.t} className="block" placeholder="Tiêu đề" onChange={(v) => set('items', b.items.map((x, j) => (j === i ? { ...x, t: v } : x)))} /></div>
            <div className="mt-1 font-serif text-[15px] text-neutral-700"><Editable value={it.b} className="block" multiline placeholder="Mô tả" onChange={(v) => set('items', b.items.map((x, j) => (j === i ? { ...x, b: v } : x)))} /></div></div>
          {b.items.length > 2 && <button onClick={() => set('items', b.items.filter((_, j) => j !== i))} className="absolute right-2 top-2 rounded p-1 text-neutral-400 opacity-0 hover:bg-neutral-100 group-hover/t:opacity-100" title="Xóa mốc"><X size={14} /></button>}
        </div>))}</div> : <Timeline items={b.items} />}
      {add('Thêm mốc', () => set('items', [...b.items, { d: '', t: '', b: '' }]))}{src}</Wrap>
    case 'hotspot': return <Wrap wide><h2 className="font-lato text-[30px] font-bold">{E('h', 'block', 'Tiêu đề')}</h2>{(b.p || ed) ? <p className="mb-6 mt-3 font-serif text-[17px] leading-[1.9] text-neutral-800">{E('p', 'block', 'Mô tả (tùy chọn)', true)}</p> : <div className="mb-6" />}
      {ed ? <HotspotEdit b={b} onChange={onChange} /> : <Hotspots b={b} />}{src}</Wrap>
    case 'sorting': return <Wrap wide><h2 className="font-lato text-[30px] font-bold">{E('h', 'block', 'Tiêu đề')}</h2>{(b.p || ed) ? <p className="mb-6 mt-3 font-serif text-[17px] leading-[1.9] text-neutral-800">{E('p', 'block', 'Mô tả (tùy chọn)', true)}</p> : <div className="mb-6" />}
      {ed ? <div className="rounded-md bg-neutral-50 p-5 shadow-card"><div className="mb-3 text-[12px] font-bold uppercase tracking-wider text-neutral-500">Luyện tập kéo thả · nhập nhóm và mục đúng, người học thấy các mục trộn lẫn</div>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(b.groups.length, 3)}, minmax(0, 1fr))` }}>{b.groups.map((g, gi) => (
          <div key={gi} className="rounded-lg border border-line bg-white p-3">
            <div className="flex items-center gap-2 font-lato font-bold"><Editable value={g.name} className="block flex-1" placeholder="Tên nhóm" onChange={(v) => set('groups', b.groups.map((x, j) => (j === gi ? { ...x, name: v } : x)))} />{b.groups.length > 2 && <button title="Xóa nhóm" onClick={() => set('groups', b.groups.filter((_, j) => j !== gi))} className="text-neutral-400 hover:text-red-600"><X size={14} /></button>}</div>
            <EditableList items={g.items?.length ? g.items : ['']} placeholder="Mục thuộc nhóm" itemClass="block flex-1" onChange={(v) => set('groups', b.groups.map((x, j) => (j === gi ? { ...x, items: v } : x)))} render={(el) => <div className="mt-2 flex rounded-md border border-line px-2 py-1.5 font-serif text-[14px]">{el}</div>} />
          </div>))}</div>
        {b.groups.length < 4 && add('Thêm nhóm', () => set('groups', [...b.groups, { name: `Nhóm ${b.groups.length + 1}`, items: [''] }]))}</div> : <Sorting b={b} />}{src}</Wrap>
    case 'gap': return editor ? <Wrap><div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-[14px]"><AlertTriangle size={18} className="shrink-0 text-amber-600" /><div><b>Thiếu căn cứ trong tài liệu nguồn.</b> {b.p}</div></div></Wrap> : null
    default: return null
  }
}
