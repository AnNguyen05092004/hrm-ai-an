// Chấm bài: trắc nghiệm, điền, test case do code chấm (BR08); tự luận AI chấm nháp, người chấm xác nhận (BR09).
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '../../db/client.js'
import { aiJson } from '../../lib/ai/index.js'
import { runTests, type TestCase } from '../../lib/sandbox.js'
import { fold } from '../../lib/text.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
export type Attempt = typeof schema.attempts.$inferSelect
export interface Grade { score: number; max: number; auto: boolean; correct?: boolean; tests?: unknown[]; ai?: Json; final?: number }

const toTest = (t: unknown): TestCase | null => (t && typeof t === 'object' && 'expected' in t ? t as TestCase : null)

const EssayGrade = z.object({
  criteria: z.array(z.object({ index: z.number().int(), met: z.boolean(), evidence: z.string().describe('trích nguyên văn đoạn trả lời ứng với tiêu chí, rỗng nếu không có') })),
  comment: z.string().describe('nhận xét ngắn cho người chấm'),
})
const CodeReview = z.object({ comment: z.string().describe('nhận xét đặt tên, cấu trúc, xử lý lỗi; 2–4 câu') })

async function gradeEssay(orgId: string, q: Json, answer: string): Promise<Grade> {
  const rubric: string[] = q.rubric ?? []
  if (!answer.trim()) return { score: 0, max: 1, auto: false, ai: { criteria: rubric.map((_, i) => ({ index: i, met: false, evidence: '' })), comment: 'Bỏ trống.' } }
  const r = await aiJson({
    orgId, feature: 'grade_essay', schema: EssayGrade,
    system: 'Bạn chấm nháp câu tự luận theo rubric. Với từng tiêu chí, xét câu trả lời có đáp ứng không và trích đúng đoạn trả lời làm bằng chứng. Không tự cho đạt khi không có bằng chứng. Đây chỉ là điểm nháp, người chấm sẽ xác nhận. Tiếng Việt.',
    input: `Câu hỏi: ${q.q}\n\nRubric:\n${rubric.map((c, i) => `${i}. ${c}`).join('\n')}\n\nBài làm:\n${answer.slice(0, 6000)}`,
    mock: () => ({ criteria: rubric.map((c, i) => ({ index: i, met: fold(c).split(/\s+/).filter((w) => w.length > 3).some((w) => fold(answer).includes(w)), evidence: answer.slice(0, 80) })), comment: 'Chấm nháp theo từ khóa.' }),
  })
  const met = new Set(r.criteria.filter((c) => c.met && c.index >= 0 && c.index < rubric.length).map((c) => c.index)).size
  return { score: rubric.length ? met / rubric.length : 0, max: 1, auto: false, ai: r }
}

async function gradeCode(orgId: string, q: Json, code: string): Promise<Grade> {
  const tests = (q.tests ?? []).map(toTest).filter(Boolean) as TestCase[]
  const results = await runTests(code, tests)
  const pass = results.filter((r) => r.pass).length
  const review = code.trim() ? await aiJson({
    orgId, feature: 'review_code', schema: CodeReview,
    system: 'Nhận xét chất lượng code JavaScript của người thi: đặt tên, cấu trúc, xử lý lỗi. Không quyết định đạt hay không (test case quyết định). Tiếng Việt.',
    input: `Đề: ${q.q}\n\nCode:\n${code.slice(0, 6000)}`,
    mock: () => ({ comment: 'Nhận xét tự động: kiểm tra đặt tên biến và xử lý đầu vào lỗi.' }),
  }) : { comment: 'Bỏ trống.' }
  return { score: tests.length ? pass / tests.length : 0, max: 1, auto: true, correct: tests.length > 0 && pass === tests.length, tests: results, ai: review }
}

export async function gradeQuestion(orgId: string, q: Json, answer: unknown): Promise<Grade> {
  if (q.type === 'mc' || q.type === 'mr') {
    const picked = new Set(Array.isArray(answer) ? answer.map(Number) : answer == null ? [] : [Number(answer)])
    const ok = new Set<number>((q.choices ?? []).map((c: Json, i: number) => (c.ok ? i : -1)).filter((i: number) => i >= 0))
    const correct = picked.size === ok.size && [...picked].every((i) => ok.has(i))
    return { score: correct ? 1 : 0, max: 1, auto: true, correct }
  }
  if (q.type === 'fill') {
    const accepted = String(q.answer ?? '').split('|').map((x) => fold(x).trim()).filter(Boolean)
    const correct = accepted.includes(fold(String(answer ?? '')).trim())
    return { score: correct ? 1 : 0, max: 1, auto: true, correct }
  }
  if (q.type === 'code') return gradeCode(orgId, q, String(answer ?? ''))
  return gradeEssay(orgId, q, String(answer ?? ''))
}

export const scoreOf = (grades: Record<string, Grade>): number => {
  const g = Object.values(grades)
  const max = g.reduce((s, x) => s + x.max, 0)
  return max ? (100 * g.reduce((s, x) => s + (x.final ?? x.score), 0)) / max : 0
}

/** Chỉ ra phần cần học lại cho câu sai: bài có khối trích cùng nguồn (F11) */
export function remediation(content: Json, questions: Json[], grades: Record<string, Grade>): { q: string; where: string; lessonId?: string }[] {
  const lessons: Json[] = (content.lessons ?? []).filter((l: Json) => l.kind === 'lesson')
  return questions.filter((q) => (grades[q.id]?.final ?? grades[q.id]?.score ?? 0) < 1).map((q) => {
    const key = q.srcRef?.chunkId
    const li = lessons.findIndex((l) => (l.blocks ?? []).some((b: Json) => (key && b.srcRef?.chunkId === key) || (q.src && b.src === q.src)))
    return li >= 0 ? { q: q.q, where: `Bài ${li + 1} · ${lessons[li].title}`, lessonId: lessons[li].id } : { q: q.q, where: q.src ? `Nguồn: ${q.src}` : 'Xem lại nội dung khóa' }
  })
}

/** Nội dung đúng phiên bản người thi đã làm */
export async function versionContent(a: { artifactId: string; version: number }): Promise<Json> {
  const [v] = await db.select({ content: schema.artifactVersions.content }).from(schema.artifactVersions).where(and(eq(schema.artifactVersions.artifactId, a.artifactId), eq(schema.artifactVersions.version, a.version)))
  return (v?.content ?? {}) as Json
}

/** Thi chính thức đạt: nâng mức kỹ năng (tối đa 3), ghi lịch sử và gửi sang Talent (BR10) */
export async function applySkill(a: Attempt, passed: boolean, byUserId: string | null): Promise<{ from: number; to: number } | null> {
  if (!passed || a.mode !== 'official') return null
  const [art] = await db.select({ kitId: schema.artifacts.kitId }).from(schema.artifacts).where(eq(schema.artifacts.id, a.artifactId))
  const [kit] = await db.select({ skillId: schema.kits.skillId }).from(schema.kits).where(eq(schema.kits.id, art.kitId))
  // cấu hình bài thi theo đúng phiên bản người thi đã làm
  const quiz = (await versionContent(a)).quiz ?? {}
  const skillId = quiz.skill ?? kit?.skillId
  if (!skillId) return null
  const lv = Number(quiz.level ?? 1)
  if (!Number.isInteger(lv) || lv < 1) return null
  const target = Math.min(3, lv)
  // nâng mức, ghi lịch sử và hàng gửi Talent trong một giao dịch
  return db.transaction(async (tx) => {
    const [cur] = await tx.select().from(schema.userSkills).where(and(eq(schema.userSkills.userId, a.userId), eq(schema.userSkills.skillId, skillId))).for('update')
    const from = cur?.level ?? 0
    if (from >= target) return { from, to: from }
    await tx.insert(schema.userSkills).values({ userId: a.userId, skillId, level: target, source: 'exam' })
      .onConflictDoUpdate({ target: [schema.userSkills.userId, schema.userSkills.skillId], set: { level: target, source: 'exam', updatedAt: new Date() } })
    await tx.insert(schema.skillEvents).values({ userId: a.userId, skillId, from, to: target, reason: 'Thi chính thức đạt', refId: a.id, byUserId })
    await tx.insert(schema.outbox).values({ orgId: a.orgId, topic: 'talent.skill_level', payload: { userId: a.userId, skillId, level: target, attemptId: a.id, score: a.score } })
    return { from, to: target }
  })
}
