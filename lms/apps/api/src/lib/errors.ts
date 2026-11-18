export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

export const notFound = (what = 'Dữ liệu'): AppError => new AppError(404, 'not_found', `${what} không tồn tại`)
export const forbidden = (msg = 'Bạn không có quyền làm việc này'): AppError => new AppError(403, 'forbidden', msg)
export const badRequest = (msg: string, code = 'bad_request'): AppError => new AppError(400, code, msg)
export const conflict = (msg: string): AppError => new AppError(409, 'conflict', msg)

export function must<T>(v: T | null | undefined, what?: string): T {
  if (v === null || v === undefined) throw notFound(what)
  return v
}
