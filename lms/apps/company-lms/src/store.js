// Dữ liệu của cổng đào tạo demo: danh mục gói, việc giao, bản ghi SCORM của từng học viên.
// Lưu trên trình duyệt này (localStorage); tệp của gói nằm ở Cache Storage (pkg.js).
import { useSyncExternalStore } from 'react'

const KEY = 'company-lms-demo-v1'
export const ADMIN = { id: 'NV0001', name: 'Nguyễn An', role: 'Giám đốc · Quản trị đào tạo', initials: 'NA' }
export const LEARNERS = [{ id: 'NV0014', name: 'Phạm Thu Hà', scormName: 'Phạm, Thu Hà', role: 'Nhân viên', initials: 'TH' }]

const EMPTY = { packages: [], records: {} }
function load() {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return EMPTY }
}
let data = load()
const subs = new Set()

export function update(fn) {
  data = fn(data)
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* trình duyệt chặn lưu: vẫn chạy trong phiên này */ }
  subs.forEach((f) => f())
}
export const useData = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => data)
export const recKey = (pkgId, userId) => `${pkgId}|${userId}`
export const getRecord = (pkgId, userId) => data.records[recKey(pkgId, userId)] ?? {}
export const saveRecord = (pkgId, userId, rec) => update((d) => ({ ...d, records: { ...d.records, [recKey(pkgId, userId)]: rec } }))
export const resetRecord = (pkgId, userId) => update((d) => ({ ...d, records: Object.fromEntries(Object.entries(d.records).filter(([k]) => k !== recKey(pkgId, userId))) }))

export const STATUS = {
  'not attempted': { label: 'Chưa học', cls: 'bg-muted text-ink-muted' },
  incomplete: { label: 'Đang học', cls: 'bg-info-surface text-ink', dot: 'bg-info' },
  completed: { label: 'Hoàn thành', cls: 'bg-success-surface text-success-text' },
  passed: { label: 'Đạt', cls: 'bg-success-surface text-success-text' },
  failed: { label: 'Chưa đạt', cls: 'bg-danger-surface text-danger-text' },
  browsed: { label: 'Đã xem thử', cls: 'bg-muted text-ink-muted' },
  grading: { label: 'Chờ chấm', cls: 'bg-warning-surface text-warning-text', dot: 'bg-warning' },
  in_progress: { label: 'Đang làm bài', cls: 'bg-info-surface text-ink', dot: 'bg-info' },
}
export const statusOf = (rec) => rec.lesson_status ?? 'not attempted'
export const isDone = (s) => s === 'passed' || s === 'completed'

/** Lượt thi đề QTI của một học viên; lượt đang làm cũng tính là đã dùng */
export const attemptsOf = (rec) => rec.attempts ?? []
/** Cập nhật một lượt thi rồi tính lại trạng thái chung: lấy lượt có kết quả tốt nhất, chưa có thì lượt mới nhất */
export function saveAttempt(pkg, userId, attempt) {
  const rec = getRecord(pkg.id, userId)
  const attempts = [...attemptsOf(rec).filter((a) => a.id !== attempt.id), attempt].sort((a, b) => a.start - b.start)
  const graded = attempts.filter((a) => a.status === 'passed' || a.status === 'failed')
  const best = graded.sort((a, b) => b.score - a.score)[0]
  const latest = attempts[attempts.length - 1]
  const status = best?.status === 'passed' ? 'passed' : attempts.some((a) => a.status === 'grading') ? 'grading' : best?.status ?? latest.status
  saveRecord(pkg.id, userId, { ...rec, attempts, lesson_status: status, score: { raw: best ? String(best.score) : '' }, firstAt: rec.firstAt ?? attempt.start, lastAt: Date.now() })
}
