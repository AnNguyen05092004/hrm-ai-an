// Bộ chấm Match Score top-down:
//   Điểm = Σ_nhóm (trọng số nhóm) × Σ_tiêu chí (trọng số trong nhóm, chuẩn hoá) × mức đạt
// Tiêu chí "bắt buộc" đạt dưới KNOCKOUT_MIN → hồ sơ bị giới hạn tối đa hạng C (vẫn hiển thị, người quyết định).
import { scoreItem, labelOf, needOf, yearsIn, fmtYears } from './criteria.js'

export const KNOCKOUT_MIN = 0.5
export const REQ = {
  must: { label: 'Bắt buộc', factor: 3 },
  important: { label: 'Quan trọng', factor: 2 },
  bonus: { label: 'Cộng điểm', factor: 1 },
}
export const GRADES = {
  A: { label: 'Rất phù hợp' },
  B: { label: 'Phù hợp' },
  C: { label: 'Phù hợp một phần' },
  D: { label: 'Ít phù hợp' },
}
const MET = 0.999
const round1 = (x) => Math.round(x * 10) / 10

export const statusOf = (s) => (s >= MET ? 'met' : s > 0 ? 'partial' : 'missing')

export function gradeOf(score, hasKnockout, t) {
  const raw = score >= t.A ? 'A' : score >= t.B ? 'B' : score >= t.C ? 'C' : 'D'
  return hasKnockout && (raw === 'A' || raw === 'B') ? 'C' : raw
}

const sumWeights = (list) => list.reduce((s, x) => s + (Number(x.weight) || 0), 0)

function scoreGroup(group, groupShare, cv, job) {
  const total = sumWeights(group.items)
  const items = group.items.map((item) => {
    const r = scoreItem(item, cv, job)
    const eff = total ? groupShare * (item.weight / total) : 0
    return {
      ...item, ...r, label: labelOf(item), need: needOf(item, job), status: statusOf(r.s),
      share: total ? item.weight / total : 0, eff: round1(eff), points: eff * r.s, lost: eff * (1 - r.s),
      knockout: item.req === 'must' && r.s < KNOCKOUT_MIN,
    }
  })
  const points = items.reduce((s, i) => s + i.points, 0)
  return { id: group.id, name: group.name, weight: group.weight, max: groupShare, points, s: groupShare ? points / groupShare : 0, items }
}

/**
 * @param {object} job tin tuyển dụng
 * @param {object} cv hồ sơ
 * @param {object} [criteria] cây tiêu chí đang dùng (mặc định của JD; truyền bản đang chỉnh để xem trước)
 */
export function matchScore(job, cv, criteria = job.criteria) {
  const active = criteria.groups.filter((g) => g.items.length && g.weight > 0)
  const totalGroup = sumWeights(active)
  const groups = active.map((g) => scoreGroup(g, totalGroup ? (g.weight / totalGroup) * 100 : 0, cv, job))
  const items = groups.flatMap((g) => g.items)
  const raw = groups.reduce((s, g) => s + g.points, 0)
  const score = Math.round(raw)
  const knockouts = items.filter((i) => i.knockout)
  const counts = { met: 0, partial: 0, missing: 0 }
  items.forEach((i) => { counts[i.status] += 1 })
  const yearsItem = items.find((i) => i.type === 'years')
  return {
    jobId: job.id, cvId: cv.id, score, raw: round1(raw),
    grade: gradeOf(score, knockouts.length > 0, criteria.thresholds),
    knockouts, groups, counts: { ...counts, total: items.length },
    strengths: items.filter((i) => i.status === 'met').sort((a, b) => b.eff - a.eff).slice(0, 4),
    gaps: items.filter((i) => i.status !== 'met').sort((a, b) => b.lost - a.lost),
    experience: yearsItem ? experienceDelta(cv, yearsItem) : null,
  }
}

function experienceDelta(cv, item) {
  const { years } = yearsIn(cv, item.domains)
  const delta = years - item.min
  const label = delta < 0 ? `Thiếu ${fmtYears(-delta)}` : delta >= item.min * 1.5 ? `Dư ${fmtYears(delta)}` : 'Đủ'
  return { years, need: item.min, delta, label, tone: delta < 0 ? 'bad' : delta >= item.min * 1.5 ? 'warn' : 'good' }
}

export function rankCandidates(job, cvs, criteria = job.criteria) {
  return cvs.map((cv) => ({ cv, m: matchScore(job, cv, criteria) })).sort((a, b) => b.m.raw - a.m.raw)
}

export function rankJobs(cv, jobs, criteriaOf = (j) => j.criteria) {
  return jobs.map((job) => ({ job, m: matchScore(job, cv, criteriaOf(job)) })).sort((a, b) => b.m.raw - a.m.raw)
}

/** Phân bổ lại trọng số trong nhóm theo mức độ yêu cầu (3 : 2 : 1), tổng = 100. */
export function distributeByReq(items) {
  const total = items.reduce((s, i) => s + REQ[i.req].factor, 0)
  if (!total) return items
  const raw = items.map((i) => (REQ[i.req].factor / total) * 100)
  const rounded = raw.map(Math.round)
  const diff = 100 - rounded.reduce((a, b) => a + b, 0)
  return items.map((item, idx) => ({ ...item, weight: rounded[idx] + (idx === 0 ? diff : 0) }))
}

export function groupWeightTotal(criteria) {
  return criteria.groups.filter((g) => g.items.length).reduce((s, g) => s + (Number(g.weight) || 0), 0)
}

/** Mức tăng điểm nếu một tiêu chí thiếu được đáp ứng đầy đủ. */
export const gainIfMet = (item) => Math.round(item.lost * 10) / 10
