// Mô hình năng lực đội ngũ: từ KPI → kỹ năng cần → khoảng cách từng người → khóa phù hợp.
import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import { db, schema } from '../../db/client.js'
import { initials } from '../../lib/text.js'

export interface Person { id: string; name: string; email: string; title: string; color: string; initials: string; deptId: string | null; positionId: string | null; joinedAt: Date; lv: Record<string, number> }
export type CellState = 'ok' | 'gap' | 'assigned' | 'learning' | 'done'
export interface Rec {
  skillId: string; skillName: string; kpiIds: string[]; score: number
  courseLevel: number; courses: { id: string; title: string; type: string; kitId: string }[]; kitId: string | null
  gap: string[]; byCourse: string[]; beyondCourse: string[]; assigned: string[]; completed: string[]
  mentors: Record<string, string | null>
}

export async function buildModel(orgId: string) {
  const [people, depts, positions, skills, kpis, us, kits, arts, asg, prog] = await Promise.all([
    db.select().from(schema.users).where(and(eq(schema.users.orgId, orgId), eq(schema.users.role, 'learner'), eq(schema.users.active, true))).orderBy(schema.users.name),
    db.select().from(schema.departments).where(eq(schema.departments.orgId, orgId)).orderBy(schema.departments.sort),
    db.select().from(schema.positions).where(eq(schema.positions.orgId, orgId)),
    db.select().from(schema.skills).where(eq(schema.skills.orgId, orgId)),
    db.select().from(schema.kpis).where(eq(schema.kpis.orgId, orgId)).orderBy(schema.kpis.createdAt),
    db.select({ userId: schema.userSkills.userId, skillId: schema.userSkills.skillId, level: schema.userSkills.level }).from(schema.userSkills).innerJoin(schema.users, eq(schema.users.id, schema.userSkills.userId)).where(eq(schema.users.orgId, orgId)),
    db.select().from(schema.kits).where(and(eq(schema.kits.orgId, orgId), isNotNull(schema.kits.skillId))),
    db.select({ id: schema.artifacts.id, kitId: schema.artifacts.kitId, title: schema.artifacts.title, type: schema.artifacts.type, published: schema.artifacts.publishedVersion }).from(schema.artifacts).where(eq(schema.artifacts.orgId, orgId)),
    db.select().from(schema.assignments).where(eq(schema.assignments.orgId, orgId)),
    db.select({ userId: schema.progress.userId, artifactId: schema.progress.artifactId, percent: schema.progress.percent }).from(schema.progress).innerJoin(schema.users, eq(schema.users.id, schema.progress.userId)).where(eq(schema.users.orgId, orgId)),
  ])
  const lv = new Map<string, Record<string, number>>()
  for (const s of us) lv.set(s.userId, { ...(lv.get(s.userId) ?? {}), [s.skillId]: s.level })
  const team: Person[] = people.map((p) => ({ id: p.id, name: p.name, email: p.email, title: p.title, color: p.color, initials: initials(p.name), deptId: p.deptId, positionId: p.positionId, joinedAt: p.joinedAt, lv: lv.get(p.id) ?? {} }))
  const posNeeds = new Map(positions.map((p) => [p.id, p.needs]))
  const active = kpis.filter((k) => k.active)
  const cur = (p: Person, sk: string): number => p.lv[sk] ?? 0
  const need = (p: Person, sk: string): number => Math.max(
    posNeeds.get(p.positionId ?? '')?.[sk] ?? 0,
    ...active.flatMap((k) => k.skills.filter((s) => s.skillId === sk && s.boost && (!s.positions?.length || s.positions.includes(p.positionId ?? ''))).map((s) => s.boost ?? 0)),
  )
  const gap = (p: Person, sk: string): number => Math.max(0, need(p, sk) - cur(p, sk))
  const kpiSkills = [...new Set(active.flatMap((k) => k.skills.map((s) => s.skillId)))].filter((sk) => skills.some((s) => s.id === sk))

  // khóa đã xuất bản theo kỹ năng; một khóa chỉ đưa người học tới mức của khóa
  const coursesOf = (sk: string) => {
    const ks = kits.filter((k) => k.skillId === sk)
    const list = ks.flatMap((k) => arts.filter((a) => a.kitId === k.id && a.published).map((a) => ({ id: a.id, title: a.title, type: a.type, kitId: k.id, level: k.level ?? 1 })))
    return { list, level: Math.max(0, ...list.map((c) => c.level)), kitId: ks.find((k) => arts.some((a) => a.kitId === k.id && a.published))?.id ?? ks[0]?.id ?? null }
  }
  const stateOf = (p: Person, sk: string, courseIds: string[]): CellState => {
    if (!gap(p, sk)) return 'ok'
    const mine = asg.filter((a) => a.userId === p.id && courseIds.includes(a.artifactId))
    if (!mine.length) return 'gap'
    const pr = mine.map((a) => prog.find((x) => x.userId === p.id && x.artifactId === a.artifactId)?.percent ?? 0)
    return pr.every((x) => x >= 100) ? 'done' : pr.some((x) => x > 0) ? 'learning' : 'assigned'
  }

  const recs: Rec[] = kpiSkills.map((sk) => {
    const c = coursesOf(sk)
    const ids = c.list.map((x) => x.id)
    const G = team.filter((p) => gap(p, sk) > 0)
    const ks = active.filter((k) => k.skills.some((s) => s.skillId === sk))
    const mentors = Object.fromEntries(G.map((p) => [p.id, team.filter((m) => m.id !== p.id && cur(m, sk) >= need(p, sk)).sort((a, b) => cur(b, sk) - cur(a, sk))[0]?.id ?? null]))
    return {
      skillId: sk, skillName: skills.find((s) => s.id === sk)?.name ?? sk, kpiIds: ks.map((k) => k.id),
      score: G.reduce((s, p) => s + gap(p, sk), 0) * ks.length,
      courseLevel: c.level, courses: c.list.map(({ level: _l, ...x }) => x), kitId: c.kitId,
      gap: G.map((p) => p.id), byCourse: G.filter((p) => cur(p, sk) < c.level).map((p) => p.id), beyondCourse: G.filter((p) => cur(p, sk) >= c.level).map((p) => p.id),
      assigned: G.filter((p) => stateOf(p, sk, ids) !== 'gap').map((p) => p.id), completed: G.filter((p) => stateOf(p, sk, ids) === 'done').map((p) => p.id),
      mentors,
    }
  }).filter((r) => r.gap.length).sort((a, b) => b.score - a.score)

  const cells: Record<string, Record<string, { cur: number; need: number; state: CellState }>> = {}
  for (const p of team) {
    cells[p.id] = {}
    for (const sk of kpiSkills) { const n = need(p, sk); if (n) cells[p.id][sk] = { cur: cur(p, sk), need: n, state: stateOf(p, sk, coursesOf(sk).list.map((x) => x.id)) } }
  }
  const after = (p: Person, sk: string): number => { const r = recs.find((x) => x.skillId === sk); return r ? Math.max(cur(p, sk), Math.min(need(p, sk), r.courseLevel)) : cur(p, sk) }
  const readiness = (future: boolean): number => {
    let a = 0, b = 0
    for (const p of team) for (const sk of kpiSkills) { const n = need(p, sk); if (!n) continue; b += n; a += Math.min(n, future ? after(p, sk) : cur(p, sk)) }
    return b ? Math.round((a / b) * 100) : 100
  }
  return {
    team, depts, positions: positions.map((p) => ({ id: p.id, name: p.name, needs: p.needs })), skills: skills.map((s) => ({ id: s.id, name: s.name, group: s.group })),
    kpis, kpiSkills, recs, cells, readiness: { now: readiness(false), after: readiness(true) },
  }
}

export type Model = Awaited<ReturnType<typeof buildModel>>

/** Số liệu đào tạo thật cho tab tác động: lượt giao, tỷ lệ hoàn thành, tỷ lệ đạt theo KPI */
export async function trainingStats(orgId: string, kpiId?: string): Promise<{ assigned: number; completion: number; pass: number; firstAssigned: Date | null }> {
  const where = [eq(schema.assignments.orgId, orgId)]
  if (kpiId) where.push(eq(schema.assignments.kpiId, kpiId))
  const asg = await db.select().from(schema.assignments).where(and(...where))
  if (!asg.length) return { assigned: 0, completion: 0, pass: 0, firstAssigned: null }
  const prog = await db.select().from(schema.progress).where(inArray(schema.progress.artifactId, [...new Set(asg.map((a) => a.artifactId))]))
  const done = asg.filter((a) => (prog.find((p) => p.userId === a.userId && p.artifactId === a.artifactId)?.percent ?? 0) >= 100).length
  const atts = await db.select({ status: schema.attempts.status }).from(schema.attempts).where(and(eq(schema.attempts.orgId, orgId), inArray(schema.attempts.artifactId, [...new Set(asg.map((a) => a.artifactId))])))
  const graded = atts.filter((a) => a.status === 'passed' || a.status === 'failed')
  return {
    assigned: asg.length, completion: Math.round((100 * done) / asg.length), pass: graded.length ? Math.round((100 * graded.filter((a) => a.status === 'passed').length) / graded.length) : 0,
    firstAssigned: asg.reduce<Date | null>((m, a) => (!m || a.createdAt < m ? a.createdAt : m), null),
  }
}
