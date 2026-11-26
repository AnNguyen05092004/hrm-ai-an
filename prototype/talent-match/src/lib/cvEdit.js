// Các thao tác sửa hồ sơ trong Trình tạo CV — hàm thuần, luôn trả về bản sao mới.
import { SKILLS } from '../data/skills.js'

export const setField = (cv, key, value) => ({ ...cv, [key]: value })
export const setNested = (cv, key, patch) => ({ ...cv, [key]: { ...cv[key], ...patch } })

export const setSkill = (cv, id, level) => ({ ...cv, skills: { ...cv.skills, [id]: level } })
export function removeSkill(cv, id) {
  const { [id]: _drop, ...skills } = cv.skills
  return { ...cv, skills }
}

export const setEntry = (cv, idx, patch) => ({ ...cv, history: cv.history.map((e, i) => (i === idx ? { ...e, ...patch } : e)) })
export const removeEntry = (cv, idx) => ({ ...cv, history: cv.history.filter((_, i) => i !== idx) })
export const addEntry = (cv) => ({
  ...cv,
  history: [{ uid: `e${Date.now().toString(36)}`, title: 'Vị trí mới', org: 'Tên công ty', from: '2025-01', to: null, tags: [], skills: [], note: '', roles: [] }, ...cv.history],
})

export const PLACEHOLDER = '[kết quả cụ thể]'
/** Chèn một câu có từ khoá vào mô tả kinh nghiệm; trả về vị trí phần cần người dùng tự điền. */
export function insertKeyword(cv, idx, skillId) {
  const note = cv.history[idx].note.trim()
  const sentence = `Sử dụng ${SKILLS[skillId].name} để ${PLACEHOLDER}.`
  const next = note ? `${note.replace(/[.\s]*$/, '.')} ${sentence}` : sentence
  const start = next.lastIndexOf(PLACEHOLDER)
  return { cv: setEntry(cv, idx, { note: next }), select: [start, start + PLACEHOLDER.length] }
}

const CHECKS = [
  ['Tóm tắt từ 60 ký tự', (cv) => (cv.summary ?? '').trim().length >= 60],
  ['Ít nhất 6 kỹ năng', (cv) => Object.keys(cv.skills).length >= 6],
  ['Có kinh nghiệm làm việc', (cv) => cv.history.length > 0],
  ['Mô tả kinh nghiệm có kết quả (số liệu)', (cv) => cv.history.some((e) => /\d/.test(e.note))],
  ['Không còn phần [cần điền]', (cv) => !cv.history.some((e) => e.note.includes(PLACEHOLDER))],
  ['Có chứng chỉ ngoại ngữ', (cv) => !/Chưa ghi/.test(cv.english.label)],
  ['Ghi lương kỳ vọng', (cv) => cv.salary != null],
  ['Ghi thời gian nhận việc', (cv) => cv.noticeDays != null],
]
/** Mức hoàn thiện CV (độc lập với vị trí). */
export function completeness(cv) {
  const results = CHECKS.map(([label, ok]) => ({ label, ok: ok(cv) }))
  return { pct: Math.round((results.filter((r) => r.ok).length / results.length) * 100), results }
}

/** Gắn khoá ổn định cho từng mục kinh nghiệm (dùng làm key khi thêm/xoá). */
export const withUids = (cv) => ({ ...cv, history: cv.history.map((e, i) => (e.uid ? e : { ...e, uid: `e${i}-${e.from}` })) })
