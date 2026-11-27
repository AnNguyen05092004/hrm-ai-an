// AI soạn khóa học: chi tiết → dàn ý nội dung gốc → nội dung gốc → (sau khi chốt) các định dạng soạn từ nội dung gốc.
// Mọi đoạn nội dung phải trích một đoạn căn cứ có mã [S#]: đoạn tài liệu nguồn, hoặc đoạn của nội dung gốc đã chốt.
import { z } from 'zod'
import { aiJson } from '../../lib/ai/index.js'
import type { Hit } from '../sources/service.js'

export const IMAGES = ['server', 'rack', 'desk', 'person', 'screen', 'office', 'meeting', 'team', 'cyber', 'lock', 'mobile', 'dash', 'charts', 'code', 'plan', 'support', 'handshake', 'teamwork', 'terminal', 'devscreen', 'nodes', 'ai', 'ml', 'servers', 'setup', 'devs', 'shop', 'notes', 'writing', 'welcome', 'workshop', 'warehouse'] as const
export const GEN_TYPES = ['qr', 'deck', 'scenario', 'video'] as const
export type GenType = typeof GEN_TYPES[number]
/** Nội dung gốc: bản soạn đầy đủ để duyệt nội bộ, không xuất cho người học; mọi định dạng sinh từ bản này */
export type DraftType = GenType | 'master'

const RULES = `Bạn là chuyên gia thiết kế đào tạo nội bộ, viết tiếng Việt rõ ràng, câu ngắn, giọng trung tính.
Quy tắc bắt buộc:
- Chỉ dùng thông tin trong các đoạn nguồn được cấp (mã [S1], [S2]…). Không bịa số liệu, lệnh, quy định.
- Nội dung nào không có căn cứ trong nguồn thì không viết; ghi vào chỗ thiếu căn cứ (gap) để người soạn bổ sung.
- Nếu hai nguồn mâu thuẫn, nêu rõ mâu thuẫn, không tự chọn.
- Không đưa dữ liệu cá nhân, mật khẩu, khóa bí mật vào nội dung.
- Tên, tóm tắt, tiêu đề, dàn ý luôn viết tự nhiên theo mục tiêu đào tạo; không bao giờ ghi chữ "GAP", "thiếu nguồn" hay ghi chú cho người soạn trong các trường này. Phần thiếu căn cứ chỉ nêu trong warnings hoặc khối gap.`

export interface KitBrief {
  title: string; goal: string; audience: string; goals: string[]; takeaways: string[]; metrics: string[]
  skillName: string; level: number; practice: string
}
const brief = (k: KitBrief): string => `Khóa học: ${k.title}
Mô tả: ${k.goal}
Đối tượng: ${k.audience}
Mục tiêu: ${k.goals.join('; ')}
Điều cần nhớ: ${k.takeaways.join('; ')}
Kỹ năng: ${k.skillName}, khóa đưa người học tới mức ${k.level} (1 biết khái niệm, 2 làm được khi có hướng dẫn, 3 làm độc lập)
Lượng luyện tập: ${k.practice === 'more' ? 'nhiều' : k.practice === 'less' ? 'ít' : 'cân bằng'}`

export const hitsText = (hits: Hit[]): string => hits.map((h, i) => `[S${i + 1}] (${h.sourceName} · ${h.section})\n${h.text}`).join('\n\n')

// ---------- 1. Chi tiết khóa học ----------
export const DetailsSchema = z.object({
  title: z.string(),
  desc: z.string(),
  audience: z.string(),
  goals: z.array(z.string()),
  takeaways: z.array(z.string()),
  metrics: z.array(z.string()),
  skillId: z.string().describe('id kỹ năng trong danh sách, hoặc chuỗi rỗng nếu không khớp'),
  level: z.number().int(),
  practice: z.enum(['less', 'balanced', 'more']),
  warnings: z.array(z.string()).describe('mâu thuẫn giữa các nguồn, dữ liệu nhạy cảm, nguồn thiếu'),
})
export type Details = z.infer<typeof DetailsSchema>

export function draftDetails(orgId: string, goal: string, skills: { id: string; name: string }[], hits: Hit[], sourceNames: string[], sensitive: string[]): Promise<Details> {
  return aiJson({
    orgId, feature: 'kit_details', schema: DetailsSchema,
    system: `${RULES}
Nhiệm vụ: từ mô tả mục tiêu và tài liệu nguồn, đề xuất chi tiết một khóa học.
- title ngắn (≤ 60 ký tự), desc 1–2 câu.
- 3–4 mục tiêu, 3–5 điều cần nhớ, 2–3 chỉ số thành công đo được.
- Chọn skillId từ danh sách kỹ năng; level 1–3.
- warnings: nêu mâu thuẫn giữa nguồn, nguồn có dữ liệu nhạy cảm, hoặc nguồn không đủ cho mục tiêu.`,
    input: `Mô tả mục tiêu của người soạn:\n${goal}\n\nKỹ năng có trong khung năng lực:\n${skills.map((s) => `${s.id}: ${s.name}`).join('\n')}\n\nTài liệu nguồn: ${sourceNames.join(', ') || 'không có'}\n${sensitive.length ? `Tài liệu có dấu hiệu chứa dữ liệu nhạy cảm: ${sensitive.join(', ')}\n` : ''}\nTrích đoạn nguồn:\n${hitsText(hits) || '(không có)'}`,
    mock: () => mockDetails(goal, skills, sourceNames, sensitive),
  })
}

function mockDetails(goal: string, skills: { id: string; name: string }[], sourceNames: string[], sensitive: string[]): Details {
  const t = goal.replace(/^tạo (khóa|bài|bộ)( đào tạo)? ?(cho|về)? ?/i, '').split(/[.,\n]/)[0].trim().slice(0, 60) || 'Khóa học mới'
  const title = t.charAt(0).toUpperCase() + t.slice(1)
  const sk = skills.find((s) => goal.toLowerCase().includes(s.id) || goal.toLowerCase().includes(s.name.toLowerCase().split(' (')[0])) ?? skills[0]
  return {
    title, desc: goal.slice(0, 200), audience: 'Nhân viên liên quan tới nội dung đã mô tả.',
    goals: ['Nắm được nội dung chính', 'Áp dụng vào công việc hằng ngày', 'Tránh các lỗi hay gặp'],
    takeaways: ['Giải thích được khái niệm chính', 'Làm đúng các bước cơ bản', 'Biết lỗi hay gặp'],
    metrics: ['Giảm câu hỏi lặp lại gửi bộ phận phụ trách', 'Tỷ lệ đạt bài kiểm tra ≥ 80%'],
    skillId: sk?.id ?? '', level: 2, practice: 'balanced',
    warnings: [...(sourceNames.length ? [] : ['Chưa có tài liệu nguồn: AI chỉ soạn khung, không viết nội dung chi tiết.']), ...sensitive.map((s) => `${s} có dấu hiệu chứa dữ liệu nhạy cảm. Xác nhận phạm vi được dùng trước khi soạn.`)],
  }
}

// ---------- 2. Dàn ý ----------
export const OutlineSchemas = {
  master: z.object({ sections: z.array(z.object({ t: z.string(), items: z.array(z.string()) })) }),
  qr: z.object({ sections: z.array(z.object({ t: z.string(), items: z.array(z.string()) })) }),
  deck: z.object({ slides: z.array(z.string()) }),
  video: z.object({ chapters: z.array(z.string()) }),
  scenario: z.object({ character: z.string().describe('Tên · vai trò'), learner: z.string(), situation: z.string(), goals: z.array(z.string()) }),
}
const OUTLINE_HINT: Record<DraftType, string> = {
  master: 'Dàn ý Nội dung gốc của cả khóa: 3–8 bài (sections) theo trình tự học, mỗi bài 3–6 ý chính (items), bao quát đủ các mục tiêu và điều cần nhớ.',
  qr: 'Dàn ý Tài liệu nhanh: tối đa 3 bài (sections), mỗi bài 2–4 ý chính (items).',
  deck: 'Dàn ý Bộ slide: 6–9 tiêu đề slide, slide đầu là bìa, slide cuối là việc cần làm.',
  video: 'Dàn ý video 5–8 phút: 4–6 chương.',
  scenario: 'Dàn ý Tình huống: nhân vật AI đóng (character dạng "Tên · vai trò"), vai người học, bối cảnh (situation), 2–3 mục tiêu cho từng cảnh.',
}

export function draftOutline(orgId: string, type: DraftType, kit: KitBrief, item: { title: string; summary: string }, hits: Hit[]): Promise<Record<string, unknown>> {
  const schema = OutlineSchemas[type]
  return aiJson({
    orgId, feature: `outline_${type}`, schema: schema as z.ZodType<Record<string, unknown>>,
    system: `${RULES}\nNhiệm vụ: lập dàn ý cho một tài liệu trong khóa học. ${OUTLINE_HINT[type]} Chỉ đưa các ý có căn cứ trong nguồn; nếu nguồn ít thì dàn ý ngắn lại.`,
    input: `${brief(kit)}\n\nTài liệu cần lập dàn ý: ${item.title}\nMục đích: ${item.summary}\n\nTrích đoạn nguồn:\n${hitsText(hits) || '(không có nguồn)'}`,
    mock: () => mockOutline(type, kit),
  })
}

function mockOutline(type: DraftType, kit: KitBrief): Record<string, unknown> {
  if (type === 'master') return { sections: ['Tổng quan và khái niệm', 'Các bước thực hiện', 'Ví dụ thực tế', 'Lỗi hay gặp và cách tránh'].map((t) => ({ t, items: ['Khái niệm chính', 'Ví dụ thực tế', 'Điều cần lưu ý'] })) }
  if (type === 'qr') return { sections: ['Tổng quan', 'Các bước thực hiện', 'Lỗi hay gặp'].map((t) => ({ t, items: ['Khái niệm chính', 'Ví dụ thực tế'] })) }
  if (type === 'deck') return { slides: [kit.title, 'Vì sao cần học', 'Nội dung chính', 'Ví dụ', 'Việc cần làm'] }
  if (type === 'video') return { chapters: ['Mở đầu', 'Nội dung chính', 'Ví dụ', 'Tóm tắt'] }
  return { character: 'Chị Lan · Trưởng nhóm', learner: 'Nhân viên mới', situation: 'Trưởng nhóm hỏi người học cách xử lý một việc thường gặp.', goals: ['Chọn cách làm đúng', 'Giải thích được lý do'] }
}

// ---------- 3. Nội dung ----------
const N = <T extends z.ZodType>(t: T) => t.nullable()
export const BlockSchema = z.object({
  t: z.enum(['heading', 'para', 'list', 'flash', 'accordion', 'tabs', 'timeline', 'sorting', 'table', 'code', 'process', 'kc', 'image', 'gap']),
  h: N(z.string()), p: N(z.string()), intro: N(z.string()),
  items: N(z.array(z.string())), steps: N(z.array(z.string())),
  cards: N(z.array(z.object({ f: z.string(), b: z.string() }))),
  accordion: N(z.array(z.object({ t: z.string(), b: z.string() }))).describe('các mục t/b của accordion hoặc tabs'),
  timeline: N(z.array(z.object({ d: z.string().describe('mốc: năm, ngày, giai đoạn hoặc bước'), t: z.string(), b: z.string() }))),
  groups: N(z.array(z.object({ name: z.string(), items: z.array(z.string()) }))).describe('sorting: các nhóm và mục thuộc nhóm, người học kéo mục vào đúng nhóm'),
  head: N(z.array(z.string())), rows: N(z.array(z.array(z.string()))),
  code: N(z.string()), q: N(z.string()), choices: N(z.array(z.string())), correct: N(z.number().int()),
  img: N(z.enum(IMAGES)), cap: N(z.string()),
  src: N(z.string()).describe('mã đoạn nguồn, ví dụ "S2"; null với kc, image, gap'),
})
/** Dạng câu hỏi: một đáp án, nhiều đáp án, đúng/sai, điền chỗ trống, sắp thứ tự, ghép cặp, phân loại, tự luận, bài code */
export const QUESTION_TYPES = ['mc', 'mr', 'tf', 'fill', 'order', 'match', 'cat', 'essay', 'code'] as const
export type QuestionType = typeof QUESTION_TYPES[number]
export const QuestionSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  level: z.number().int(),
  q: z.string(),
  choices: N(z.array(z.object({ t: z.string(), ok: z.boolean(), fb: z.string() }))).describe('mc: 3–4 lựa chọn, đúng 1; mr: 4–5 lựa chọn, đúng từ 2; tf: đúng 2 lựa chọn "Đúng" và "Sai", câu q là một phát biểu'),
  answer: N(z.string()).describe('đáp án câu điền'),
  rubric: N(z.array(z.string())),
  pairs: N(z.array(z.object({ l: z.string(), r: z.string() }))).describe('match: 3–5 cặp vế trái / vế phải ghép đúng'),
  order: N(z.array(z.string())).describe('order: 3–6 mục theo đúng thứ tự'),
  groups: N(z.array(z.object({ name: z.string(), items: z.array(z.string()) }))).describe('cat: 2–3 nhóm, mỗi nhóm 2–4 mục, người thi kéo mục vào đúng nhóm'),
  starter: N(z.string()).describe('mã khởi đầu JavaScript cho câu code, khai báo function solve(...)'),
  tests: N(z.array(z.object({ name: z.string(), args: z.string().describe('mảng JSON các tham số'), expected: z.string().describe('giá trị JSON mong đợi') }))),
  src: N(z.string()),
})
export const QrSchema = z.object({
  lessons: z.array(z.object({ title: z.string(), img: z.enum(IMAGES), blocks: z.array(BlockSchema) })),
  questions: z.array(QuestionSchema),
})
export type QrDraft = z.infer<typeof QrSchema>

const LEVEL_KINDS: Record<number, string> = {
  1: 'mức 1: 4–5 câu trắc nghiệm (mc), 1 câu điền (fill), 1 câu ghép cặp (match) hoặc sắp thứ tự (order)',
  2: 'mức 2: 3–4 câu trắc nghiệm tình huống (mc), 1 câu điền, 1 câu phân loại kéo thả (cat) hoặc sắp thứ tự (order), 1–2 câu tự luận ngắn (essay) có rubric 3 tiêu chí',
  3: 'mức 3: 3 câu trắc nghiệm, 1 câu tự luận tình huống có rubric, 1 bài code JavaScript (code) có hàm solve và 3–4 test',
}

const TASK = {
  master: 'Nhiệm vụ: viết Nội dung gốc của khóa theo dàn ý, mỗi bài (lesson) ứng với một mục dàn ý. Đây là bản nội dung đầy đủ để chuyên gia duyệt; slide, video, tình huống, đề kiểm tra sẽ được soạn từ bản này, nên viết đủ ý, chính xác, có ví dụ. Không viết câu hỏi kiểm tra (questions là mảng rỗng).',
  qr: 'Nhiệm vụ: viết Tài liệu nhanh theo dàn ý, mỗi bài (lesson) ứng với một mục dàn ý, và bộ câu hỏi kiểm tra.',
  lesson: 'Nhiệm vụ: viết đúng một bài học (lesson) theo tên bài và yêu cầu. Không viết câu hỏi kiểm tra (questions là mảng rỗng).',
}
export type QrMode = keyof typeof TASK

/** Viết bài học theo dàn ý. mode: master = Nội dung gốc (không có câu hỏi), qr = Tài liệu nhanh kèm câu hỏi, lesson = một bài lẻ */
export function draftQr(orgId: string, kit: KitBrief, item: { title: string; summary: string }, outline: { sections: { t: string; items: string[] }[] }, hits: Hit[], mode: QrMode = 'qr'): Promise<QrDraft> {
  const quiz = mode === 'qr'
  return aiJson({
    orgId, feature: mode === 'master' ? 'gen_master' : 'gen_qr', schema: QrSchema, strong: true,
    system: `${RULES}
${TASK[mode]}
Khối (block) dùng được: heading (h + p), para (p), list (intro + items), flash (h, p, cards mặt trước f / mặt sau b), accordion (h, p, accordion các mục t/b), tabs (h, p, accordion: mỗi mục là một tab t/b, hợp khi so sánh các lựa chọn), timeline (h, timeline: mốc d, tiêu đề t, mô tả b; hợp với quy trình theo thời gian hoặc lịch sử), sorting (h, p, groups: hoạt động kéo thả mục vào đúng nhóm), table (head, rows), code (h, code), process (h, steps), kc (câu hỏi nhanh: q, choices, correct là chỉ số), image (img, cap), gap (p: mô tả phần thiếu căn cứ).
- Mỗi bài 4–7 khối, mở đầu bằng heading, có ít nhất một khối tương tác (flash/accordion/tabs/timeline/sorting/process/table) và kết thúc bằng một kc.
- Mọi khối nội dung (trừ kc, image, gap) phải có src là mã đoạn nguồn dùng làm căn cứ.
- Ý trong dàn ý không tìm thấy trong nguồn: viết khối gap nêu rõ thiếu gì.
${quiz ? `- Câu hỏi kiểm tra: ${LEVEL_KINDS[kit.level] ?? LEVEL_KINDS[2]}. Mỗi câu có src. Câu mc có 3–4 lựa chọn, đúng một đáp án, mỗi lựa chọn có giải thích fb. Câu code: tests là mảng, args là chuỗi JSON của mảng tham số, expected là chuỗi JSON.` : ''}`,
    input: `${brief(kit)}\n\nTài liệu: ${item.title}\nMục đích: ${item.summary}\n\nDàn ý:\n${outline.sections.map((s, i) => `Bài ${i + 1}: ${s.t}\n${s.items.map((x) => `  - ${x}`).join('\n')}`).join('\n')}\n\nTrích đoạn nguồn:\n${hitsText(hits) || '(không có nguồn: chỉ dựng khung và gap)'}`,
    mock: () => { const d = mockQr(outline, kit, hits); return quiz ? d : { ...d, questions: [] } },
  })
}

function mockQr(outline: { sections: { t: string; items: string[] }[] }, kit: KitBrief, hits: Hit[]): QrDraft {
  const nul = { h: null, p: null, intro: null, items: null, steps: null, cards: null, accordion: null, timeline: null, groups: null, head: null, rows: null, code: null, q: null, choices: null, correct: null, img: null, cap: null, src: null }
  const src = hits.length ? 'S1' : null
  return {
    lessons: outline.sections.map((s) => ({
      title: s.t, img: 'office' as const,
      blocks: [
        { ...nul, t: 'heading' as const, h: s.t, p: hits[0]?.text.slice(0, 200) ?? `Nội dung về ${s.t}.`, src },
        { ...nul, t: 'list' as const, intro: 'Ý chính:', items: s.items, src },
        ...(hits.length ? [] : [{ ...nul, t: 'gap' as const, p: 'Chưa có tài liệu nguồn cho bài này.' }]),
        { ...nul, t: 'kc' as const, q: `Ý nào thuộc bài "${s.t}"?`, choices: [s.items[0] ?? s.t, 'Không liên quan'], correct: 0 },
      ],
    })),
    questions: [
      { type: 'match', level: 1, q: 'Ghép mỗi khái niệm với mô tả đúng.', choices: null, answer: null, rubric: null, starter: null, tests: null, src, pairs: [{ l: 'Mục tiêu', r: 'Điều người học làm được sau khóa' }, { l: 'Chỉ số', r: 'Cách đo kết quả' }, { l: 'Nguồn', r: 'Tài liệu làm căn cứ' }], order: null, groups: null },
      { type: 'order', level: 1, q: 'Sắp xếp các bước học theo đúng thứ tự.', choices: null, answer: null, rubric: null, starter: null, tests: null, src, pairs: null, order: ['Đọc tài liệu nhanh', 'Xem slide', 'Luyện tình huống', 'Làm bài kiểm tra'], groups: null },
      { type: 'cat', level: 2, q: 'Kéo mỗi việc vào đúng nhóm.', choices: null, answer: null, rubric: null, starter: null, tests: null, src, pairs: null, order: null, groups: [{ name: 'Nên làm', items: ['Kiểm tra nguồn', 'Hỏi khi chưa rõ'] }, { name: 'Không nên', items: ['Đoán khi chưa có căn cứ'] }] },
      { type: 'mc', level: 1, q: `Mục tiêu chính của khóa "${kit.title}" là gì?`, choices: [{ t: kit.goals[0] ?? 'Nắm nội dung chính', ok: true, fb: 'Đúng.' }, { t: 'Không có mục tiêu', ok: false, fb: 'Xem lại phần mục tiêu.' }], answer: null, rubric: null, starter: null, tests: null, src, pairs: null, order: null, groups: null },
      { type: 'essay', level: 2, q: 'Trình bày cách bạn áp dụng nội dung khóa vào công việc.', choices: null, answer: null, rubric: ['Nêu đúng khái niệm chính', 'Có ví dụ cụ thể', 'Nêu được lỗi cần tránh'], starter: null, tests: null, src, pairs: null, order: null, groups: null },
      { type: 'code', level: 3, q: 'Viết hàm solve(a, b) trả về tổng hai số.', choices: null, answer: null, rubric: null, starter: 'function solve(a, b) {\n  \n}', tests: [{ name: 'Cộng hai số dương', args: '[1, 2]', expected: '3' }, { name: 'Có số âm', args: '[-1, 5]', expected: '4' }], src: null, pairs: null, order: null, groups: null },
    ],
  }
}

export const DeckSchema = z.object({
  slides: z.array(z.object({
    layout: z.enum(['cover', 'bullets', 'steps', 'two', 'table', 'stat', 'quote']),
    title: z.string(), sub: N(z.string()), items: N(z.array(z.string())),
    cols: N(z.array(z.array(z.string())).describe('mỗi cột: phần tử đầu là tiêu đề cột')),
    head: N(z.array(z.string())), rows: N(z.array(z.array(z.string()))),
    stats: N(z.array(z.array(z.string())).describe('[[số, mô tả]]')), quote: N(z.string()), by: N(z.string()),
    notes: z.string().describe('lời người trình bày, cũng là lời đọc khi tạo video, 2–4 câu'),
    src: N(z.string()),
  })),
})
export type DeckDraft = z.infer<typeof DeckSchema>

export function draftDeck(orgId: string, kit: KitBrief, item: { title: string; summary: string }, titles: string[], hits: Hit[], forVideo = false): Promise<DeckDraft> {
  return aiJson({
    orgId, feature: forVideo ? 'gen_video' : 'gen_deck', schema: DeckSchema,
    system: `${RULES}
Nhiệm vụ: viết ${forVideo ? 'kịch bản video dạng slide + lời đọc' : 'bộ slide'} theo danh sách tiêu đề. Mỗi slide ngắn gọn (≤ 5 ý, mỗi ý ≤ 12 từ). Slide đầu layout cover.
Chọn layout hợp nội dung: bullets, steps (quy trình), two (so sánh hai cột), table, stat (số liệu có trong nguồn), quote.
notes: lời đọc tự nhiên ${forVideo ? '3–5 câu, đây là lời đọc của giọng AI' : '2–4 câu'}. Mỗi slide nội dung có src.`,
    input: `${brief(kit)}\n\nTài liệu: ${item.title}\nMục đích: ${item.summary}\n\nTiêu đề các slide:\n${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nTrích đoạn nguồn:\n${hitsText(hits) || '(không có nguồn)'}`,
    mock: () => ({
      slides: titles.map((t, i) => ({ layout: i === 0 ? 'cover' as const : 'bullets' as const, title: t, sub: i === 0 ? kit.goal.slice(0, 80) : null, items: i === 0 ? null : kit.goals.slice(0, 3), cols: null, head: null, rows: null, stats: null, quote: null, by: null, notes: `Phần ${t}. ${kit.goals[0] ?? ''}`, src: hits.length ? 'S1' : null })),
    }),
  })
}

export const ScenarioSchema = z.object({
  character: z.object({ name: z.string(), role: z.string() }),
  learner: z.string(),
  intro: z.string(),
  scenes: z.array(z.object({
    title: z.string(), goal: z.string(),
    line: z.string().describe('câu nhân vật nói mở đầu cảnh'),
    // cùng thang với trình soạn và trình học: good (tốt nhất) / neutral (chấp nhận được) / bad
    choices: z.array(z.object({ t: z.string(), ok: z.enum(['good', 'neutral', 'bad']), reply: z.string() })),
  })),
})
export type ScenarioDraft = z.infer<typeof ScenarioSchema>

export function draftScenario(orgId: string, kit: KitBrief, item: { title: string; summary: string }, o: { character: string; learner: string; situation: string; goals: string[] }, hits: Hit[]): Promise<ScenarioDraft> {
  return aiJson({
    orgId, feature: 'gen_scenario', schema: ScenarioSchema,
    system: `${RULES}
Nhiệm vụ: viết tình huống hội thoại luyện tập. Mỗi cảnh ứng với một mục tiêu: nhân vật nói một câu (line), người học chọn 1 trong 3 lựa chọn (1 good: tốt nhất, 1 neutral: chấp nhận được nhưng chưa tối ưu, 1 bad: sai hoặc rủi ro), nhân vật đáp lại (reply) giải thích hệ quả dựa trên nguồn. Lời thoại tự nhiên như chat công việc.`,
    input: `${brief(kit)}\n\nTài liệu: ${item.title}\nNhân vật: ${o.character}\nNgười học đóng vai: ${o.learner}\nBối cảnh: ${o.situation}\nMục tiêu từng cảnh:\n${o.goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}\n\nTrích đoạn nguồn:\n${hitsText(hits) || '(không có nguồn)'}`,
    mock: () => {
      const [name, ...role] = o.character.split(' · ')
      return {
        character: { name: name || 'Chị Lan', role: role.join(' · ') || 'Trưởng nhóm' }, learner: o.learner, intro: o.situation,
        scenes: o.goals.map((g, i) => ({
          title: `Cảnh ${i + 1}`, goal: g, line: `Em xử lý việc này thế nào? (${g.toLowerCase()})`,
          choices: [
            { t: 'Em làm theo đúng quy trình và hỏi lại chỗ chưa rõ.', ok: 'good' as const, reply: 'Tốt, cách đó an toàn nhất.' },
            { t: 'Em làm trước rồi báo sau.', ok: 'neutral' as const, reply: 'Được, nhưng nên báo trước để tránh rủi ro.' },
            { t: 'Em làm theo cách quen, không cần xem quy trình.', ok: 'bad' as const, reply: 'Cách đó dễ sai nếu quy trình vừa thay đổi.' },
          ],
        })),
      }
    },
  })
}

// ---------- 4. Gợi ý thêm tài liệu vào kế hoạch ----------
export const PlanItemSchema = z.object({ title: z.string(), summary: z.string() })
export function suggestPlanItem(orgId: string, kit: KitBrief, type: GenType, instruction: string): Promise<z.infer<typeof PlanItemSchema>> {
  return aiJson({
    orgId, feature: 'plan_item', schema: PlanItemSchema,
    system: 'Đặt tên ngắn (≤ 60 ký tự) và mục đích 1–2 câu cho một tài liệu mới trong khóa học, theo hướng dẫn của người soạn. Tiếng Việt.',
    input: `${brief(kit)}\nDạng: ${type}\nHướng dẫn: ${instruction}`,
    mock: () => ({ title: instruction.slice(0, 60), summary: instruction }),
  })
}

// ---------- 5. Sửa bằng AI một phần nội dung ----------
export function aiRewrite<T extends z.ZodType>(orgId: string, schema: T, current: unknown, instruction: string, hits: Hit[], mock: () => z.infer<T>): Promise<z.infer<T>> {
  return aiJson({
    orgId, feature: 'ai_edit', schema,
    system: `${RULES}\nNhiệm vụ: sửa phần nội dung JSON theo yêu cầu của người soạn, giữ nguyên cấu trúc, giữ mã nguồn src nếu vẫn đúng.`,
    input: `Yêu cầu: ${instruction}\n\nNội dung hiện tại (JSON):\n${JSON.stringify(current)}\n\nTrích đoạn nguồn:\n${hitsText(hits) || '(không có)'}`,
    mock,
  })
}
