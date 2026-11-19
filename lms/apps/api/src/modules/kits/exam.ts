// Đề kiểm tra riêng của bộ: AI soạn ngân hàng câu theo mức từ tài liệu nguồn, người soạn duyệt từng câu.
// Dùng chung luồng thi, chấm, giám sát với bài kiểm tra trong Tài liệu nhanh (content.quiz).
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db/client.js'
import { defineJob } from '../../lib/jobs.js'
import { generateQuestions } from '../artifacts/ai-edit.js'
import { getKit, type Kit } from './service.js'

type Json = Record<string, unknown>

export const ExamSpec = z.object({
  title: z.string().trim().max(200).default(''),
  focus: z.string().trim().max(500).default(''),
  levels: z.array(z.number().int().min(1).max(3)).min(1).max(3),
  perLevel: z.number().int().min(1).max(10).default(5),
  pick: z.number().int().min(1).max(50).optional(),
  mode: z.enum(['official', 'practice']).default('official'),
  minutes: z.number().int().min(5).max(240).default(30),
  passScore: z.number().int().min(1).max(100).default(80),
  attempts: z.number().int().min(1).max(10).default(2),
  proctor: z.boolean().default(true),
})
export type ExamSpec = z.infer<typeof ExamSpec>

export function examPlan(k: Kit, spec: ExamSpec): { type: 'exam'; title: string; summary: string; outline: Json } {
  const levels = [...new Set(spec.levels)].sort()
  return {
    type: 'exam',
    title: spec.title || `Đề kiểm tra: ${k.title}`,
    summary: `${spec.mode === 'official' ? 'Thi chính thức' : 'Luyện tập'} · mức ${levels.join(', ')} · ${spec.minutes} phút · đạt từ ${spec.passScore}%${spec.focus ? ` · trọng tâm: ${spec.focus}` : ''}`,
    outline: { ...spec, levels },
  }
}

/** Soạn ngân hàng câu: lần lượt từng mức để AI tránh câu trùng */
export async function buildExam(k: Kit, spec: ExamSpec, report: (p: number, m: string) => Promise<void>): Promise<Json> {
  const questions: Json[] = []
  for (const [i, level] of spec.levels.entries()) {
    await report(10 + Math.round((80 * i) / spec.levels.length), `AI soạn câu hỏi mức ${level}`)
    const qs = await generateQuestions(k, level, spec.perLevel, spec.focus, questions.map((q) => String(q.q)))
    questions.push(...qs)
  }
  return {
    quiz: {
      mode: spec.mode, skill: k.skillId, level: Math.max(...spec.levels), passScore: spec.passScore, attempts: spec.attempts, minutes: spec.minutes,
      proctor: spec.mode === 'official' && spec.proctor, pick: Math.min(spec.pick ?? 10, questions.length), questions,
    },
  }
}

defineJob('exam.generate', async ({ job, report }) => {
  const [a] = await db.select().from(schema.artifacts).where(eq(schema.artifacts.id, String(job.payload.artifactId)))
  if (!a) return
  const plan = (a.content as Json).plan as { outline: unknown }
  try {
    const content = await buildExam(await getKit(a.orgId, a.kitId), ExamSpec.parse(plan.outline), report)
    await db.update(schema.artifacts).set({ content: { ...content, plan }, status: 'draft', updatedAt: new Date() }).where(eq(schema.artifacts.id, a.id))
    return { artifactId: a.id }
  } catch (e) {
    if (job.attempts >= 2) await db.update(schema.artifacts).set({ status: 'failed', updatedAt: new Date() }).where(eq(schema.artifacts.id, a.id))
    throw e
  }
})
