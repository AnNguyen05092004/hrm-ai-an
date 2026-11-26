// Trạng thái demo dùng chung (thay cho API). Lưu localStorage để tải lại trang không mất thao tác.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { JOBS } from './data/jobs.js'
import { CVS } from './data/cvs.js'
import { effectiveCv } from './lib/extract.js'

const KEY = 'talent-match-demo-v1'
const INITIAL = {
  role: 'recruiter', meId: 'cv-19', masked: false, criteria: {}, status: {}, shortlist: {}, invited: {}, applied: {},
  cvEdits: {}, // hồ sơ ứng viên đã sửa trong Trình tạo CV, hoặc tải lên ở trang đích (id → hồ sơ đầy đủ)
  extraJobs: [], // tin nháp tạo từ JD tải lên
  jobEdits: {}, // jobId → phần JD đã sửa trực tiếp (ghi đè lên tin gốc; xoá để khôi phục)
  tracker: {}, // cvId → { jobId → { status, savedAt, excitement } }
  prefs: {}, // tuỳ chọn nhỏ của người dùng: mục tiêu nghề nghiệp, việc đã xem hướng dẫn…
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...INITIAL, ...JSON.parse(raw) } : INITIAL
  } catch {
    return INITIAL
  }
}

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, setState] = useState(load)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* bộ nhớ trình duyệt bị chặn: chỉ mất tính năng nhớ phiên */ }
  }, [state])

  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const patch = useCallback((fn) => setState((s) => ({ ...s, ...fn(s) })), [])
  const notify = useCallback((text) => setToast({ text, at: Date.now() }), [])

  const cvs = useMemo(() => {
    // Hồ sơ đã sửa / tải lên được chấm theo bản "hiệu lực" (kỹ năng trong kinh nghiệm tính mức Cơ bản) — hai phía thấy cùng điểm.
    const base = CVS.map((c) => (state.cvEdits[c.id] ? effectiveCv(state.cvEdits[c.id]).cv : c))
    const uploaded = Object.values(state.cvEdits).filter((c) => !CVS.some((x) => x.id === c.id)).map((c) => effectiveCv(c).cv)
    return [...base, ...uploaded]
  }, [state.cvEdits])
  const jobs = useMemo(
    () => [...JOBS, ...state.extraJobs].map((j) => (state.jobEdits[j.id] ? { ...j, ...state.jobEdits[j.id] } : j)),
    [state.extraJobs, state.jobEdits],
  )

  const api = useMemo(() => {
    const jobById = (id) => jobs.find((j) => j.id === id)
    const cvById = (id) => cvs.find((c) => c.id === id)
    const toggleIn = (map, key, id) => {
      const list = map[key] ?? []
      return { ...map, [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] }
    }
    return {
      ...state, toast, notify,
      jobs, cvs,
      job: (id) => jobById(id),
      cv: (id) => cvById(id),
      rawCv: (id) => state.cvEdits[id] ?? CVS.find((c) => c.id === id),
      criteriaOf: (jobId) => state.criteria[jobId] ?? jobById(jobId)?.criteria,
      statusOf: (jobId) => state.status[jobId] ?? jobById(jobId)?.status,
      isEdited: (jobId) => Boolean(state.criteria[jobId]),
      setRole: (role) => patch(() => ({ role })),
      setMe: (meId) => patch(() => ({ meId })),
      setMasked: (masked) => patch(() => ({ masked })),
      saveCriteria: (jobId, criteria) => patch((s) => ({ criteria: { ...s.criteria, [jobId]: criteria }, status: { ...s.status, [jobId]: 'confirmed' } })),
      resetCriteria: (jobId) => patch((s) => {
        const { [jobId]: _c, ...criteria } = s.criteria
        const { [jobId]: _s, ...status } = s.status
        return { criteria, status }
      }),
      isShortlisted: (jobId, cvId) => (state.shortlist[jobId] ?? []).includes(cvId),
      toggleShortlist: (jobId, cvId) => patch((s) => ({ shortlist: toggleIn(s.shortlist, jobId, cvId) })),
      isInvited: (jobId, cvId) => Boolean(state.invited[`${jobId}:${cvId}`]),
      invite: (jobId, cvId) => patch((s) => ({ invited: { ...s.invited, [`${jobId}:${cvId}`]: true } })),
      hasApplied: (cvId, jobId) => (state.applied[cvId] ?? []).includes(jobId) || cvById(cvId)?.appliedTo.includes(jobId),
      apply: (cvId, jobId) => patch((s) => ({ applied: { ...s.applied, [cvId]: [...(s.applied[cvId] ?? []), jobId] } })),
      saveCv: (cv) => patch((s) => ({ cvEdits: { ...s.cvEdits, [cv.id]: { ...cv, updatedAt: '2026-11-20' } } })),
      isCvEdited: (cvId) => Boolean(state.cvEdits[cvId]) && CVS.some((c) => c.id === cvId),
      resetCv: (cvId) => patch((s) => {
        const { [cvId]: _drop, ...cvEdits } = s.cvEdits
        return { cvEdits }
      }),
      /**
       * Lưu JD sửa trực tiếp. criteria (tuỳ chọn) = tiêu chí AI trích lại từ JD mới: thay đề xuất AI của tin,
       * bỏ phần chỉnh tay cũ và đưa tin về trạng thái "chờ chốt" để người tuyển dụng duyệt lại.
       */
      saveJob: (jobId, fields, criteria) => patch((s) => {
        const jobEdits = { ...s.jobEdits, [jobId]: { ...s.jobEdits[jobId], ...fields, ...(criteria ? { criteria } : {}) } }
        if (!criteria) return { jobEdits }
        const { [jobId]: _c, ...rest } = s.criteria
        return { jobEdits, criteria: rest, status: { ...s.status, [jobId]: 'draft' } }
      }),
      isJobEdited: (jobId) => Boolean(state.jobEdits[jobId]),
      resetJob: (jobId) => patch((s) => {
        const { [jobId]: _j, ...jobEdits } = s.jobEdits
        const { [jobId]: _c, ...criteria } = s.criteria
        const { [jobId]: _s, ...status } = s.status
        return { jobEdits, criteria, status }
      }),
      addJob: (job) => patch((s) => ({ extraJobs: [...s.extraJobs.filter((j) => j.id !== job.id), job] })),
      trackerOf: (cvId) => state.tracker[cvId],
      pref: (key, fallback) => state.prefs[key] ?? fallback,
      setPref: (key, value) => patch((s) => ({ prefs: { ...s.prefs, [key]: value } })),
      setTracker: (cvId, map) => patch((s) => ({ tracker: { ...s.tracker, [cvId]: map } })),
      resetDemo: () => setState(INITIAL),
    }
  }, [state, toast, notify, patch, cvs, jobs])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore phải nằm trong StoreProvider')
  return v
}

/** Tên hiển thị — khi bật "Ẩn danh khi sàng lọc" chỉ hiện mã hồ sơ. */
export const displayName = (cv, masked) => (masked ? `Ứng viên #${cv.id.slice(3)}` : cv.name)
