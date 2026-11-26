// Chấm từng tiêu chí: trả về mức đạt s ∈ [0, 1], giá trị của hồ sơ, yêu cầu, bằng chứng và ghi chú.
import { SKILLS, DOMAINS, ROLES, DEGREES, CERTS, LEVELS, skillName } from '../data/skills.js'

export const NOW = '2026-11'
export const REMOTE = 'Từ xa'
const SALARY_TOLERANCE = 1.15
const LANG_SPAN = 1.5

export const clamp01 = (x) => Math.max(0, Math.min(1, x))

export function monthsBetween(from, to) {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = (to ?? NOW).split('-').map(Number)
  return Math.max(0, (ty - fy) * 12 + (tm - fm) + 1)
}

export const fmtYears = (y) => `${(Math.round(y * 10) / 10).toLocaleString('vi-VN')} năm`
/** '2023-03' → '03/2023' */
export const fmtMonth = (ym) => (ym ? `${ym.slice(5, 7)}/${ym.slice(0, 4)}` : 'nay')
export const period = (e) => `${fmtMonth(e.from)} – ${fmtMonth(e.to)}`
const toEvidence = (e) => ({ title: e.title, org: e.org, period: period(e), note: e.note })

export function yearsIn(cv, domains) {
  const entries = cv.history.filter((e) => !domains?.length || e.tags.some((t) => domains.includes(t)))
  const months = entries.reduce((sum, e) => sum + monthsBetween(e.from, e.to), 0)
  return { years: months / 12, entries }
}

export function totalYears(cv) {
  return yearsIn(cv, null).years
}

/** Nhãn ngắn của tiêu chí, dùng chung cho mọi màn. */
export function labelOf(item) {
  switch (item.type) {
    case 'skill': return skillName(item.skill)
    case 'years': return item.domains.length ? `Kinh nghiệm ${item.domains.map((d) => DOMAINS[d]).join(' / ')}` : 'Tổng số năm kinh nghiệm'
    case 'domain': return item.label ?? `Từng làm lĩnh vực ${DOMAINS[item.domain]}`
    case 'role': return `Từng giữ vai trò ${ROLES[item.role].toLowerCase()}`
    case 'degree': return `Bằng ${DEGREES[item.min].toLowerCase()} trở lên`
    case 'cert': return [item.cert, ...(item.alt ?? [])].map((c) => CERTS[c]).join(' hoặc ')
    case 'lang': return 'Tiếng Anh'
    case 'location': return 'Địa điểm làm việc'
    case 'salary': return 'Lương kỳ vọng'
    case 'availability': return 'Thời gian nhận việc'
    default: return item.id
  }
}

/** Yêu cầu của JD, dạng chữ. */
export function needOf(item, job) {
  switch (item.type) {
    case 'skill': return `${LEVELS[item.level]} (${item.level}/5)`
    case 'years': return `≥ ${item.min} năm`
    case 'domain': case 'role': case 'cert': return 'Có'
    case 'degree': return item.majors.length ? `${DEGREES[item.min]} · ${item.majors.slice(0, 3).join(', ')}` : DEGREES[item.min]
    case 'lang': return `IELTS ${item.min.toFixed(1)} tương đương`
    case 'location': return job.mode === REMOTE ? 'Từ xa' : `${job.city} · ${job.mode}`
    case 'salary': return job.salary.max ? `${job.salary.min}–${job.salary.max} triệu` : 'Chưa ghi ngân sách'
    case 'availability': return `≤ ${job.noticeDays} ngày`
    default: return ''
  }
}

function scoreSkill(item, cv) {
  const level = cv.skills[item.skill]
  const evidence = (id) => cv.history.filter((e) => e.skills.includes(id)).map(toEvidence)
  if (level) {
    return { s: clamp01(level / item.level), have: `${LEVELS[level]} (${level}/5)`, evidence: evidence(item.skill) }
  }
  const near = Object.entries(SKILLS[item.skill]?.near ?? {})
    .filter(([id]) => cv.skills[id])
    .map(([id, sim]) => ({ id, sim, s: sim * clamp01(cv.skills[id] / item.level) }))
    .sort((a, b) => b.s - a.s)[0]
  if (!near) return { s: 0, have: 'Không có trong hồ sơ', evidence: [] }
  return {
    s: near.s,
    have: `${skillName(near.id)} (${cv.skills[near.id]}/5)`,
    near: skillName(near.id),
    note: `Kỹ năng gần: ${skillName(near.id)} tương đồng ${Math.round(near.sim * 100)}% với ${skillName(item.skill)}`,
    evidence: evidence(near.id),
  }
}

function scoreYears(item, cv) {
  const { years, entries } = yearsIn(cv, item.domains)
  const over = years >= item.min * 2.5 ? `Dư ${fmtYears(years - item.min)} so với yêu cầu` : undefined
  return { s: clamp01(years / item.min), have: fmtYears(years), evidence: entries.map(toEvidence), note: over }
}

function scoreDomain(item, cv) {
  const wanted = [item.domain, ...(item.alt ?? [])]
  const entries = cv.history.filter((e) => e.tags.some((t) => wanted.includes(t)))
  return { s: entries.length ? 1 : 0, have: entries.length ? 'Có' : 'Chưa có', evidence: entries.map(toEvidence) }
}

function scoreRole(item, cv) {
  const entries = cv.history.filter((e) => e.roles.includes(item.role))
  if (entries.length) return { s: 1, have: 'Có', evidence: entries.map(toEvidence) }
  const mentors = cv.history.filter((e) => e.roles.includes('mentor'))
  if (item.role === 'lead' && mentors.length) {
    return { s: 0.5, have: 'Đã kèm cặp, chưa làm trưởng nhóm', evidence: mentors.map(toEvidence) }
  }
  return { s: 0, have: 'Chưa có', evidence: [] }
}

function scoreDegree(item, cv) {
  const { level, major, school } = cv.education
  const majorOk = !item.majors.length || item.majors.includes(major)
  const have = `${DEGREES[level]} · ${major}`
  const ev = [{ title: `${DEGREES[level]} ${major}`, org: school, period: '', note: '' }]
  if (level >= item.min) {
    return majorOk ? { s: 1, have, evidence: ev } : { s: 0.6, have, evidence: ev, note: 'Đủ bậc học nhưng khác ngành yêu cầu' }
  }
  return { s: level === item.min - 1 ? 0.4 : 0, have, evidence: ev, note: 'Thấp hơn bậc học yêu cầu' }
}

function scoreCert(item, cv) {
  const found = [item.cert, ...(item.alt ?? [])].find((c) => cv.certs.includes(c))
  return found
    ? { s: 1, have: CERTS[found], evidence: [{ title: CERTS[found], org: 'Mục Chứng chỉ', period: '', note: '' }] }
    : { s: 0, have: 'Chưa có', evidence: [] }
}

function scoreLang(item, cv) {
  const { band, label } = cv.english
  const have = /^IELTS/.test(label) ? label : `${label} (≈ IELTS ${band.toFixed(1)})`
  return { s: clamp01(1 - (item.min - band) / LANG_SPAN), have, evidence: [] }
}

function scoreLocation(item, cv, job) {
  if (job.mode === REMOTE) return { s: 1, have: cv.city, evidence: [], note: 'Làm từ xa – không xét địa điểm', dynamic: true }
  if (cv.city === job.city) return { s: 1, have: cv.city, evidence: [] }
  if (cv.relocate) return { s: 0.7, have: `${cv.city} · sẵn sàng chuyển nơi ở`, evidence: [] }
  return { s: 0, have: `${cv.city} · không chuyển nơi ở`, evidence: [] }
}

const UNKNOWN = 0.5 // hồ sơ không ghi thông tin → tính trung lập, kèm ghi chú để người tuyển dụng hỏi lại

function scoreSalary(item, cv, job) {
  if (cv.salary == null) return { s: UNKNOWN, have: 'Chưa ghi', evidence: [], note: 'CV chưa ghi lương kỳ vọng – tính trung lập 50%' }
  if (!job.salary.max) return { s: 1, have: `${cv.salary} triệu`, evidence: [], note: 'Tin chưa ghi ngân sách' }
  const have = `${cv.salary} triệu`
  if (cv.salary <= job.salary.max) return { s: 1, have, evidence: [] }
  if (cv.salary <= job.salary.max * SALARY_TOLERANCE) {
    return { s: 0.5, have, evidence: [], note: `Vượt trần ngân sách ${cv.salary - job.salary.max} triệu (trong ngưỡng thương lượng 15%)` }
  }
  return { s: 0, have, evidence: [], note: `Vượt trần ngân sách ${cv.salary - job.salary.max} triệu` }
}

function scoreAvailability(item, cv, job) {
  if (cv.noticeDays == null) return { s: UNKNOWN, have: 'Chưa ghi', evidence: [], note: 'CV chưa ghi thời gian nhận việc – tính trung lập 50%' }
  const have = `${cv.noticeDays} ngày`
  if (cv.noticeDays <= job.noticeDays) return { s: 1, have, evidence: [] }
  return { s: cv.noticeDays <= job.noticeDays * 2 ? 0.5 : 0, have, evidence: [] }
}

const SCORERS = {
  skill: scoreSkill, years: scoreYears, domain: scoreDomain, role: scoreRole, degree: scoreDegree,
  cert: scoreCert, lang: scoreLang, location: scoreLocation, salary: scoreSalary, availability: scoreAvailability,
}

export function scoreItem(item, cv, job) {
  const scorer = SCORERS[item.type]
  if (!scorer) throw new Error(`Loại tiêu chí không hỗ trợ: ${item.type}`)
  return scorer(item, cv, job)
}

/** Tạo tiêu chí con mới; trọng số khởi điểm 10% để người tuyển dụng chỉnh tiếp hoặc bấm phân bổ 3 : 2 : 1. */
export function newItem(key) {
  const [type, ref] = key.split(':')
  const base = { id: `u-${type}-${ref}`, req: 'important', weight: 10, src: 'Người tuyển dụng thêm' }
  if (type === 'skill') return { ...base, type, skill: ref, level: 3 }
  if (type === 'years') return { ...base, type, domains: [ref], min: 2 }
  if (type === 'domain') return { ...base, type, domain: ref, req: 'bonus' }
  return { ...base, type: 'cert', cert: ref, req: 'bonus' }
}
