// Nội dung của khóa: bản soạn đầy đủ, duyệt nội bộ, không xuất cho người học.
// "Chốt nội dung" = xuất bản bản nội dung thành một phiên bản; mọi định dạng (Tài liệu nhanh, slide, video,
// tình huống, đề kiểm tra) chỉ soạn từ phiên bản đã chốt, nên các định dạng luôn khớp nhau và khớp bản đã duyệt.
import { and, eq } from 'drizzle-orm'
import { db, schema } from '../../db/client.js'
import { badRequest } from '../../lib/errors.js'
import type { Hit } from '../sources/service.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
type Artifact = typeof schema.artifacts.$inferSelect

export const MASTER_TITLE = 'Nội dung'
const MAX_PASSAGES = 40
const MAX_CHARS = 1500

export async function masterOf(kitId: string): Promise<Artifact | null> {
  const [a] = await db.select().from(schema.artifacts).where(and(eq(schema.artifacts.kitId, kitId), eq(schema.artifacts.type, 'master'))).limit(1)
  return a ?? null
}

export interface LockedMaster { artifact: Artifact; version: number; content: Json }

/** Phiên bản nội dung đã chốt gần nhất; null khi chưa chốt */
export async function lockedMaster(kitId: string): Promise<LockedMaster | null> {
  const a = await masterOf(kitId)
  if (!a?.publishedVersion) return null
  const [v] = await db.select().from(schema.artifactVersions).where(and(eq(schema.artifactVersions.artifactId, a.id), eq(schema.artifactVersions.version, a.publishedVersion)))
  return v ? { artifact: a, version: v.version, content: v.content as Json } : null
}

/** Bắt buộc đã chốt nội dung trước khi soạn định dạng */
export async function requireLocked(kitId: string): Promise<LockedMaster> {
  const m = await lockedMaster(kitId)
  if (!m) throw badRequest('Chốt nội dung trước khi tạo định dạng cho người học', 'master_not_locked')
  return m
}

/** Chữ thuần của một khối (bỏ thẻ định dạng) */
function blockText(b: Json): string {
  const parts = [b.h, b.p, b.intro, ...(b.items ?? []).map((x: Json | string) => (typeof x === 'string' ? x : `${x.t ?? x.d ?? ''}: ${x.b ?? ''}`)),
    ...(b.steps ?? []), ...(b.cards ?? []).map((c: Json) => `${c.f}: ${c.b}`), b.code, ...(b.head ? [b.head.join(' | ')] : []), ...(b.rows ?? []).map((r: string[]) => r.join(' | ')),
    ...(b.groups ?? []).map((g: Json) => `${g.name}: ${(g.items ?? []).join(', ')}`)]
  return parts.filter(Boolean).join('\n').replace(/<[^>]+>/g, '').trim()
}

/**
 * Các đoạn của nội dung dùng làm căn cứ khi soạn định dạng. Khối có trích nguồn giữ nguyên tài liệu và đoạn nguồn gốc,
 * nên định dạng sinh ra vẫn trích đúng tài liệu nguồn (và vẫn được báo khi tài liệu nguồn đổi).
 */
export function masterHits(content: Json): Hit[] {
  const out: Hit[] = []
  for (const l of (content.lessons ?? []) as Json[]) {
    if (l.kind !== 'lesson') continue
    for (const b of (l.blocks ?? []) as Json[]) {
      if (b.t === 'image' || b.t === 'gap' || b.t === 'kc') continue
      const text = blockText(b)
      if (!text) continue
      const [file, sec] = String(b.src ?? '').split(' · ')
      out.push({
        id: b.srcRef?.chunkId ?? b.id, sourceId: b.srcRef?.sourceId ?? '', version: b.srcRef?.version ?? 0, score: 1,
        sourceName: b.src ? file : MASTER_TITLE, section: b.src ? (sec ?? l.title) : l.title, text: `[${l.title}] ${text}`.slice(0, MAX_CHARS),
      })
    }
  }
  return out.slice(0, MAX_PASSAGES)
}

/** Tên các bài của nội dung, dùng làm dàn ý mặc định cho định dạng mới */
export const masterLessons = (content: Json): { t: string; items: string[] }[] =>
  ((content.lessons ?? []) as Json[]).filter((l) => l.kind === 'lesson').map((l) => ({ t: String(l.title), items: [] }))

/** Tạo nội dung từ Tài liệu nhanh có sẵn (khóa tạo trước khi có bước nội dung) */
export function masterFromQr(qr: Json): Json {
  return { lessons: ((qr.lessons ?? []) as Json[]).filter((l) => l.kind === 'lesson') }
}
