import { z } from 'zod'
import { badRequest } from '../../lib/errors.js'
import { aiRewrite } from '../kits/ai.js'
import { searchSources } from '../sources/service.js'

const Loose = z.object({ json: z.string().describe('nội dung sau khi sửa, dạng chuỗi JSON cùng cấu trúc với đầu vào') })

/** Sửa một phần nội dung theo yêu cầu, có tra nguồn; trả về object cùng cấu trúc */
export async function aiEditBlock(orgId: string, sourceIds: string[], kind: string, value: Record<string, unknown>, instruction: string): Promise<Record<string, unknown>> {
  const text = JSON.stringify(value).slice(0, 4000)
  const hits = await searchSources(orgId, sourceIds, `${instruction} ${text.slice(0, 500)}`, 5)
  const r = await aiRewrite(orgId, Loose, value, `${instruction} (phần cần sửa là một ${kind})`, hits, () => ({ json: JSON.stringify(value) }))
  let out: Record<string, unknown>
  try {
    out = JSON.parse(r.json) as Record<string, unknown>
  } catch {
    throw badRequest('AI trả về nội dung không hợp lệ, thử lại hoặc diễn đạt yêu cầu khác')
  }
  if (!out || typeof out !== 'object' || Array.isArray(out)) throw badRequest('AI trả về nội dung không hợp lệ, thử lại')
  // giữ định danh, loại khối và nguồn trích của bản gốc: AI chỉ sửa nội dung
  const keep = Object.fromEntries(['id', 't', 'type', 'src', 'srcRef', 'level', 'approved', 'layout', 'st', 'boxes', 'bg', 'img'].filter((k) => k in value).map((k) => [k, value[k]]))
  return { ...out, ...keep }
}

import { aiJson } from '../../lib/ai/index.js'
import { BlockSchema, QuestionSchema, hitsText } from '../kits/ai.js'
import { qrContent } from '../kits/service.js'
import type { Kit } from '../kits/service.js'

const OneBlock = z.object({ block: BlockSchema })

/** Tạo một khối mới từ tài liệu nguồn theo mô tả; không có căn cứ thì trả khối gap */
export async function aiBlock(kit: Kit, instruction: string): Promise<Record<string, unknown>> {
  const hits = await searchSources(kit.orgId, kit.sourceIds, instruction, 6)
  const r = await aiJson({
    orgId: kit.orgId, feature: 'ai_block', schema: OneBlock,
    system: `Bạn viết một khối nội dung bài học tiếng Việt từ các đoạn nguồn [S#]. Chọn loại khối hợp với yêu cầu (para, heading, list, flash, accordion, table, code, process, kc). Bắt buộc src là mã đoạn nguồn. Không có căn cứ trong nguồn thì trả t = "gap" và p mô tả phần thiếu. Không bịa.`,
    input: `Yêu cầu: ${instruction}\n\nTrích đoạn nguồn:\n${hitsText(hits) || '(không có)'}`,
    mock: () => ({ block: { t: (hits.length ? 'para' : 'gap') as 'para' | 'gap', h: null, p: hits[0]?.text.slice(0, 300) ?? `Tài liệu nguồn chưa có nội dung về: ${instruction}`, intro: null, items: null, steps: null, cards: null, accordion: null, head: null, rows: null, code: null, q: null, choices: null, correct: null, img: null, cap: null, src: hits.length ? 'S1' : null } }),
  })
  const c = qrContent({ lessons: [{ title: '', img: 'office', blocks: [r.block] }], questions: [] }, kit, hits, kit.sourceIds.length > 0)
  const blocks = (c.lessons as { blocks: Record<string, unknown>[] }[])[0].blocks
  return blocks[1] ?? blocks[0]
}

const Qs = z.object({ questions: z.array(QuestionSchema) })
const KIND_BY_LEVEL: Record<number, string> = {
  1: 'trắc nghiệm một đáp án (mc) hoặc điền chỗ trống (fill), kiểm tra hiểu khái niệm',
  2: 'trắc nghiệm tình huống (mc) và tự luận ngắn (essay) có rubric 3 tiêu chí',
  3: 'tự luận tình huống (essay) có rubric, hoặc bài code JavaScript (code) có hàm solve và 3–4 test (args là chuỗi JSON mảng tham số, expected là chuỗi JSON)',
}

export async function generateQuestions(kit: Kit, level: number, count: number, focus: string, existing: string[]): Promise<Record<string, unknown>[]> {
  const hits = await searchSources(kit.orgId, kit.sourceIds, focus || kit.title, 10)
  const r = await aiJson({
    orgId: kit.orgId, feature: 'gen_questions', schema: Qs, strong: true,
    system: `Bạn là chuyên gia ra đề. Viết ${count} câu hỏi mức ${level}: ${KIND_BY_LEVEL[level] ?? KIND_BY_LEVEL[1]}. Mỗi câu có src là mã đoạn nguồn [S#] làm căn cứ. Câu mc có 3–4 lựa chọn, đúng một đáp án, mỗi lựa chọn có giải thích fb. Không trùng các câu đã có. Không bịa nội dung ngoài nguồn. Tiếng Việt.`,
    input: `Khóa: ${kit.title}\nTrọng tâm: ${focus || 'toàn bộ nội dung'}\nCâu đã có:\n${existing.map((x) => `- ${x}`).join('\n') || '(chưa có)'}\n\nTrích đoạn nguồn:\n${hitsText(hits) || '(không có)'}`,
    mock: () => ({ questions: Array.from({ length: count }, (_, i) => ({ type: 'mc' as const, level, q: `Câu hỏi nháp ${i + 1} về ${focus || kit.title}`, choices: [{ t: 'Lựa chọn đúng', ok: true, fb: 'Đúng.' }, { t: 'Lựa chọn sai', ok: false, fb: 'Chưa đúng.' }], answer: null, rubric: null, starter: null, tests: null, src: hits.length ? 'S1' : null })) }),
  })
  const c = qrContent({ lessons: [], questions: r.questions.slice(0, count) }, kit, hits, true)
  return (c.quiz as { questions: Record<string, unknown>[] }).questions
}
