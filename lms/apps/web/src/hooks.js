// Hook dùng chung: theo dõi việc AI chạy nền, tài liệu sửa tại chỗ có tự lưu.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { get, patch } from './api'

/** Hỏi trạng thái việc nền mỗi giây đến khi xong */
export function useJob(jobId, { onDone } = {}) {
  const done = useRef(onDone); done.current = onDone
  const q = useQuery({
    queryKey: ['job', jobId], queryFn: () => get(`/jobs/${jobId}`), enabled: !!jobId,
    refetchInterval: (query) => (['done', 'failed'].includes(query.state.data?.status) ? false : 1000),
  })
  const status = q.data?.status
  useEffect(() => { if (status === 'done' || status === 'failed') done.current?.(q.data) }, [status]) // eslint-disable-line react-hooks/exhaustive-deps
  return q.data
}

const SAVE_DELAY = 700

/**
 * Bản sao cục bộ của một tài liệu để sửa tại chỗ; tự lưu sau khi ngừng gõ.
 * up(draft => { ...sửa trực tiếp... }) giống prototype.
 */
export function useDoc(key, url, toBody) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: key, queryFn: () => get(url) })
  const [doc, setDoc] = useState(null)
  const [saveState, setSave] = useState({ state: 'idle', at: null })
  const pending = useRef(null), timer = useRef(), toBodyRef = useRef(toBody)
  toBodyRef.current = toBody
  useEffect(() => { if (q.data && !pending.current) setDoc(q.data) }, [q.data])

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    const d = pending.current
    if (!d) return
    pending.current = null
    setSave({ state: 'saving', at: null })
    try {
      await patch(url, toBodyRef.current(d))
      qc.setQueryData(key, d)
      setSave({ state: 'saved', at: new Date() })
    } catch (e) {
      if (!pending.current) pending.current = d
      const retry = !e.status || e.status >= 500
      setSave({ state: 'error', at: null, error: e.message, retry })
      if (retry) timer.current = setTimeout(flush, 3000)
    }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  const up = useCallback((fn) => {
    setDoc((prev) => {
      const d = structuredClone(prev); fn(d)
      pending.current = d
      clearTimeout(timer.current); timer.current = setTimeout(flush, SAVE_DELAY)
      return d
    })
  }, [flush])

  // lưu nốt khi rời màn hoặc đóng tab
  useEffect(() => {
    const before = (e) => { if (pending.current) { flush(); e.preventDefault() } }
    window.addEventListener('beforeunload', before)
    return () => { window.removeEventListener('beforeunload', before); flush() }
  }, [flush])

  // reload: bỏ thay đổi chưa lưu (vd. sau khi khôi phục phiên bản cũ)
  const reload = useCallback(async () => { pending.current = null; const d = await qc.fetchQuery({ queryKey: key, queryFn: () => get(url), staleTime: 0 }); setDoc(d) }, [url]) // eslint-disable-line react-hooks/exhaustive-deps
  // refresh: lấy bản mới từ máy chủ (vd. kết quả job nền) mà không làm mất thay đổi đang gõ
  const refresh = useCallback(async () => {
    await flush()
    // staleTime 0: luôn hỏi máy chủ (bản trong bộ đệm có thể còn "mới" theo cấu hình chung 15 giây)
    const d = await qc.fetchQuery({ queryKey: key, queryFn: () => get(url), staleTime: 0 })
    if (!pending.current) setDoc(d)
  }, [url, flush]) // eslint-disable-line react-hooks/exhaustive-deps
  return { doc, up, saveState, flush, reload, refresh, loading: q.isLoading, error: q.error }
}

export const saveLabel = (s) => s.state === 'saving' ? 'Đang lưu…' : s.state === 'error' ? (s.retry ? 'Chưa lưu được, đang thử lại…' : `Không lưu được: ${s.error}`) : s.state === 'saved' ? `Đã lưu lúc ${s.at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Tự động lưu'

/** Trường nội dung của tài liệu (bỏ phần thông tin chung) để gửi khi lưu */
const META = ['id', 'kitId', 'type', 'title', 'summary', 'status', 'img', 'publishedVersion', 'updated', 'updatedAt', 'shareSlug']
export const artifactBody = (a) => ({ title: a.title, summary: a.summary, img: a.img, content: Object.fromEntries(Object.entries(a).filter(([k]) => !META.includes(k))) })

/** Màn hình rộng từ 768px (trình soạn cần màn này; thanh bên mở đầy đủ) */
export const WIDE_QUERY = '(min-width: 768px)'
const subscribeWide = (cb) => { const m = window.matchMedia(WIDE_QUERY); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) }
export const useWide = () => useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE_QUERY).matches)
