// Phân tích theo người: ai được giao khóa nào, tiến độ, thi, hỏi Tutor; chi tiết một người trong một khóa.
// Tiến độ khóa của một người = trung bình tiến độ các tài liệu được giao (đề kiểm tra đạt tính 100%),
// cùng cách tính với màn "Khóa học của tôi" để hai phía thấy cùng một con số.
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db, schema } from '../../db/client.js'
import { notFound } from '../../lib/errors.js'
import { initials } from '../../lib/text.js'

type Json = Record<string, unknown>

export interface PersonRow {
  userId: string; name: string; initials: string; title: string; dept: string | null; color: string
  docs: number; doneDocs: number; percent: number; started: boolean; done: boolean
  due: string | null; overdue: boolean; reason: string; lastAt: string | null
  exam: { attempts: number; passed: number; grading: number; best: number | null }; tutor: number
}
export interface KitSummary { kitId: string; people: number; started: number; done: number; overdue: number; avgPercent: number | null }

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null)

/** Người được giao trong từng khóa (kitId bỏ trống: mọi khóa của tổ chức) */
export async function kitPeople(orgId: string, kitId?: string): Promise<Map<string, PersonRow[]>> {
  const arts = await db.select({ id: schema.artifacts.id, kitId: schema.artifacts.kitId, type: schema.artifacts.type })
    .from(schema.artifacts).where(and(eq(schema.artifacts.orgId, orgId), kitId ? eq(schema.artifacts.kitId, kitId) : undefined))
  const out = new Map<string, PersonRow[]>()
  if (!arts.length) return out
  const ids = arts.map((a) => a.id)
  const artOf = new Map(arts.map((a) => [a.id, a]))
  const [asg, prog, atts, tq, depts] = await Promise.all([
    db.select({ artifactId: schema.assignments.artifactId, userId: schema.assignments.userId, due: schema.assignments.due, reason: schema.assignments.reason, name: schema.users.name, title: schema.users.title, color: schema.users.color, deptId: schema.users.deptId })
      .from(schema.assignments).innerJoin(schema.users, eq(schema.users.id, schema.assignments.userId))
      .where(and(eq(schema.assignments.orgId, orgId), inArray(schema.assignments.artifactId, ids))),
    db.select({ artifactId: schema.progress.artifactId, userId: schema.progress.userId, percent: schema.progress.percent, lastAt: schema.progress.lastAt })
      .from(schema.progress).where(inArray(schema.progress.artifactId, ids)),
    db.select({ artifactId: schema.attempts.artifactId, userId: schema.attempts.userId, status: schema.attempts.status, score: schema.attempts.score, submittedAt: schema.attempts.submittedAt })
      .from(schema.attempts).where(and(eq(schema.attempts.orgId, orgId), inArray(schema.attempts.artifactId, ids), sql`${schema.attempts.status} <> 'in_progress'`)),
    db.select({ artifactId: schema.tutorMessages.artifactId, userId: schema.tutorMessages.userId, n: sql<number>`count(*)::int` })
      .from(schema.tutorMessages).where(and(eq(schema.tutorMessages.orgId, orgId), inArray(schema.tutorMessages.artifactId, ids)))
      .groupBy(schema.tutorMessages.artifactId, schema.tutorMessages.userId),
    db.select({ id: schema.departments.id, name: schema.departments.name }).from(schema.departments).where(eq(schema.departments.orgId, orgId)),
  ])
  const deptName = new Map(depts.map((d) => [d.id, d.name]))
  const key = (u: string, a: string): string => `${u}|${a}`
  const progOf = new Map(prog.map((p) => [key(p.userId, p.artifactId), p]))
  const now = Date.now()

  // gom theo khóa → người
  const groups = new Map<string, Map<string, typeof asg>>()
  for (const a of asg) {
    const k = artOf.get(a.artifactId)!.kitId
    const byUser = groups.get(k) ?? new Map<string, typeof asg>()
    byUser.set(a.userId, [...(byUser.get(a.userId) ?? []), a])
    groups.set(k, byUser)
  }
  for (const [k, byUser] of groups) {
    const kitArtIds = new Set(arts.filter((a) => a.kitId === k).map((a) => a.id))
    const rows: PersonRow[] = [...byUser.entries()].map(([userId, list]) => {
      const mine = atts.filter((t) => t.userId === userId && kitArtIds.has(t.artifactId))
      const pct = list.map((a) => {
        if (artOf.get(a.artifactId)!.type === 'exam') return mine.some((t) => t.artifactId === a.artifactId && t.status === 'passed') ? 100 : 0
        return progOf.get(key(userId, a.artifactId))?.percent ?? 0
      })
      const percent = Math.round(pct.reduce((s, x) => s + x, 0) / pct.length)
      const lasts = [...list.map((a) => progOf.get(key(userId, a.artifactId))?.lastAt), ...mine.map((t) => t.submittedAt)].filter(Boolean) as Date[]
      const dues = list.map((a) => a.due).filter(Boolean) as Date[]
      const due = dues.length ? new Date(Math.min(...dues.map((d) => d.getTime()))) : null
      const graded = mine.filter((t) => t.status !== 'grading' && t.score != null)
      const u = list[0]
      return {
        userId, name: u.name, initials: initials(u.name), title: u.title, dept: u.deptId ? deptName.get(u.deptId) ?? null : null, color: u.color,
        docs: list.length, doneDocs: pct.filter((x) => x >= 100).length, percent, started: lasts.length > 0, done: percent >= 100,
        due: iso(due), overdue: !!due && due.getTime() < now && percent < 100, reason: list.find((a) => a.reason)?.reason ?? '',
        lastAt: lasts.length ? new Date(Math.max(...lasts.map((d) => d.getTime()))).toISOString() : null,
        exam: { attempts: mine.length, passed: mine.filter((t) => t.status === 'passed').length, grading: mine.filter((t) => t.status === 'grading').length, best: graded.length ? Math.round(Math.max(...graded.map((t) => t.score as number))) : null },
        tutor: tq.filter((t) => t.userId === userId && kitArtIds.has(t.artifactId)).reduce((s, t) => s + t.n, 0),
      }
    })
    // quá hạn lên đầu, rồi chưa xong theo tiến độ thấp trước, người đã xong xuống cuối
    rows.sort((a, b) => Number(b.overdue) - Number(a.overdue) || Number(a.done) - Number(b.done) || a.percent - b.percent || a.name.localeCompare(b.name, 'vi'))
    out.set(k, rows)
  }
  return out
}

export function kitSummary(kitId: string, rows: PersonRow[]): KitSummary {
  return {
    kitId, people: rows.length, started: rows.filter((r) => r.started).length, done: rows.filter((r) => r.done).length,
    overdue: rows.filter((r) => r.overdue).length, avgPercent: rows.length ? Math.round(rows.reduce((s, r) => s + r.percent, 0) / rows.length) : null,
  }
}

/** Mọi thứ về một người trong một khóa: tài liệu và tiến độ, lượt thi, câu hỏi Tutor, mức kỹ năng của khóa */
export async function personInKit(orgId: string, kitId: string, userId: string): Promise<Json> {
  const [kit] = await db.select().from(schema.kits).where(and(eq(schema.kits.id, kitId), eq(schema.kits.orgId, orgId)))
  const [user] = await db.select().from(schema.users).where(and(eq(schema.users.id, userId), eq(schema.users.orgId, orgId)))
  if (!kit || !user) throw notFound('Khóa học hoặc người học')
  const arts = await db.select({ id: schema.artifacts.id, type: schema.artifacts.type, title: schema.artifacts.title, status: schema.artifacts.status })
    .from(schema.artifacts).where(eq(schema.artifacts.kitId, kitId))
  const ids = arts.map((a) => a.id)
  const none = ['__none__']
  const [asg, prog, atts, tutor, dept, skill, level, events, row] = await Promise.all([
    db.select().from(schema.assignments).where(and(eq(schema.assignments.userId, userId), inArray(schema.assignments.artifactId, ids.length ? ids : none))),
    db.select().from(schema.progress).where(and(eq(schema.progress.userId, userId), inArray(schema.progress.artifactId, ids.length ? ids : none))),
    db.select().from(schema.attempts).where(and(eq(schema.attempts.userId, userId), inArray(schema.attempts.artifactId, ids.length ? ids : none), sql`${schema.attempts.status} <> 'in_progress'`)).orderBy(desc(schema.attempts.submittedAt)),
    db.select({ id: schema.tutorMessages.id, artifactId: schema.tutorMessages.artifactId, question: schema.tutorMessages.question, found: schema.tutorMessages.found, at: schema.tutorMessages.createdAt })
      .from(schema.tutorMessages).where(and(eq(schema.tutorMessages.userId, userId), inArray(schema.tutorMessages.artifactId, ids.length ? ids : none))).orderBy(desc(schema.tutorMessages.createdAt)).limit(20),
    user.deptId ? db.select({ name: schema.departments.name }).from(schema.departments).where(eq(schema.departments.id, user.deptId)) : Promise.resolve([]),
    kit.skillId ? db.select({ name: schema.skills.name }).from(schema.skills).where(eq(schema.skills.id, kit.skillId)) : Promise.resolve([]),
    kit.skillId ? db.select({ level: schema.userSkills.level, source: schema.userSkills.source }).from(schema.userSkills).where(and(eq(schema.userSkills.userId, userId), eq(schema.userSkills.skillId, kit.skillId))) : Promise.resolve([]),
    kit.skillId ? db.select().from(schema.skillEvents).where(and(eq(schema.skillEvents.userId, userId), eq(schema.skillEvents.skillId, kit.skillId))).orderBy(desc(schema.skillEvents.createdAt)).limit(5) : Promise.resolve([]),
    kitPeople(orgId, kitId).then((m) => m.get(kitId)?.find((r) => r.userId === userId) ?? null),
  ])
  const title = new Map(arts.map((a) => [a.id, a.title]))
  // tài liệu được giao, cộng tài liệu người này tự mở dù không được giao
  const shown = arts.filter((a) => asg.some((x) => x.artifactId === a.id) || prog.some((p) => p.artifactId === a.id) || atts.some((t) => t.artifactId === a.id))
  const items = shown.map((a) => {
    const g = asg.find((x) => x.artifactId === a.id), p = prog.find((x) => x.artifactId === a.id)
    const mine = atts.filter((t) => t.artifactId === a.id)
    const passed = mine.some((t) => t.status === 'passed')
    return {
      id: a.id, type: a.type, title: a.title, assigned: !!g, due: iso(g?.due), reason: g?.reason ?? '', assignedAt: iso(g?.createdAt),
      percent: a.type === 'exam' ? (passed ? 100 : 0) : p?.percent ?? 0, sessions: p?.sessions ?? 0, steps: p?.done.length ?? 0,
      lastAt: iso(p?.lastAt), completedAt: iso(p?.completedAt ?? null),
    }
  })
  return {
    user: { id: user.id, name: user.name, initials: initials(user.name), title: user.title, dept: dept[0]?.name ?? null, color: user.color, email: user.email },
    kit: { id: kit.id, title: kit.title, level: kit.level },
    summary: row,
    skill: kit.skillId ? { id: kit.skillId, name: skill[0]?.name ?? kit.skillId, level: level[0]?.level ?? 0, source: level[0]?.source ?? null, target: kit.level ?? null, events: events.map((e) => ({ from: e.from, to: e.to, reason: e.reason, at: iso(e.createdAt) })) } : null,
    items,
    attempts: atts.map((t) => ({ id: t.id, artifactId: t.artifactId, title: title.get(t.artifactId) ?? '', mode: t.mode, status: t.status, score: t.score == null ? null : Math.round(t.score), submittedAt: iso(t.submittedAt), flags: t.flags.length })),
    tutor: tutor.map((m) => ({ ...m, at: iso(m.at), title: title.get(m.artifactId) ?? '' })),
  }
}
