// Xếp hạng các tin đang mở theo hồ sơ của ứng viên đang xem (dùng ở Trang chủ, Theo dõi việc làm).
import { useMemo } from 'react'
import { useStore } from '../store.jsx'
import { rankJobs } from '../lib/match.js'
import { seedTracker, normalizeStatus } from '../lib/tracker.js'

export function useMyRanking() {
  const s = useStore()
  const cv = s.cv(s.meId)
  const ranking = useMemo(
    () => rankJobs(cv, s.jobs.filter((j) => s.statusOf(j.id) !== 'draft'), (j) => s.criteriaOf(j.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tính lại khi đổi hồ sơ, tin hoặc tiêu chí
    [cv, s.jobs, s.criteria, s.status],
  )
  const stored = s.trackerOf(cv.id) ?? seedTracker(cv, ranking, s.hasApplied)
  // Việc đã ứng tuyển (kể cả ứng tuyển 1 chạm) luôn có mặt và ít nhất ở bước "Đã ứng tuyển".
  const tracker = Object.fromEntries(ranking.flatMap(({ job }) => {
    const t = stored[job.id]
    const applied = s.hasApplied(cv.id, job.id)
    if (!t && !applied) return []
    const base = t ? { ...t, status: normalizeStatus(t.status) } : { savedAt: '2026-11-20', excitement: 3, status: 'applied' }
    const early = ['saved', 'applying'].includes(base.status)
    return [[job.id, applied && early ? { ...base, status: 'applied', appliedAt: base.appliedAt ?? '2026-11-20' } : base]]
  }))
  const setTrack = (jobId, patch) => {
    const prev = tracker[jobId] ?? { status: 'saved', savedAt: '2026-11-20', excitement: 3 }
    const appliedAt = patch.status === 'applied' && !prev.appliedAt ? '2026-11-20' : prev.appliedAt
    s.setTracker(cv.id, { ...tracker, [jobId]: { ...prev, ...patch, ...(appliedAt ? { appliedAt } : {}) } })
  }
  const untrack = (...jobIds) => s.setTracker(cv.id, Object.fromEntries(Object.entries(tracker).filter(([k]) => !jobIds.includes(k))))
  return { cv, ranking, tracker, setTrack, untrack }
}
