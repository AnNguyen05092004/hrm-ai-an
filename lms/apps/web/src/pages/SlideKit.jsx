// Slide: hiển thị theo bố cục + định dạng tự do kiểu trình chiếu.
// Dữ liệu trên slide (render.ts dựng video từ cùng dữ liệu này):
//   st[phần] = { x, y, size, color, b, i, u, align }  — định dạng nhãn, tiêu đề, phụ đề, nội dung
//   bg (màu nền) · bgImg + bgTone ('light' | 'dark' | 'none') — ảnh nền cho slide không phải bìa (bìa dùng img)
//   boxes[] = phần tử đặt tự do, kind: 'text' (mặc định) | 'img' | 'shape'
//     chung: { id, x, y, w (% khung), op (độ đậm 0.1–1) } · ảnh, hình: h (% chiều cao) · ảnh: img, r (bo góc)
//     hình: shape 'rect' | 'round' | 'circle' | 'line' | 'arrow', fill, stroke, sw (độ dày nét)
import { Fragment, createContext, useContext, useState } from 'react'
import { Move } from 'lucide-react'
import { Thumb } from '../ui'
import { Editable, EditableList } from '../edit'
import { u, BOLD_DEFAULT, clamp, elKind, isLine, TONES } from '../slideModel'

const Ctx = createContext(null)

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
  return `${st.color ? 'fx-color' : ''} ${st.b === undefined ? '' : b ? 'fx-bold' : 'fx-normal'} ${st.i ? 'fx-italic' : ''} ${st.u ? 'fx-underline' : ''} ${st.align ? `fx-${st.align}` : ''}`
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

/** Hình khối: chữ nhật, bo góc, tròn vẽ bằng khung; đường thẳng và mũi tên vẽ bằng thanh ngang */
function ShapeBody({ b }) {
  const sw = b.sw ?? 3
  if (isLine(b)) {
    const c = b.stroke || b.fill || '#111827'
    return (
      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center">
        <div className="flex-1" style={{ height: u(sw), background: c, borderRadius: u(sw) }} />
        {b.shape === 'arrow' && <div className="shrink-0" style={{ width: 0, height: 0, borderTop: `${u(sw * 1.6 + 5)} solid transparent`, borderBottom: `${u(sw * 1.6 + 5)} solid transparent`, borderLeft: `${u(sw * 2.6 + 9)} solid ${c}`, marginLeft: u(-1) }} />}
      </div>
    )
  }
  return <div className="absolute inset-0" style={{ background: b.fill || 'transparent', border: b.stroke ? `${u(sw)} solid ${b.stroke}` : undefined, borderRadius: b.shape === 'circle' ? '50%' : b.shape === 'round' ? u(18) : 0 }} />
}

/** Phần tử đặt tự do trên slide: hộp chữ, ảnh, hình khối */
function El({ b }) {
  const ctx = useContext(Ctx)
  const k = `box:${b.id}`
  const kind = elKind(b), line = isLine(b)
  const [d, start] = useDrag((r) => {
    if (r.mode === 'size') ctx.setSt(k, kind === 'text' || line ? { w: clamp(b.w + r.x, line ? 3 : 8, 100) } : { w: clamp(b.w + r.x, 3, 100), h: clamp((b.h ?? 20) + r.y, 3, 100) })
    else ctx.setSt(k, { x: clamp(b.x + r.x, -5, 95), y: clamp(b.y + r.y, -5, 95) })
  })
  const on = ctx?.sel === k
  const mv = d?.mode === 'move', sz = d?.mode === 'size'
  const w = clamp(b.w + (sz ? d.x : 0), line ? 3 : 8, 100)
  const h = kind === 'text' ? undefined : line ? u(28) : `${clamp((b.h ?? 20) + (sz ? d.y : 0), 3, 100)}%`
  const body = kind === 'img'
    ? <div className="h-full w-full overflow-hidden" style={{ borderRadius: b.r ? u(14) : 0 }}><Thumb img={b.img || 'desk'} className="h-full w-full" /></div>
    : kind === 'shape' ? <ShapeBody b={b} />
      : <div className={`font-serif leading-snug text-neutral-800 ${fmtClass(b, 'box')}`} style={{ fontSize: u(22 * (b.size ?? 1)), '--fx-c': b.color }}>
        {ctx?.edit ? <Editable value={b.text} multiline className="block" placeholder="Nhập chữ" onChange={(v) => ctx.setSt(k, { text: v })} /> : <span className="whitespace-pre-wrap">{b.text}</span>}
      </div>
  return (
    <div data-part data-el data-id={b.id} className={`absolute ${on ? 'outline-dashed outline-2 outline-offset-2 outline-sky-400' : ''} ${kind !== 'text' && ctx ? 'cursor-move touch-none' : ''}`}
      style={{ left: `${b.x + (mv ? d.x : 0)}%`, top: `${b.y + (mv ? d.y : 0)}%`, width: `${w}%`, height: h, opacity: b.op ?? 1, background: kind === 'text' ? b.fill || undefined : undefined, padding: kind === 'text' && b.fill ? u(10) : 0, borderRadius: kind === 'text' ? u(6) : undefined }}
      onPointerDownCapture={ctx ? () => ctx.onSel(k) : undefined}
      onPointerDown={ctx && kind !== 'text' ? (e) => { if (e.button === 0) start(e, 'move') } : undefined}>
      {body}
      {on && kind === 'text' && <Handle className="-left-3 -top-3" onPointerDown={(e) => start(e, 'move')} />}
      {on && (kind === 'text' || line) && <Handle className="-right-3 top-1/2 -translate-y-1/2 !cursor-ew-resize" title="Kéo để đổi bề ngang" onPointerDown={(e) => start(e, 'size')}><span className="text-[11px] font-bold">↔</span></Handle>}
      {on && kind !== 'text' && !line && <Handle className="-bottom-3 -right-3 !cursor-nwse-resize" title="Kéo để đổi kích thước" onPointerDown={(e) => start(e, 'size')}><span className="text-[11px] font-bold">⤡</span></Handle>}
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
        {(s.boxes ?? []).map((b) => <El key={b.id} b={b} />)}
      </div>
    </Ctx.Provider>
  )
}

/** Nền của slide thường: màu, hoặc ảnh có lớp phủ cho chữ dễ đọc */
function Backdrop({ s }) {
  if (!s.bgImg) return null
  // Thumb luôn là khối relative nên đặt trong một lớp absolute phủ kín slide
  return <div data-backdrop className="absolute inset-0"><Thumb img={s.bgImg} className="h-full w-full"><div className="absolute inset-0" style={{ background: TONES[s.bgTone ?? 'light'] ?? TONES.light }} /></Thumb></div>
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
  const dark = s.bgImg && s.bgTone === 'dark'
  return (
    <div className="relative flex h-full flex-col overflow-hidden" style={{ padding: `${u(46)} ${u(60)} ${u(54)} ${u(64)}`, background: s.bg || '#fff' }}>
      <Backdrop s={s} />
      <div className="absolute inset-y-0 left-0 bg-brand" style={{ width: u(8) }} />
      <div className={`relative flex h-full flex-col ${dark ? 'slide-on-dark' : ''}`}>
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
      </div>
      <div className={`absolute flex items-center justify-between font-lato ${dark ? 'text-white/60' : 'text-neutral-400'}`} style={{ left: u(64), right: u(60), bottom: u(18), fontSize: u(11) }}><span>LMS · Công ty demo</span>{n && <span>{n}{total ? ` / ${total}` : ''}</span>}</div>
    </div>
  )
}
