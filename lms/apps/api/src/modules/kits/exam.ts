// Đề kiểm tra riêng của bộ: AI soạn ngân hàng câu theo ma trận đề (dạng câu × độ khó × số câu), người soạn duyệt từng câu.
// Dùng chung luồng thi, chấm, giám sát với bài kiểm tra trong Tài liệu nhanh (content.quiz).
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db/client.js'
import { defineJob } from '../../lib/jobs.js'
import { generateQuestions } from '../artifacts/ai-edit.js'
import { QUESTION_TYPES } from './ai.js'
import type { Hit } from '../sources/service.js'
import { getKit, type Kit } from './service.js'
import { lockedMaster, masterHits } from './master.js'
import { DIFF_NAME, TYPE_NAME, type Cell } from './matrix.js'
import { badRequest } from '../../lib/errors.js'

type Json = Record<string, unknown>

/** Một ô của ma trận đề: dạng câu, độ khó (1 dễ, 2 trung bình, 3 khó), số câu trong mỗi lượt thi */
export const MatrixCell = z.object({ type: z.enum(QUESTION_TYPES), level: z.number().int().min(1).max(3), count: z.number().int().min(1).max(20) })
const MAX_EXAM = 50
const MAX_BANK = 100
const CHUNK = 10

export const ExamSpec = z.object({
  title: z.string().trim().max(200).default(''),
  focus: z.string().trim().max(500).default(''),
  matrix: z.array(MatrixCell).min(1).max(27).optional(),
  // ngân hàng soạn gấp mấy lần số câu trong đề, để mỗi lượt thi rút một bộ khác nhau
  reserve: z.number().int().min(1).max(3).default(2),
  // đề tạo trước khi có ma trận: soạn theo mức, rút ngẫu nhiên `pick` câu
  levels: z.array(z.number().int().min(1).max(3)).min(1).max(3).optional(),
  perLevel: z.number().int().min(1).max(10).default(5),
  types: z.array(z.enum(QUESTION_TYPES)).max(QUESTION_TYPES.length).optional(),
  pick: z.number().int().min(1).max(50).optional(),
  mode: z.enum(['official', 'practice']).default('official'),
  minutes: z.number().int().min(5).max(240).default(30),
  passScore: z.number().int().min(1).max(100).default(80),
  attempts: z.number().int().min(1).max(10).default(2),
  proctor: z.boolean().default(false),
})
export type ExamSpec = z.infer<typeof ExamSpec>

const examSize = (m: Cell[]): number => m.reduce((s, c) => s + c.count, 0)

/** Kiểm tra ma trận: không trùng ô, không quá số câu cho phép */
export function checkMatrix(spec: ExamSpec): void {
  const m = spec.matrix
  if (!m) { if (!spec.levels?.length) throw badRequest('Thêm ít nhất một dòng vào ma trận đề'); return }
  const keys = m.map((c) => `${c.type}:${c.level}`)
  if (new Set(keys).size !== keys.length) throw badRequest('Ma trận có hai dòng trùng dạng câu và độ khó, gộp lại thành một dòng')
  if (examSize(m) > MAX_EXAM) throw badRequest(`Mỗi đề tối đa ${MAX_EXAM} câu`)
  if (examSize(m) * spec.reserve > MAX_BANK) throw badRequest(`Ngân hàng tối đa ${MAX_BANK} câu, giảm số câu hoặc số câu dự phòng`)
}

export function examPlan(k: Kit, spec: ExamSpec): { type: 'exam'; title: string; summary: string; outline: Json } {
  checkMatrix(spec)
  const shape = spec.matrix ? `${examSize(spec.matrix)} câu mỗi lượt thi theo ma trận ${spec.matrix.length} dòng` : `mức ${[...new Set(spec.levels)].sort().join(', ')}`
  return {
    type: 'exam',
    title: spec.title || `Đề kiểm tra: ${k.title}`,
    summary: `${spec.mode === 'official' ? 'Thi chính thức' : 'Luyện tập'} · ${shape} · ${spec.minutes} phút · đạt từ ${spec.passScore}%${spec.focus ? ` · trọng tâm: ${spec.focus}` : ''}`,
    outline: ExamSpec.parse(spec),
  }
}

interface Batch { level: number; count: number; types?: ExamSpec['types']; label: string }

/** Các lượt gọi AI: mỗi ô ma trận một lượt (chia nhỏ khi nhiều câu) */
function batchesOf(spec: ExamSpec): Batch[] {
  const rows: Batch[] = spec.matrix
    ? spec.matrix.map((c) => ({ level: c.level, count: c.count * spec.reserve, types: [c.type], label: `${TYPE_NAME[c.type]} · ${DIFF_NAME[c.level]}` }))
    : (spec.levels ?? []).map((l) => ({ level: l, count: spec.perLevel, types: spec.types, label: `độ khó ${DIFF_NAME[l]}` }))
  return rows.flatMap((r) => Array.from({ length: Math.ceil(r.count / CHUNK) }, (_, i) => ({ ...r, count: Math.min(CHUNK, r.count - i * CHUNK) })))
}

/** Soạn ngân hàng câu theo ma trận: lần lượt từng ô để AI tránh câu trùng */
export async function buildExam(k: Kit, spec: ExamSpec, report: (p: number, m: string) => Promise<void>, hits?: Hit[]): Promise<Json> {
  const questions: Json[] = []
  const batches = batchesOf(spec)
  for (const [i, b] of batches.entries()) {
    await report(10 + Math.round((80 * i) / batches.length), `AI soạn câu ${b.label}`)
    const qs = await generateQuestions(k, b.level, b.count, spec.focus, questions.map((q) => String(q.q)), { types: b.types, hits })
    questions.push(...qs)
  }
  const matrix = spec.matrix
  return {
    quiz: {
      mode: spec.mode, skill: k.skillId, level: k.level ?? 1, passScore: spec.passScore, attempts: spec.attempts, minutes: spec.minutes,
      proctor: spec.mode === 'official' && spec.proctor, ...(matrix ? { matrix } : {}),
      pick: matrix ? examSize(matrix) : Math.min(spec.pick ?? 10, questions.length), questions,
    },
  }
}

defineJob('exam.generate', async ({ job, report }) => {
  const [a] = await db.select().from(schema.artifacts).where(eq(schema.artifacts.id, String(job.payload.artifactId)))
  if (!a) return
  const plan = (a.content as Json).plan as { outline: unknown }
  try {
    // khóa đã chốt nội dung: ra đề từ nội dung; đề trong kho đề tạo từ tài liệu: ra đề từ tài liệu nguồn
    const m = await lockedMaster(a.kitId)
    const content = await buildExam(await getKit(a.orgId, a.kitId), ExamSpec.parse(plan.outline), report, m ? masterHits(m.content) : undefined)
    await db.update(schema.artifacts).set({ content: { ...content, plan: { ...plan, ...(m ? { basedOn: m.version } : {}) } }, status: a.publishedVersion ? 'published' : 'draft', updatedAt: new Date() }).where(eq(schema.artifacts.id, a.id))
    return { artifactId: a.id }
  } catch (e) {
    if (job.attempts >= 2) await db.update(schema.artifacts).set({ status: 'failed', updatedAt: new Date() }).where(eq(schema.artifacts.id, a.id))
    throw e
  }
})
