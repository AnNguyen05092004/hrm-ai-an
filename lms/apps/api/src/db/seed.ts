// Dữ liệu mẫu: tổ chức "Công ty demo", 1 quản trị, 1 người soạn, 2 reviewer, 6 khóa học lấy từ prototype và vài lượt review.
// Mật khẩu mẫu của mọi tài khoản: demo1234 (chỉ dùng cho môi trường phát triển).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { eq, sql } from 'drizzle-orm'
import { db, schema, sqlClient } from './client.js'
import { hashPassword } from '../lib/auth.js'
import { chunkExisting } from '../modules/sources/service.js'
import { ADMIN_EMAIL, AUTHOR_EMAIL, REVIEWER_EMAIL } from './demo-accounts.js'
import { seedExam } from './seed-exam.js'
export { ADMIN_EMAIL, AUTHOR_EMAIL, REVIEWER_EMAIL }

export const DEMO_PASSWORD = 'demo1234'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
const here = path.dirname(fileURLToPath(import.meta.url))
const P: Json = JSON.parse(readFileSync(path.join(here, 'seed-data/prototype.json'), 'utf8'))

const META_KEYS = new Set(['id', 'kitId', 'type', 'title', 'summary', 'status', 'updated', 'img', 'viewers', 'sessions', 'done', 'link'])
const contentOf = (a: Json): Json => Object.fromEntries(Object.entries(a).filter(([k]) => !META_KEYS.has(k)))
const vnDate = (s: string): Date => { const [d, m, y] = s.split('/').map(Number); return new Date(Date.UTC(y, m - 1, d, 10)) }

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
  await db.execute(sql`truncate orgs, users, sessions, skills, sources, source_chunks, kits, images, artifacts, artifact_versions,
    kit_reviews, review_comments, jobs, ai_usage, audit_logs restart identity cascade`)
}

export interface SeedIds { orgId: string; adminId: string; authorId: string; reviewerId: string; reviewer2Id: string; kits: Record<string, string> }

export async function seed(): Promise<SeedIds> {
  await resetDb()
  const [org] = await db.insert(schema.orgs).values({ name: 'Công ty demo' }).returning()
  const orgId = org.id
  const pw = await hashPassword(DEMO_PASSWORD)

  await db.insert(schema.skills).values((P.skills as Json[]).map((s) => ({ id: s.id, orgId, name: s.name, group: s.comp })))

  const person = (email: string, name: string, role: 'admin' | 'author' | 'reviewer', title: string, color: string) =>
    db.insert(schema.users).values({ orgId, email, name, passwordHash: pw, role, title, color }).returning().then((r) => r[0])
  const admin = await person(ADMIN_EMAIL, 'Đỗ Minh Quân', 'admin', 'Quản trị hệ thống đào tạo', '#7a8b99')
  const author = await person(AUTHOR_EMAIL, 'Nguyễn An', 'author', 'Chuyên viên thiết kế đào tạo', '#8b88c9')
  const reviewer = await person(REVIEWER_EMAIL, 'Phạm Thu Hà', 'reviewer', 'Chuyên gia an toàn thông tin', '#4caf8e')
  const reviewer2 = await person('nam.lh@demo.local', 'Lê Hoàng Nam', 'reviewer', 'Kỹ sư DevOps', '#5b9bd5')

  const srcIds: Record<string, string> = {}
  for (const [name, parts] of sourceTexts()) {
    const [s] = await db.insert(schema.sources).values({
      orgId, name, mime: 'text/markdown', text: parts.join('\n\n'), status: 'ready', uploadedBy: author.id,
    }).returning()
    srcIds[name] = s.id
    await chunkExisting(s.id)
  }

  // gắn trích nguồn của nội dung mẫu với đoạn nguồn thật (để phát hiện khi tài liệu nguồn đổi)
  const chunks = await db.select({ id: schema.sourceChunks.id, sourceId: schema.sourceChunks.sourceId, section: schema.sourceChunks.section, version: schema.sourceChunks.version, name: schema.sources.name })
    .from(schema.sourceChunks).innerJoin(schema.sources, eq(schema.sources.id, schema.sourceChunks.sourceId))
  const refOf = (src?: string): Json | undefined => {
    if (!src) return undefined
    const [file, sec] = src.split(' · ')
    const c = chunks.find((x) => x.name === file && x.section === sec)
    return c ? { sourceId: c.sourceId, chunkId: c.id, version: c.version } : undefined
  }
  const link = (c: Json): Json => ({
    ...c,
    ...(c.lessons ? { lessons: c.lessons.map((l: Json) => (l.blocks ? { ...l, blocks: l.blocks.map((b: Json) => ({ ...b, ...(refOf(b.src) ? { srcRef: refOf(b.src) } : {}) })) } : l)) } : {}),
    ...(c.quiz ? { quiz: { ...c.quiz, questions: c.quiz.questions.map((q: Json) => ({ ...q, ...(refOf(q.src) ? { srcRef: refOf(q.src) } : {}) })) } } : {}),
  })

  const artIds: Record<string, string> = {}
  const kitIds: Record<string, string> = {}
  // nội dung mẫu: lấy các bài của Tài liệu nhanh, đã chốt v1; các định dạng mẫu coi như soạn từ v1
  const masters = new Map<string, Json>()
  for (const k of P.kits as Json[]) {
    const [kit] = await db.insert(schema.kits).values({
      orgId, title: k.title, goal: k.desc, skillId: k.skill, level: k.level, stage: 'ready', createdBy: author.id,
      img: P.artifacts[k.artifacts[0]]?.img ?? 'server',
      details: { audience: k.audience, goals: k.goals, takeaways: k.takeaways, metrics: k.metrics, practice: k.practice },
      sourceIds: (k.sources as Json[]).map((s) => srcIds[s.name]).filter(Boolean),
    }).returning()
    kitIds[k.id] = kit.id
    for (const aid of k.artifacts as string[]) {
      const a = P.artifacts[aid]
      if (!a) continue
      const published = a.status === 'published'
      const [row] = await db.insert(schema.artifacts).values({
        orgId, kitId: kit.id, type: a.type, title: a.title, summary: a.summary, content: link({ ...contentOf(a), plan: { type: a.type, title: a.title, summary: a.summary, basedOn: 1 } }),
        status: published ? 'published' : 'draft', publishedVersion: published ? 1 : null, img: a.img,
        updatedAt: vnDate(a.updated.split(' ')[0]),
      }).returning()
      artIds[aid] = row.id
      if (a.type === 'qr' && !masters.has(kit.id)) masters.set(kit.id, { lessons: contentOf(a).lessons.filter((l: Json) => l.kind === 'lesson') })
      if (published) {
        await db.insert(schema.artifactVersions).values({
          artifactId: row.id, version: 1, title: a.title, summary: a.summary, content: link(contentOf(a)), publishedBy: author.id, note: 'Bản đầu',
        })
      }
    }
    const m = masters.get(kit.id)
    if (m) {
      const content = link(m)
      const [ma] = await db.insert(schema.artifacts).values({
        orgId, kitId: kit.id, type: 'master', title: 'Nội dung', summary: k.desc, content, status: 'published', publishedVersion: 1, img: 'notes',
      }).returning()
      await db.insert(schema.artifactVersions).values({ artifactId: ma.id, version: 1, title: 'Nội dung', summary: k.desc, content, publishedBy: author.id, note: 'Chốt nội dung' })
    }
  }

  const [sec] = await db.select({ img: schema.kits.img }).from(schema.kits).where(eq(schema.kits.id, kitIds['k-sec']))
  await seedExam(orgId, kitIds['k-sec'], sec.img, author.id)
  await seedReviews(orgId, author.id, reviewer.id, reviewer2.id, kitIds, artIds)
  return { orgId, adminId: admin.id, authorId: author.id, reviewerId: reviewer.id, reviewer2Id: reviewer2.id, kits: kitIds }
}

/** Vài lượt review để bản demo có sẵn: một khóa đang chờ review, một khóa cần sửa có góp ý, một khóa đã duyệt */
async function seedReviews(orgId: string, authorId: string, haId: string, namId: string, kits: Record<string, string>, arts: Record<string, string>): Promise<void> {
  const day = (n: number): Date => new Date(Date.now() + n * 86400_000)
  const lessonOf = (aid: string, i: number): { key: string; label: string } | null => {
    const l = ((P.artifacts[aid]?.lessons ?? []) as Json[]).filter((x) => x.kind === 'lesson')[i]
    return l ? { key: `lesson:${l.id}`, label: `Bài ${i + 1}: ${l.title}` } : null
  }
  await db.insert(schema.kitReviews).values([
    { orgId, kitId: kits['k-sec'], reviewerId: haId, invitedBy: authorId, message: 'Chị xem giúp em phần nhận diện email lừa đảo và quy trình báo cáo đã đúng chính sách mới chưa ạ.', due: day(3) },
    { orgId, kitId: kits['k-docker'], reviewerId: namId, invitedBy: authorId, message: 'Anh rà giúp các lệnh sao lưu volume.', status: 'changes', decisionNote: 'Lệnh sao lưu cần dừng container trước, và thêm cảnh báo về quyền thư mục khi dùng bind mount.', decidedAt: day(-1), due: day(2) },
    { orgId, kitId: kits['k-leave'], reviewerId: haId, invitedBy: authorId, status: 'approved', decisionNote: 'Nội dung đúng quy định nghỉ phép hiện hành.', decidedAt: day(-3) },
  ])
  const [c1] = await db.insert(schema.reviewComments).values({
    orgId, kitId: kits['k-docker'], artifactId: arts['a-qr'], anchor: lessonOf('a-qr', 2), authorId: namId,
    body: 'Ví dụ tar đang chạy khi container còn ghi dữ liệu: bản sao lưu có thể hỏng. Thêm bước docker stop trước khi sao lưu.',
  }).returning()
  await db.insert(schema.reviewComments).values([
    { orgId, kitId: kits['k-docker'], parentId: c1.id, artifactId: arts['a-qr'], anchor: lessonOf('a-qr', 2), authorId, body: 'Em đã thêm bước dừng container, anh xem lại giúp em.' },
    { orgId, kitId: kits['k-docker'], artifactId: arts['a-qr'], anchor: lessonOf('a-qr', 1), authorId: namId, body: 'Nên nói rõ bind mount phụ thuộc quyền thư mục trên máy chủ (UID/GID).' },
  ])
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { runMigrations } = await import('./migrate.js')
  await runMigrations()
  await seed()
  process.stdout.write(`Đã tạo dữ liệu mẫu. Đăng nhập: ${ADMIN_EMAIL}, ${AUTHOR_EMAIL} hoặc ${REVIEWER_EMAIL} / ${DEMO_PASSWORD}\n`)
  await sqlClient.end()
}
