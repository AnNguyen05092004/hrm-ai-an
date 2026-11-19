import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import type { z } from 'zod'
import { and, eq, gte, sql } from 'drizzle-orm'
import { env } from '../../env.js'
import { db, schema } from '../../db/client.js'
import { EMBED_DIM } from '../../db/schema.js'
import { AppError } from '../errors.js'
import { mockEmbed } from './mock-embed.js'

export interface JsonCall<T extends z.ZodType> {
  orgId: string
  feature: string
  system: string
  input: string
  schema: T
  strong?: boolean
  /** câu trả lời dùng khi AI_PROVIDER=mock (test, chạy không có key) */
  mock: () => z.infer<T>
}

let client: OpenAI | null = null
const oa = (): OpenAI => (client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 120_000, maxRetries: 2 }))
export const isMock = (): boolean => env.AI_PROVIDER === 'mock'

async function track(orgId: string, feature: string, model: string, input = 0, output = 0): Promise<void> {
  await db.insert(schema.aiUsage).values({ orgId, feature, model, inputTokens: input, outputTokens: output })
}

/** Tổng token AI tổ chức đã dùng trong tháng này */
export async function monthUsage(orgId: string): Promise<number> {
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0)
  const [r] = await db.select({ n: sql<number>`coalesce(sum(${schema.aiUsage.inputTokens} + ${schema.aiUsage.outputTokens}), 0)::int` })
    .from(schema.aiUsage).where(and(eq(schema.aiUsage.orgId, orgId), gte(schema.aiUsage.createdAt, start)))
  return r?.n ?? 0
}

async function checkQuota(orgId: string): Promise<void> {
  const [o] = await db.select({ q: schema.orgs.aiMonthlyTokens }).from(schema.orgs).where(eq(schema.orgs.id, orgId))
  if (o && (await monthUsage(orgId)) >= o.q) throw new AppError(429, 'ai_quota', 'Tổ chức đã dùng hết hạn mức AI tháng này')
}

export async function aiJson<T extends z.ZodType>(c: JsonCall<T>): Promise<z.infer<T>> {
  if (isMock()) { await track(c.orgId, c.feature, 'mock'); return c.schema.parse(c.mock()) }
  await checkQuota(c.orgId)
  const model = c.strong ? env.AI_MODEL_STRONG : env.AI_MODEL
  const r = await oa().responses.parse({
    model,
    reasoning: { effort: 'low' },
    instructions: c.system,
    input: c.input,
    text: { format: zodTextFormat(c.schema, c.feature.replace(/[^a-zA-Z0-9_]/g, '_')) },
  })
  await track(c.orgId, c.feature, model, r.usage?.input_tokens, r.usage?.output_tokens)
  if (!r.output_parsed) throw new AppError(502, 'ai_failed', 'AI không trả về kết quả hợp lệ, vui lòng thử lại')
  return r.output_parsed as z.infer<T>
}

const EMBED_BATCH = 96
export async function embed(orgId: string, texts: string[]): Promise<number[][]> {
  if (!texts.length) return []
  if (isMock()) return texts.map(mockEmbed)
  await checkQuota(orgId)
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const part = texts.slice(i, i + EMBED_BATCH).map((t) => t.slice(0, 8000))
    const r = await oa().embeddings.create({ model: env.AI_EMBED_MODEL, input: part, dimensions: EMBED_DIM })
    out.push(...r.data.map((d) => d.embedding))
    await track(orgId, 'embed', env.AI_EMBED_MODEL, r.usage.prompt_tokens, 0)
  }
  return out
}

/** Giọng đọc AI (giọng có sẵn của dịch vụ, không nhân bản giọng người thật) */
/** Ảnh minh họa cho tài liệu đào tạo (PNG ngang 3:2). Mock trả null để bên gọi tự vẽ ảnh thay thế. */
export async function imageGen(orgId: string, prompt: string): Promise<Buffer | null> {
  if (isMock()) return null
  await checkQuota(orgId)
  const r = await oa().images.generate({
    model: env.AI_IMAGE_MODEL, size: '1536x1024', quality: 'medium', n: 1,
    prompt: `Ảnh minh họa cho tài liệu đào tạo nội bộ doanh nghiệp. Phong cách ảnh chụp chân thực, ánh sáng tự nhiên, bố cục gọn. Không có chữ, không logo, không thương hiệu thật, không người nổi tiếng. Nội dung: ${prompt}`,
  })
  const b64 = r.data?.[0]?.b64_json
  if (!b64) throw new Error('AI không trả về ảnh')
  // giá ảnh tính theo ảnh; quy đổi tương đương token để vào chung hạn mức
  await track(orgId, 'image', env.AI_IMAGE_MODEL, r.usage?.input_tokens ?? 0, r.usage?.output_tokens ?? 4000)
  return Buffer.from(b64, 'base64')
}

export async function tts(orgId: string, text: string): Promise<Buffer | null> {
  if (isMock()) return null
  await checkQuota(orgId)
  const r = await oa().audio.speech.create({ model: env.AI_TTS_MODEL, voice: 'alloy', input: text.slice(0, 4000), response_format: 'mp3' })
  await track(orgId, 'tts', env.AI_TTS_MODEL, Math.ceil(text.length / 4), 0)
  return Buffer.from(await r.arrayBuffer())
}
