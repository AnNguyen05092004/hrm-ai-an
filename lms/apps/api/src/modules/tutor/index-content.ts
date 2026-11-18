// Chia nội dung đã xuất bản thành các đoạn có chỗ nhảy tới (bài, phút video, slide…) để AI Tutor tìm kiếm.
import { and, eq, isNotNull } from 'drizzle-orm'
import { db, schema } from '../../db/client.js'
import type { Jump } from '../../db/schema.js'
import { embed } from '../../lib/ai/index.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
export interface Section { label: string; jump: Jump; text: string; src?: string }

const mmss = (t: number): string => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`
const flat = (x: unknown): string => {
  if (!x) return ''
  if (typeof x === 'string') return x
  if (Array.isArray(x)) return x.map(flat).filter(Boolean).join(' – ')
  if (typeof x === 'object') { const o = x as Json; return flat(o.t ?? o.text ?? o.h ?? o.title ?? (o.f && o.b ? `${o.f}: ${o.b}` : '')) }
  return String(x)
}

function blockText(b: Json): string {
  if (b.t === 'kc' || b.t === 'gap') return '' // câu kiểm tra và chỗ thiếu căn cứ không dùng làm câu trả lời
  const parts = [b.h, b.p, b.intro, b.cap, b.code, ...(b.items ?? []), ...(b.steps ?? []), ...(b.rows ?? []), ...(b.cards ?? []).map((c: Json) => `${c.f}: ${c.b}`)]
  return parts.map(flat).filter(Boolean).join('\n')
}

export function sectionsOf(type: string, c: Json): Section[] {
  if (type === 'qr') {
    return (c.lessons ?? []).filter((l: Json) => l.kind === 'lesson').map((l: Json, i: number) => ({
      label: `Bài ${i + 1} · ${l.title}`, jump: { lesson: l.id },
      text: [l.title, ...(l.blocks ?? []).map(blockText)].filter(Boolean).join('\n'),
      src: (l.blocks ?? []).find((b: Json) => b.src)?.src,
    }))
  }
  if (type === 'video') {
    const ch: Json[] = c.chapters ?? []
    return ch.map((x, i) => {
      const next = ch[i + 1]?.t ?? Infinity
      const lines = (c.transcript ?? []).filter((l: Json) => l.t >= x.t && l.t < next).map((l: Json) => l.x)
      return { label: `Chương ${i + 1} · ${x.title} (${mmss(x.t)})`, jump: { t: x.t }, text: [x.title, ...lines].join('\n'), src: 'Lời thoại video' }
    })
  }
  if (type === 'deck') {
    return (c.slides ?? []).map((s: Json, i: number) => ({
      label: `Slide ${i + 1} · ${s.title}`, jump: { slide: i },
      text: [s.title, s.sub, ...(s.items ?? []), ...(s.cols ?? []).flat(), ...(s.rows ?? []).map(flat), s.notes].map(flat).filter(Boolean).join('\n'),
    }))
  }
  if (type === 'guide') {
    return (c.steps ?? []).map((s: Json, i: number) => ({ label: `Bước ${i + 1} · ${s.title ?? s.t}`, jump: { step: i }, text: [s.title ?? s.t, s.text ?? s.b].map(flat).join('\n') }))
  }
  if (type === 'scenario') {
    return (c.scenes ?? []).map((s: Json, i: number) => ({
      label: `Cảnh ${i + 1} · ${s.title}`, jump: { scene: s.id },
      text: [s.goal, ...(s.cards ?? []).map((k: Json) => [k.text, ...(k.choices ?? []).map((ch: Json) => `${ch.t} → ${ch.reply}`)].join('\n'))].map(flat).filter(Boolean).join('\n'),
    }))
  }
  return []
}

/** Lập chỉ mục bản đã xuất bản mới nhất của một tài liệu */
export async function indexArtifact(artifactId: string): Promise<number> {
  const [a] = await db.select().from(schema.artifacts).where(eq(schema.artifacts.id, artifactId))
  await db.delete(schema.contentChunks).where(eq(schema.contentChunks.artifactId, artifactId))
  if (!a?.publishedVersion) return 0
  const [v] = await db.select().from(schema.artifactVersions)
    .where(and(eq(schema.artifactVersions.artifactId, artifactId), eq(schema.artifactVersions.version, a.publishedVersion)))
  if (!v) return 0
  const secs = sectionsOf(a.type, v.content as Json).filter((s) => s.text.trim())
  const vecs = await embed(a.orgId, secs.map((s) => `${v.title}\n${s.label}\n${s.text}`))
  if (secs.length) {
    await db.insert(schema.contentChunks).values(secs.map((s, i) => ({
      orgId: a.orgId, artifactId, label: s.label, jump: s.jump, text: s.text, src: s.src ?? null, embedding: vecs[i],
    })))
  }
  return secs.length
}

export async function indexAllPublished(orgId: string): Promise<void> {
  const rows = await db.select({ id: schema.artifacts.id }).from(schema.artifacts)
    .where(and(eq(schema.artifacts.orgId, orgId), isNotNull(schema.artifacts.publishedVersion)))
  for (const r of rows) await indexArtifact(r.id)
}
