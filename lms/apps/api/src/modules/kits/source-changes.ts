// F05: tài liệu nguồn có bản mới → chỉ ra bài, slide, câu hỏi đang trích đoạn bị đổi.
import { and, eq, inArray } from 'drizzle-orm'
import { db, schema } from '../../db/client.js'
import { FORMAT_NAMES } from './names.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
export interface Part { artifactId: string; lessonId?: string; where: string; what: string; t?: number }
export interface Change { sourceId: string; sourceName: string; from: number; to: number; parts: Part[] }

interface Ref { sourceId: string; chunkId: string; version: number }
interface Cite { ref: Ref; artifactId: string; lessonId?: string; where: string; t?: number }

function citesOf(a: typeof schema.artifacts.$inferSelect): Cite[] {
  const c = a.content as Json
  const out: Cite[] = []
  const name = FORMAT_NAMES[a.type]
  const lessons = (c.lessons ?? []).filter((l: Json) => l.kind === 'lesson')
  lessons.forEach((l: Json, i: number) => (l.blocks ?? []).forEach((b: Json) => {
    if (b.srcRef) out.push({ ref: b.srcRef, artifactId: a.id, lessonId: l.id, where: `${name} · Bài ${i + 1} · ${b.h || l.title}` })
  }))
  ;(c.quiz?.questions ?? []).forEach((q: Json, i: number) => { if (q.srcRef) out.push({ ref: q.srcRef, artifactId: a.id, where: `Bài kiểm tra · Câu ${i + 1}` }) })
  ;(c.slides ?? []).forEach((s: Json, i: number) => { if (s.srcRef) out.push({ ref: s.srcRef, artifactId: a.id, where: a.type === 'video' ? `${name} · đoạn "${s.title}"` : `${name} · Slide ${i + 1} · ${s.title}`, t: s.t }) })
  return out
}

const norm = (t: string): string => t.replace(/\s+/g, ' ').trim()

export async function sourceChanges(kitId: string): Promise<Change[]> {
  const [k] = await db.select().from(schema.kits).where(eq(schema.kits.id, kitId))
  if (!k?.sourceIds.length) return []
  const srcs = await db.select({ id: schema.sources.id, name: schema.sources.name, version: schema.sources.version, status: schema.sources.status })
    .from(schema.sources).where(inArray(schema.sources.id, k.sourceIds))
  const arts = await db.select().from(schema.artifacts).where(eq(schema.artifacts.kitId, kitId))
  const cites = arts.flatMap(citesOf)
  const result: Change[] = []
  for (const s of srcs) {
    if (s.status !== 'ready') continue
    const mine = cites.filter((c) => c.ref.sourceId === s.id && c.ref.version < s.version)
    if (!mine.length) continue
    const oldIds = [...new Set(mine.map((c) => c.ref.chunkId))]
    const [oldChunks, newChunks] = await Promise.all([
      db.select().from(schema.sourceChunks).where(inArray(schema.sourceChunks.id, oldIds)),
      db.select().from(schema.sourceChunks).where(and(eq(schema.sourceChunks.sourceId, s.id), eq(schema.sourceChunks.version, s.version))),
    ])
    const newText = new Set(newChunks.map((x) => norm(x.text)))
    const parts: Part[] = []
    for (const c of mine) {
      const old = oldChunks.find((x) => x.id === c.ref.chunkId)
      if (!old || newText.has(norm(old.text))) continue
      const sameSection = newChunks.find((x) => x.section === old.section)
      parts.push({ artifactId: c.artifactId, lessonId: c.lessonId, where: c.where, t: c.t, what: sameSection ? `Nội dung "${old.section}" đã thay đổi trong bản mới` : `"${old.section}" không còn trong bản mới` })
    }
    if (parts.length) result.push({ sourceId: s.id, sourceName: s.name, from: Math.min(...mine.map((c) => c.ref.version)), to: s.version, parts })
  }
  return result
}
