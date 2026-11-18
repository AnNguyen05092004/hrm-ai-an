import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { SEED, ROLES } from './data'

const KEY = 'lms-proto-v3'
const Ctx = createContext(null)

const load = () => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) { const s = JSON.parse(raw); if (Array.isArray(s.checklist)) return s }
  } catch { /* bỏ qua */ }
  return structuredClone(SEED)
}

export function StoreProvider({ children }) {
  const [S, setRaw] = useState(load)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)) } catch { /* bỏ qua */ }
  }, [S])

  // set(draft => { ...sửa trực tiếp... })
  const set = useCallback((fn) => setRaw((prev) => { const d = structuredClone(prev); fn(d); return d }), [])
  const say = useCallback((msg) => { setToast(msg); clearTimeout(window.__tt); window.__tt = setTimeout(() => setToast(null), 2600) }, [])
  const reset = () => { localStorage.removeItem(KEY); setRaw(structuredClone(SEED)); say('Đã đặt lại dữ liệu mẫu') }

  return <Ctx.Provider value={{ S, set, say, reset, toast }}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
export const useRole = () => { const { S } = useContext(Ctx); const role = ROLES[S.role] ? S.role : 'author'; return { role, me: ROLES[role] } }
export const tick = (d, i) => { if (!d.checklist.includes(i)) d.checklist.push(i) }
export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 8)}`
