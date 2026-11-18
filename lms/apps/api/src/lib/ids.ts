import crypto from 'node:crypto'

/** id ngắn cho phần tử trong nội dung (bài, khối, câu hỏi) */
export const uid = (p = 'id'): string => `${p}-${crypto.randomBytes(4).toString('hex')}`
