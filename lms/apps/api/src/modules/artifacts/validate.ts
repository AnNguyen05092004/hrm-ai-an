// Kiểm tra trước khi xuất bản: chặn lỗi nghiêm trọng, nhắc các điểm cần xem lại.
import type { schema } from '../../db/client.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
export interface Issues { blocking: string[]; warnings: string[] }

/** Kiểm tra ngân hàng câu hỏi; đề kiểm tra riêng bắt buộc có câu đã duyệt */
function quizIssues(quiz: Json | undefined, blocking: string[], warnings: string[], required: boolean): void {
  const qs = (quiz?.questions ?? []) as Json[]
  const approved = qs.filter((q) => q.approved)
  if (!approved.length && (required || qs.length)) (required ? blocking : warnings).push('Chưa có câu nào được duyệt vào ngân hàng đề, người học chưa thi được.')
  if (approved.length && quiz?.pick > approved.length) warnings.push(`Đề rút ${quiz?.pick} câu nhưng ngân hàng chỉ có ${approved.length} câu đã duyệt.`)
  const pending = qs.length - approved.length
  if (required && approved.length && pending) warnings.push(`${pending} câu chưa duyệt sẽ không vào đề.`)
  for (const q of approved) {
    if ((q.type === 'mc' || q.type === 'mr') && !(q.choices ?? []).some((x: Json) => x.ok)) blocking.push(`Câu "${String(q.q).slice(0, 40)}…" chưa có đáp án đúng.`)
    if (q.type === 'code' && !(q.tests ?? []).length) blocking.push(`Câu code "${String(q.q).slice(0, 40)}…" chưa có test case.`)
    if (q.type === 'essay' && !(q.rubric ?? []).length) blocking.push(`Câu tự luận "${String(q.q).slice(0, 40)}…" chưa có rubric.`)
  }
}

export function publishIssues(a: typeof schema.artifacts.$inferSelect): Issues {
  const c = a.content as Json
  const blocking: string[] = [], warnings: string[] = []
  if (a.status === 'generating') blocking.push('Tài liệu đang được AI soạn.')
  if (!a.title.trim()) blocking.push('Tài liệu chưa có tên.')
  if (a.type === 'qr') {
    const lessons = (c.lessons ?? []).filter((l: Json) => l.kind === 'lesson')
    if (!lessons.length) blocking.push('Chưa có bài học nào.')
    const gaps = lessons.flatMap((l: Json) => l.blocks ?? []).filter((b: Json) => b.t === 'gap').length
    const nosrc = lessons.flatMap((l: Json) => l.blocks ?? []).filter((b: Json) => b.nosrc).length
    if (gaps) warnings.push(`Còn ${gaps} chỗ thiếu căn cứ trong tài liệu nguồn (người học không thấy các khối này).`)
    if (nosrc) warnings.push(`${nosrc} khối chưa có nguồn trích dẫn.`)
    quizIssues(c.quiz, blocking, warnings, false)
  }
  if (a.type === 'exam') {
    if (!c.quiz) blocking.push('Đề kiểm tra chưa có ngân hàng câu hỏi.')
    else quizIssues(c.quiz, blocking, warnings, true)
  }
  if (a.type === 'deck' && !(c.slides ?? []).length) blocking.push('Bộ slide chưa có slide nào.')
  if (a.type === 'scenario' && !(c.scenes ?? []).length) blocking.push('Tình huống chưa có cảnh nào.')
  if (a.type === 'video' && !(c.chapters ?? []).length) blocking.push('Video chưa có chương nào.')
  return { blocking, warnings }
}
