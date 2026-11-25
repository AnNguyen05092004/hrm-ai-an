// Thanh công cụ soạn slide kiểu phần mềm trình chiếu: chèn chữ/ảnh/hình, nền màu hoặc ảnh,
// định dạng theo phần đang chọn, sắp lớp, căn giữa, nhân đôi, xóa, phím tắt. Dữ liệu: xem đầu SlideKit.jsx.
import { useEffect, useRef, useState } from 'react'
import {
  Move, Plus, Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Minus, RotateCcw, Trash2, Copy, Sparkles,
  PaintBucket, X, Image as ImageIcon, Undo2, Redo2, ChevronDown, Square, RectangleHorizontal, Circle, MoveRight, Slash,
  BringToFront, SendToBack, AlignCenterHorizontal, AlignCenterVertical, Shapes, Replace,
} from 'lucide-react'
import { ImagePicker } from '../ImagePicker'
import { uid, useStore } from '../store'
import { Tip, Spinner } from '../ui'
import { post } from '../api'
import { Slide } from './SlideKit'
import { BOLD_DEFAULT, clamp, elKind, isLine } from '../slideModel'

const TEXT_COLORS = ['#111827', '#ffffff', '#ff6119', '#dc2626', '#16a34a', '#2563eb', '#7c3aed', '#6b7280']
const BG_COLORS = ['#ffffff', '#fff7ed', '#f1f5f9', '#ecfeff', '#fef9c3', '#111827', '#1e3a8a', '#ff6119']
const SHAPE_COLORS = ['#ff6119', '#fde68a', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fecaca', '#111827', '#ffffff']
const PART_NAMES = { kicker: 'Nhãn nhỏ', title: 'Tiêu đề', sub: 'Phụ đề', body: 'Nội dung' }
const LAYOUTS = [['cover', 'Bìa'], ['bullets', 'Danh sách'], ['steps', 'Các bước'], ['image', 'Ảnh + ý chính'], ['two', 'Hai cột'], ['table', 'Bảng'], ['stat', 'Số liệu'], ['quote', 'Trích dẫn']]
const SHAPES = [['rect', 'Chữ nhật', Square], ['round', 'Bo góc', RectangleHorizontal], ['circle', 'Hình tròn', Circle], ['line', 'Đường thẳng', Slash], ['arrow', 'Mũi tên', MoveRight]]
const OPACITY = [1, 0.75, 0.5, 0.25]
const TONE_LABELS = [['light', 'Phủ sáng'], ['dark', 'Phủ tối'], ['none', 'Không phủ']]

// Phần tử mới đặt giữa slide; hình tròn tính theo khung 16:9 để ra tròn thật
const NEW_EL = {
  text: () => ({ x: 30, y: 42, w: 40, text: 'Hộp chữ mới', size: 1 }),
  img: (img) => ({ kind: 'img', img, x: 55, y: 22, w: 35, h: 45 }),
  rect: () => ({ kind: 'shape', shape: 'rect', x: 35, y: 30, w: 30, h: 40, fill: '#fde68a' }),
  round: () => ({ kind: 'shape', shape: 'round', x: 35, y: 30, w: 30, h: 40, fill: '#bfdbfe' }),
  circle: () => ({ kind: 'shape', shape: 'circle', x: 41, y: 34, w: 18, h: 32, fill: '#bbf7d0' }),
  line: () => ({ kind: 'shape', shape: 'line', x: 30, y: 50, w: 40, stroke: '#111827', sw: 3 }),
  arrow: () => ({ kind: 'shape', shape: 'arrow', x: 30, y: 50, w: 40, stroke: '#ff6119', sw: 3 }),
}

/** Đổi bố cục: thêm sẵn trường còn thiếu, giữ tiêu đề và các ý đã có */
function relayout(x, layout) {
  const items = x.items?.length ? x.items : (x.cols ? x.cols.flatMap((c) => c.slice(1)) : ['', ''])
  x.layout = layout
  if (['bullets', 'steps', 'image'].includes(layout)) x.items = items
  if (layout === 'two' && !x.cols) x.cols = [['Cột 1', ...items.slice(0, 2)], ['Cột 2', ...items.slice(2, 4)]]
  if (layout === 'table' && !x.head) { x.head = ['Cột 1', 'Cột 2']; x.rows = [['', ''], ['', '']] }
  if (layout === 'stat' && !x.stats) x.stats = [['0', 'Mô tả'], ['0', 'Mô tả'], ['0', 'Mô tả']]
  if (layout === 'quote' && x.quote == null) { x.quote = ''; x.by = '' }
}

const boxIndex = (x, k) => (x.boxes ?? []).findIndex((y) => `box:${y.id}` === k)
/** Ghi định dạng vào slide (đột biến bản nháp trong upS) */
function applySt(x, k, patch) {
  if (k.startsWith('box:')) { const b = x.boxes?.[boxIndex(x, k)]; if (b) Object.assign(b, patch); return }
  x.st = { ...(x.st ?? {}), [k]: { ...(x.st?.[k] ?? {}), ...patch } }
}
const stOf = (s, k) => (k?.startsWith('box:') ? s.boxes?.find((y) => `box:${y.id}` === k) : s.st?.[k]) ?? {}
const typing = (t) => t?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName ?? '')

const Swatch = ({ c, on, onClick, title }) => <button title={title ?? c} onClick={onClick} className={`h-5 w-5 shrink-0 rounded-full border ${on ? 'ring-2 ring-sky-500 ring-offset-1' : 'border-neutral-300'}`} style={{ background: c }} />
const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-line" />
const Label = ({ children }) => <span className="whitespace-nowrap text-neutral-500">{children}</span>

/** Dải màu: màu có sẵn, ô "không màu" (tùy chọn) và ô chọn màu bất kỳ */
function Colors({ value, onChange, colors, none }) {
  const custom = value && !colors.includes(value)
  return (
    <span className="flex items-center gap-1.5">
      {none && <button title={none} onClick={() => onChange(undefined)} className={`relative h-5 w-5 shrink-0 overflow-hidden rounded-full border border-neutral-300 bg-white ${!value ? 'ring-2 ring-sky-500 ring-offset-1' : ''}`}><span className="absolute left-1/2 top-[-2px] h-6 w-px rotate-45 bg-red-500" /></button>}
      {colors.map((c) => <Swatch key={c} c={c} on={value === c} onClick={() => onChange(value === c && !none ? undefined : c)} />)}
      <label title="Màu khác" className={`relative h-5 w-5 shrink-0 cursor-pointer rounded-full border border-neutral-300 ${custom ? 'ring-2 ring-sky-500 ring-offset-1' : ''}`} style={{ background: custom ? value : 'conic-gradient(#ef4444,#f59e0b,#22c55e,#06b6d4,#6366f1,#d946ef,#ef4444)' }}>
        <input type="color" value={custom ? value : '#2563eb'} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </label>
    </span>
  )
}

/** Bảng nổi gắn với nút; bấm ra ngoài hoặc Esc thì đóng */
function Pop({ label, icon: I, open, setOpen, children, extra, w = 260 }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const out = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('pointerdown', out); window.addEventListener('keydown', esc)
    return () => { window.removeEventListener('pointerdown', out); window.removeEventListener('keydown', esc) }
  }, [open, setOpen])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className={`flex items-center gap-1 rounded-lg border border-line px-2 py-1 font-medium hover:bg-neutral-50 ${open ? 'bg-neutral-50' : 'bg-white'}`}><I size={14} />{label}{extra}<ChevronDown size={13} className="text-neutral-400" /></button>
      {open && <div className="fade absolute left-0 top-9 z-30 rounded-xl border border-line bg-white p-3 shadow-pop" style={{ width: w }}>{children}</div>}
    </div>
  )
}

/** Khung sửa một slide: thanh công cụ, thanh định dạng theo phần đang chọn, slide lớn sửa tại chỗ */
export function SlideCanvas({ artId, s, n, total, upS, onDuplicate, onDelete, onUndo, onRedo, canUndo, canRedo, onBgAll, roomy }) {
  const { say } = useStore()
  const [sel, setSel] = useState(null)
  const [menu, setMenu] = useState(null) // 'insert' | 'bg'
  const [ai, setAi] = useState(false)
  const [pick, setPick] = useState(null) // 'illus' | 'bg' | 'insert' | 'replace'
  const stage = useRef(null)
  useEffect(() => { setSel(null); setMenu(null) }, [s.id])

  const st = stOf(s, sel)
  const isBox = !!sel?.startsWith('box:')
  const kind = isBox ? elKind(st) : null
  const setSt = (k, patch) => upS((x) => applySt(x, k, patch))
  const bold = st.b ?? (isBox ? false : BOLD_DEFAULT[sel] ?? false)
  const size = st.size ?? 1
  const cover = s.layout === 'cover'

  const add = (type, img) => {
    const id = uid('t')
    upS((x) => { x.boxes = [...(x.boxes ?? []), { id, ...NEW_EL[type](img) }] })
    setSel(`box:${id}`); setMenu(null)
  }
  const removeEl = () => { upS((x) => { x.boxes = x.boxes.filter((y) => `box:${y.id}` !== sel) }); setSel(null) }
  const duplicateEl = () => {
    const id = uid('t')
    upS((x) => { const i = boxIndex(x, sel); if (i < 0) return; const c = { ...structuredClone(x.boxes[i]), id, x: clamp(x.boxes[i].x + 3, -5, 95), y: clamp(x.boxes[i].y + 4, -5, 95) }; x.boxes.splice(i + 1, 0, c) })
    setSel(`box:${id}`)
  }
  const layer = (dir) => upS((x) => {
    const i = boxIndex(x, sel), j = i + dir
    if (i < 0 || j < 0 || j >= x.boxes.length) return
    const b = [...x.boxes];[b[i], b[j]] = [b[j], b[i]]; x.boxes = b
  })
  const lastLayer = (s.boxes?.length ?? 0) - 1, idx = isBox ? boxIndex(s, sel) : -1
  /** Căn phần tử vào giữa slide theo kích thước thật đang hiển thị */
  const center = (axis) => {
    const slide = stage.current?.querySelector('[data-slide]'), el = stage.current?.querySelector(`[data-id="${sel.slice(4)}"]`)
    if (!slide || !el) return
    setSt(sel, axis === 'x' ? { x: +(50 - (el.offsetWidth / slide.offsetWidth) * 50).toFixed(2) } : { y: +(50 - (el.offsetHeight / slide.offsetHeight) * 50).toFixed(2) })
  }
  const nudge = (dx, dy) => {
    if (isBox) setSt(sel, { x: clamp((st.x ?? 0) + dx, -5, 95), y: clamp((st.y ?? 0) + dy, -5, 95) })
    else setSt(sel, { x: clamp((st.x ?? 0) + dx, -100, 100), y: clamp((st.y ?? 0) + dy, -100, 100) })
  }
  const reset = () => upS((x) => {
    if (isBox) { const b = x.boxes[boxIndex(x, sel)]; Object.assign(b, { size: 1, color: undefined, b: undefined, i: undefined, u: undefined, align: undefined, fill: undefined, op: undefined }); return }
    if (x.st) delete x.st[sel]
  })

  // phím tắt khi không gõ chữ: Delete xóa phần tử, mũi tên dịch (Shift: bước lớn), ⌘D nhân đôi, Esc bỏ chọn
  const keys = useRef(); keys.current = { sel, isBox, removeEl, duplicateEl, nudge }
  useEffect(() => {
    const h = (e) => {
      const k = keys.current
      if (e.key === 'Escape') { if (typing(e.target)) e.target.blur(); if (k.sel) setSel(null); return }
      if (!k.sel || typing(e.target)) return
      const step = e.shiftKey ? 5 : 0.5
      const arrows = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
      if (arrows[e.key]) { e.preventDefault(); k.nudge(...arrows[e.key]) }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && k.isBox) { e.preventDefault(); k.removeEl() }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && k.isBox) { e.preventDefault(); k.duplicateEl() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const onPick = (v) => {
    if (pick === 'illus') upS((x) => { x.img = v })
    else if (pick === 'insert') add('img', v)
    else if (pick === 'replace') setSt(sel, { img: v })
    else if (pick === 'bg') upS((x) => { if (x.layout === 'cover') { x.img = v; delete x.bg } else { x.bgImg = v; x.bgTone = x.bgTone ?? 'light' } })
  }
  const bgSwatch = s.bg || (cover ? '#334155' : '#fff')
  const hasBgImg = cover ? !s.bg : !!s.bgImg

  // các nút dùng chung cho phần tử đặt tự do
  const elActions = <>
    <Sep /><Label>Độ đậm</Label>
    <select value={st.op ?? 1} onChange={(e) => setSt(sel, { op: Number(e.target.value) === 1 ? undefined : Number(e.target.value) })} className="rounded-md border border-line bg-white px-1 py-0.5 text-[13px] outline-none">{OPACITY.map((o) => <option key={o} value={o}>{o * 100}%</option>)}</select>
    <Sep />
    <Tip label="Đưa lên trên" className="h-7 w-7" disabled={idx >= lastLayer} onClick={() => layer(1)}><BringToFront size={14} /></Tip>
    <Tip label="Đưa xuống dưới" className="h-7 w-7" disabled={idx <= 0} onClick={() => layer(-1)}><SendToBack size={14} /></Tip>
    <Tip label="Căn giữa ngang" className="h-7 w-7" onClick={() => center('x')}><AlignCenterHorizontal size={14} /></Tip>
    <Tip label="Căn giữa dọc" className="h-7 w-7" onClick={() => center('y')}><AlignCenterVertical size={14} /></Tip>
    <Tip label="Nhân đôi (⌘D)" className="h-7 w-7" onClick={duplicateEl}><Copy size={14} /></Tip>
  </>
  const textFormat = <>
    <Tip label="Chữ nhỏ hơn" className="h-7 w-7" onClick={() => setSt(sel, { size: +clamp(size - 0.1, 0.5, 2.5).toFixed(2) })}><Minus size={14} /></Tip>
    <span className="w-10 text-center tabular-nums">{Math.round(size * 100)}%</span>
    <Tip label="Chữ lớn hơn" className="h-7 w-7" onClick={() => setSt(sel, { size: +clamp(size + 0.1, 0.5, 2.5).toFixed(2) })}><Plus size={14} /></Tip><Sep />
    <Tip label="Đậm" active={bold} className="h-7 w-7" onClick={() => setSt(sel, { b: !bold })}><Bold size={14} /></Tip>
    <Tip label="Nghiêng" active={!!st.i} className="h-7 w-7" onClick={() => setSt(sel, { i: !st.i })}><Italic size={14} /></Tip>
    <Tip label="Gạch chân" active={!!st.u} className="h-7 w-7" onClick={() => setSt(sel, { u: !st.u })}><Underline size={14} /></Tip><Sep />
    {[['left', AlignLeft, 'Căn trái'], ['center', AlignCenter, 'Căn giữa'], ['right', AlignRight, 'Căn phải']].map(([a, I, l]) => <Tip key={a} label={l} active={st.align === a} className="h-7 w-7" onClick={() => setSt(sel, { align: st.align === a ? undefined : a })}><I size={14} /></Tip>)}<Sep />
    <Label>Màu chữ</Label><Colors value={st.color} colors={TEXT_COLORS} onChange={(c) => setSt(sel, { color: c })} />
    {isBox && <><Sep /><Label>Nền hộp</Label><Colors value={st.fill} none="Không nền" colors={['#fff7ed', '#f1f5f9', '#fef9c3', '#111827']} onChange={(c) => setSt(sel, { fill: c })} /></>}
  </>
  const shapeFormat = <>
    <span className="flex items-center">{SHAPES.map(([k, l, I]) => <Tip key={k} label={l} active={st.shape === k} className="h-7 w-7" onClick={() => setSt(sel, { ...NEW_EL[k](), x: st.x, y: st.y, w: st.w, h: st.h ?? NEW_EL[k]().h, fill: st.fill, stroke: st.stroke, sw: st.sw, op: st.op, kind: 'shape', shape: k })}><I size={14} /></Tip>)}</span><Sep />
    {!isLine(st) && <><Label>Màu nền</Label><Colors value={st.fill} none="Không nền" colors={SHAPE_COLORS} onChange={(c) => setSt(sel, { fill: c })} /><Sep /></>}
    <Label>{isLine(st) ? 'Màu nét' : 'Viền'}</Label><Colors value={st.stroke} none={isLine(st) ? undefined : 'Không viền'} colors={TEXT_COLORS.slice(0, 7)} onChange={(c) => setSt(sel, { stroke: c })} />
    {(isLine(st) || st.stroke) && <><Sep /><Label>Nét</Label>
      <Tip label="Nét mảnh hơn" className="h-7 w-7" onClick={() => setSt(sel, { sw: clamp((st.sw ?? 3) - 1, 1, 16) })}><Minus size={14} /></Tip>
      <span className="w-5 text-center tabular-nums">{st.sw ?? 3}</span>
      <Tip label="Nét dày hơn" className="h-7 w-7" onClick={() => setSt(sel, { sw: clamp((st.sw ?? 3) + 1, 1, 16) })}><Plus size={14} /></Tip></>}
  </>
  const imgFormat = <>
    <button onClick={() => setPick('replace')} className="flex items-center gap-1 rounded-md px-2 py-1 font-medium hover:bg-neutral-100"><Replace size={14} />Đổi ảnh</button>
    <Tip label="Bo góc" active={!!st.r} className="h-7 w-7" onClick={() => setSt(sel, { r: !st.r || undefined })}><RectangleHorizontal size={14} /></Tip>
  </>

  return (
    <div ref={stage} className="w-full" style={{ maxWidth: `min(960px, max(520px, calc((100vh - ${roomy ? 250 : 330}px) * 1.78)))` }}>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]">
        {onUndo && <span className="flex items-center rounded-lg border border-line bg-white">
          <Tip label="Hoàn tác (⌘Z)" className="h-7 w-7" disabled={!canUndo} onClick={onUndo}><Undo2 size={14} /></Tip>
          <Tip label="Làm lại (⇧⌘Z)" className="h-7 w-7" disabled={!canRedo} onClick={onRedo}><Redo2 size={14} /></Tip>
        </span>}
        <span className="text-neutral-500">Bố cục</span>
        <select value={s.layout} onChange={(e) => upS((x) => relayout(x, e.target.value))} className="rounded-lg border border-line bg-white px-2 py-1 text-[13px] font-medium outline-none">{LAYOUTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <Pop label="Chèn" icon={Plus} open={menu === 'insert'} setOpen={(o) => setMenu(o ? 'insert' : null)} w={236}>
          <div className="grid gap-0.5 text-[13px]">
            <button onClick={() => add('text')} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-50"><Type size={15} />Hộp chữ</button>
            <button onClick={() => { setMenu(null); setPick('insert') }} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-50"><ImageIcon size={15} />Ảnh</button>
            <div className="mt-1.5 flex items-center gap-1.5 px-2 text-[12px] text-neutral-500"><Shapes size={13} />Hình khối</div>
            <div className="flex gap-1 px-1 pt-1">{SHAPES.map(([k, l, I]) => <button key={k} title={l} aria-label={l} onClick={() => add(k)} className="grid h-9 w-9 place-items-center rounded-lg border border-line hover:bg-neutral-50"><I size={16} /></button>)}</div>
          </div>
        </Pop>
        <Pop label="Nền" icon={PaintBucket} open={menu === 'bg'} setOpen={(o) => setMenu(o ? 'bg' : null)} w={268}
          extra={<span className="h-3.5 w-3.5 rounded-full border border-neutral-300" style={{ background: hasBgImg ? 'linear-gradient(135deg,#94a3b8,#334155)' : bgSwatch }} />}>
          <div className="text-[12px] font-semibold text-neutral-500">Màu nền</div>
          <div className="mt-2"><Colors value={cover && !s.bg ? undefined : s.bg} colors={BG_COLORS} onChange={(c) => upS((x) => { if (c) x.bg = c; else delete x.bg; if (x.layout === 'cover') return; if (c && x.bgImg) { delete x.bgImg; delete x.bgTone } })} /></div>
          <div className="mt-3 text-[12px] font-semibold text-neutral-500">Ảnh nền</div>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => { setMenu(null); setPick('bg') }} className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[13px] font-medium hover:bg-neutral-50"><ImageIcon size={14} />{hasBgImg ? 'Đổi ảnh nền' : 'Chọn ảnh nền'}</button>
            {!cover && s.bgImg && <button onClick={() => upS((x) => { delete x.bgImg; delete x.bgTone })} className="text-[12px] text-red-600 hover:underline">Bỏ ảnh</button>}
          </div>
          {!cover && s.bgImg && <div className="mt-2 flex rounded-lg bg-neutral-100 p-0.5 text-[12px]">{TONE_LABELS.map(([t, l]) => <button key={t} onClick={() => upS((x) => { x.bgTone = t })} className={`flex-1 rounded-md py-1 ${(s.bgTone ?? 'light') === t ? 'bg-white font-semibold shadow-card' : 'text-neutral-600'}`}>{l}</button>)}</div>}
          {cover && <p className="mt-1.5 text-[12px] text-neutral-500">Slide bìa có lớp phủ tối sẵn để chữ trắng dễ đọc.</p>}
          <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-[12px]">
            <button onClick={() => upS((x) => { delete x.bg; delete x.bgImg; delete x.bgTone })} className="text-sky-700 hover:underline">{cover ? 'Dùng ảnh bìa' : 'Về mặc định'}</button>
            {onBgAll && !cover && <button onClick={() => { onBgAll({ bg: s.bg, bgImg: s.bgImg, bgTone: s.bgTone }); setMenu(null) }} className="font-medium text-sky-700 hover:underline">Áp dụng cho mọi slide</button>}
          </div>
        </Pop>
        {s.layout === 'image' && <button onClick={() => setPick('illus')} className="flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 font-medium hover:bg-neutral-50"><ImageIcon size={14} />Ảnh minh họa</button>}
        <button onClick={() => setAi(true)} className="flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 font-medium text-violet-700 hover:bg-violet-50"><Sparkles size={14} />Sửa bằng AI</button>
        <div className="flex-1" />
        {onDuplicate && <Tip label="Nhân đôi slide" className="h-8 w-8" onClick={onDuplicate}><Copy size={15} /></Tip>}
        {onDelete && <Tip label="Xóa slide" className="h-8 w-8" onClick={onDelete}><Trash2 size={15} /></Tip>}
      </div>
      <div className="mb-3 flex min-h-10 flex-wrap items-center gap-1 rounded-xl border border-line bg-white px-3 py-1 text-[13px]">
        {!sel ? <span className="text-neutral-500">Bấm vào chữ, ảnh hoặc hình để định dạng. Kéo <Move size={12} className="inline text-sky-600" /> để di chuyển, mũi tên để dịch từng chút.</span> : <>
          <span className="mr-1 whitespace-nowrap font-semibold">{isBox ? { text: 'Hộp chữ', img: 'Ảnh', shape: 'Hình' }[kind] : PART_NAMES[sel]}</span><Sep />
          {kind === 'img' ? imgFormat : kind === 'shape' ? shapeFormat : textFormat}
          {isBox && elActions}
          <div className="flex-1" />
          {kind !== 'img' && kind !== 'shape' && <Tip label="Bỏ định dạng, về vị trí cũ" className="h-7 w-7" onClick={reset}><RotateCcw size={14} /></Tip>}
          {isBox && <Tip label="Xóa (Delete)" className="h-7 w-7" onClick={removeEl}><Trash2 size={14} /></Tip>}
        </>}
      </div>
      <div className="relative aspect-video w-full overflow-hidden rounded-xl shadow-pop">
        <Slide s={s} n={n} total={total} sel={sel} onSel={setSel} setSt={setSt} onEdit={(patch) => upS((x) => { Object.assign(x, patch) })} />
      </div>
      <ImagePicker open={!!pick} value={pick === 'replace' ? st.img : pick === 'bg' ? (cover ? s.img : s.bgImg) : pick === 'illus' ? s.img : undefined}
        title={{ illus: 'Ảnh minh họa', bg: 'Ảnh nền slide', insert: 'Chèn ảnh', replace: 'Đổi ảnh' }[pick] ?? 'Chọn ảnh'} onClose={() => setPick(null)} onPick={onPick} />
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
