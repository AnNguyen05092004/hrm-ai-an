import { forwardRef, useLayoutEffect, useRef, useImperativeHandle } from 'react'
import { cx } from '../ui.jsx'

/** Ô nhập nhiều dòng tự giãn theo nội dung. */
const AutoTextarea = forwardRef(function AutoTextarea({ className, value, ...rest }, ref) {
  const inner = useRef(null)
  useImperativeHandle(ref, () => inner.current)
  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])
  return (
    <textarea ref={inner} rows={2} value={value} {...rest}
      className={cx('block w-full resize-none rounded-lg border-0 bg-transparent px-2.5 py-2 text-sm leading-relaxed text-ink ring-1 ring-transparent transition hover:ring-line focus:bg-white focus:ring-2 focus:ring-accent-500/40', className)} />
  )
})
export default AutoTextarea
