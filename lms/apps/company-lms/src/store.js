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
  'not attempted': { label: 'Chưa học', cls: 'bg-slate-100 text-slate-600' },
  incomplete: { label: 'Đang học', cls: 'bg-sky-100 text-sky-800' },
  completed: { label: 'Hoàn thành', cls: 'bg-emerald-100 text-emerald-800' },
  passed: { label: 'Đạt', cls: 'bg-emerald-100 text-emerald-800' },
  failed: { label: 'Chưa đạt', cls: 'bg-red-100 text-red-700' },
  browsed: { label: 'Đã xem thử', cls: 'bg-slate-100 text-slate-600' },
}
export const statusOf = (rec) => rec.lesson_status ?? 'not attempted'
export const isDone = (s) => s === 'passed' || s === 'completed'
