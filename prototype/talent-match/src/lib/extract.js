// Đọc văn bản CV / JD thành dữ liệu có cấu trúc, chạy hoàn toàn trên trình duyệt (bản demo).
// Thực tế phần này do AI đảm nhận; ở đây dùng từ điển + quy tắc để kết quả ổn định và giải thích được.
import { SKILLS, CERTS, DEGREES } from '../data/skills.js'
import { NOW } from './criteria.js'
import { distributeByReq } from './match.js'

/** Bỏ dấu, chữ thường, giữ nguyên độ dài chuỗi (mỗi ký tự NFC → 1 ký tự) để còn ánh xạ vị trí. */
export function fold(text) {
  let out = ''
  for (const ch of text.normalize('NFC')) {
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '')
    out += (base[0] ?? ch).toLowerCase().replace('đ', 'd')
  }
  return out
}

// Cách viết thường gặp của từng kỹ năng trong CV/JD (đã bỏ dấu).
const SKILL_ALIASES = {
  python: ['python'], pytorch: ['pytorch'], tensorflow: ['tensorflow', 'keras'], opencv: ['opencv'],
  vision: ['thi giac may tinh', 'computer vision'], llm: ['llm', 'rag', 'mo hinh ngon ngu lon'], mlops: ['mlops'],
  docker: ['docker'], kubernetes: ['kubernetes', 'k8s'], java: ['java'], kotlin: ['kotlin'], spring: ['spring boot', 'spring'],
  go: ['golang'], nodejs: ['node.js', 'nodejs', 'node js'], microservices: ['microservices', 'microservice', 'vi dich vu'],
  sql: ['sql'], postgresql: ['postgresql', 'postgres'], mysql: ['mysql'], mongodb: ['mongodb'], redis: ['redis'],
  kafka: ['kafka'], rabbitmq: ['rabbitmq'], spark: ['apache spark', 'spark'], airflow: ['airflow'], dbt: ['dbt'],
  aws: ['aws', 'amazon web services'], gcp: ['google cloud', 'gcp'], cicd: ['ci/cd', 'cicd'], linux: ['linux'],
  react: ['react.js', 'reactjs', 'react'], vue: ['vue.js', 'vuejs', 'vue'], typescript: ['typescript'], javascript: ['javascript'],
  nextjs: ['next.js', 'nextjs'], css: ['html/css', 'html', 'css'], jest: ['jest', 'kiem thu don vi', 'unit test'],
  selenium: ['selenium'], playwright: ['playwright'], cypress: ['cypress'], apitest: ['kiem thu api', 'api testing', 'postman'],
  cpp: ['c++'], c: ['ngon ngu c'], rtos: ['freertos', 'rtos'], emblinux: ['embedded linux', 'linux nhung'],
  periph: ['uart', 'i2c', 'spi'], scrum: ['agile', 'scrum'], backlog: ['backlog'],
  discovery: ['kham pha san pham', 'product discovery'], analytics: ['phan tich du lieu san pham', 'product analytics'],
  figma: ['figma'], sourcing: ['tim nguon ung vien', 'sourcing'], interviewing: ['phong van theo nang luc', 'phong van'],
  ats: ['ats'], branding: ['thuong hieu nha tuyen dung', 'employer branding'],
  communication: ['giao tiep'], teamwork: ['lam viec nhom'], leadership: ['dan dat'], mentoring: ['kem cap', 'mentor'],
  problem: ['giai quyet van de'], stakeholder: ['cac ben lien quan', 'stakeholder'], negotiation: ['dam phan'],
  ownership: ['tinh chu dong', 'chu dong'],
}
const ALIAS_LIST = Object.entries(SKILL_ALIASES)
  .flatMap(([skill, list]) => list.map((alias) => ({ skill, alias })))
  .sort((a, b) => b.alias.length - a.alias.length)

const isWordChar = (ch) => Boolean(ch) && /[a-z0-9+#]/.test(ch)

/** Vị trí các kỹ năng xuất hiện trong văn bản: [{ start, end, skill }], không chồng nhau, theo thứ tự. */
export function findMentions(text) {
  const f = fold(text)
  const taken = new Array(f.length).fill(false)
  const out = []
  for (const { skill, alias } of ALIAS_LIST) {
    let from = 0
    for (;;) {
      const i = f.indexOf(alias, from)
      if (i < 0) break
      const end = i + alias.length
      from = i + 1
      if (isWordChar(f[i - 1]) || isWordChar(f[end])) continue
      if (taken.slice(i, end).some(Boolean)) continue
      taken.fill(true, i, end)
      out.push({ start: i, end, skill })
    }
  }
  return out.sort((a, b) => a.start - b.start)
}

export const skillsIn = (text) => [...new Set(findMentions(text).map((m) => m.skill))]

/** Cắt văn bản thành các đoạn thường / đoạn là kỹ năng để tô màu. */
export function segment(text) {
  const parts = []
  let at = 0
  const t = text.normalize('NFC')
  for (const m of findMentions(t)) {
    if (m.start > at) parts.push({ text: t.slice(at, m.start) })
    parts.push({ text: t.slice(m.start, m.end), skill: m.skill })
    at = m.end
  }
  if (at < t.length) parts.push({ text: t.slice(at) })
  return parts
}

const DOMAIN_ALIASES = {
  vision: ['thi giac may tinh', 'computer vision', 'xu ly anh'], ai: [' ai', 'ai/ml', 'hoc may', 'machine learning', 'tri tue nhan tao'],
  backend: ['backend', 'back-end'], frontend: ['frontend', 'front-end', 'giao dien'], data: ['du lieu', 'data'],
  qa: ['kiem thu', 'qa', 'tester'], embedded: ['nhung', 'embedded', 'firmware'], iot: ['iot', 'thiet bi thong minh'],
  product: ['san pham', 'product'], recruit: ['tuyen dung'], hr: ['nhan su'], hrtech: ['phan mem nhan su'],
  fintech: ['tai chinh', 'ngan hang', 'fintech'], ecommerce: ['thuong mai dien tu', 'e-commerce'], manufacturing: ['san xuat', 'nha may'],
}
function domainsIn(f) {
  const padded = ` ${f} `
  return Object.entries(DOMAIN_ALIASES).filter(([, list]) => list.some((a) => {
    const i = padded.indexOf(a.trim() === a ? a : a.trim())
    return i >= 0 && !isWordChar(padded[i - 1]) && !isWordChar(padded[i + a.trim().length])
  })).map(([d]) => d)
}

const MAJORS = [
  ['CNTT', ['cntt', 'cong nghe thong tin']], ['Khoa học máy tính', ['khoa hoc may tinh']], ['Toán tin', ['toan tin']],
  ['Điện tử', ['dien tu']], ['Kỹ thuật phần mềm', ['ky thuat phan mem']], ['Quản trị kinh doanh', ['quan tri kinh doanh']],
  ['Quản trị nhân lực', ['quan tri nhan luc', 'quan tri nhan su']], ['Tâm lý học', ['tam ly hoc']],
]
const majorsIn = (f) => MAJORS.filter(([, a]) => a.some((x) => f.includes(x))).map(([m]) => m)

const CERT_ALIASES = { 'aws-saa': ['solutions architect'], 'gcp-de': ['professional data engineer'], istqb: ['istqb'], cka: ['cka', 'certified kubernetes'], psm: ['psm', 'scrum master'], cspo: ['cspo', 'scrum product owner'], shrm: ['shrm'] }
const certsIn = (f) => Object.entries(CERT_ALIASES).filter(([, a]) => a.some((x) => f.includes(x))).map(([c]) => c)

const CITIES = [['Hà Nội', ['ha noi', 'hanoi']], ['TP. Hồ Chí Minh', ['ho chi minh', 'hcm', 'sai gon']], ['Đà Nẵng', ['da nang']]]
const cityIn = (f) => CITIES.find(([, a]) => a.some((x) => f.includes(x)))?.[0]

function degreeIn(f) {
  if (/tien si|phd/.test(f)) return 4
  if (/thac si|master/.test(f)) return 3
  if (/dai hoc|cu nhan|ky su|bachelor/.test(f)) return 2
  if (/cao dang/.test(f)) return 1
  return 0
}

/** Điểm tiếng Anh quy đổi tương đương IELTS. */
function englishIn(f) {
  const ielts = f.match(/ielts\s*:?\s*(\d(?:[.,]\d)?)/)
  if (ielts) { const band = Number(ielts[1].replace(',', '.')); return { band, label: `IELTS ${band.toFixed(1)}` } }
  const toeic = f.match(/toeic\s*:?\s*(\d{3})/)
  if (toeic) {
    const t = Number(toeic[1])
    const band = t >= 900 ? 7.5 : t >= 850 ? 7 : t >= 780 ? 6.5 : t >= 700 ? 6 : t >= 600 ? 5.5 : 5
    return { band, label: `TOEIC ${t}` }
  }
  return null
}

/** Mức thành thạo suy từ câu chứa kỹ năng (thang 1–5). */
const LEVEL_RULES = [[/chuyen gia|chuyen sau|expert/, 5], [/thanh thao|vung|lam chu|advanced/, 4], [/co kinh nghiem|da lam|su dung tot/, 3], [/co ban|biet|hieu biet|lam quen|basic/, 2]]
const explicitLevel = (f) => LEVEL_RULES.find(([re]) => re.test(f))?.[1] ?? null
function levelIn(f, fallback = 3) {
  return explicitLevel(f) ?? fallback
}

const cleanLine = (l) => l.normalize('NFC').replace(/^[\s•●▪◦*·\-–—+]+/, '').replace(/\s+/g, ' ').trim()
const toLines = (text) => text.split(/\r?\n/).map(cleanLine).filter(Boolean)

// ---------------------------------------------------------------- Nhận dạng loại văn bản
export function detectKind(text) {
  const f = fold(text)
  const count = (list) => list.reduce((n, w) => n + (f.includes(w) ? 1 : 0), 0)
  const jd = count(['mo ta cong viec', 'yeu cau', 'trach nhiem', 'quyen loi', 'phuc loi', 'ung tuyen', 'chung toi', 'tuyen dung', 'muc luong', 'ung vien'])
  const cv = count(['kinh nghiem lam viec', 'hoc van', 'muc tieu nghe nghiep', 'thong tin ca nhan', 'ngay sinh', 'email', 'dien thoai', 'so thich', 'du an da lam'])
    + Math.min(3, (f.match(/\d{1,2}\/\d{4}\s*[-–]/g) ?? []).length)
  return jd > cv ? 'jd' : 'cv'
}

// ---------------------------------------------------------------- CV
const DATE_RANGE = /(\d{1,2})\s*\/\s*(\d{4})\s*[-–—]\s*(?:(\d{1,2})\s*\/\s*(\d{4})|(nay|hien tai|hien nay|present))/
const pad = (m) => String(m).padStart(2, '0')
const SECTION = /^(kinh nghiem|hoc van|ky nang|chung chi|ngoai ngu|muc tieu|tom tat|gioi thieu|thong tin|du an|mong muon|so thich)/

function rolesIn(f) {
  const r = []
  if (/truong nhom|team lead|tech lead|lead\b/.test(f)) r.push('lead')
  if (/kem cap|mentor|huong dan/.test(f)) r.push('mentor')
  if (/product owner|chiu trach nhiem san pham/.test(f)) r.push('owner')
  return r
}

function parseHistory(lines) {
  const out = []
  lines.forEach((line, idx) => {
    const fl = fold(line)
    const m = fl.match(DATE_RANGE)
    if (!m) return
    const head = line.slice(0, m.index).replace(/[|,(–—-]\s*$/, '').trim() || lines[idx - 1] || 'Vị trí'
    const [title, org = ''] = head.split(/\s+[|–—]\s+|\s+tại\s+|\s*,\s*/).map((x) => x.trim())
    const notes = []
    for (let j = idx + 1; j < lines.length; j += 1) {
      const fj = fold(lines[j])
      if (DATE_RANGE.test(fj) || SECTION.test(fj)) break
      notes.push(lines[j])
    }
    const note = notes.join(' ')
    const f = fold(`${head} ${note}`)
    out.push({
      title, org, from: `${m[2]}-${pad(m[1])}`, to: m[4] ? `${m[4]}-${pad(m[3])}` : null,
      tags: domainsIn(f), skills: skillsIn(`${head} ${note}`), note, roles: rolesIn(f),
    })
  })
  return out
}

const looksLikeName = (l) => /^[A-ZÀ-Ỹ][\p{L}]*(\s[A-ZÀ-Ỹ][\p{L}]*){1,4}$/u.test(l) && l.length <= 40

export function parseCv(text, { id = 'cv-me' } = {}) {
  const lines = toLines(text)
  const all = fold(lines.join('\n'))
  const name = lines.slice(0, 6).find(looksLikeName) ?? 'Hồ sơ của tôi'
  const headline = lines.slice(0, 8).find((l) => l !== name && l.length <= 60 && !/@|\d{4}|:/.test(l)) ?? 'Chưa có chức danh'

  // Kỹ năng: lấy mức cao nhất suy ra từ các câu có nhắc tới.
  const skills = {}
  lines.forEach((l) => {
    const fl = fold(l)
    skillsIn(l).forEach((id) => { skills[id] = Math.max(skills[id] ?? 0, levelIn(fl)) })
  })

  let history = parseHistory(lines)
  const yearsHint = all.match(/(\d+(?:[.,]\d)?)\+?\s*nam kinh nghiem/)
  if (!history.length && yearsHint) {
    const months = Math.round(Number(yearsHint[1].replace(',', '.')) * 12)
    const [y, mo] = NOW.split('-').map(Number)
    const start = y * 12 + (mo - 1) - months + 1
    history = [{ title: headline, org: 'Theo CV', from: `${Math.floor(start / 12)}-${pad((start % 12) + 1)}`, to: null, tags: domainsIn(all), skills: Object.keys(skills), note: lines.find((l) => fold(l).includes('nam kinh nghiem')) ?? '', roles: rolesIn(all) }]
  }

  const eduLine = lines.find((l) => /dai hoc|cao dang|hoc vien|truong/.test(fold(l))) ?? ''
  const salaryLine = lines.find((l) => /luong|thu nhap/.test(fold(l)))
  const salary = salaryLine ? Number(fold(salaryLine).match(/(\d+)\s*(trieu|tr\b)/)?.[1]) || null : null
  const notice = all.match(/(\d+)\s*ngay/)
  const summaryIdx = lines.findIndex((l) => /^(muc tieu|tom tat|gioi thieu)/.test(fold(l)))
  const after = summaryIdx >= 0 ? lines.slice(summaryIdx + 1) : []
  const end = after.findIndex((l) => SECTION.test(fold(l)) || DATE_RANGE.test(fold(l)))
  const summary = summaryIdx >= 0 ? after.slice(0, end < 0 ? 2 : end).join(' ') : lines.find((l) => l.length > 70) ?? ''

  return {
    id, name, headline, city: cityIn(all) ?? 'Chưa ghi', relocate: /san sang chuyen|co the chuyen/.test(all),
    source: 'upload', appliedTo: [], updatedAt: '2026-11-20',
    salary, noticeDays: notice && /nhan viec|bao truoc/.test(all) ? Number(notice[1]) : null,
    education: { level: degreeIn(fold(eduLine)) || degreeIn(all) || 2, major: majorsIn(all)[0] ?? 'Chưa ghi ngành', school: eduLine || 'Chưa ghi trường' },
    certs: certsIn(all), english: englishIn(all) ?? { band: 5, label: 'Chưa ghi chứng chỉ' },
    skills, summary, history,
  }
}

// ---------------------------------------------------------------- JD
const GROUP_DEFAULT = [
  { id: 'skills', name: 'Kỹ năng chuyên môn', weight: 45 },
  { id: 'experience', name: 'Kinh nghiệm', weight: 25 },
  { id: 'education', name: 'Học vấn & chứng chỉ', weight: 10 },
  { id: 'language', name: 'Ngoại ngữ', weight: 5 },
  { id: 'soft', name: 'Kỹ năng mềm', weight: 5 },
  { id: 'conditions', name: 'Điều kiện làm việc', weight: 10 },
]

function explicitReq(f) {
  if (/uu tien|loi the|diem cong|nice to have/.test(f)) return 'bonus'
  if (/bat buoc|toi thieu|it nhat|thanh thao|vung|can co|phai co|yeu cau/.test(f)) return 'must'
  if (/co kinh nghiem|hieu biet/.test(f)) return 'important'
  return null
}
const reqIn = (f) => explicitReq(f) ?? 'important'

/**
 * Mức yêu cầu và mức thành thạo theo từng vế câu ("Vững PostgreSQL, có kinh nghiệm Redis" → 2 vế khác nhau).
 * Vế không có từ chỉ mức thì thừa hưởng vế trước ("Thành thạo Docker, CI/CD").
 */
function skillClauses(line, baseReq) {
  let req = baseReq
  let level = 3
  return line.split(/[,;]/).flatMap((clause) => {
    const f = fold(clause)
    req = explicitReq(f) ?? req
    level = explicitLevel(f) ?? level
    return skillsIn(clause).map((skill) => ({ skill, req, level }))
  })
}
const RANK = { must: 3, important: 2, bonus: 1 }

/** Chuẩn hoá trọng số nhóm có tiêu chí về tổng 100 (nhóm trống = 0). */
function normalizeGroups(groups) {
  const active = groups.filter((g) => g.items.length)
  const total = active.reduce((s, g) => s + g.weight, 0)
  const raw = groups.map((g) => (g.items.length && total ? (g.weight / total) * 100 : 0))
  const rounded = raw.map(Math.round)
  const diff = 100 - rounded.reduce((a, b) => a + b, 0)
  const first = rounded.findIndex((x) => x > 0)
  return groups.map((g, i) => ({ ...g, weight: rounded[i] + (i === first ? diff : 0), items: g.items.length ? distributeByReq(g.items) : g.items }))
}

export function parseJd(text, { id = `job-up-${Date.now().toString(36)}` } = {}) {
  const lines = toLines(text)
  const all = fold(lines.join('\n'))
  const header = (l) => /^(mo ta|gioi thieu|trach nhiem|nhiem vu|cong viec|yeu cau|quyen loi|phuc loi|che do|thong tin|dia diem|muc luong)/.test(fold(l)) && l.length <= 40
  const title = lines.find((l) => !header(l) && l.length <= 80) ?? 'Vị trí mới'

  const sections = { summary: [], responsibilities: [], requirements: [], benefits: [] }
  let cur = null
  lines.forEach((l) => {
    if (l === title) return
    const f = fold(l)
    if (header(l)) {
      cur = /yeu cau/.test(f) ? 'requirements' : /trach nhiem|nhiem vu|cong viec/.test(f) ? 'responsibilities' : /quyen loi|phuc loi|che do/.test(f) ? 'benefits' : /mo ta|gioi thieu/.test(f) ? 'summary' : null
      return
    }
    if (cur) sections[cur].push(l)
    else if (l.length > 60) sections.summary.push(l)
  })
  if (!sections.requirements.length) sections.requirements = lines.filter((l) => l !== title && !header(l) && skillsIn(l).length)

  const salaryM = all.match(/(\d+)\s*[-–]\s*(\d+)\s*(trieu|tr\b)/)
  const city = cityIn(all) ?? 'Hà Nội'
  const mode = /tu xa|remote/.test(all) ? 'Từ xa' : /hybrid|linh hoat/.test(all) ? 'Hybrid' : 'Tại văn phòng'
  const salary = salaryM ? { min: Number(salaryM[1]), max: Number(salaryM[2]) } : { min: 0, max: 0 }
  const criteria = criteriaFromSections(sections.requirements, sections.responsibilities, { city, mode, salary, availability: 'Mặc định nhận việc trong 30 ngày' })

  return {
    id, code: 'REQ-NHÁP', title, level: '—', dept: 'Chưa gán phòng ban', team: '', city, mode, headcount: 1,
    salary, salaryKnown: Boolean(salaryM),
    noticeDays: 30, openedAt: '2026-11-20', recruiter: 'Bạn', manager: '—', status: 'draft', custom: true,
    summary: sections.summary.join(' ') || 'JD tải lên chưa có đoạn mô tả chung.',
    responsibilities: sections.responsibilities, requirements: sections.requirements,
    criteria,
  }
}

/**
 * Trích cây tiêu chí top-down từ các dòng yêu cầu / trách nhiệm của JD (dùng chung cho JD tải lên và JD sửa trực tiếp).
 * Dòng yêu cầu → kỹ năng, số năm, lĩnh vực, bằng cấp, chứng chỉ, ngoại ngữ; dòng trách nhiệm → kỹ năng mức "Cộng điểm".
 */
export function criteriaFromSections(requirements, responsibilities, { city, mode, salary, availability }) {
  const groups = Object.fromEntries(GROUP_DEFAULT.map((g) => [g.id, { ...g, items: [] }]))
  let n = 0
  const nextId = () => { n += 1; return `x${n}` }
  const pushSkill = (skill, level, req, src) => {
    const gid = SKILLS[skill].kind === 'soft' ? 'soft' : 'skills'
    const found = groups[gid].items.find((i) => i.skill === skill)
    if (found) { if (RANK[req] > RANK[found.req]) found.req = req; found.level = Math.max(found.level, level); return }
    groups[gid].items.push({ id: nextId(), type: 'skill', skill, level, req, weight: 0, src })
  }

  ;[...requirements, ...responsibilities].forEach((line, idx) => {
    const f = fold(line)
    const isReq = idx < requirements.length
    const req = isReq ? reqIn(f) : 'bonus'
    skillClauses(line, isReq ? 'important' : 'bonus').forEach((c) => pushSkill(c.skill, c.level, isReq ? c.req : 'bonus', line))
    if (!isReq) return
    const years = f.match(/(\d+(?:[.,]\d)?)\+?\s*nam/)
    if (years && /kinh nghiem/.test(f)) {
      groups.experience.items.push({ id: nextId(), type: 'years', domains: domainsIn(f), min: Number(years[1].replace(',', '.')), req: reqIn(f) === 'bonus' ? 'important' : 'must', weight: 0, src: line })
    } else if (req === 'bonus' && domainsIn(f).length && !skillsIn(line).length) {
      groups.experience.items.push({ id: nextId(), type: 'domain', domain: domainsIn(f)[0], req: 'bonus', weight: 0, src: line })
    }
    if (/lead|truong nhom|dan dat nhom/.test(f) && !groups.experience.items.some((i) => i.type === 'role')) {
      groups.experience.items.push({ id: nextId(), type: 'role', role: 'lead', req, weight: 0, src: line })
    }
    const degree = degreeIn(f)
    if (degree && /tot nghiep|bang|trinh do|dai hoc|cao dang|thac si/.test(f) && !groups.education.items.some((i) => i.type === 'degree')) {
      groups.education.items.push({ id: nextId(), type: 'degree', min: degree, majors: majorsIn(f), req: reqIn(f) === 'bonus' ? 'bonus' : 'important', weight: 0, src: line })
    }
    certsIn(f).forEach((cert) => groups.education.items.push({ id: nextId(), type: 'cert', cert, req: 'bonus', weight: 0, src: line }))
    const eng = englishIn(f)
    if ((eng || /tieng anh|english/.test(f)) && !groups.language.items.length) {
      groups.language.items.push({ id: nextId(), type: 'lang', min: eng?.band ?? 5.5, req: reqIn(f) === 'bonus' ? 'bonus' : 'important', weight: 0, src: line })
    }
  })
  groups.conditions.items.push(
    { id: nextId(), type: 'location', req: 'important', weight: 0, src: `${city} · ${mode}` },
    ...(salary.max ? [{ id: nextId(), type: 'salary', req: 'important', weight: 0, src: `Ngân sách ${salary.min}–${salary.max} triệu` }] : []),
    { id: nextId(), type: 'availability', req: 'bonus', weight: 0, src: availability },
  )
  return { groups: normalizeGroups(GROUP_DEFAULT.map((g) => groups[g.id])), thresholds: { A: 85, B: 70, C: 50 } }

}

/** Trích lại tiêu chí từ một tin đã sửa (giữ nguyên id tin). */
export const criteriaFromJob = (job) => criteriaFromSections(job.requirements, job.responsibilities, {
  city: job.city, mode: job.mode, salary: job.salary, availability: `Nhận việc trong ${job.noticeDays} ngày`,
})

export const CITY_NAMES = CITIES.map(([name]) => name)

export const CERT_NAMES = CERTS
export const DEGREE_NAMES = DEGREES

// ---------------------------------------------------------------- CV đang chỉnh
export const DERIVED_LEVEL = 2

/**
 * Hồ sơ dùng để chấm: kỹ năng nhắc trong phần kinh nghiệm được gắn vào mục đó; kỹ năng chỉ xuất hiện
 * trong kinh nghiệm (chưa khai ở mục Kỹ năng) được tính mức "Cơ bản" — tránh thưởng điểm cho việc nhồi từ khoá.
 */
export function effectiveCv(cv) {
  const history = cv.history.map((e) => ({ ...e, skills: [...new Set([...(e.skills ?? []), ...skillsIn(`${e.title} ${e.note}`)])] }))
  const derived = [...new Set([...history.flatMap((e) => e.skills), ...skillsIn(cv.summary ?? '')])].filter((id) => !cv.skills[id])
  return { cv: { ...cv, history, skills: { ...cv.skills, ...Object.fromEntries(derived.map((id) => [id, DERIVED_LEVEL])) } }, derived }
}

// ---------------------------------------------------------------- Câu hỏi tìm việc bằng lời
/** Hiểu câu mô tả công việc mong muốn: kỹ năng, lĩnh vực, thành phố, làm từ xa, lương tối thiểu. */
export function parseQuery(text) {
  const f = fold(text)
  const salary = f.match(/(\d+)\s*(trieu|tr\b)/)
  return {
    skills: skillsIn(text),
    domains: domainsIn(f),
    city: cityIn(f) ?? null,
    remote: /tu xa|remote|o nha/.test(f),
    hybrid: /hybrid|linh hoat/.test(f),
    minSalary: salary ? Number(salary[1]) : null,
  }
}
