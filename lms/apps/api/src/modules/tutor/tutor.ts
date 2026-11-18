// AI Tutor: trả lời chỉ từ nội dung đã xuất bản, có nguồn và chỗ nhảy tới; không có thì nói rõ (BR05, F06–F08).
import { z } from 'zod'
import { and, eq, inArray, isNotNull, ne, or, sql } from 'drizzle-orm'
import { db, schema } from '../../db/client.js'
import type { Jump } from '../../db/schema.js'
import type { AuthUser } from '../../lib/auth.js'
import { aiJson, embed, isMock } from '../../lib/ai/index.js'
import { cut } from '../../lib/text.js'

export interface Turn { role: 'user' | 'tutor'; text: string }
export interface TutorReply {
  text: string; list?: string[]; src?: string; none?: boolean; off?: boolean
  jump?: { label: string; to: Jump; artifactId: string; other?: boolean }[]
  suggest?: string[]
}
interface Hit { id: string; artifactId: string; title: string; label: string; jump: Jump; text: string; src: string | null; score: number }

const EXAM = /đáp án|bài thi|câu thi|đề thi|đề kiểm tra|(câu|câu hỏi) (số )?\d+/i
const MIN_SCORE = 0.2
const MOCK_MIN = 0.12

/** Đang có lượt thi chính thức chưa nộp thì tắt Tutor (BR06) */
export async function inOfficialExam(userId: string): Promise<boolean> {
  const [r] = await db.select({ id: schema.attempts.id }).from(schema.attempts)
    .where(and(eq(schema.attempts.userId, userId), eq(schema.attempts.mode, 'official'), eq(schema.attempts.status, 'in_progress'), sql`(${schema.attempts.deadline} is null or ${schema.attempts.deadline} > now())`))
  return !!r
}

/** Các tài liệu đã xuất bản người dùng được xem (được giao hoặc có đường dẫn chia sẻ) */
async function visibleIds(u: AuthUser): Promise<string[]> {
  const assigned = db.select({ id: schema.assignments.artifactId }).from(schema.assignments).where(eq(schema.assignments.userId, u.id))
  const rows = await db.select({ id: schema.artifacts.id }).from(schema.artifacts).where(and(
    eq(schema.artifacts.orgId, u.orgId), isNotNull(schema.artifacts.publishedVersion),
    u.role === 'author' ? sql`true` : or(isNotNull(schema.artifacts.shareSlug), inArray(schema.artifacts.id, assigned)),
  ))
  return rows.map((r) => r.id)
}

async function search(vec: number[], ids: string[], k: number): Promise<Hit[]> {
  if (!ids.length) return []
  const v = `[${vec.join(',')}]`
  return db.select({
    id: schema.contentChunks.id, artifactId: schema.contentChunks.artifactId, title: schema.artifacts.title, label: schema.contentChunks.label,
    jump: schema.contentChunks.jump, text: schema.contentChunks.text, src: schema.contentChunks.src,
    score: sql<number>`1 - (${schema.contentChunks.embedding} <=> ${v}::vector)`,
  }).from(schema.contentChunks).innerJoin(schema.artifacts, eq(schema.artifacts.id, schema.contentChunks.artifactId))
    .where(inArray(schema.contentChunks.artifactId, ids))
    .orderBy(sql`${schema.contentChunks.embedding} <=> ${v}::vector`).limit(k)
}

const Answer = z.object({
  kind: z.enum(['answer', 'smalltalk', 'not_found']),
  text: z.string().describe('câu trả lời ngắn gọn, thân thiện, tiếng Việt'),
  points: z.array(z.string()).describe('các ý chính nếu cần liệt kê, có thể rỗng'),
  cite: z.array(z.string()).describe('mã đoạn đã dùng, ví dụ ["C1","C3"]'),
  conflict: z.boolean().describe('các đoạn từ hai khóa nói khác nhau'),
  suggest: z.array(z.string()).describe('1–2 câu hỏi gợi ý tiếp theo'),
})

const btn = (h: Hit, other: boolean): { label: string; to: Jump; artifactId: string; other?: boolean } => {
  const to = h.jump
  const label = to.t != null ? `Xem phút ${String(Math.floor(to.t / 60)).padStart(2, '0')}:${String(to.t % 60).padStart(2, '0')}` : `Mở ${h.label.split(' · ')[0]}`
  return { label: other ? `${label} · ${cut(h.title, 30)}` : label, to, artifactId: h.artifactId, ...(other ? { other: true } : {}) }
}

export async function askTutor(u: AuthUser, artifactId: string, question: string, history: Turn[]): Promise<TutorReply> {
  if (await inOfficialExam(u.id)) return { off: true, text: 'AI Tutor tắt trong lúc bạn đang làm bài thi chính thức. Nộp bài xong bạn hỏi tiếp nhé.' }
  if (EXAM.test(question)) return { text: 'Mình không hỗ trợ trả lời câu hỏi bài thi hay bài kiểm tra. Mình có thể giải thích lại phần kiến thức liên quan nếu bạn nói rõ chủ đề.', suggest: ['Tóm tắt khóa này'] }

  const [a] = await db.select({ title: schema.artifacts.title, orgId: schema.artifacts.orgId }).from(schema.artifacts).where(eq(schema.artifacts.id, artifactId))
  const [vec, plain] = await embed(u.orgId, [`${a?.title ?? ''}\n${question}`, question])
  const others = (await visibleIds(u)).filter((x) => x !== artifactId)
  const [own, more] = await Promise.all([search(isMock() ? plain : vec, [artifactId], 5), search(plain, others, 3)])
  const floor = isMock() ? MOCK_MIN : MIN_SCORE
  const hits = [...own.filter((h) => h.score >= floor), ...more.filter((h) => h.score >= floor)]
  const summary = /tóm tắt|tổng quan|nội dung chính|(khóa|bài) này (nói|dạy|học|có) (về )?gì/i.test(question)
  const used = summary ? await search(vec, [artifactId], 12) : hits
  const ctx = used.map((h, i) => `[C${i + 1}] Khóa "${h.title}"${h.artifactId === artifactId ? ' (khóa đang học)' : ' (khóa khác)'} · ${h.label}\n${cut(h.text, 1200)}`).join('\n\n')

  const r = await aiJson({
    orgId: u.orgId, feature: 'tutor', schema: Answer,
    system: `Bạn là AI Tutor của khóa học nội bộ "${a?.title}". Quy tắc:
- Chỉ trả lời từ các đoạn [C#] được cấp. Không dùng kiến thức bên ngoài, không đoán.
- Nếu các đoạn không đủ để trả lời: kind = "not_found", nói rõ là không tìm thấy trong khóa học và các khóa đã chia sẻ.
- Ưu tiên khóa đang học. Nếu chỉ khóa khác có câu trả lời, nói rõ là tìm thấy ở khóa khác.
- Nếu hai khóa nói khác nhau, nêu cả hai và đặt conflict = true.
- Câu chào hỏi, cảm ơn, hỏi bạn làm được gì: kind = "smalltalk", giới thiệu ngắn: giải thích lại, tóm tắt, chỉ đúng bài hoặc phút video, tìm trong các khóa đã chia sẻ.
- Trả lời ngắn (≤ 120 từ), dễ hiểu, giọng thân thiện. Không trả lời câu hỏi bài thi.`,
    input: `${history.slice(-4).map((t) => `${t.role === 'user' ? 'Người học' : 'Tutor'}: ${t.text}`).join('\n')}\nNgười học hỏi: ${question}\n\nCác đoạn nội dung:\n${ctx || '(không có đoạn nào liên quan)'}`,
    mock: () => used.length
      ? { kind: 'answer' as const, text: `Mình tìm thấy trong ${used[0].artifactId === artifactId ? 'khóa' : `khóa "${used[0].title}"`}: ${cut(used[0].text.split('\n').slice(1).join(' ') || used[0].text, 220)}`, points: [], cite: ['C1'], conflict: false, suggest: [] }
      : /^(hi|hello|chào|xin chào)|bạn (là ai|làm được gì|giúp được gì)/i.test(question)
        ? { kind: 'smalltalk' as const, text: `Mình là AI Tutor của khóa "${a?.title}". Mình giải thích lại, tóm tắt, chỉ đúng bài hoặc phút video, và tìm trong các khóa đã chia sẻ.`, points: [], cite: [], conflict: false, suggest: ['Tóm tắt khóa này'] }
        : { kind: 'not_found' as const, text: 'Mình không tìm thấy nội dung này trong khóa học hay các khóa đã chia sẻ, nên không đoán.', points: [], cite: [], conflict: false, suggest: [] },
  })

  const cited = r.cite.map((c) => used[Number(c.replace(/\D/g, '')) - 1]).filter(Boolean) as Hit[]
  const none = r.kind === 'not_found' || (r.kind === 'answer' && !cited.length)
  const reply: TutorReply = none
    ? { none: true, text: `${r.kind === 'not_found' ? r.text : 'Mình không tìm thấy nội dung này trong khóa học hay các khóa đã chia sẻ, nên không đoán.'} Câu hỏi đã được gửi cho người soạn để bổ sung.`, suggest: ['Tóm tắt khóa này'] }
    : {
      text: r.text, list: r.points.length ? r.points : undefined, suggest: r.suggest.slice(0, 2),
      src: cited.length ? [...new Set(cited.map((h) => `${h.artifactId === artifactId ? '' : `${h.title} · `}${h.label}${h.src ? ` (${h.src})` : ''}`))].join('; ') : undefined,
      jump: [...new Map(cited.map((h) => [h.id, btn(h, h.artifactId !== artifactId)])).values()].slice(0, 3),
    }
  if (r.conflict) reply.text += ' Lưu ý: các khóa đang nói khác nhau ở điểm này, mình đã báo người soạn kiểm tra.'
  await db.insert(schema.tutorMessages).values({ orgId: u.orgId, userId: u.id, artifactId, question, answer: reply as unknown as Record<string, unknown>, found: !none && !r.conflict })
  return reply
}

/** Câu hỏi Tutor chưa trả lời được, gom theo tài liệu cho người soạn */
export async function unanswered(orgId: string): Promise<{ id: string; question: string; artifactId: string; title: string; at: Date; by: string }[]> {
  return db.select({ id: schema.tutorMessages.id, question: schema.tutorMessages.question, artifactId: schema.tutorMessages.artifactId, title: schema.artifacts.title, at: schema.tutorMessages.createdAt, by: schema.users.name })
    .from(schema.tutorMessages).innerJoin(schema.artifacts, eq(schema.artifacts.id, schema.tutorMessages.artifactId)).innerJoin(schema.users, eq(schema.users.id, schema.tutorMessages.userId))
    .where(and(eq(schema.tutorMessages.orgId, orgId), eq(schema.tutorMessages.found, false), eq(schema.tutorMessages.resolved, false), ne(schema.users.role, 'author')))
    .orderBy(sql`${schema.tutorMessages.createdAt} desc`).limit(200)
}
