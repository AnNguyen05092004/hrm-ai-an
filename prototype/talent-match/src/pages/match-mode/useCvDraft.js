// Bản nháp CV đang sửa: tự lưu vào store sau mỗi thay đổi, có hoàn tác. Dùng ở Trình tạo CV và Chế độ đối chiếu.
import { useRef, useState } from 'react'
import { useStore } from '../../store.jsx'
import { CVS } from '../../data/cvs.js'
import { withUids } from '../../lib/cvEdit.js'
import { effectiveCv } from '../../lib/extract.js'

const TYPING_MS = 900 // các phím gõ liên tiếp gộp thành 1 bước hoàn tác
const MAX_UNDO = 50

export function useCvDraft() {
  const s = useStore()
  const [st, setSt] = useState(() => ({ id: s.meId, cv: withUids(s.rawCv(s.meId)), past: [] }))
  const [meta, setMeta] = useState({})
  const last = useRef(0)
  if (st.id !== s.meId) setSt({ id: s.meId, cv: withUids(s.rawCv(s.meId)), past: [] })

  const change = (next, m = {}) => {
    const discrete = Boolean(m.flash || m.focus)
    const now = Date.now()
    const push = discrete || now - last.current > TYPING_MS
    last.current = discrete ? 0 : now
    setSt((x) => ({ ...x, cv: next, past: push ? [...x.past.slice(-MAX_UNDO + 1), x.cv] : x.past }))
    s.saveCv(next)
    setMeta(m)
  }
  const undo = () => {
    const prev = st.past[st.past.length - 1]
    if (!prev) return
    setSt((x) => ({ ...x, cv: prev, past: x.past.slice(0, -1) }))
    s.saveCv(prev)
    setMeta({})
  }
  const original = CVS.find((c) => c.id === st.id)
  const reset = original ? () => {
    s.resetCv(st.id)
    setSt((x) => ({ ...x, cv: withUids(original), past: [...x.past, x.cv] }))
    setMeta({})
  } : null
  const { cv: scored, derived } = effectiveCv(st.cv)
  return { cv: st.cv, scored, derived, change, undo, canUndo: st.past.length > 0, meta, reset, isEdited: s.isCvEdited(st.id) }
}
