// Slide: hiển thị theo bố cục + định dạng tự do (di chuyển, cỡ chữ, màu, đậm/nghiêng, căn lề, hộp chữ, màu nền).
// Định dạng lưu trong slide: st[phần] = { x, y, size, color, b, i, align }, boxes[], bg. Video dựng (render.ts) đọc cùng dữ liệu này.
import { Fragment, createContext, useContext, useEffect, useState } from 'react'
import { Move, Plus, Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Minus, RotateCcw, Trash2, Copy, Sparkles, PaintBucket, X, Image as ImageIcon } from 'lucide-react'
import { ImagePicker } from '../ImagePicker'
import { uid, useStore } from '../store'
import { Thumb, Tip, Spinner } from '../ui'
import { Editable, EditableList } from '../edit'
import { post } from '../api'

// Kích thước theo bề ngang khung (cqw) nên cùng một slide hiển thị đẹp ở ảnh nhỏ, trình chiếu và video
const u = (px) => `${(px / 9.6).toFixed(3)}cqw`
const Ctx = createContext(null)

const TEXT_COLORS = ['#111827', '#ffffff', '#ff6119', '#dc2626', '#16a34a', '#2563eb', '#7c3aed', '#6b7280']
const BG_COLORS = ['#ffffff', '#fff7ed', '#f1f5f9', '#ecfeff', '#fef9c3', '#111827', '#1e3a8a', '#ff6119']
const BOLD_DEFAULT = { kicker: true, title: true }
const PART_NAMES = { kicker: 'Nhãn nhỏ', title: 'Tiêu đề', sub: 'Phụ đề', body: 'Nội dung' }
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

/** Kéo bằng con trỏ, trả về độ dời theo % khung slide */
function useDrag(onEnd) {
  const [d, setD] = useState(null)
  const start = (e, mode = 'move') => {
    e.preventDefault(); e.stopPropagation()
    const box = e.currentTarget.closest('[data-slide]').getBoundingClientRect()
    const x0 = e.clientX, y0 = e.clientY
    const calc = (ev) => ({ x: ((ev.clientX - x0) / box.width) * 100, y: ((ev.clientY - y0) / box.height) * 100, mode })
    const mv = (ev) => setD(calc(ev))
    const up = (ev) => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); setD(null); const r = calc(ev); if (Math.abs(r.x) + Math.abs(r.y) > 0.2) onEnd(r) }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up)
  }
  return [d, start]
}

const Handle = ({ onPointerDown, className = '', title = 'Kéo để di chuyển', children }) => (
  <span onPointerDown={onPointerDown} title={title} className={`absolute z-10 grid h-6 w-6 cursor-move touch-none place-items-center rounded-full bg-sky-500 text-white shadow ${className}`}>{children ?? <Move size={13} />}</span>
)

const fmtClass = (st, k) => {
  const b = st.b ?? BOLD_DEFAULT[k]
  return `${st.color ? 'fx-color' : ''} ${st.b === undefined ? '' : b ? 'fx-bold' : 'fx-normal'} ${st.i ? 'fx-italic' : ''} ${st.align ? `fx-${st.align}` : ''}`
}

/** Một phần của bố cục (nhãn, tiêu đề, phụ đề, nội dung) có thể chọn, kéo và định dạng */
function Part({ k, s, className = '', style, children }) {
  const ctx = useContext(Ctx)
  const st = s.st?.[k] ?? {}
  const [d, start] = useDrag((r) => ctx.setSt(k, { x: clamp((st.x ?? 0) + r.x, -100, 100), y: clamp((st.y ?? 0) + r.y, -100, 100) }))
  const x = (st.x ?? 0) + (d?.x ?? 0), y = (st.y ?? 0) + (d?.y ?? 0)
  const on = ctx?.sel === k
  return (
    <div data-part className={`relative ${on ? 'outline-dashed outline-2 outline-offset-4 outline-sky-400' : ''} ${className}`}
      style={{ ...style, transform: x || y ? `translate(${x}cqw, ${(y * 0.5625).toFixed(3)}cqw)` : undefined }}
      onPointerDownCapture={ctx ? () => ctx.onSel(k) : undefined}>
      <div className={fmtClass(st, k)} style={{ zoom: st.size ?? 1, '--fx-c': st.color }}>{children}</div>
      {on && <Handle className="-left-3 -top-3" onPointerDown={start} />}
    </div>
  )
}

/** Hộp chữ đặt tự do trên slide */
function Box({ b }) {
  const ctx = useContext(Ctx)
  const k = `box:${b.id}`
  const [d, start] = useDrag((r) => ctx.setSt(k, r.mode === 'size' ? { w: clamp(b.w + r.x, 8, 100) } : { x: clamp(b.x + r.x, -5, 95), y: clamp(b.y + r.y, -5, 95) }))
  const on = ctx?.sel === k
  const moving = d?.mode === 'move'
  return (
    <div data-part className={`absolute ${on ? 'outline-dashed outline-2 outline-offset-2 outline-sky-400' : ''}`}
      style={{ left: `${b.x + (moving ? d.x : 0)}%`, top: `${b.y + (moving ? d.y : 0)}%`, width: `${clamp(b.w + (d?.mode === 'size' ? d.x : 0), 8, 100)}%`, background: b.fill || undefined, padding: b.fill ? u(10) : 0, borderRadius: u(6) }}
      onPointerDownCapture={ctx ? () => ctx.onSel(k) : undefined}>
      <div className={`font-serif leading-snug text-neutral-800 ${fmtClass(b, 'box')}`} style={{ fontSize: u(22 * (b.size ?? 1)), '--fx-c': b.color }}>
        {ctx?.edit ? <Editable value={b.text} multiline className="block" placeholder="Nhập chữ" onChange={(v) => ctx.setSt(k, { text: v })} /> : <span className="whitespace-pre-wrap">{b.text}</span>}
      </div>
      {on && <><Handle className="-left-3 -top-3" onPointerDown={(e) => start(e, 'move')} /><Handle className="-right-3 top-1/2 -translate-y-1/2 !cursor-ew-resize" title="Kéo để đổi bề ngang" onPointerDown={(e) => start(e, 'size')}><span className="text-[11px] font-bold">↔</span></Handle></>}
    </div>
  )
}

/** sel/onSel/setSt có thì slide ở chế độ định dạng; onEdit có thì chữ sửa tại chỗ */
export function Slide({ s, n, total, onEdit, sel, onSel, setSt }) {
  const ctx = onSel ? { sel, onSel, setSt, edit: !!onEdit } : null
  return (
    <Ctx.Provider value={ctx}>
      <div data-slide className="relative h-full w-full" style={{ containerType: 'inline-size' }}
        onPointerDown={ctx ? (e) => { if (!e.target.closest('[data-part]')) onSel(null) } : undefined}>
        <SlideBody s={s} n={n} total={total} onEdit={onEdit} />
        {(s.boxes ?? []).map((b) => <Box key={b.id} b={b} />)}
      </div>
    </Ctx.Provider>
  )
}

function SlideBody({ s, n, total, onEdit }) {
  const T = (k, ph, multi) => onEdit ? <Editable value={s[k] || ''} onChange={(v) => onEdit({ [k]: v })} className="block" placeholder={ph} multiline={multi} /> : s[k]
  const L = (k, render, ph = 'Nhập ý') => onEdit ? <EditableList items={s[k]?.length ? s[k] : ['']} onChange={(v) => onEdit({ [k]: v })} placeholder={ph} itemClass="block flex-1" render={render} /> : (s[k] || []).map((x, i) => <Fragment key={i}>{render(x, i)}</Fragment>)
  const cell = (path, v, ph) => onEdit ? <Editable value={v} className="block" placeholder={ph} onChange={(nv) => onEdit(path(nv))} /> : v
  const P = (k, props, child) => <Part k={k} s={s} {...props}>{child}</Part>
  if (s.layout === 'cover') {
    const inner = (
      <div className="absolute inset-y-0 left-0 flex max-w-[78%] flex-col justify-end text-white" style={{ padding: `${u(56)} ${u(60)}` }}>
        {(s.kicker || onEdit) && P('kicker', { className: 'font-lato font-bold uppercase text-white/80', style: { fontSize: u(13), letterSpacing: '0.14em' } }, T('kicker', 'Nhãn nhỏ (tùy chọn)'))}
        {P('title', { className: 'font-lato font-black leading-[1.08]', style: { fontSize: u(46), marginTop: u(10) } }, T('title', 'Tiêu đề'))}
        {(s.sub || onEdit) && P('sub', { className: 'font-serif opacity-85', style: { fontSize: u(19), marginTop: u(14) } }, T('sub', 'Phụ đề (tùy chọn)'))}
        <div className="bg-brand" style={{ width: u(64), height: u(5), marginTop: u(26) }} />
      </div>
    )
    return s.bg ? <div className="relative h-full overflow-hidden" style={{ background: s.bg }}>{inner}</div>
      : <Thumb img={s.img || 'desk'} className="h-full"><div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/60 to-slate-900/10" />{inner}</Thumb>
  }
  return (
    <div className="relative flex h-full flex-col overflow-hidden" style={{ padding: `${u(46)} ${u(60)} ${u(54)} ${u(64)}`, background: s.bg || '#fff' }}>
      <div className="absolute inset-y-0 left-0 bg-brand" style={{ width: u(8) }} />
      {(s.kicker || onEdit) && P('kicker', { className: 'font-lato font-bold uppercase text-brand', style: { fontSize: u(12), letterSpacing: '0.14em' } }, T('kicker', 'Nhãn nhỏ (tùy chọn)'))}
      {P('title', { className: 'font-lato font-bold leading-tight text-ink', style: { fontSize: u(32) } }, T('title', 'Tiêu đề slide'))}
      <div className="flex flex-1 flex-col justify-center" style={{ paddingBottom: u(10) }}>{P('body', {}, <>
        {s.layout === 'bullets' && L('items', (x, i) => <div className="flex items-center font-serif text-neutral-800" style={{ fontSize: u(20), gap: u(16), marginBottom: u(16) }}><span className="grid shrink-0 place-items-center rounded-full bg-brand/10 font-lato font-bold text-brand" style={{ width: u(34), height: u(34), fontSize: u(15) }}>{i + 1}</span>{x}</div>)}
        {s.layout === 'steps' && <div className="flex" style={{ gap: u(14) }}>{L('items', (x, i) => <div className="flex-1 rounded-lg border border-brand/30 bg-brand/5" style={{ padding: u(18) }}><div className="font-lato font-black text-brand" style={{ fontSize: u(34) }}>{String(i + 1).padStart(2, '0')}</div><div className="font-serif text-neutral-800" style={{ fontSize: u(16), marginTop: u(8) }}>{x}</div></div>, 'Bước')}</div>}
        {s.layout === 'two' && <div className="grid grid-cols-2" style={{ gap: u(18) }}>{(s.cols || [[''], ['']]).map((c, ci) => <div key={ci} className={`rounded-lg ${ci ? 'bg-slate-50' : 'bg-brand/5'}`} style={{ padding: u(22) }}><div className={`font-lato font-bold ${ci ? 'text-slate-700' : 'text-brand'}`} style={{ fontSize: u(20) }}>{cell((v) => ({ cols: s.cols.map((cc, j) => (j === ci ? [v, ...cc.slice(1)] : cc)) }), c[0], 'Tiêu đề cột')}</div>
          {onEdit ? <EditableList items={c.slice(1).length ? c.slice(1) : ['']} onChange={(v) => onEdit({ cols: s.cols.map((cc, j) => (j === ci ? [cc[0], ...v] : cc)) })} itemClass="block flex-1" render={(el) => <div className="flex font-serif text-neutral-800" style={{ fontSize: u(16), marginTop: u(10), gap: u(6) }}>·{el}</div>} /> : c.slice(1).map((x, i) => <div key={i} className="font-serif text-neutral-800" style={{ fontSize: u(16), marginTop: u(10) }}>· {x}</div>)}</div>)}</div>}
        {s.layout === 'table' && <table className="w-full overflow-hidden rounded-lg font-serif" style={{ fontSize: u(15) }}><thead className="bg-ink font-lato text-white"><tr>{s.head.map((h, j) => <th key={j} className="text-left font-semibold" style={{ padding: `${u(10)} ${u(14)}` }}>{cell((v) => ({ head: s.head.map((x, k) => (k === j ? v : x)) }), h, 'Cột')}</th>)}</tr></thead><tbody>{s.rows.map((r, i) => <tr key={i} className={i % 2 ? 'bg-neutral-50' : 'bg-white'}>{r.map((c, j) => <td key={j} className={j === 0 ? 'font-semibold' : ''} style={{ padding: `${u(10)} ${u(14)}` }}>{cell((v) => ({ rows: s.rows.map((x, k) => (k === i ? x.map((y, m) => (m === j ? v : y)) : x)) }), c, '…')}</td>)}</tr>)}</tbody></table>}
        {s.layout === 'stat' && <div className="grid" style={{ gridTemplateColumns: `repeat(${s.stats.length}, 1fr)`, gap: u(24), marginTop: u(20) }}>{s.stats.map(([v, l], i) => <div key={i} className="border-t-4 border-brand" style={{ paddingTop: u(16) }}><div className="font-lato font-black leading-none text-ink" style={{ fontSize: u(56) }}>{cell((nv) => ({ stats: s.stats.map((x, k) => (k === i ? [nv, x[1]] : x)) }), v, 'Số')}</div><div className="font-serif text-neutral-600" style={{ fontSize: u(15), marginTop: u(12) }}>{cell((nv) => ({ stats: s.stats.map((x, k) => (k === i ? [x[0], nv] : x)) }), l, 'Mô tả')}</div></div>)}</div>}
        {s.layout === 'quote' && <div className="relative" style={{ paddingLeft: u(56), marginTop: u(10) }}><div className="absolute left-0 font-serif leading-none text-brand/40" style={{ fontSize: u(110), top: u(-20) }}>“</div><div className="font-serif italic leading-snug text-neutral-800" style={{ fontSize: u(28) }}>{T('quote', 'Câu trích dẫn', true)}</div><div className="flex font-lato font-semibold text-neutral-500" style={{ fontSize: u(15), marginTop: u(20), gap: u(6) }}>—{T('by', 'Người nói')}</div></div>}
        {s.layout === 'image' && <div className="grid grid-cols-[1fr_0.9fr] items-start" style={{ gap: u(28) }}><div>{L('items', (x) => <div className="flex font-serif text-neutral-800" style={{ fontSize: u(18), gap: u(12), marginBottom: u(16) }}><span className="shrink-0 rounded-full bg-brand" style={{ width: u(8), height: u(8), marginTop: u(10) }} />{x}</div>)}</div><Thumb img={s.img || 'desk'} className="rounded-lg" ><div style={{ paddingTop: '68%' }} /></Thumb></div>}
      </>)}</div>
      <div className="absolute flex items-center justify-between font-lato text-neutral-400" style={{ left: u(64), right: u(60), bottom: u(18), fontSize: u(11) }}><span>LMS · Công ty demo</span>{n && <span>{n}{total ? ` / ${total}` : ''}</span>}</div>
    </div>
  )
}

// Đổi bố cục: thêm sẵn trường còn thiếu, giữ tiêu đề và các ý đã có
const LAYOUTS = [['cover', 'Bìa'], ['bullets', 'Danh sách'], ['steps', 'Các bước'], ['image', 'Ảnh + ý chính'], ['two', 'Hai cột'], ['table', 'Bảng'], ['stat', 'Số liệu'], ['quote', 'Trích dẫn']]
function relayout(x, layout) {
  const items = x.items?.length ? x.items : (x.cols ? x.cols.flatMap((c) => c.slice(1)) : ['', ''])
  x.layout = layout
  if (['bullets', 'steps', 'image'].includes(layout)) x.items = items
  if (layout === 'two' && !x.cols) x.cols = [['Cột 1', ...items.slice(0, 2)], ['Cột 2', ...items.slice(2, 4)]]
  if (layout === 'table' && !x.head) { x.head = ['Cột 1', 'Cột 2']; x.rows = [['', ''], ['', '']] }
  if (layout === 'stat' && !x.stats) x.stats = [['0', 'Mô tả'], ['0', 'Mô tả'], ['0', 'Mô tả']]
  if (layout === 'quote' && x.quote == null) { x.quote = ''; x.by = '' }
}

/** Ghi định dạng vào slide (đột biến bản nháp trong upS) */
function applySt(x, k, patch) {
  if (k.startsWith('box:')) { const b = x.boxes?.find((y) => y.id === k.slice(4)); if (b) Object.assign(b, patch); return }
  x.st = { ...(x.st ?? {}), [k]: { ...(x.st?.[k] ?? {}), ...patch } }
}
const stOf = (s, k) => (k?.startsWith('box:') ? s.boxes?.find((y) => y.id === k.slice(4)) : s.st?.[k]) ?? {}

const Swatch = ({ c, on, onClick, title }) => <button title={title ?? c} onClick={onClick} className={`h-5 w-5 shrink-0 rounded-full border ${on ? 'ring-2 ring-sky-500 ring-offset-1' : 'border-neutral-300'}`} style={{ background: c }} />
const Sep = () => <span className="mx-1 h-5 w-px bg-line" />

/** Khung sửa một slide: thanh bố cục, thanh định dạng, slide lớn sửa tại chỗ */
export function SlideCanvas({ artId, s, n, total, upS, onDuplicate, onDelete }) {
  const { say } = useStore()
  const [sel, setSel] = useState(null)
  const [bgOpen, setBgOpen] = useState(false)
  const [ai, setAi] = useState(false)
  const [pick, setPick] = useState(false)
  useEffect(() => { setSel(null); setBgOpen(false) }, [s.id])
  useEffect(() => { const h = (e) => { if (e.key === 'Escape') setSel(null) }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [])
  const st = stOf(s, sel)
  const isBox = sel?.startsWith('box:')
  const setSt = (k, patch) => upS((x) => applySt(x, k, patch))
  const bold = st.b ?? (isBox ? false : BOLD_DEFAULT[sel] ?? false)
  const size = st.size ?? 1
  const addBox = () => { const id = uid('t'); upS((x) => { x.boxes = [...(x.boxes ?? []), { id, x: 30, y: 42, w: 40, text: 'Hộp chữ mới', size: 1 }] }); setSel(`box:${id}`) }
  const reset = () => upS((x) => {
    if (isBox) { const b = x.boxes.find((y) => y.id === sel.slice(4)); Object.assign(b, { size: 1, color: undefined, b: undefined, i: undefined, align: undefined, fill: undefined }); return }
    if (x.st) delete x.st[sel]
  })
  return (
    <div className="w-full" style={{ maxWidth: "min(880px, max(520px, calc((100vh - 330px) * 1.78)))" }}>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-neutral-500">Bố cục</span>
        <select value={s.layout} onChange={(e) => upS((x) => relayout(x, e.target.value))} className="rounded-lg border border-line bg-white px-2 py-1 text-[13px] font-medium outline-none">{LAYOUTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <button onClick={addBox} className="flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 font-medium hover:bg-neutral-50"><Type size={14} />Hộp chữ</button>
        <div className="relative">
          <button onClick={() => setBgOpen(!bgOpen)} className="flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 font-medium hover:bg-neutral-50"><PaintBucket size={14} />Nền<span className="h-3.5 w-3.5 rounded-full border border-neutral-300" style={{ background: s.bg || (s.layout === 'cover' ? '#334155' : '#fff') }} /></button>
          {bgOpen && <div className="absolute left-0 top-9 z-30 flex w-[230px] flex-wrap gap-2 rounded-xl border border-line bg-white p-3 shadow-pop">
            {BG_COLORS.map((c) => <Swatch key={c} c={c} on={s.bg === c} onClick={() => { upS((x) => { x.bg = c }); setBgOpen(false) }} />)}
            <button onClick={() => { upS((x) => { delete x.bg }); setBgOpen(false) }} className="text-[12px] text-sky-700 hover:underline">{s.layout === 'cover' ? 'Dùng ảnh nền' : 'Mặc định'}</button>
          </div>}
        </div>
        {(s.layout === 'image' || (s.layout === 'cover' && !s.bg)) && <button onClick={() => setPick(true)} className="flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 font-medium hover:bg-neutral-50"><ImageIcon size={14} />Ảnh</button>}
        <button onClick={() => setAi(true)} className="flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 font-medium text-violet-700 hover:bg-violet-50"><Sparkles size={14} />Sửa bằng AI</button>
        <div className="flex-1" />
        {onDuplicate && <Tip label="Nhân đôi slide" className="h-8 w-8" onClick={onDuplicate}><Copy size={15} /></Tip>}
        {onDelete && <Tip label="Xóa slide" className="h-8 w-8" onClick={onDelete}><Trash2 size={15} /></Tip>}
      </div>
      <div className="mb-3 flex min-h-10 flex-wrap items-center gap-1 rounded-xl border border-line bg-white px-3 py-1 text-[13px]">
        {!sel ? <span className="text-neutral-500">Bấm vào chữ để sửa và định dạng. Kéo <Move size={12} className="inline text-sky-600" /> để di chuyển.</span> : <>
          <span className="mr-1 whitespace-nowrap font-semibold">{isBox ? 'Hộp chữ' : PART_NAMES[sel]}</span><Sep />
          <Tip label="Chữ nhỏ hơn" className="h-7 w-7" onClick={() => setSt(sel, { size: +clamp(size - 0.1, 0.5, 2.5).toFixed(2) })}><Minus size={14} /></Tip>
          <span className="w-10 text-center tabular-nums">{Math.round(size * 100)}%</span>
          <Tip label="Chữ lớn hơn" className="h-7 w-7" onClick={() => setSt(sel, { size: +clamp(size + 0.1, 0.5, 2.5).toFixed(2) })}><Plus size={14} /></Tip><Sep />
          <Tip label="Đậm" active={bold} className="h-7 w-7" onClick={() => setSt(sel, { b: !bold })}><Bold size={14} /></Tip>
          <Tip label="Nghiêng" active={!!st.i} className="h-7 w-7" onClick={() => setSt(sel, { i: !st.i })}><Italic size={14} /></Tip><Sep />
          {[['left', AlignLeft, 'Căn trái'], ['center', AlignCenter, 'Căn giữa'], ['right', AlignRight, 'Căn phải']].map(([a, I, l]) => <Tip key={a} label={l} active={st.align === a} className="h-7 w-7" onClick={() => setSt(sel, { align: st.align === a ? undefined : a })}><I size={14} /></Tip>)}<Sep />
          <span className="flex items-center gap-1.5">{TEXT_COLORS.map((c) => <Swatch key={c} c={c} on={st.color === c} onClick={() => setSt(sel, { color: st.color === c ? undefined : c })} />)}</span>
          {isBox && <><Sep /><span className="text-neutral-500">Nền hộp</span>{['#fff7ed', '#f1f5f9', '#111827'].map((c) => <Swatch key={c} c={c} on={st.fill === c} onClick={() => setSt(sel, { fill: st.fill === c ? undefined : c })} />)}</>}
          <div className="flex-1" />
          <Tip label="Bỏ định dạng, về vị trí cũ" className="h-7 w-7" onClick={reset}><RotateCcw size={14} /></Tip>
          {isBox && <Tip label="Xóa hộp chữ" className="h-7 w-7" onClick={() => { upS((x) => { x.boxes = x.boxes.filter((y) => `box:${y.id}` !== sel) }); setSel(null) }}><Trash2 size={14} /></Tip>}
        </>}
      </div>
      <div className="relative aspect-video w-full overflow-hidden rounded-xl shadow-pop">
        <Slide s={s} n={n} total={total} sel={sel} onSel={setSel} setSt={setSt} onEdit={(patch) => upS((x) => { Object.assign(x, patch) })} />
      </div>
      <ImagePicker open={pick} value={s.img} title="Ảnh cho slide" onClose={() => setPick(false)} onPick={(v) => upS((x) => { x.img = v })} />
      {ai && <SlideAi artId={artId} s={s} onClose={() => setAi(false)} onApply={(ns) => { upS((x) => { Object.assign(x, ns) }); say('AI đã sửa slide, bấm vào chữ để chỉnh tiếp') }} />}
    </div>
  )
}

/** Sửa nội dung slide bằng AI (giữ bố cục và định dạng) */
function SlideAi({ artId, s, onClose, onApply }) {
  const { say } = useStore()
  const [t, setT] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (instruction) => {
    setBusy(true)
    try { onApply(await post(`/artifacts/${artId}/ai-edit`, { kind: 'slide', value: s, instruction })); onClose() } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="fade mt-3 rounded-2xl border border-line bg-white p-4 shadow-pop">
      <div className="flex items-center gap-2 text-[15px] font-semibold"><Sparkles size={17} className="text-violet-600" />Sửa slide bằng AI<span className="text-[12px] font-normal text-neutral-500">Giữ bố cục và định dạng, tra tài liệu nguồn</span><div className="flex-1" /><button onClick={onClose} aria-label="Đóng"><X size={16} /></button></div>
      <div className="mt-2 flex flex-wrap gap-1.5">{['Viết ngắn gọn hơn', 'Viết lại lời đọc tự nhiên hơn', 'Thêm ý từ tài liệu', 'Sửa lỗi chính tả'].map((c) => <button key={c} disabled={busy} onClick={() => run(c)} className="rounded-lg border border-line px-2 py-1 text-[12px] hover:bg-neutral-50">{c}</button>)}</div>
      <div className="mt-2 flex items-end gap-2"><textarea autoFocus value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && t.trim()) { e.preventDefault(); run(t) } }} className="h-12 flex-1 resize-none text-[14px] outline-none" placeholder="Hoặc nhập yêu cầu…" />
        {busy ? <Spinner size={20} w={2} /> : <button disabled={!t.trim()} onClick={() => run(t)} className="btn-dark btn-sm h-8">Sửa</button>}</div>
    </div>
  )
}
