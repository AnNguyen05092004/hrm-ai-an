// Kiểm tra trước khi xuất bản: chặn lỗi nghiêm trọng, nhắc các điểm cần xem lại.
import type { schema } from '../../db/client.js'
import { cellName, matrixPools, type Cell } from '../kits/matrix.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
/** Một chỗ cần sửa trong bài học, để người soạn bấm tới đúng khối */
export interface Spot { kind: 'gap' | 'nosrc'; lesson: string; lessonTitle: string; block: string; text: string }
export interface Issues { blocking: string[]; warnings: string[]; spots: Spot[] }

const plain = (s: unknown): string => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

/** Các khối thiếu căn cứ / chưa có nguồn, theo thứ tự bài */
function spotsOf(lessons: Json[]): Spot[] {
  return lessons.flatMap((l) => ((l.blocks ?? []) as Json[]).flatMap((b): Spot[] => {
    const kind = b.t === 'gap' ? 'gap' : b.nosrc ? 'nosrc' : null
    return kind ? [{ kind, lesson: l.id, lessonTitle: plain(l.title) || 'Bài chưa đặt tên', block: b.id, text: plain(b.p ?? b.h ?? b.intro).slice(0, 160) }] : []
  }))
}

/** Ma trận đề: mỗi ô cần đủ câu đã duyệt; câu đã duyệt ngoài ma trận không được rút */
function matrixIssues(matrix: Cell[], approved: Json[], warnings: string[]): void {
  const { cells, rest } = matrixPools(matrix, approved)
  for (const c of cells) if (c.pool.length < c.count) warnings.push(`Ô ${cellName(c)} cần ${c.count} câu mỗi lượt thi nhưng ngân hàng có ${c.pool.length} câu đã duyệt.`)
  if (rest.length) warnings.push(`${rest.length} câu đã duyệt không thuộc ô nào của ma trận đề nên không được rút. Đổi dạng / độ khó của câu hoặc thêm dòng vào ma trận.`)
}

/** Kiểm tra ngân hàng câu hỏi; đề kiểm tra riêng bắt buộc có câu đã duyệt */
function quizIssues(quiz: Json | undefined, blocking: string[], warnings: string[], required: boolean): void {
  const qs = (quiz?.questions ?? []) as Json[]
  const approved = qs.filter((q) => q.approved)
  if (!approved.length && (required || qs.length)) (required ? blocking : warnings).push('Chưa có câu nào được duyệt vào ngân hàng đề, người học chưa thi được.')
  if (approved.length && quiz?.matrix?.length) matrixIssues(quiz.matrix, approved, warnings)
  else if (approved.length && quiz?.pick > approved.length) warnings.push(`Đề rút ${quiz?.pick} câu nhưng ngân hàng chỉ có ${approved.length} câu đã duyệt.`)
  const pending = qs.length - approved.length
  if (required && approved.length && pending) warnings.push(`${pending} câu chưa duyệt sẽ không vào đề.`)
  for (const q of approved) {
    if ((q.type === 'mc' || q.type === 'mr' || q.type === 'tf') && !(q.choices ?? []).some((x: Json) => x.ok)) blocking.push(`Câu "${String(q.q).slice(0, 40)}…" chưa có đáp án đúng.`)
    if (q.type === 'code' && !(q.tests ?? []).length) blocking.push(`Câu code "${String(q.q).slice(0, 40)}…" chưa có test case.`)
    if (q.type === 'essay' && !(q.rubric ?? []).length) blocking.push(`Câu tự luận "${String(q.q).slice(0, 40)}…" chưa có rubric.`)
    const name = `"${String(q.q).slice(0, 40)}…"`
    const dup = (xs: string[]): boolean => new Set(xs.map((x) => x.trim())).size !== xs.length
    if (q.type === 'match') {
      const ps = (q.pairs ?? []) as Json[]
      if (ps.length < 2 || ps.some((p) => !String(p.l ?? '').trim() || !String(p.r ?? '').trim())) blocking.push(`Câu ghép cặp ${name} cần ít nhất 2 cặp, không để trống vế nào.`)
      else if (dup(ps.map((p) => p.r))) blocking.push(`Câu ghép cặp ${name} có vế phải trùng nhau.`)
    }
    if (q.type === 'order') {
      const xs = (q.items ?? []) as string[]
      if (xs.length < 2 || xs.some((x) => !String(x).trim())) blocking.push(`Câu sắp thứ tự ${name} cần ít nhất 2 mục, không để trống.`)
      else if (dup(xs)) blocking.push(`Câu sắp thứ tự ${name} có mục trùng nhau.`)
    }
    if (q.type === 'cat') {
      const gs = (q.groups ?? []) as Json[]
      const all = gs.flatMap((g) => g.items ?? []) as string[]
      if (gs.length < 2 || all.length < 2 || gs.some((g) => !String(g.name ?? '').trim()) || all.some((x) => !String(x).trim())) blocking.push(`Câu phân loại ${name} cần ít nhất 2 nhóm có tên và 2 mục.`)
      else if (dup(all)) blocking.push(`Câu phân loại ${name} có mục trùng nhau.`)
    }
  }
}

export function publishIssues(a: typeof schema.artifacts.$inferSelect): Issues {
  const c = a.content as Json
  const blocking: string[] = [], warnings: string[] = []
  let spots: Spot[] = []
  if (a.status === 'generating') blocking.push('Tài liệu đang được AI soạn.')
  if (!a.title.trim()) blocking.push('Tài liệu chưa có tên.')
  if (a.type === 'qr' || a.type === 'master') {
    const lessons = (c.lessons ?? []).filter((l: Json) => l.kind === 'lesson')
    if (!lessons.length) blocking.push('Chưa có bài học nào.')
    spots = spotsOf(lessons)
    const gaps = spots.filter((x) => x.kind === 'gap').length
    const nosrc = spots.length - gaps
    if (gaps) warnings.push(a.type === 'master' ? `Còn ${gaps} chỗ thiếu căn cứ. Các khối này không được dùng khi soạn định dạng; nên bổ sung trước khi chốt.` : `Còn ${gaps} chỗ thiếu căn cứ trong tài liệu nguồn (người học không thấy các khối này).`)
    if (nosrc) warnings.push(`${nosrc} khối chưa có nguồn trích dẫn.`)
    if (a.type === 'qr') quizIssues(c.quiz, blocking, warnings, false)
  }
  if (a.type === 'exam') {
    if (!c.quiz) blocking.push('Đề kiểm tra chưa có ngân hàng câu hỏi.')
    else quizIssues(c.quiz, blocking, warnings, true)
  }
  if (a.type === 'deck' && !(c.slides ?? []).length) blocking.push('Bộ slide chưa có slide nào.')
  if (a.type === 'scenario' && !(c.scenes ?? []).length) blocking.push('Tình huống chưa có cảnh nào.')
  if (a.type === 'video' && !(c.chapters ?? []).length) blocking.push('Video chưa có chương nào.')
  return { blocking, warnings, spots }
}
