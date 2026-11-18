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
  const timer = useRef()
  const say = useCallback((msg) => { setToast(msg); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 2800) }, [])
  return <Ctx.Provider value={{ say, toast }}>{children}</Ctx.Provider>
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
