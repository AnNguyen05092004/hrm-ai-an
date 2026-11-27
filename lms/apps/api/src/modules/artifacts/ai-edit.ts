import { z } from 'zod'
import { badRequest } from '../../lib/errors.js'
import { aiRewrite } from '../kits/ai.js'
import { searchSources } from '../sources/service.js'

const Loose = z.object({ json: z.string().describe('nội dung sau khi sửa, dạng chuỗi JSON cùng cấu trúc với đầu vào') })

/** Sửa một phần nội dung theo yêu cầu, có tra nguồn; trả về object cùng cấu trúc */
export async function aiEditBlock(orgId: string, sourceIds: string[], kind: string, value: Record<string, unknown>, instruction: string): Promise<Record<string, unknown>> {
  const text = JSON.stringify(value).slice(0, 4000)
  const hits = await searchSources(orgId, sourceIds, `${instruction} ${text.slice(0, 500)}`, 5)
  const r = await aiRewrite(orgId, Loose, value, `${instruction} (phần cần sửa là một ${kind}. Chữ có thể chứa thẻ định dạng <b> <i> <u> <s> <br> <span data-c="…"> <mark data-c="…"> <a href="…">: giữ nguyên các thẻ này quanh phần chữ tương ứng, không thêm thẻ khác)`, hits, () => ({ json: JSON.stringify(value) }))
  let out: Record<string, unknown>
  try {
    out = JSON.parse(r.json) as Record<string, unknown>
  } catch {
    throw badRequest('AI trả về nội dung không hợp lệ, thử lại hoặc diễn đạt yêu cầu khác')
  }
  if (!out || typeof out !== 'object' || Array.isArray(out)) throw badRequest('AI trả về nội dung không hợp lệ, thử lại')
  // giữ định danh, loại khối và nguồn trích của bản gốc: AI chỉ sửa nội dung
  const keep = Object.fromEntries(['id', 't', 'type', 'src', 'srcRef', 'level', 'approved', 'layout', 'st', 'boxes', 'bg', 'bgImg', 'bgTone', 'img'].filter((k) => k in value).map((k) => [k, value[k]]))
  return { ...out, ...keep }
}

import { aiJson } from '../../lib/ai/index.js'
import { BlockSchema, QuestionSchema, hitsText, type QuestionType } from '../kits/ai.js'
import type { Hit } from '../sources/service.js'
import { briefOf, qrContent } from '../kits/service.js'
import type { Kit } from '../kits/service.js'
import { draftQr } from '../kits/ai.js'
import { lockedMaster, masterHits } from '../kits/master.js'

const OneBlock = z.object({ block: BlockSchema })

/** Tạo một khối mới từ tài liệu nguồn theo mô tả; không có căn cứ thì trả khối gap */
export async function aiBlock(kit: Kit, instruction: string): Promise<Record<string, unknown>> {
  const hits = await searchSources(kit.orgId, kit.sourceIds, instruction, 6)
  const r = await aiJson({
    orgId: kit.orgId, feature: 'ai_block', schema: OneBlock,
    system: `Bạn viết một khối nội dung bài học tiếng Việt từ các đoạn nguồn [S#]. Chọn loại khối hợp với yêu cầu (para, heading, list, flash, accordion, tabs, timeline, sorting, table, code, process, kc). Bắt buộc src là mã đoạn nguồn. Không có căn cứ trong nguồn thì trả t = "gap" và p mô tả phần thiếu. Không bịa.`,
    input: `Yêu cầu: ${instruction}\n\nTrích đoạn nguồn:\n${hitsText(hits) || '(không có)'}`,
    mock: () => ({ block: { t: (hits.length ? 'para' : 'gap') as 'para' | 'gap', h: null, p: hits[0]?.text.slice(0, 300) ?? `Tài liệu nguồn chưa có nội dung về: ${instruction}`, intro: null, items: null, steps: null, cards: null, accordion: null, timeline: null, groups: null, head: null, rows: null, code: null, q: null, choices: null, correct: null, img: null, cap: null, src: hits.length ? 'S1' : null } }),
  })
  const c = qrContent({ lessons: [{ title: '', img: 'office', blocks: [r.block] }], questions: [] }, kit, hits, kit.sourceIds.length > 0)
  const blocks = (c.lessons as { blocks: Record<string, unknown>[] }[])[0].blocks
  return blocks[1] ?? blocks[0]
}

/** Một bài học mới. Nội dung gốc: căn cứ là tài liệu nguồn. Tài liệu nhanh: căn cứ là nội dung gốc đã chốt (chưa chốt thì tài liệu nguồn) */
export async function aiLesson(kit: Kit, type: 'master' | 'qr', title: string, instruction: string): Promise<Record<string, unknown>> {
  const m = type === 'qr' ? await lockedMaster(kit.id) : null
  const query = `${title}. ${instruction}`
  const hits = m ? masterHits(m.content) : await searchSources(kit.orgId, kit.sourceIds, query, 10)
  const r = await draftQr(kit.orgId, await briefOf(kit), { title, summary: instruction || title }, { sections: [{ t: title, items: instruction ? [instruction] : [] }] }, hits, 'lesson')
  const c = qrContent({ lessons: r.lessons.slice(0, 1), questions: [] }, kit, hits, !!m || kit.sourceIds.length > 0, { maxLessons: 1, quiz: false })
  const lesson = (c.lessons as Record<string, unknown>[])[0]
  if (!lesson) throw badRequest('AI chưa soạn được bài học, thử lại hoặc viết yêu cầu cụ thể hơn')
  return { ...lesson, title }
}

const Qs = z.object({ questions: z.array(QuestionSchema) })
const KIND_BY_LEVEL: Record<number, string> = {
  1: 'trắc nghiệm một đáp án (mc), đúng/sai (tf), điền chỗ trống (fill), ghép cặp (match) hoặc sắp thứ tự (order), kiểm tra hiểu khái niệm',
  2: 'trắc nghiệm tình huống (mc), nhiều đáp án (mr), phân loại kéo thả (cat), sắp thứ tự quy trình (order) và tự luận ngắn (essay) có rubric 3 tiêu chí',
  3: 'tự luận tình huống (essay) có rubric, hoặc bài code JavaScript (code) có hàm solve và 3–4 test (args là chuỗi JSON mảng tham số, expected là chuỗi JSON)',
}
/** Cách viết từng dạng câu khi người soạn chọn dạng cụ thể */
const HOW: Record<QuestionType, string> = {
  mc: 'mc: một đáp án đúng, 3–4 lựa chọn, mỗi lựa chọn có giải thích fb',
  mr: 'mr: nhiều đáp án đúng (ít nhất 2), 4–5 lựa chọn, mỗi lựa chọn có fb',
  tf: 'tf: câu q là một phát biểu; choices đúng 2 mục "Đúng" và "Sai", đánh dấu ok mục đúng, fb giải thích',
  fill: 'fill: câu có chỗ trống ____, answer là đáp án (nhiều đáp án chấp nhận cách nhau bằng |)',
  order: 'order: 3–6 mục theo đúng thứ tự',
  match: 'match: 3–5 cặp vế trái / vế phải',
  cat: 'cat: 2–3 nhóm, mỗi nhóm 2–4 mục',
  essay: 'essay: câu tự luận tình huống, rubric 3–5 tiêu chí chấm',
  code: 'code: bài JavaScript có starter khai báo function solve và 3–4 test (args là chuỗi JSON mảng tham số, expected là chuỗi JSON)',
}
const LEVEL_KINDS: Record<number, QuestionType[]> = { 1: ['mc', 'tf', 'fill', 'match', 'order'], 2: ['mc', 'mr', 'cat', 'order', 'essay'], 3: ['mc', 'essay', 'match'] }

type MockQ = z.infer<typeof QuestionSchema>
/** Câu nháp khi chạy AI giả lập: xoay vòng các dạng câu được chọn để test đủ dạng */
function mockQuestion(level: number, t: QuestionType, i: number, topic: string, src: string | null): MockQ {
  const base = { level, choices: null, answer: null, rubric: null, starter: null, tests: null, pairs: null, order: null, groups: null, src }
  if (t === 'match') return { ...base, type: 'match', q: `Ghép khái niệm với mô tả (${topic})`, pairs: [{ l: 'Khái niệm A', r: 'Mô tả A' }, { l: 'Khái niệm B', r: 'Mô tả B' }, { l: 'Khái niệm C', r: 'Mô tả C' }] }
  if (t === 'order') return { ...base, type: 'order', q: `Sắp xếp các bước (${topic})`, order: ['Bước một', 'Bước hai', 'Bước ba', 'Bước bốn'] }
  if (t === 'cat') return { ...base, type: 'cat', q: `Phân loại các mục (${topic})`, groups: [{ name: 'Nên làm', items: ['Kiểm tra nguồn', 'Ghi lại'] }, { name: 'Không nên', items: ['Đoán bừa'] }] }
  if (t === 'essay') return { ...base, type: 'essay', q: `Trình bày cách áp dụng (${topic})`, rubric: ['Đúng khái niệm', 'Có ví dụ', 'Nêu rủi ro'] }
  if (t === 'code') return { ...base, type: 'code', q: `Viết hàm solve cộng hai số (${topic})`, starter: 'function solve(a, b) {\n  \n}', tests: [{ name: 'Cộng', args: '[1,2]', expected: '3' }, { name: 'Số âm', args: '[-1,1]', expected: '0' }] }
  if (t === 'fill') return { ...base, type: 'fill', q: `Điền vào chỗ trống: khái niệm chính của ${topic} là ____.`, answer: 'đáp án' }
  if (t === 'tf') return { ...base, type: 'tf', q: `Phát biểu nháp ${i + 1} về ${topic} là đúng.`, choices: [{ t: 'Đúng', ok: true, fb: 'Đúng theo tài liệu.' }, { t: 'Sai', ok: false, fb: 'Chưa đúng.' }] }
  if (t === 'mr') return { ...base, type: 'mr', q: `Chọn mọi ý đúng về ${topic}`, choices: [{ t: 'Ý đúng thứ nhất', ok: true, fb: 'Đúng.' }, { t: 'Ý đúng thứ hai', ok: true, fb: 'Đúng.' }, { t: 'Ý sai', ok: false, fb: 'Chưa đúng.' }] }
  return { ...base, type: 'mc', q: `Câu hỏi nháp ${i + 1} về ${topic}`, choices: [{ t: 'Lựa chọn đúng', ok: true, fb: 'Đúng.' }, { t: 'Lựa chọn sai', ok: false, fb: 'Chưa đúng.' }] }
}

export interface QuestionOptions { types?: QuestionType[]; hits?: Hit[] }

/** Sinh câu hỏi theo mức và dạng. hits: đoạn căn cứ (mặc định tìm trong tài liệu nguồn của khóa; khóa đã chốt nội dung gốc thì truyền đoạn của nội dung gốc) */
export async function generateQuestions(kit: Kit, level: number, count: number, focus: string, existing: string[], o: QuestionOptions = {}): Promise<Record<string, unknown>[]> {
  const hits = o.hits ?? await searchSources(kit.orgId, kit.sourceIds, focus || kit.title, 10)
  const types = o.types?.length ? o.types : null
  const kinds = types ? `chỉ dùng các dạng sau, chia đều: ${types.map((t) => HOW[t]).join('; ')}` : KIND_BY_LEVEL[level] ?? KIND_BY_LEVEL[1]
  const r = await aiJson({
    orgId: kit.orgId, feature: 'gen_questions', schema: Qs, strong: true,
    system: `Bạn là chuyên gia ra đề. Viết ${count} câu hỏi mức ${level}: ${kinds}. Mỗi câu có src là mã đoạn nguồn [S#] làm căn cứ. Không trùng các câu đã có. Không bịa nội dung ngoài nguồn. Tiếng Việt.`,
    input: `Khóa: ${kit.title}\nTrọng tâm: ${focus || 'toàn bộ nội dung'}\nCâu đã có:\n${existing.map((x) => `- ${x}`).join('\n') || '(chưa có)'}\n\nTrích đoạn nguồn:\n${hitsText(hits) || '(không có)'}`,
    mock: () => {
      const pool = types ?? LEVEL_KINDS[level] ?? LEVEL_KINDS[1]
      return { questions: Array.from({ length: count }, (_, i) => mockQuestion(level, pool[i % pool.length], i, focus || kit.title, hits.length ? 'S1' : null)) }
    },
  })
  const allowed = types ? r.questions.filter((q) => types.includes(q.type)) : r.questions
  const c = qrContent({ lessons: [], questions: allowed.slice(0, count) }, kit, hits, true)
  return (c.quiz as { questions: Record<string, unknown>[] }).questions
}
