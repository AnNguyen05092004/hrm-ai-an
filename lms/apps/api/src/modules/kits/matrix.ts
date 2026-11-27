// Ma trận đề: mỗi ô là một dạng câu ở một độ khó, kèm số câu có trong mỗi lượt thi.
// Ngân hàng câu soạn dư (gấp `reserve` lần) để mỗi lượt thi rút ngẫu nhiên một bộ khác nhau nhưng cùng cấu trúc.

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export const TYPE_NAME: Record<string, string> = {
  mc: 'Một đáp án', mr: 'Nhiều đáp án', tf: 'Đúng / Sai', fill: 'Điền chỗ trống', match: 'Ghép cặp', order: 'Sắp thứ tự', cat: 'Phân loại', essay: 'Tự luận', code: 'Bài code JavaScript',
}
/** Độ khó của câu hỏi (trường `level` của câu) */
export const DIFF_NAME: Record<number, string> = { 1: 'Dễ', 2: 'Trung bình', 3: 'Khó' }

export interface Cell { type: string; level: number; count: number }
export interface Pool extends Cell { pool: Json[] }

const inCell = (q: Json, c: Cell): boolean => q.type === c.type && (q.level ?? 1) === c.level
export const cellName = (c: Cell): string => `${TYPE_NAME[c.type] ?? c.type} · ${DIFF_NAME[c.level] ?? c.level}`

/** Chia các câu theo ô ma trận; `rest` là câu không thuộc ô nào (không được rút) */
export function matrixPools(matrix: Cell[], qs: Json[]): { cells: Pool[]; rest: Json[] } {
  return { cells: matrix.map((c) => ({ ...c, pool: qs.filter((q) => inCell(q, c)) })), rest: qs.filter((q) => !matrix.some((c) => inCell(q, c))) }
}

/** Số câu mỗi lượt thi thực rút được từ các câu `qs` (đã duyệt) */
export function examPick(quiz: Json, qs: Json[]): number {
  const m = quiz.matrix as Cell[] | undefined
  if (m?.length) return matrixPools(m, qs).cells.reduce((s, c) => s + Math.min(c.count, c.pool.length), 0)
  return Math.min(Number(quiz.pick ?? qs.length), qs.length)
}
