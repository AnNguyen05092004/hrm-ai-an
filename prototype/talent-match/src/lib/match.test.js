import { describe, it, expect } from 'vitest'
import { matchScore, rankCandidates, rankJobs, gradeOf, distributeByReq, groupWeightTotal } from './match.js'
import { monthsBetween, scoreItem } from './criteria.js'
import { JOBS, jobById } from '../data/jobs.js'
import { CVS, cvById } from '../data/cvs.js'

const T = { A: 85, B: 70, C: 50 }

describe('dữ liệu mẫu', () => {
  it('mọi JD có trọng số nhóm tổng 100 và trọng số trong nhóm tổng 100', () => {
    JOBS.forEach((job) => {
      expect(groupWeightTotal(job.criteria), job.id).toBe(100)
      job.criteria.groups.forEach((g) => expect(g.items.reduce((s, i) => s + i.weight, 0), `${job.id}/${g.id}`).toBe(100))
    })
  })
})

describe('monthsBetween', () => {
  it('tính cả tháng đầu và tháng cuối', () => {
    expect(monthsBetween('2020-08', '2020-10')).toBe(3)
  })
  it('vị trí đang làm tính đến tháng hiện tại', () => {
    expect(monthsBetween('2026-01', null)).toBe(11)
  })
})

describe('gradeOf', () => {
  it('xếp hạng theo ngưỡng', () => {
    expect(gradeOf(90, false, T)).toBe('A')
    expect(gradeOf(70, false, T)).toBe('B')
    expect(gradeOf(55, false, T)).toBe('C')
    expect(gradeOf(49, false, T)).toBe('D')
  })
  it('thiếu tiêu chí bắt buộc thì tối đa hạng C', () => {
    expect(gradeOf(92, true, T)).toBe('C')
    expect(gradeOf(40, true, T)).toBe('D')
  })
})

describe('scoreItem', () => {
  const job = jobById('job-be')
  it('kỹ năng thiếu nhưng có kỹ năng gần thì đạt một phần', () => {
    const r = scoreItem({ type: 'skill', skill: 'postgresql', level: 4 }, cvById('cv-07'), job)
    expect(r.near).toBe('MySQL')
    expect(r.s).toBeCloseTo(0.75 * 0.75)
  })
  it('lương vượt trần trong 15% được nửa điểm', () => {
    const r = scoreItem({ type: 'salary' }, { ...cvById('cv-05'), salary: 44 }, job)
    expect(r.s).toBe(0.5)
  })
  it('JD làm từ xa không xét địa điểm', () => {
    const r = scoreItem({ type: 'location' }, cvById('cv-18'), jobById('job-fe'))
    expect(r.s).toBe(1)
    expect(r.dynamic).toBe(true)
  })
})

describe('matchScore', () => {
  it('ứng viên đủ mọi yêu cầu chính đạt hạng A', () => {
    const m = matchScore(jobById('job-cv'), cvById('cv-01'))
    expect(m.grade).toBe('A')
    expect(m.knockouts).toHaveLength(0)
  })
  it('thiếu Java (bắt buộc) thì bị giới hạn hạng C dù điểm cao', () => {
    const m = matchScore(jobById('job-be'), cvById('cv-06'))
    expect(m.knockouts.map((k) => k.skill)).toContain('java')
    expect(['C', 'D']).toContain(m.grade)
  })
  it('tổng điểm bằng tổng điểm thành phần của các nhóm', () => {
    const m = matchScore(jobById('job-po'), cvById('cv-20'))
    const sum = m.groups.reduce((s, g) => s + g.points, 0)
    expect(m.raw).toBeCloseTo(sum, 1)
    expect(m.groups.reduce((s, g) => s + g.max, 0)).toBeCloseTo(100)
  })
  it('đổi trọng số làm thay đổi điểm mà không sửa JD gốc', () => {
    const job = jobById('job-be')
    const before = JSON.stringify(job.criteria)
    const criteria = { ...job.criteria, groups: job.criteria.groups.map((g) => (g.id === 'skills' ? { ...g, weight: 20 } : g.id === 'experience' ? { ...g, weight: 55 } : g)) }
    const a = matchScore(job, cvById('cv-06'))
    const b = matchScore(job, cvById('cv-06'), criteria)
    expect(a.raw).not.toBe(b.raw)
    expect(JSON.stringify(job.criteria)).toBe(before)
  })
})

describe('xếp hạng hai chiều', () => {
  it('JD → kho hồ sơ: người ứng tuyển phù hợp nhất đứng đầu', () => {
    expect(rankCandidates(jobById('job-qa'), CVS)[0].cv.id).toBe('cv-11')
  })
  it('hồ sơ → kho JD: vị trí phù hợp nhất đứng đầu', () => {
    expect(rankJobs(cvById('cv-14'), JOBS)[0].job.id).toBe('job-emb')
    expect(rankJobs(cvById('cv-22'), JOBS)[0].job.id).toBe('job-hr')
  })
})

describe('distributeByReq', () => {
  it('chia 3:2:1 và tổng luôn 100', () => {
    const out = distributeByReq([{ req: 'must' }, { req: 'important' }, { req: 'bonus' }])
    expect(out.map((i) => i.weight)).toEqual([50, 33, 17])
    expect(out.reduce((s, i) => s + i.weight, 0)).toBe(100)
  })
})
