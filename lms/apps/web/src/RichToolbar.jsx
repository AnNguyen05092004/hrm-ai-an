// Thanh định dạng nổi: bôi đen chữ trong ô có định dạng (Editable rich) thì hiện ngay phía trên vùng chọn.
// Đậm, nghiêng, gạch chân, gạch ngang, màu chữ, tô nền, liên kết, xóa định dạng. Phím tắt: ⌘/Ctrl + B, I, U, K.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bold, Italic, Underline, Strikethrough, Link2, Unlink, RemoveFormatting, Highlighter, ChevronDown, Check } from 'lucide-react'
import { BRAND_PROBE, COLORS, DEFAULT_PROBE, MARKS, safeHref } from './rich'

const BAR_H = 44
const exec = (cmd, val) => document.execCommand(cmd, false, val)
const rootOf = (node) => (node?.nodeType === 1 ? node : node?.parentElement)?.closest?.('[data-rich]')

function Btn({ on, label, onClick, children }) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={on} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-md transition ${on ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>{children}</button>
  )
}

function Swatches({ list, current, onPick, kind }) {
  return (
    <div className="absolute left-1/2 top-[calc(100%+6px)] z-10 w-[212px] -translate-x-1/2 rounded-lg bg-white p-2 text-ink shadow-xl ring-1 ring-black/5" onMouseDown={(e) => e.preventDefault()}>
      <div className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{kind === 'c' ? 'Màu chữ' : 'Tô nền'}</div>
      <div className="grid grid-cols-4 gap-1.5">{list.map(([name, label, css]) => (
        <button key={name || 'none'} type="button" title={label} aria-label={label} onClick={() => onPick(name)}
          className={`relative grid h-9 place-items-center rounded-md border ${current === name ? 'border-ink' : 'border-line hover:border-neutral-400'}`}>
          {kind === 'c'
            ? <span className="text-[15px] font-bold" style={{ color: css ?? '#262626' }}>A</span>
            : <span className="h-5 w-7 rounded" style={{ background: css ?? 'transparent', border: css ? 'none' : '1px dashed #a3a3a3' }} />}
          {current === name && <Check size={10} strokeWidth={3} className="absolute right-0.5 top-0.5" />}
        </button>))}</div>
    </div>
  )
}

export default function RichToolbar() {
  const [pos, setPos] = useState(null) // {x, y, below}
  const [state, setState] = useState({})
  const [menu, setMenu] = useState(null) // 'c' | 'm' | 'link'
  const [url, setUrl] = useState('')
  const saved = useRef(null)
  const bar = useRef()

  useEffect(() => {
    const update = () => {
      if (bar.current?.contains(document.activeElement)) return // đang gõ địa chỉ liên kết
      const sel = window.getSelection()
      const root = sel?.rangeCount ? rootOf(sel.anchorNode) : null
      if (!root || sel.isCollapsed || !root.contains(sel.focusNode)) { setPos(null); setMenu(null); return }
      const r = sel.getRangeAt(0).getBoundingClientRect()
      const below = r.top < BAR_H + 72 // sát mép trên (dưới thanh tiêu đề) thì hiện bên dưới vùng chọn
      // thanh nằm ngoài vùng giao diện của khóa (portal) nên mang theo màu nhấn của ô đang soạn
      setPos({ x: Math.min(Math.max(r.left + r.width / 2, 200), window.innerWidth - 200), y: below ? r.bottom + 10 : r.top - BAR_H - 8, brand: getComputedStyle(root).getPropertyValue('--brand-rgb').trim() })
      const a = (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement).closest('a')
      setState({ bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), underline: document.queryCommandState('underline'), strike: document.queryCommandState('strikeThrough'), link: a && root.contains(a) ? a.getAttribute('href') : '' })
    }
    const onLink = () => { update(); openLink() }
    document.addEventListener('selectionchange', update)
    window.addEventListener('scroll', update, true)
    window.addEventListener('rich-link', onLink)
    return () => { document.removeEventListener('selectionchange', update); window.removeEventListener('scroll', update, true); window.removeEventListener('rich-link', onLink) }
  }, [])

  const run = (fn) => { fn(); setState((s) => ({ ...s, bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), underline: document.queryCommandState('underline'), strike: document.queryCommandState('strikeThrough') })) }
  const color = (name) => { exec('styleWithCSS', false); exec('foreColor', name === 'brand' ? BRAND_PROBE : name ? COLORS.find((c) => c[0] === name)[2] : DEFAULT_PROBE); setMenu(null) }
  const mark = (name) => { exec('styleWithCSS', true); exec('hiliteColor', name ? MARKS.find((c) => c[0] === name)[2] : 'transparent'); exec('styleWithCSS', false); setMenu(null) }
  function openLink() {
    const sel = window.getSelection()
    if (!sel?.rangeCount || sel.isCollapsed || !rootOf(sel.anchorNode)) return
    saved.current = sel.getRangeAt(0).cloneRange()
    const a = (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement).closest('a')
    setUrl(a?.getAttribute('href') ?? '')
    setMenu('link')
  }
  const restore = () => { const r = saved.current; if (!r) return false; const root = rootOf(r.startContainer); root?.focus(); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); return true }
  const applyLink = () => {
    const raw = url.trim()
    const href = safeHref(/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(raw) ? `https://${raw}` : raw)
    if (!href) return
    if (restore()) exec('createLink', href)
    setMenu(null)
  }
  const unlink = () => { if (menu === 'link') restore(); exec('unlink'); setMenu(null) }

  if (!pos) return null
  const linkOk = !!safeHref(/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(url.trim()) ? `https://${url.trim()}` : url.trim())
  return createPortal(
    <div ref={bar} role="toolbar" aria-label="Định dạng chữ" style={{ left: pos.x, top: pos.y, ...(pos.brand ? { '--brand-rgb': pos.brand } : {}) }} onMouseDown={(e) => { if (e.target.tagName !== 'INPUT') e.preventDefault() }}
      className="fixed z-[70] flex h-11 -translate-x-1/2 items-center gap-0.5 rounded-xl bg-ink px-1.5 shadow-xl">
      {menu === 'link' ? <>
        <Link2 size={16} className="ml-1.5 text-white/70" />
        <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Dán đường dẫn, ví dụ https://…"
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); applyLink() } if (e.key === 'Escape') { setMenu(null); restore() } }}
          className="h-8 w-[260px] rounded-md bg-white/10 px-2.5 text-[13px] text-white outline-none placeholder:text-white/50 focus:bg-white/15" />
        <button type="button" disabled={!linkOk} onClick={applyLink} className="h-8 rounded-md bg-white px-3 text-[13px] font-semibold text-ink disabled:opacity-40">Gắn</button>
        {state.link && <Btn label="Bỏ liên kết" onClick={unlink}><Unlink size={16} /></Btn>}
      </> : <>
        <Btn on={state.bold} label="In đậm (⌘B)" onClick={() => run(() => exec('bold'))}><Bold size={16} strokeWidth={2.5} /></Btn>
        <Btn on={state.italic} label="In nghiêng (⌘I)" onClick={() => run(() => exec('italic'))}><Italic size={16} /></Btn>
        <Btn on={state.underline} label="Gạch chân (⌘U)" onClick={() => run(() => exec('underline'))}><Underline size={16} /></Btn>
        <Btn on={state.strike} label="Gạch ngang" onClick={() => run(() => exec('strikeThrough'))}><Strikethrough size={16} /></Btn>
        <span className="mx-1 h-5 w-px bg-white/20" />
        <div className="relative">
          <button type="button" title="Màu chữ" aria-label="Màu chữ" aria-expanded={menu === 'c'} onClick={() => setMenu(menu === 'c' ? null : 'c')} className={`flex h-8 items-center gap-0.5 rounded-md px-1.5 text-white/80 hover:bg-white/10 hover:text-white ${menu === 'c' ? 'bg-white/10' : ''}`}>
            <span className="flex flex-col items-center leading-none"><span className="text-[14px] font-bold">A</span><span className="mt-0.5 h-[3px] w-4 rounded-full bg-brand" /></span><ChevronDown size={12} /></button>
          {menu === 'c' && <Swatches kind="c" list={COLORS} onPick={color} />}
        </div>
        <div className="relative">
          <button type="button" title="Tô nền chữ" aria-label="Tô nền chữ" aria-expanded={menu === 'm'} onClick={() => setMenu(menu === 'm' ? null : 'm')} className={`flex h-8 items-center gap-0.5 rounded-md px-1.5 text-white/80 hover:bg-white/10 hover:text-white ${menu === 'm' ? 'bg-white/10' : ''}`}><Highlighter size={16} /><ChevronDown size={12} /></button>
          {menu === 'm' && <Swatches kind="m" list={MARKS} onPick={mark} />}
        </div>
        <span className="mx-1 h-5 w-px bg-white/20" />
        <Btn on={!!state.link} label={state.link ? `Sửa liên kết: ${state.link}` : 'Gắn liên kết (⌘K)'} onClick={openLink}><Link2 size={16} /></Btn>
        <Btn label="Xóa định dạng" onClick={() => run(() => { exec('removeFormat'); exec('unlink') })}><RemoveFormatting size={16} /></Btn>
      </>}
    </div>,
    document.body,
  )
}
