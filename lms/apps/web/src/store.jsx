// Trạng thái dùng chung phía trình duyệt: người dùng đang đăng nhập, thông báo nhanh.
import { createContext, useContext, useCallback, useRef, useState } from 'react'
import { QueryClient, useQuery } from '@tanstack/react-query'
import { get } from './api'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: (n, e) => e?.status >= 500 && n < 2, refetchOnWindowFocus: false } },
})

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [ask, setAsk] = useState(null)
  const timer = useRef()
  const say = useCallback((msg) => { setToast(msg); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 2800) }, [])
  // Hộp xác nhận trong app thay cho window.confirm: await confirmBox('...')
  const confirmBox = useCallback((text, { ok = 'Đồng ý', danger = false } = {}) => new Promise((resolve) => setAsk({ text, ok, danger, resolve })), [])
  const close = (v) => { ask?.resolve(v); setAsk(null) }
  return (
    <Ctx.Provider value={{ say, toast, confirmBox }}>
      {children}
      {ask && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/35 p-4" onMouseDown={() => close(false)}>
          <div role="dialog" aria-modal="true" className="fade w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-pop" onMouseDown={(e) => e.stopPropagation()}>
            <p className="text-[16px] leading-relaxed">{ask.text}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-line h-10" onClick={() => close(false)}>Hủy</button>
              <button autoFocus className={`btn h-10 px-5 text-white ${ask.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-ink hover:bg-neutral-800'}`} onClick={() => close(true)}>{ask.ok}</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

export const useStore = () => useContext(Ctx)

const HOME = { author: '/', learner: '/learn' }
export function useMe() {
  const q = useQuery({ queryKey: ['me'], queryFn: () => get('/auth/me'), retry: false, staleTime: 60_000 })
  const me = q.data ? { ...q.data, initials: initials(q.data.name), home: HOME[q.data.role] } : null
  return { me, role: me?.role, loading: q.isLoading, error: q.error }
}

export const initials = (name = '') => { const p = name.trim().split(/\s+/); return ((p[p.length - 2]?.[0] ?? '') + (p[p.length - 1]?.[0] ?? '')).toUpperCase() }
export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 8)}`
