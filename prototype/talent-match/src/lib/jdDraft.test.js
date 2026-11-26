import { test, expect } from 'vitest'
import { JOBS } from '../data/jobs.js'
import { toDraft, fromDraft, isDirty, affectsCriteria, validate, previewCriteria } from './jdDraft.js'

const job = JOBS[1]

test('bản nháp chưa sửa không bị coi là thay đổi; khoảng trắng thừa và dòng rỗng được bỏ', () => {
  const d = toDraft(job)
  expect(isDirty(job, null)).toBe(false)
  expect(isDirty(job, d)).toBe(false)
  const padded = { ...d, title: `  ${d.title}  `, requirements: [...d.requirements, { id: 'x', text: '   ' }] }
  expect(isDirty(job, padded)).toBe(false)
  expect(fromDraft(padded).requirements).toEqual(job.requirements)
})

test('sửa chức danh là thay đổi nhưng không ảnh hưởng tiêu chí; sửa yêu cầu thì có', () => {
  const d = toDraft(job)
  const renamed = { ...d, title: 'Kỹ sư Backend (Java) – Senior' }
  expect(isDirty(job, renamed)).toBe(true)
  expect(affectsCriteria(job, fromDraft(renamed))).toBe(false)
  const more = { ...d, requirements: [...d.requirements, { id: 'n', text: 'Bắt buộc có kinh nghiệm Kubernetes.' }] }
  expect(affectsCriteria(job, fromDraft(more))).toBe(true)
  const items = previewCriteria(job, fromDraft(more)).groups.flatMap((g) => g.items)
  expect(items.some((i) => i.skill === 'kubernetes' && i.req === 'must')).toBe(true)
})

test('chặn lưu khi thiếu chức danh, lương ngược, hoặc không còn yêu cầu', () => {
  const d = toDraft(job)
  expect(validate(fromDraft(d))).toEqual([])
  expect(validate(fromDraft({ ...d, title: ' ' }))).toHaveLength(1)
  expect(validate(fromDraft({ ...d, salaryMin: 50, salaryMax: 40 }))).toHaveLength(1)
  expect(validate(fromDraft({ ...d, requirements: [{ id: 'a', text: '' }] }))).toHaveLength(1)
})

const labels = (c) => c.groups.flatMap((g) => g.items).map((i) => i.id)
const groupSums = (c) => c.groups.filter((g) => g.items.length).map((g) => g.items.reduce((n, i) => n + i.weight, 0))

test('trích lại theo dòng: JD không đổi thì giữ nguyên bộ tiêu chí (kể cả tiêu chí suy ra, trọng số chỉnh tay)', () => {
  for (const j of JOBS) {
    const custom = { ...j.criteria, groups: j.criteria.groups.map((g, gi) => (gi === 0 ? { ...g, items: g.items.map((i, k) => (k === 0 ? { ...i, weight: i.weight + 7 } : i)) } : g)) }
    const merged = previewCriteria(j, fromDraft(toDraft(j)), custom)
    expect(labels(merged)).toEqual(labels(custom))
    expect(merged.groups[0].items[0].weight).toBeGreaterThan(j.criteria.groups[0].items[0].weight)
  }
})

test('trích lại theo dòng: chỉ dòng sửa / thêm / xoá làm đổi tiêu chí; tổng trọng số vẫn 100', () => {
  const d = toDraft(job)
  const before = previewCriteria(job, fromDraft(d))
  const more = fromDraft({ ...d, requirements: [...d.requirements, { id: 'n', text: 'Bắt buộc có kinh nghiệm Kubernetes.' }] })
  const after = previewCriteria(job, more)
  const added = labels(after).filter((id) => !labels(before).includes(id))
  expect(added).toHaveLength(1)
  expect(after.groups.flatMap((g) => g.items).find((i) => i.skill === 'kubernetes').req).toBe('must')
  const removedLine = job.requirements[0]
  const less = fromDraft({ ...d, requirements: d.requirements.filter((l) => l.text !== removedLine) })
  const afterLess = previewCriteria(job, less)
  expect(afterLess.groups.flatMap((g) => g.items).some((i) => i.src && removedLine.includes(i.src.replace(/…/g, '').trim()))).toBe(false)
  for (const c of [after, afterLess]) {
    expect(groupSums(c).every((n) => n === 100)).toBe(true)
    expect(c.groups.filter((g) => g.items.length).reduce((n, g) => n + g.weight, 0)).toBe(100)
  }
})
