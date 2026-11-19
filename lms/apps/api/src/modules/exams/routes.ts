import crypto from 'node:crypto'
import { z } from 'zod'
import { and, desc, eq, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import type { Flag } from '../../db/schema.js'
import { me, requireAuthor, requireUser, type AuthUser } from '../../lib/auth.js'
import { badRequest, conflict, forbidden, must } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { publishedContent, viewable } from '../learn/access.js'
import { applySkill, gradeQuestion, remediation, scoreOf, versionContent, type Attempt, type Grade } from './grade.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
const GRACE_MS = 30_000

const shuffle = <T>(xs: T[]): T[] => {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

/** Đề riêng: rút ngẫu nhiên từ câu đã duyệt, xáo thứ tự câu và lựa chọn (BR07) */
function buildPaper(quiz: Json): Json[] {
  const bank: Json[] = (quiz.questions ?? []).filter((q: Json) => q.approved)
  const n = Math.min(Number(quiz.pick ?? bank.length) || bank.length, bank.length)
  return shuffle(bank).slice(0, n).map((q) => (q.choices && (q.type === 'mc' || q.type === 'mr') ? { ...q, choices: shuffle(q.choices) } : q))
}

/** Đề gửi cho người thi: bỏ đáp án, giải thích, rubric, giá trị mong đợi */
const publicQ = (q: Json): Json => ({
  id: q.id, type: q.type, q: q.q, level: q.level, starter: q.starter,
  choices: q.choices?.map((c: Json) => c.t), tests: q.type === 'code' ? (q.tests ?? []).map((t: Json) => (typeof t === 'string' ? t : t.name)) : undefined,
  criteria: q.type === 'essay' ? (q.rubric ?? []).length : undefined,
})

async function getAttempt(u: AuthUser, id: string): Promise<Attempt> {
  const a = must((await db.select().from(schema.attempts).where(and(eq(schema.attempts.id, id), eq(schema.attempts.orgId, u.orgId))))[0], 'Bài thi')
  if (a.userId !== u.id && u.role !== 'author') throw forbidden()
  return a
}

const expired = (a: Attempt): boolean => !!a.deadline && Date.now() > a.deadline.getTime() + GRACE_MS

/** Nộp bài: chấm phần chấm được ngay; có tự luận hoặc cờ giám sát thì chờ người chấm */
export async function submit(a: Attempt): Promise<Attempt> {
  // khóa bài trước khi chấm để lần lưu muộn không ghi đè đáp án
  const [locked] = await db.update(schema.attempts).set({ status: 'grading', submittedAt: new Date() })
    .where(and(eq(schema.attempts.id, a.id), eq(schema.attempts.status, 'in_progress'))).returning()
  if (!locked) return (await db.select().from(schema.attempts).where(eq(schema.attempts.id, a.id)))[0]
  const graded = await Promise.all(locked.questions.map(async (q) => [q.id, await gradeQuestion(a.orgId, q, locked.answers[q.id])] as const))
  const grades: Record<string, Grade> = Object.fromEntries(graded)
  const needsHuman = Object.values(grades).some((g) => !g.auto) || locked.flags.length > 0
  const pass = Number((await versionContent(a)).quiz?.passScore ?? 80)
  const score = scoreOf(grades)
  const status = needsHuman ? 'grading' : score >= pass ? 'passed' : 'failed'
  const [r] = await db.update(schema.attempts).set({ grades: grades as unknown as Attempt['grades'], score, status }).where(eq(schema.attempts.id, a.id)).returning()
  if (status === 'passed') await applySkill(r, true, null)
  return r
}

async function view(a: Attempt): Promise<Json> {
  const done = a.status !== 'in_progress'
  const base = { id: a.id, artifactId: a.artifactId, mode: a.mode, status: a.status, startedAt: a.startedAt, deadline: a.deadline, submittedAt: a.submittedAt, answers: a.answers, questions: a.questions.map(publicQ), flags: a.flags.length }
  if (!done) return base
  const content = await versionContent(a)
  const graded = a.status === 'passed' || a.status === 'failed'
  const g = a.grades as unknown as Record<string, Grade>
  return {
    ...base, score: graded ? a.score : null, passScore: content.quiz?.passScore ?? 80,
    results: a.questions.map((q) => {
      const x = g[q.id]
      const auto = x?.auto
      return { id: q.id, correct: graded || auto ? (x?.final ?? x?.score ?? 0) >= 1 : null, score: graded || auto ? (x?.final ?? x?.score) : null, tests: x?.tests, feedback: q.type === 'mc' && auto ? (q.choices as Json[]).find((c, i) => Number(a.answers[q.id]) === i)?.fb : undefined }
    }),
    review: graded && a.status === 'failed' ? remediation(content, a.questions, g) : [],
  }
}

export const examRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireUser)
  const AID = z.object({ aid: z.string() })
  const ID = z.object({ id: z.string() })

  app.get('/my', async (req) => {
    const u = me(req)
    return db.select({ id: schema.attempts.id, artifactId: schema.attempts.artifactId, title: schema.artifacts.title, mode: schema.attempts.mode, status: schema.attempts.status, score: schema.attempts.score, submittedAt: schema.attempts.submittedAt })
      .from(schema.attempts).innerJoin(schema.artifacts, eq(schema.artifacts.id, schema.attempts.artifactId))
      .where(eq(schema.attempts.userId, u.id)).orderBy(desc(schema.attempts.startedAt))
  })

  // Thông tin trước khi thi: cấu hình, số lượt đã dùng, lượt đang làm dở
  app.get('/a/:aid', { schema: { params: AID } }, async (req) => {
    const u = me(req)
    const art = await viewable(u, req.params.aid)
    const { content, title, version } = await publishedContent(art)
    const quiz = content.quiz
    if (!quiz) throw badRequest('Tài liệu này không có bài kiểm tra')
    const mine = await db.select().from(schema.attempts).where(and(eq(schema.attempts.userId, u.id), eq(schema.attempts.artifactId, art.id))).orderBy(desc(schema.attempts.startedAt))
    const open = mine.find((x) => x.status === 'in_progress' && !expired(x))
    const used = mine.filter((x) => x.status !== 'in_progress' || expired(x)).length
    const bank = (quiz.questions ?? []).filter((q: Json) => q.approved).length
    return {
      title, version, kitId: art.kitId, type: art.type, mode: quiz.mode, level: quiz.level ?? 1, passScore: quiz.passScore ?? 80, minutes: quiz.minutes ?? 30, attempts: quiz.attempts ?? 1, proctor: !!quiz.proctor && quiz.mode === 'official',
      count: Math.min(Number(quiz.pick ?? bank) || bank, bank), bank, used, openAttempt: open?.id ?? null,
      passed: mine.some((x) => x.status === 'passed'),
      history: mine.map((x) => ({ id: x.id, status: x.status, score: x.status === 'grading' ? null : x.score, submittedAt: x.submittedAt })),
    }
  })

  app.post('/a/:aid/start', { schema: { params: AID, body: z.object({ consent: z.boolean().default(false), resume: z.boolean().default(false) }) } }, async (req) => {
    const u = me(req)
    const art = await viewable(u, req.params.aid)
    const { content, version } = await publishedContent(art)
    const quiz = content.quiz
    if (!quiz) throw badRequest('Tài liệu này không có bài kiểm tra')
    const proctor = !!quiz.proctor && quiz.mode === 'official'
    if (proctor && !req.body.consent) throw badRequest('Bài thi có giám sát cần bạn đồng ý trước khi bắt đầu. Nếu không đồng ý, liên hệ người phụ trách để thi hình thức khác.', 'consent_required')
    // Mất mạng giữa giờ: vào lại thì tiếp tục lượt đang làm, thời gian vẫn tính (biên #6)
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${u.id}:${art.id}`}))`)
      const mine = await tx.select().from(schema.attempts).where(and(eq(schema.attempts.userId, u.id), eq(schema.attempts.artifactId, art.id)))
      const open = mine.find((x) => x.status === 'in_progress')
      if (open && !expired(open)) return { attempt: open, resumed: true }
      const expiredOpen = open && expired(open) ? open : null
      // chỉ muốn làm tiếp mà bài đã hết giờ: không tự mở lượt mới
      if (req.body.resume) return { attempt: null, resumed: false, expiredOpen, reason: 'Bài đang làm dở đã hết giờ và được nộp tự động.' }
      if (mine.length >= Number(quiz.attempts ?? 1)) return { attempt: null, resumed: false, expiredOpen, reason: 'Bạn đã dùng hết số lượt thi. Liên hệ người phụ trách khóa nếu cần thi lại.' }
      const paper = buildPaper(quiz)
      if (!paper.length) throw badRequest('Bài kiểm tra chưa có câu hỏi nào được duyệt')
      const [a] = await tx.insert(schema.attempts).values({
        orgId: u.orgId, artifactId: art.id, version, userId: u.id, mode: quiz.mode === 'official' ? 'official' : 'practice',
        questions: paper as Attempt['questions'], consent: req.body.consent, deadline: new Date(Date.now() + Number(quiz.minutes ?? 30) * 60_000),
      }).returning()
      return { attempt: a, resumed: false, expiredOpen }
    })
    if (result.expiredOpen) await submit(result.expiredOpen)
    if (!result.attempt) throw conflict(result.reason ?? 'Không bắt đầu được bài thi')
    if (!result.resumed) await audit(u, 'exam.start', result.attempt.id, { artifactId: art.id, version })
    return { id: result.attempt.id, resumed: result.resumed }
  })

  app.get('/attempts/:id', { schema: { params: ID } }, async (req) => {
    let a = await getAttempt(me(req), req.params.id)
    if (a.status === 'in_progress' && expired(a)) a = await submit(a)
    return view(a)
  })

  // Lưu bài liên tục
  app.patch('/attempts/:id', { schema: { params: ID, body: z.object({ answers: z.record(z.string(), z.unknown()) }) } }, async (req) => {
    const u = me(req)
    const a = await getAttempt(u, req.params.id)
    if (a.userId !== u.id || a.status !== 'in_progress') throw conflict('Bài thi đã nộp')
    if (expired(a)) { await submit(a); throw conflict('Đã hết giờ, bài đã được nộp tự động') }
    const ids = new Set(a.questions.map((q) => q.id))
    const answers = Object.fromEntries(Object.entries(req.body.answers).filter(([k]) => ids.has(k)).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 20_000) : v]))
    // gộp nguyên tử và chỉ khi bài chưa nộp
    const [r] = await db.update(schema.attempts).set({ answers: sql`${schema.attempts.answers} || ${JSON.stringify(answers)}::jsonb` })
      .where(and(eq(schema.attempts.id, a.id), eq(schema.attempts.status, 'in_progress'))).returning({ id: schema.attempts.id })
    if (!r) throw conflict('Bài thi đã nộp')
    return { ok: true, savedAt: new Date() }
  })

  // Cờ giám sát: chỉ ghi nhận, không tự trừ điểm hay hủy bài (BR12)
  app.post('/attempts/:id/flags', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } }, schema: { params: ID, body: z.object({ kind: z.enum(['tab', 'paste', 'blur']), note: z.string().max(200).optional() }) } }, async (req) => {
    const u = me(req)
    const a = await getAttempt(u, req.params.id)
    if (a.userId !== u.id || a.status !== 'in_progress' || !a.consent) return { ok: false }
    const at = Math.round((Date.now() - a.startedAt.getTime()) / 1000)
    const flag: Flag = { kind: req.body.kind, at, note: req.body.note, status: 'open' }
    await db.update(schema.attempts).set({ flags: sql`${schema.attempts.flags} || ${JSON.stringify([flag])}::jsonb` }).where(eq(schema.attempts.id, a.id))
    return { ok: true }
  })

  app.post('/attempts/:id/submit', { schema: { params: ID } }, async (req) => {
    const u = me(req)
    const a = await getAttempt(u, req.params.id)
    if (a.userId !== u.id) throw forbidden()
    if (a.status !== 'in_progress') return view(a)
    const r = await submit(a)
    await audit(u, 'exam.submit', a.id, { status: r.status })
    return view(r)
  })
}

export const gradingRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireAuthor)
  const ID = z.object({ id: z.string() })

  app.get('/count', async (req) => {
    const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.attempts).where(and(eq(schema.attempts.orgId, me(req).orgId), eq(schema.attempts.status, 'grading')))
    return { n: r?.n ?? 0 }
  })

  app.get('/', { schema: { querystring: z.object({ status: z.enum(['grading', 'passed', 'failed', 'all']).default('grading') }) } }, async (req) => {
    const u = me(req)
    const where = [eq(schema.attempts.orgId, u.orgId), sql`${schema.attempts.status} <> 'in_progress'`]
    if (req.query.status !== 'all') where.push(eq(schema.attempts.status, req.query.status))
    const rows = await db.select({ a: schema.attempts, who: schema.users.name, title: schema.artifacts.title })
      .from(schema.attempts).innerJoin(schema.users, eq(schema.users.id, schema.attempts.userId)).innerJoin(schema.artifacts, eq(schema.artifacts.id, schema.attempts.artifactId))
      .where(and(...where)).orderBy(desc(schema.attempts.submittedAt)).limit(200)
    return rows.map(({ a, who, title }) => ({
      id: a.id, who, title, artifactId: a.artifactId, mode: a.mode, status: a.status, score: a.score, submittedAt: a.submittedAt,
      flags: a.flags.length, openFlags: a.flags.filter((f) => f.status === 'open').length,
      essays: a.questions.filter((q) => q.type === 'essay').length,
    }))
  })

  // Toàn bộ bài làm cho người chấm: đề, đáp án đúng, bài làm, điểm nháp AI, cờ giám sát
  app.get('/:id', { schema: { params: ID } }, async (req) => {
    const u = me(req)
    const a = await getAttempt(u, req.params.id)
    const [who] = await db.select({ name: schema.users.name, title: schema.users.title }).from(schema.users).where(eq(schema.users.id, a.userId))
    const [art] = await db.select({ title: schema.artifacts.title }).from(schema.artifacts).where(eq(schema.artifacts.id, a.artifactId))
    await audit(u, 'grading.view', a.id, { flags: a.flags.length })
    return { ...a, who, artifactTitle: art?.title }
  })

  // Người chấm xác nhận điểm từng câu và xử lý cờ; hệ thống không tự cho đạt (BR09, BR12)
  app.post('/:id/confirm', {
    schema: { params: ID, body: z.object({
      scores: z.record(z.string(), z.number().min(0).max(1)).default({}),
      flags: z.record(z.string(), z.enum(['ok', 'violation'])).default({}),
      decision: z.enum(['auto', 'pass', 'fail']).default('auto'), note: z.string().max(1000).default(''),
    }) },
  }, async (req) => {
    const u = me(req)
    const a = await getAttempt(u, req.params.id)
    if (a.status !== 'grading') throw conflict('Bài này không ở trạng thái chờ chấm')
    const grades = a.grades as unknown as Record<string, Grade>
    const next: Record<string, Grade> = Object.fromEntries(Object.entries(grades).map(([k, g]) => [k, { ...g, final: req.body.scores[k] ?? g.final ?? g.score }]))
    const flags: Flag[] = a.flags.map((f, i) => ({ ...f, status: req.body.flags[String(i)] ?? f.status ?? 'open' }))
    if (flags.some((f) => f.status === 'open')) throw badRequest('Xử lý hết các cờ giám sát trước khi xác nhận')
    const pass = Number((await versionContent(a)).quiz?.passScore ?? 80)
    const score = scoreOf(next)
    const violation = flags.some((f) => f.status === 'violation')
    const passed = req.body.decision === 'pass' ? true : req.body.decision === 'fail' ? false : score >= pass && !violation
    const [r] = await db.update(schema.attempts).set({ grades: next as unknown as Attempt['grades'], flags, score, status: passed ? 'passed' : 'failed', gradedBy: u.id, gradedAt: new Date() })
      .where(and(eq(schema.attempts.id, a.id), eq(schema.attempts.status, 'grading'))).returning()
    if (!r) throw conflict('Bài đã được người khác chấm')
    const skill = await applySkill(r, passed, u.id)
    await audit(u, 'grading.confirm', a.id, { score, passed, note: req.body.note, violation })
    return { status: r.status, score, skill }
  })
}
