import { and, eq, desc, inArray, sql } from 'drizzle-orm'
import { db, schema } from '../../db/client.js'
import { chunkText, extractText } from '../../lib/extract.js'
import { embed } from '../../lib/ai/index.js'
import { getFile } from '../../lib/storage.js'
import { defineJob } from '../../lib/jobs.js'
import { must } from '../../lib/errors.js'

export type Source = typeof schema.sources.$inferSelect
const SENSITIVE = [/\b\d{12}\b/, /\b\d{9}\b/, /\b0\d{9}\b/, /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/, /mật khẩu\s*[:=]/i, /password\s*[:=]/i, /tài liệu mật|tuyệt mật|\bconfidential\b|hạn chế lưu hành/i]

export const looksSensitive = (t: string): boolean => SENSITIVE.some((r) => r.test(t))
export const kindOfSource = (s: { mime: string }): string => s.mime.split('/')[1] ?? 'txt'
export const fileKey = (s: { id: string; version: number; mime: string }): string => `sources/${s.id}-v${s.version}.${kindOfSource(s)}`

export async function processSource(sourceId: string): Promise<number> {
  const s = must((await db.select().from(schema.sources).where(eq(schema.sources.id, sourceId)))[0], 'Tài liệu')
  const text = await extractText(await getFile(fileKey(s)), kindOfSource(s))
  if (text.replace(/\[\[trang \d+\]\]/g, '').trim().length < 30) {
    await db.update(schema.sources).set({ status: 'failed', error: 'Không đọc được chữ trong tệp (tệp ảnh scan chưa hỗ trợ)' }).where(eq(schema.sources.id, s.id))
    return 0
  }
  const chunks = chunkText(text)
  const vecs = await embed(s.orgId, chunks.map((c) => `${s.name} · ${c.section}\n${c.text}`))
  await db.delete(schema.sourceChunks).where(and(eq(schema.sourceChunks.sourceId, s.id), eq(schema.sourceChunks.version, s.version)))
  if (chunks.length) {
    await db.insert(schema.sourceChunks).values(chunks.map((c, i) => ({ sourceId: s.id, version: s.version, ord: i, section: c.section, text: c.text, embedding: vecs[i] })))
  }
  await db.update(schema.sources).set({ status: 'ready', text, error: null, sensitive: looksSensitive(text), updatedAt: new Date() }).where(eq(schema.sources.id, s.id))
  return chunks.length
}

defineJob('source.process', async ({ job, report }) => {
  await report(20, 'Đang đọc tài liệu')
  const id = String(job.payload.sourceId)
  try {
    return { chunks: await processSource(id) }
  } catch (e) {
    // tệp hỏng hoặc bị khóa: ghi lỗi lên tài liệu để người soạn thấy, không thử lại
    const msg = e instanceof Error && /password|encrypt/i.test(e.message) ? 'Tệp có mật khẩu, không đọc được' : 'Không đọc được tệp. Kiểm tra tệp có bị hỏng không rồi tải lại.'
    await db.update(schema.sources).set({ status: 'failed', error: msg }).where(eq(schema.sources.id, id))
    return { error: msg }
  }
})

/** Seed và tài liệu dạng chữ: tạo đoạn trực tiếp từ text đã có */
export async function chunkExisting(sourceId: string): Promise<void> {
  const s = must((await db.select().from(schema.sources).where(eq(schema.sources.id, sourceId)))[0])
  const chunks = chunkText(s.text)
  const vecs = await embed(s.orgId, chunks.map((c) => `${s.name} · ${c.section}\n${c.text}`))
  if (chunks.length) await db.insert(schema.sourceChunks).values(chunks.map((c, i) => ({ sourceId: s.id, version: s.version, ord: i, section: c.section, text: c.text, embedding: vecs[i] })))
}

export interface Hit { id: string; sourceId: string; sourceName: string; section: string; text: string; version: number; score: number }

/** Tìm các đoạn nguồn gần nhất với câu hỏi, chỉ trong các tài liệu được phép dùng */
export async function searchSources(orgId: string, sourceIds: string[], query: string, k = 6): Promise<Hit[]> {
  if (!sourceIds.length) return []
  const [v] = await embed(orgId, [query])
  return searchByVector(orgId, sourceIds, v, k)
}

export async function searchByVector(orgId: string, sourceIds: string[], v: number[], k = 6): Promise<Hit[]> {
  if (!sourceIds.length) return []
  const vec = `[${v.join(',')}]`
  const rows = await db.select({
    id: schema.sourceChunks.id, sourceId: schema.sourceChunks.sourceId, sourceName: schema.sources.name, section: schema.sourceChunks.section,
    text: schema.sourceChunks.text, version: schema.sourceChunks.version,
    score: sql<number>`1 - (${schema.sourceChunks.embedding} <=> ${vec}::vector)`,
  }).from(schema.sourceChunks)
    .innerJoin(schema.sources, and(eq(schema.sources.id, schema.sourceChunks.sourceId), eq(schema.sources.version, schema.sourceChunks.version)))
    .where(and(eq(schema.sources.orgId, orgId), inArray(schema.sourceChunks.sourceId, sourceIds)))
    .orderBy(sql`${schema.sourceChunks.embedding} <=> ${vec}::vector`).limit(k)
  return rows
}

export async function listSources(orgId: string): Promise<Omit<Source, 'text'>[]> {
  return db.select({
    id: schema.sources.id, orgId: schema.sources.orgId, name: schema.sources.name, mime: schema.sources.mime, version: schema.sources.version,
    status: schema.sources.status, error: schema.sources.error, sensitive: schema.sources.sensitive, uploadedBy: schema.sources.uploadedBy,
    createdAt: schema.sources.createdAt, updatedAt: schema.sources.updatedAt,
  }).from(schema.sources).where(eq(schema.sources.orgId, orgId)).orderBy(desc(schema.sources.updatedAt))
}
