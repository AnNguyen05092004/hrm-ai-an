// Dữ liệu mẫu: tổ chức "Công ty demo", đội 20 người + 1 giám đốc, KPI, 6 bộ đào tạo lấy từ prototype.
// Mật khẩu mẫu của mọi tài khoản: demo1234 (chỉ dùng cho môi trường phát triển).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { sql } from 'drizzle-orm'
import { db, schema, sqlClient } from './client.js'
import { hashPassword } from '../lib/auth.js'
import { fold } from '../lib/text.js'
import { chunkExisting } from '../modules/sources/service.js'

export const DEMO_PASSWORD = 'demo1234'
export const AUTHOR_EMAIL = 'an@demo.local'
export const LEARNER_EMAIL = 'ha@demo.local'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
const here = path.dirname(fileURLToPath(import.meta.url))
const P: Json = JSON.parse(readFileSync(path.join(here, 'seed-data/prototype.json'), 'utf8'))

const META_KEYS = new Set(['id', 'kitId', 'type', 'title', 'summary', 'status', 'updated', 'img', 'viewers', 'sessions', 'done', 'link'])
const contentOf = (a: Json): Json => Object.fromEntries(Object.entries(a).filter(([k]) => !META_KEYS.has(k)))
const vnDate = (s: string): Date => { const [d, m, y] = s.split('/').map(Number); return new Date(Date.UTC(y, m - 1, d, 10)) }

const emailOf = (name: string): string => {
  const parts = fold(name).split(/\s+/)
  return `${parts[parts.length - 1]}.${parts.slice(0, -1).map((w) => w[0]).join('')}@demo.local`
}

/** Gom nội dung các khối trích cùng một tài liệu nguồn thành văn bản nguồn mẫu */
function sourceTexts(): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const a of Object.values(P.artifacts) as Json[]) {
    for (const l of a.lessons ?? []) for (const b of l.blocks ?? []) {
      if (!b.src) continue
      const [file, sec] = String(b.src).split(' · ')
      const body = [b.h, b.p, ...(b.items ?? []), ...(b.steps ?? []), b.code, ...(b.rows ?? []).map((r: string[]) => r.join(' | '))].filter(Boolean).join('\n')
      m.set(file, [...(m.get(file) ?? []), `## ${sec ?? 'Nội dung'}\n${body}`])
    }
  }
  return m
}

export async function resetDb(): Promise<void> {
  await db.execute(sql`truncate orgs, users, sessions, departments, positions, skills, user_skills, skill_events, kpis,
    sources, source_chunks, kits, artifacts, artifact_versions, content_chunks, assignments, progress, attempts,
    tutor_messages, jobs, ai_usage, audit_logs, outbox, evidence restart identity cascade`)
}

export async function seed(): Promise<{ orgId: string; authorId: string; learnerId: string }> {
  await resetDb()
  const T = P.team
  const [org] = await db.insert(schema.orgs).values({ name: 'Công ty demo' }).returning()
  const orgId = org.id
  const pw = await hashPassword(DEMO_PASSWORD)

  const deptIds: Record<string, string> = {}
  for (const [i, [key, name]] of Object.entries(T.DEPTS as Record<string, string>).entries()) {
    const [d] = await db.insert(schema.departments).values({ orgId, name, sort: i, parentId: key === 'mgmt' ? null : undefined }).returning()
    deptIds[key] = d.id
  }
  const posIds: Record<string, string> = {}
  for (const [key, p] of Object.entries(T.POSITIONS as Record<string, Json>)) {
    const [r] = await db.insert(schema.positions).values({ orgId, name: p.name, needs: p.need }).returning()
    posIds[key] = r.id
  }
  await db.insert(schema.skills).values((P.skills as Json[]).map((s) => ({ id: s.id, orgId, name: s.name, group: s.comp })))

  const [author] = await db.insert(schema.users).values({
    orgId, email: AUTHOR_EMAIL, name: 'Nguyễn An', passwordHash: pw, role: 'author',
    title: 'Giám đốc Kỹ thuật · Khối Kỹ thuật sản phẩm', deptId: deptIds.mgmt, color: '#8b88c9',
  }).returning()

  const userIds: Record<string, string> = {}
  for (const p of T.TEAM as Json[]) {
    const [u] = await db.insert(schema.users).values({
      orgId, email: p.learner ? LEARNER_EMAIL : emailOf(p.name), name: p.name, passwordHash: pw, role: 'learner',
      title: (T.POSITIONS as Json)[p.pos].name, deptId: deptIds[p.dept], positionId: posIds[p.pos], managerId: author.id,
      color: p.color, joinedAt: new Date(Date.UTC(p.since, 0, 15)),
    }).returning()
    userIds[p.id] = u.id
    const lv = Object.entries(p.lv as Record<string, number>).filter(([, v]) => v > 0)
    if (lv.length) await db.insert(schema.userSkills).values(lv.map(([skillId, level]) => ({ userId: u.id, skillId, level })))
  }

  for (const k of T.KPIS as Json[]) {
    const tr = T.KPI_TREND[k.id]
    await db.insert(schema.kpis).values({
      orgId, name: k.title, metric: k.metric, current: k.now, target: k.target, due: k.due, active: !k.suggested,
      skills: (k.skills as string[]).map((s) => ({ skillId: s, why: k.why?.[s] })),
      trend: tr ? (T.MONTHS as string[]).map((m, i) => ({ m, v: tr.values[i] })) : [],
    })
  }

  for (const e of T.EVIDENCE as Json[]) {
    await db.insert(schema.evidence).values({
      orgId, userId: userIds[e.pid], skillId: e.sk, kind: e.items[0][0], title: e.items.map((x: string[]) => x[1]).join(' · '),
      text: e.items.map((x: string[]) => `${x[1]}: ${x[2]}`).join('\n'), proposedLevel: e.to, confidence: e.conf, rationale: e.why,
    })
  }

  const srcIds: Record<string, string> = {}
  for (const [name, parts] of sourceTexts()) {
    const [s] = await db.insert(schema.sources).values({
      orgId, name, mime: 'text/markdown', text: parts.join('\n\n'), status: 'ready', uploadedBy: author.id,
    }).returning()
    srcIds[name] = s.id
    await chunkExisting(s.id)
  }

  const artIds: Record<string, string> = {}
  for (const k of P.kits as Json[]) {
    const [kit] = await db.insert(schema.kits).values({
      orgId, title: k.title, goal: k.desc, skillId: k.skill, level: k.level, stage: 'ready', createdBy: author.id,
      img: P.artifacts[k.artifacts[0]]?.img ?? 'server',
      details: { audience: k.audience, goals: k.goals, takeaways: k.takeaways, metrics: k.metrics, practice: k.practice, delivery: k.delivery },
      sourceIds: (k.sources as Json[]).map((s) => srcIds[s.name]).filter(Boolean),
    }).returning()
    for (const aid of k.artifacts as string[]) {
      const a = P.artifacts[aid]
      if (!a) continue
      const published = a.status === 'published'
      const [row] = await db.insert(schema.artifacts).values({
        orgId, kitId: kit.id, type: a.type, title: a.title, summary: a.summary, content: contentOf(a),
        status: published ? 'published' : 'draft', publishedVersion: published ? 1 : null, img: a.img,
        updatedAt: vnDate(a.updated.split(' ')[0]),
      }).returning()
      artIds[aid] = row.id
      if (published) {
        await db.insert(schema.artifactVersions).values({
          artifactId: row.id, version: 1, title: a.title, summary: a.summary, content: contentOf(a), publishedBy: author.id, note: 'Bản đầu',
        })
      }
    }
  }

  const ASSIGNED: [string, string, string, number][] = [
    ['a-qr', '30/11/2026', 'Lộ trình Container (Docker) lên mức 2', 1],
    ['a-vid', '30/11/2026', 'Lộ trình Container (Docker) lên mức 2', 2],
    ['a-sec-scn', '15/11/2026', 'Bắt buộc hằng năm · An toàn thông tin', 0],
    ['a-guide', '20/11/2026', 'Hội nhập nhân viên mới', 0],
    ['a-sql-gd', '05/12/2026', 'Quản lý đề xuất · SQL mức 2', 1],
    ['a-sec-qr', '20/11/2026', 'Bắt buộc hằng năm · An toàn thông tin', 4],
    ['a-sec-vid', '20/11/2026', 'Bắt buộc hằng năm · An toàn thông tin', 4],
    ['a-qr2', '20/11/2026', 'Hội nhập nhân viên mới', 3],
  ]
  const learnerId = userIds.p6
  for (const [aid, due, reason] of ASSIGNED) {
    if (!artIds[aid]) continue
    await db.insert(schema.assignments).values({ orgId, artifactId: artIds[aid], userId: learnerId, due: vnDate(due), reason, assignedBy: author.id })
  }
  return { orgId, authorId: author.id, learnerId }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { runMigrations } = await import('./migrate.js')
  const { indexAllPublished } = await import('../modules/tutor/index-content.js')
  await runMigrations()
  const r = await seed()
  await indexAllPublished(r.orgId)
  process.stdout.write(`Đã tạo dữ liệu mẫu. Đăng nhập: ${AUTHOR_EMAIL} hoặc ${LEARNER_EMAIL} / ${DEMO_PASSWORD}\n`)
  await sqlClient.end()
}
