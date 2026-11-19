// Khung vẽ cuộn được và phóng to/thu nhỏ (trình soạn tình huống).
// - Cuộn theo kích thước thật của nội dung (đo từ các thẻ con, không theo transform)
// - ⌘/Ctrl + lăn chuột: phóng quanh con trỏ; nút +/−: phóng quanh giữa khung
// - Kéo vùng trống để di chuyển
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export const ZOOM_MIN = 30
export const ZOOM_MAX = 150
const PAD = 80 // chừa mép phải/dưới để thẻ cuối không dính sát viền
const clamp = (z) => Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)))

/** top: khoảng chừa phía trên nội dung (px, không co giãn theo mức phóng) cho các bảng nổi */
export function useCanvas(initial = 80, active = true, top = 0) {
  const view = useRef(null)
  const layer = useRef(null)
  const [zoom, setZoomState] = useState(initial)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const zoomRef = useRef(initial)

  // đo nội dung sau mỗi lần vẽ: thẻ thêm/bớt, chữ dài ra đều đổi kích thước
  useLayoutEffect(() => {
    const el = layer.current
    if (!el) return
    let w = 0, h = 0
    for (const c of el.children) {
      if (c.tagName === 'svg') continue
      w = Math.max(w, c.offsetLeft + c.offsetWidth)
      h = Math.max(h, c.offsetTop + c.offsetHeight)
    }
    if (w !== size.w || h !== size.h) setSize({ w, h })
  })

  /** Đổi mức phóng, giữ nguyên điểm (x, y) trong khung (toạ độ màn hình) dưới con trỏ */
  const zoomAt = useCallback((next, x, y) => {
    const v = view.current
    const z = clamp(next), prev = zoomRef.current
    if (!v || z === prev) return
    const r = v.getBoundingClientRect()
    const ox = (x ?? r.left + r.width / 2) - r.left, oy = (y ?? r.top + r.height / 2) - r.top
    const cx = (v.scrollLeft + ox) / (prev / 100), cy = (v.scrollTop + oy) / (prev / 100)
    zoomRef.current = z
    setZoomState(z)
    requestAnimationFrame(() => { v.scrollLeft = cx * (z / 100) - ox; v.scrollTop = cy * (z / 100) - oy })
  }, [])

  const fit = useCallback(() => {
    const v = view.current
    if (!v || !size.w) return
    zoomAt(Math.min(100, ((v.clientWidth - 40) / (size.w + PAD)) * 100, ((v.clientHeight - top - 20) / (size.h + PAD)) * 100))
    requestAnimationFrame(() => { v.scrollLeft = 0; v.scrollTop = 0 })
  }, [size, top, zoomAt])

  // lăn chuột kèm ⌘/Ctrl (hoặc chụm hai ngón trên trackpad) để phóng; cần listener không passive mới chặn được trình duyệt phóng cả trang
  useEffect(() => {
    const v = view.current
    if (!v || !active) return
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      zoomAt(zoomRef.current * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY)
    }
    v.addEventListener('wheel', onWheel, { passive: false })
    return () => v.removeEventListener('wheel', onWheel)
  }, [active, zoomAt])

  // kéo vùng trống để di chuyển (không bắt khi bấm vào thẻ, nút, ô chữ)
  const drag = useRef(null)
  const onPointerDown = (e) => {
    if (e.button !== 0 || e.target.closest('[data-node], button, [contenteditable], input, textarea')) return
    drag.current = { x: e.clientX, y: e.clientY, l: view.current.scrollLeft, t: view.current.scrollTop }
    view.current.setPointerCapture(e.pointerId)
    view.current.style.cursor = 'grabbing'
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    view.current.scrollLeft = d.l - (e.clientX - d.x)
    view.current.scrollTop = d.t - (e.clientY - d.y)
  }
  const onPointerUp = (e) => {
    if (!drag.current) return
    drag.current = null
    view.current.releasePointerCapture?.(e.pointerId)
    view.current.style.cursor = ''
  }

  const s = zoom / 100
  return {
    zoom, zoomIn: () => zoomAt(zoomRef.current + 10), zoomOut: () => zoomAt(zoomRef.current - 10), reset: () => zoomAt(100), fit,
    viewProps: { ref: view, onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    sizerStyle: { position: 'relative', width: (size.w + PAD) * s, height: top + (size.h + PAD) * s },
    layerProps: { ref: layer, style: { position: 'absolute', left: 0, top, width: size.w + PAD, height: size.h + PAD, transform: `scale(${s})`, transformOrigin: '0 0' } },
  }
}
