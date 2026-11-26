// Bản nháp JD khi sửa trực tiếp trên tài liệu: chuyển qua lại giữa tin tuyển dụng và dạng có id từng dòng (để sửa, chèn, xoá dòng).
import { criteriaFromJob } from './extract.js'
import { labelOf } from './criteria.js'

export const uid = () => `l-${Math.random().toString(36).slice(2, 9)}`
const toLines = (list) => (list.length ? list : ['']).map((text) => ({ id: uid(), text }))
export const cleanLine = (text) => text.replace(/\s+/g, ' ').trim()
const clean = (lines) => lines.map((l) => cleanLine(l.text)).filter(Boolean)

/** Tin → bản nháp. */
export function toDraft(job) {
  return {
    title: job.title, dept: job.dept, level: job.level, city: job.city, mode: job.mode,
    salaryMin: job.salary.min, salaryMax: job.salary.max, headcount: job.headcount, noticeDays: job.noticeDays,
    summary: job.summary, responsibilities: toLines(job.responsibilities), requirements: toLines(job.requirements),
  }
}

/** Bản nháp → các trường của tin (đã làm sạch khoảng trắng, bỏ dòng rỗng). */
export function fromDraft(d) {
  return {
    title: d.title.trim(), dept: d.dept.trim() || 'Chưa gán phòng ban', level: d.level.trim() || '—', city: d.city, mode: d.mode,
    salary: { min: d.salaryMin, max: d.salaryMax }, salaryKnown: d.salaryMax > 0, headcount: d.headcount, noticeDays: d.noticeDays,
    summary: d.summary.trim(), responsibilities: clean(d.responsibilities), requirements: clean(d.requirements),
  }
}

const FIELDS = ['title', 'dept', 'level', 'city', 'mode', 'salary', 'headcount', 'noticeDays', 'summary', 'responsibilities', 'requirements']
const pick = (j) => JSON.stringify(FIELDS.map((k) => j[k]))
/** Bản nháp có khác tin đang lưu không. */
export const isDirty = (job, draft) => Boolean(draft) && pick(fromDraft(draft)) !== pick(fromDraft(toDraft(job)))

/** Phần JD ảnh hưởng tới tiêu chí — đổi phần này thì nên trích lại. */
const criteriaInput = (j) => JSON.stringify([j.requirements, j.responsibilities, j.city, j.mode, j.salary.min, j.salary.max, j.noticeDays])
export const affectsCriteria = (job, fields) => criteriaInput({ ...job, ...fields }) !== criteriaInput(job)

const META_TYPES = ['location', 'salary', 'availability']
const isInferred = (src) => /AI đề xuất|Suy ra|Người tuyển dụng thêm/.test(src)
const unellipsis = (t) => t.replace(/…/g, '').trim()
/** Dòng JD mà tiêu chí được trích từ đó (khớp mềm vì src của dữ liệu mẫu có thể là đoạn trích có “…”). */
export const sourceLine = (item, lines) => {
  const src = unellipsis(item.src ?? '')
  return src ? lines.find((l) => l === src || l.includes(src) || src.includes(l.slice(0, 24))) : undefined
}
const DEFAULT_WEIGHT = { must: 30, important: 20, bonus: 10 }

/**
 * Trích lại tiêu chí theo dòng (kiểu "track changes"): dòng JD không đổi giữ nguyên tiêu chí cũ (cả trọng số, mức đã chỉnh tay);
 * dòng mới / dòng đã sửa được trích lại; dòng bị xoá thì bỏ tiêu chí của nó. Tiêu chí điều kiện làm việc và tiêu chí
 * AI suy ra / người tuyển dụng thêm luôn được giữ. Trọng số trong nhóm và trọng số nhóm được quy về đủ 100 theo tỷ lệ.
 */
export function mergeCriteria(current, extracted, oldLines, newLines) {
  const still = new Set(newLines)
  const fresh = new Set(newLines.filter((l) => !oldLines.includes(l)))
  const groups = current.groups.map((g) => {
    const ext = extracted.groups.find((x) => x.id === g.id)?.items ?? []
    const kept = g.items.filter((i) => {
      if (META_TYPES.includes(i.type) || isInferred(i.src)) return true
      const line = sourceLine(i, oldLines)
      return line === undefined || still.has(line)
    })
    const keptLabels = new Set(kept.map(labelOf))
    const dropped = Object.fromEntries(g.items.filter((i) => !kept.includes(i)).map((i) => [labelOf(i), i]))
    const added = ext
      .filter((i) => fresh.has(i.src) && !keptLabels.has(labelOf(i)))
      .map((i) => {
        const prev = dropped[labelOf(i)]
        return { ...i, id: prev?.id ?? `e-${i.id}-${labelOf(i)}`, weight: prev?.weight ?? DEFAULT_WEIGHT[i.req] }
      })
    const items = [...kept, ...added]
    const total = items.reduce((n, i) => n + (Number(i.weight) || 0), 0)
    const scaled = total ? items.map((i) => ({ ...i, weight: Math.round(((Number(i.weight) || 0) / total) * 100) })) : items
    const diff = scaled.length ? 100 - scaled.reduce((n, i) => n + i.weight, 0) : 0
    const fixed = scaled.map((i, idx) => (idx === 0 ? { ...i, weight: i.weight + diff } : i))
    const weight = g.weight || (items.length ? extracted.groups.find((x) => x.id === g.id)?.weight ?? 0 : 0)
    return { ...g, weight, items: fixed }
  })
  const active = groups.filter((g) => g.items.length)
  const sum = active.reduce((n, g) => n + g.weight, 0)
  if (!sum || sum === 100) return { ...current, groups }
  const rounded = groups.map((g) => (g.items.length ? Math.round((g.weight / sum) * 100) : 0))
  const first = rounded.findIndex((w) => w > 0)
  const delta = 100 - rounded.reduce((a, b) => a + b, 0)
  return { ...current, groups: groups.map((g, i) => ({ ...g, weight: rounded[i] + (i === first ? delta : 0) })) }
}

/** Tiêu chí sau khi sửa JD: trích từ JD mới rồi gộp với bộ đang dùng theo từng dòng. */
export function previewCriteria(job, fields, current = job.criteria) {
  const extracted = criteriaFromJob({ ...job, ...fields })
  const lines = (j) => [...j.requirements, ...j.responsibilities].map(cleanLine)
  return mergeCriteria(current, extracted, lines(job), lines({ ...job, ...fields }))
}

export function validate(fields) {
  return [
    !fields.title && 'Chưa có chức danh.',
    fields.salary.max > 0 && fields.salary.min > fields.salary.max && 'Lương tối thiểu đang lớn hơn lương tối đa.',
    !fields.requirements.length && 'Cần ít nhất một dòng yêu cầu để AI trích tiêu chí.',
  ].filter(Boolean)
}

export const draftKey = (jobId) => `jdDraft:${jobId}`
