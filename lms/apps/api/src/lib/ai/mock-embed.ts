import { EMBED_DIM } from '../../db/schema.js'
import { fold } from '../text.js'

/** Vector giả lập: băm từ khóa vào các chiều, đủ để tìm kiếm theo từ chung khi chạy không có key */
export function mockEmbed(text: string): number[] {
  const v = new Array<number>(EMBED_DIM).fill(0)
  for (const w of fold(text).split(/[^a-z0-9]+/).filter((x) => x.length > 2)) {
    let h = 2166136261
    for (const ch of w) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
    v[Math.abs(h) % EMBED_DIM] += 1
  }
  const n = Math.hypot(...v) || 1
  return v.map((x) => x / n)
}
