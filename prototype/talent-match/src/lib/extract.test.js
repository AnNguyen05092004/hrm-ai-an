import { describe, it, expect } from 'vitest'
import { fold, findMentions, segment, detectKind, parseCv, parseJd } from './extract.js'
import { SAMPLE_CV, SAMPLE_JD } from '../data/samples.js'
import { matchScore, groupWeightTotal } from './match.js'
import { JOBS } from '../data/jobs.js'

describe('extract', () => {
  it('fold giữ nguyên độ dài để ánh xạ vị trí', () => {
    const t = 'Kỹ năng giao tiếp, Đàm phán'
    expect(fold(t)).toHaveLength(t.length)
    expect(fold(t)).toBe('ky nang giao tiep, dam phan')
  })
  it('nhận kỹ năng theo ranh giới từ (Java ≠ JavaScript, SQL ≠ PostgreSQL)', () => {
    const ids = findMentions('JavaScript, PostgreSQL và React.js').map((m) => m.skill)
    expect(ids).toEqual(['javascript', 'postgresql', 'react'])
  })
  it('segment ghép lại đúng văn bản gốc', () => {
    const t = 'Thành thạo Node.js và TypeScript.'
    expect(segment(t).map((p) => p.text).join('')).toBe(t)
    expect(segment(t).filter((p) => p.skill).map((p) => p.skill)).toEqual(['nodejs', 'typescript'])
  })
  it('phân biệt CV và JD', () => {
    expect(detectKind(SAMPLE_CV)).toBe('cv')
    expect(detectKind(SAMPLE_JD)).toBe('jd')
  })
  it('đọc CV mẫu: tên, kinh nghiệm, kỹ năng có mức, tiếng Anh, lương', () => {
    const cv = parseCv(SAMPLE_CV)
    expect(cv.name).toBe('Võ Thị Lan Anh')
    expect(cv.city).toBe('Hà Nội')
    expect(cv.history).toHaveLength(2)
    expect(cv.history[0]).toMatchObject({ from: '2023-03', to: null, org: 'Công ty Thương mại điện tử Phố Xanh' })
    expect(cv.skills.react).toBe(4)
    expect(cv.skills.typescript).toBe(2)
    expect(cv.english.band).toBe(6.5)
    expect(cv.salary).toBe(38)
    expect(cv.noticeDays).toBe(30)
    expect(cv.education).toMatchObject({ level: 2, major: 'CNTT' })
  })
  it('đọc JD mẫu thành cây tiêu chí tổng 100, có mức bắt buộc / cộng điểm', () => {
    const job = parseJd(SAMPLE_JD, { id: 'job-x' })
    expect(job.title).toBe('Kỹ sư Backend Node.js')
    expect(job.salary).toEqual({ min: 30, max: 45 })
    expect(groupWeightTotal(job.criteria)).toBe(100)
    const items = job.criteria.groups.flatMap((g) => g.items)
    expect(items.find((i) => i.skill === 'nodejs').req).toBe('must')
    expect(items.find((i) => i.skill === 'kafka').req).toBe('bonus')
    expect(items.find((i) => i.type === 'years')).toMatchObject({ min: 3, domains: ['backend'] })
    expect(items.find((i) => i.type === 'lang').min).toBe(5.5)
    job.criteria.groups.filter((g) => g.items.length).forEach((g) => expect(g.items.reduce((s, i) => s + i.weight, 0)).toBe(100))
  })
  it('CV tải lên chấm được với kho JD, thông tin thiếu tính trung lập', () => {
    const cv = { ...parseCv(SAMPLE_CV), salary: null }
    const m = matchScore(JOBS.find((j) => j.id === 'job-fe'), cv)
    expect(m.score).toBeGreaterThan(60)
    const salary = m.groups.flatMap((g) => g.items).find((i) => i.type === 'salary')
    expect(salary.s).toBe(0.5)
  })
})

describe('readFile', () => {
  it('nối dòng PDF bị ngắt giữa câu, giữ dòng mới bắt đầu bằng chữ hoa hoặc gạch đầu dòng', async () => {
    const { unwrapLines } = await import('./readFile.js')
    expect(unwrapLines('Kỹ sư frontend 5 năm xây ứng dụng\ncho thương mại điện tử.\n- Xây trang\nKỸ NĂNG')).toBe('Kỹ sư frontend 5 năm xây ứng dụng cho thương mại điện tử.\n- Xây trang\nKỸ NĂNG')
  })
})

describe('parseJd theo từng vế câu', () => {
  it('“Vững PostgreSQL, có kinh nghiệm Redis” → PostgreSQL bắt buộc mức 4, Redis quan trọng mức 3', () => {
    const items = parseJd('Kỹ sư\nYÊU CẦU\n- Vững PostgreSQL, có kinh nghiệm Redis.\n- Có kinh nghiệm Docker, CI/CD.').criteria.groups.flatMap((g) => g.items)
    expect(items.find((i) => i.skill === 'postgresql')).toMatchObject({ req: 'must', level: 4 })
    expect(items.find((i) => i.skill === 'redis')).toMatchObject({ req: 'important', level: 3 })
    expect(items.find((i) => i.skill === 'cicd')).toMatchObject({ req: 'important', level: 3 })
  })
})

describe('parseQuery', () => {
  it('hiểu kỹ năng, thành phố, từ xa và lương', async () => {
    const { parseQuery } = await import('./extract.js')
    expect(parseQuery('Việc React từ xa ở Hà Nội, lương trên 30 triệu')).toMatchObject({ skills: ['react'], city: 'Hà Nội', remote: true, minSalary: 30 })
  })
})
