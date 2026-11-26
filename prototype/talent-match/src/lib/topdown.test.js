import { test, expect } from 'vitest'
import { JOBS } from '../data/jobs.js'
import { CVS } from '../data/cvs.js'
import { matchScore, gainIfMet, rankCandidates } from './match.js'
import { parseJd, criteriaFromJob } from './extract.js'
import { SAMPLE_JD } from '../data/samples.js'
import { newItem } from './criteria.js'

test('mọi cặp việc × CV giữ đúng bất biến top-down (Σ nhóm = 100, điểm + phần thiếu = 100, trượt bắt buộc ≤ C)', () => {
  const issues = []
  for (const job of JOBS) {
    const gw = job.criteria.groups.filter((g) => g.items.length).reduce((s, g) => s + g.weight, 0)
    if (gw !== 100) issues.push(`${job.id} group weights = ${gw}`)
    for (const g of job.criteria.groups) {
      const iw = g.items.reduce((s, i) => s + (i.weight ?? 0), 0)
      if (g.items.length && Math.abs(iw - 100) > 0.5) issues.push(`${job.id}/${g.id} item weights = ${iw}`)
    }
    for (const cv of CVS) {
      const m = matchScore(job, cv)
      const maxSum = m.groups.reduce((s, g) => s + g.max, 0)
      if (Math.abs(maxSum - 100) > 0.01) issues.push(`${job.id}×${cv.id} max sum ${maxSum}`)
      const pts = m.groups.reduce((s, g) => s + g.points, 0)
      if (Math.abs(pts - m.raw) > 0.06) issues.push(`${job.id}×${cv.id} raw ${m.raw} != Σ ${pts}`)
      for (const g of m.groups) {
        const shares = g.items.reduce((s, i) => s + i.share, 0)
        if (Math.abs(shares - 1) > 1e-9) issues.push(`${job.id}×${cv.id} ${g.id} Σ trọng số con = ${shares}`)
        const ip = g.items.reduce((s, i) => s + i.points, 0)
        if (Math.abs(ip - g.points) > 1e-6) issues.push(`${job.id}×${cv.id} group pts`)
        if (g.points > g.max + 1e-6) issues.push(`${job.id}×${cv.id} group over max`)
      }
      const lost = m.gaps.reduce((s, i) => s + i.lost, 0)
      if (Math.abs(m.raw + lost - 100) > 0.6) issues.push(`${job.id}×${cv.id} score+gaps = ${m.raw + lost}`)
      if (m.knockouts.length && ['A', 'B'].includes(m.grade)) issues.push(`${job.id}×${cv.id} knockout but ${m.grade}`)
      if (m.score < 0 || m.score > 100) issues.push('range')
      m.gaps.forEach((i) => { if (!(gainIfMet(i) >= 0)) issues.push('gain') })
    }
  }
  expect(issues).toEqual([])
})

test('tiêu chí con mới thêm (kỹ năng, số năm, lĩnh vực, chứng chỉ) được chấm và cộng đúng vào nhóm', () => {
  const job = JOBS[0]
  const add = { skills: ['skill:docker'], experience: ['years:backend', 'domain:iot'], education: ['cert:aws-saa'] }
  const criteria = {
    ...job.criteria,
    groups: job.criteria.groups.map((g) => ({ ...g, items: [...g.items, ...(add[g.id] ?? []).map(newItem)] })),
  }
  for (const cv of CVS) {
    const m = matchScore(job, cv, criteria)
    for (const g of m.groups) {
      expect(g.items.every((i) => Number.isFinite(i.points) && i.s >= 0 && i.s <= 1)).toBe(true)
      expect(g.items.reduce((s, i) => s + i.points, 0)).toBeCloseTo(g.points, 9)
    }
    expect(m.groups.reduce((s, g) => s + g.max, 0)).toBeCloseTo(100, 9)
  }
  const exp = matchScore(job, CVS[0], criteria).groups.find((g) => g.id === 'experience')
  expect(exp.items.map((i) => i.label)).toEqual(expect.arrayContaining(['Kinh nghiệm Backend', 'Từng làm lĩnh vực Thiết bị thông minh / IoT']))
})

test('JD tải lên được chấm với toàn bộ kho hồ sơ, xếp giảm dần', () => {
  const job = parseJd(SAMPLE_JD)
  const ranking = rankCandidates(job, CVS)
  expect(ranking).toHaveLength(CVS.length)
  expect(ranking.every((r, i) => i === 0 || ranking[i - 1].m.raw >= r.m.raw)).toBe(true)
  expect(ranking[0].m.groups.reduce((s, g) => s + g.max, 0)).toBeCloseTo(100, 9)
})

test('sửa JD: thêm dòng yêu cầu thì trích thêm tiêu chí, bỏ dòng thì mất tiêu chí; trọng số vẫn đủ 100', () => {
  const job = parseJd(SAMPLE_JD)
  const labels = (c) => c.groups.flatMap((g) => g.items).map((i) => i.skill ?? i.type)
  const added = criteriaFromJob({ ...job, requirements: [...job.requirements, 'Bắt buộc có kinh nghiệm Kubernetes.'] })
  const k8s = added.groups.flatMap((g) => g.items).find((i) => i.skill === 'kubernetes')
  expect(k8s).toMatchObject({ req: 'must', src: 'Bắt buộc có kinh nghiệm Kubernetes.' })
  const removed = criteriaFromJob({ ...job, requirements: job.requirements.filter((r) => !/redis/i.test(r)), responsibilities: job.responsibilities.filter((r) => !/redis/i.test(r)) })
  expect(labels(removed)).not.toContain('redis')
  for (const c of [added, removed]) {
    expect(c.groups.filter((g) => g.items.length).reduce((s, g) => s + g.weight, 0)).toBe(100)
  }
  const noSalary = criteriaFromJob({ ...job, salary: { min: 0, max: 0 } })
  expect(labels(noSalary)).not.toContain('salary')
})
