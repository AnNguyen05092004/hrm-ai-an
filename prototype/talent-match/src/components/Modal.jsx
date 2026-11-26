import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/** Hộp thoại đơn giản: Esc / bấm nền để đóng, tự đưa focus vào hộp. */
export default function Modal({ title, onClose, children }) {
  const box = useRef(null)
  useEffect(() => {
    const prev = document.activeElement
    box.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [onClose])
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-pop outline-none">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="-mr-2 -mt-1 rounded-full p-1.5 text-mute hover:bg-soft hover:text-ink" aria-label="Đóng"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
