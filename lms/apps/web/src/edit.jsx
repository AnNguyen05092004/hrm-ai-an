// Sửa trực tiếp kiểu "thấy gì sửa nấy": bấm vào chữ là gõ được ngay, lưu liền vào dữ liệu.
import { Fragment, useEffect, useRef, useState } from 'react'
import { editorToRich, richHtml, richToEditor } from './rich'

// Ô chữ sửa tại chỗ. Một dòng: Enter để xong (hoặc onEnter). Nhiều dòng: Enter xuống dòng.
// rich: cho phép đậm/nghiêng/màu… (thanh định dạng hiện khi bôi đen, xem RichToolbar); giá trị lưu dạng chuỗi trong rich.js
export function Editable({ value, onChange, as: Tag = 'span', className = '', style, placeholder = 'Nhập nội dung', multiline = false, onEnter, onBackspaceEmpty, focus, readOnly, rich = false }) {
  const ref = useRef()
  // Chỉ đồng bộ chữ từ dữ liệu khi người dùng không đang gõ trong ô, để con trỏ không nhảy
  useEffect(() => {
    const el = ref.current
    if (!el || document.activeElement === el) return
    if (rich) { if (editorToRich(el) !== (value ?? '')) el.innerHTML = richToEditor(value) }
    else if (el.innerText !== (value ?? '')) el.innerText = value ?? ''
  }, [value, rich])
  useEffect(() => {
    if (!focus || !ref.current) return
    const el = ref.current; el.focus()
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false)
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r)
  }, [focus])
  if (readOnly || !onChange) return rich ? <Rich as={Tag} text={value} className={className} style={style} /> : <Tag className={className} style={style}>{value}</Tag>
  const emit = (el) => {
    if (rich) { const v = editorToRich(el); if (!v && el.innerHTML) el.innerHTML = ''; onChange(multiline ? v : v.replace(/<br>/g, ' ')); return }
    let t = el.innerText; if (t === '\n') { t = ''; el.innerHTML = '' } onChange(multiline ? t.replace(/\n$/, '') : t.replace(/\n/g, ' '))
  }
  return (
    <Tag
      ref={ref}
      contentEditable={rich ? 'true' : 'plaintext-only'}
      data-rich={rich ? '' : undefined}
      suppressContentEditableWarning
      spellCheck={false}
      data-ph={placeholder}
      className={`ed ${className}`}
      style={style}
      onInput={(e) => emit(e.currentTarget)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') e.currentTarget.blur()
        if (e.key === 'Enter' && (!multiline || onEnter) && !e.shiftKey) { e.preventDefault(); onEnter ? onEnter() : e.currentTarget.blur() }
        // ô nhiều dòng có định dạng: Enter xuống dòng bằng <br>, không sinh <div> lồng nhau
        else if (e.key === 'Enter' && rich && multiline) { e.preventDefault(); document.execCommand('insertLineBreak') }
        if (rich && (e.metaKey || e.ctrlKey) && !e.altKey) {
          const k = e.key.toLowerCase()
          if (k === 'b' || k === 'i' || k === 'u') { e.preventDefault(); document.execCommand({ b: 'bold', i: 'italic', u: 'underline' }[k]) }
          if (k === 'k') { e.preventDefault(); window.dispatchEvent(new CustomEvent('rich-link')) }
        }
        if (e.key === 'Backspace' && onBackspaceEmpty && e.currentTarget.innerText.replace(/\n/g, '') === '') { e.preventDefault(); onBackspaceEmpty() }
      }}
      onClick={(e) => e.stopPropagation()}
      onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')) }}
    />
  )
}

/** Hiển thị chữ có định dạng (chỉ các thẻ cho phép, xem rich.js) */
export function Rich({ text, as: Tag = 'span', className = '', style }) {
  return <Tag className={`rich ${className}`} style={style} dangerouslySetInnerHTML={{ __html: richHtml(text) }} />
}

// Danh sách sửa tại chỗ như Word: Enter thêm dòng mới ngay dưới, Backspace ở dòng trống thì xóa dòng
export function EditableList({ items, onChange, render, placeholder = 'Nhập ý', min = 1, itemClass = '', style, rich }) {
  const [f, setF] = useState(null)
  return items.map((x, i) => (
    <Fragment key={i}>{render(
      <Editable
        value={x} placeholder={placeholder} className={itemClass} style={style} rich={rich}
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
