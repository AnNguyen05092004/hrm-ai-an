// Sửa trực tiếp kiểu "thấy gì sửa nấy": bấm vào chữ là gõ được ngay, lưu liền vào dữ liệu.
import { Fragment, useEffect, useRef, useState } from 'react'

// Ô chữ sửa tại chỗ. Một dòng: Enter để xong (hoặc onEnter). Nhiều dòng: Enter xuống dòng.
export function Editable({ value, onChange, as: Tag = 'span', className = '', style, placeholder = 'Nhập nội dung', multiline = false, onEnter, onBackspaceEmpty, focus, readOnly }) {
  const ref = useRef()
  // Chỉ đồng bộ chữ từ dữ liệu khi người dùng không đang gõ trong ô, để con trỏ không nhảy
  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.innerText !== (value ?? '')) el.innerText = value ?? ''
  }, [value])
  useEffect(() => {
    if (!focus || !ref.current) return
    const el = ref.current; el.focus()
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false)
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r)
  }, [focus])
  if (readOnly || !onChange) return <Tag className={className} style={style}>{value}</Tag>
  return (
    <Tag
      ref={ref}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck={false}
      data-ph={placeholder}
      className={`ed ${className}`}
      style={style}
      onInput={(e) => { const el = e.currentTarget; let t = el.innerText; if (t === '\n') { t = ''; el.innerHTML = '' } onChange(multiline ? t.replace(/\n$/, '') : t.replace(/\n/g, ' ')) }}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') e.currentTarget.blur()
        if (e.key === 'Enter' && (!multiline || onEnter) && !e.shiftKey) { e.preventDefault(); onEnter ? onEnter() : e.currentTarget.blur() }
        if (e.key === 'Backspace' && onBackspaceEmpty && e.currentTarget.innerText.replace(/\n/g, '') === '') { e.preventDefault(); onBackspaceEmpty() }
      }}
      onClick={(e) => e.stopPropagation()}
      onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')) }}
    />
  )
}

// Danh sách sửa tại chỗ như Word: Enter thêm dòng mới ngay dưới, Backspace ở dòng trống thì xóa dòng
export function EditableList({ items, onChange, render, placeholder = 'Nhập ý', min = 1, itemClass = '', style }) {
  const [f, setF] = useState(null)
  return items.map((x, i) => (
    <Fragment key={i}>{render(
      <Editable
        value={x} placeholder={placeholder} className={itemClass} style={style}
        focus={f?.i === i ? f.n : 0}
        onChange={(v) => onChange(items.map((y, j) => (j === i ? v : y)))}
        onEnter={() => { const n = [...items]; n.splice(i + 1, 0, ''); onChange(n); setF({ i: i + 1, n: Date.now() }) }}
        onBackspaceEmpty={items.length > min ? () => { onChange(items.filter((_, j) => j !== i)); setF({ i: Math.max(0, i - 1), n: Date.now() }) } : undefined}
      />, i)}</Fragment>
  ))
}

// Nút nhỏ hiện khi rê chuột để thêm/xóa phần tử trong khối
export const MiniBtn = ({ onClick, children, title, className = '' }) => (
  <button type="button" title={title} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onClick() }} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-neutral-500 hover:bg-neutral-100 hover:text-ink ${className}`}>{children}</button>
)
