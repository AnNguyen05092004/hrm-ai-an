import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db, schema } from '../../db/client.js'
import type { ArtifactType } from '../../db/schema.js'
import { defineJob } from '../../lib/jobs.js'
import { must } from '../../lib/errors.js'
import { uid } from '../../lib/ids.js'
import { searchByVector, type Hit } from '../sources/service.js'
import { embed } from '../../lib/ai/index.js'
import {
  draftDetails, draftOutline, draftQr, draftDeck, draftScenario,
  type DeckDraft, type GenType, type KitBrief, type QrDraft, type ScenarioDraft,
} from './ai.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
export type Kit = typeof schema.kits.$inferSelect
export type Artifact = typeof schema.artifacts.$inferSelect
export interface PlanItem { type: GenType | 'exam'; title: string; summary: string; outline?: Json }

export const getKit = async (orgId: string, id: string): Promise<Kit> =>
  must((await db.select().from(schema.kits).where(and(eq(schema.kits.id, id), eq(schema.kits.orgId, orgId))))[0], 'Khóa học')

const fmt = (d: Date): string => d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')

/** Bản tóm tắt tài liệu cho danh sách (không gồm nội dung) */
export function artifactMeta(a: Artifact): Json {
  return { id: a.id, kitId: a.kitId, type: a.type, title: a.title, summary: a.summary, status: a.status, img: a.img, publishedVersion: a.publishedVersion, updated: fmt(a.updatedAt), updatedAt: a.updatedAt }
}

/** Tài liệu đầy đủ cho màn soạn: nội dung trải phẳng như prototype */
export function artifactDto(a: Artifact): Json {
  return { ...a.content, ...artifactMeta(a) }
}

export async function kitDto(k: Kit): Promise<Json> {
  const d = k.details as Json
  const [arts, srcs] = await Promise.all([
    db.select().from(schema.artifacts).where(eq(schema.artifacts.kitId, k.id)).orderBy(schema.artifacts.createdAt),
    k.sourceIds.length ? db.select({ id: schema.sources.id, name: schema.sources.name, version: schema.sources.version, status: schema.sources.status, sensitive: schema.sources.sensitive })
      .from(schema.sources).where(inArray(schema.sources.id, k.sourceIds)) : Promise.resolve([]),
  ])
  return {
    id: k.id, title: k.title, desc: k.goal, goalText: d.goalText ?? '', audience: d.audience ?? '', goals: d.goals ?? [], takeaways: d.takeaways ?? [],
    metrics: d.metrics ?? [], practice: d.practice ?? 'balanced', delivery: d.delivery ?? 'self', plan: d.plan ?? [], warnings: d.warnings ?? [],
    skill: k.skillId, level: k.level, stage: k.stage, img: k.img, updated: fmt(k.updatedAt), updatedAt: k.updatedAt,
    sources: srcs, sourceIds: k.sourceIds, artifacts: arts.map(artifactMeta), job: d.job ?? null, theme: d.theme ?? null,
  }
}

/** Giao diện khóa (màu nhấn, font) lưu trong details */
export const themeOf = (k: { details: unknown }): Json | null => ((k.details as Json)?.theme as Json) ?? null

/** Tình trạng review của khóa: số người được mời theo từng trạng thái, số góp ý chưa xử lý */
export type ReviewSummary = { total: number; pending: number; approved: number; changes: number; open: number }
export async function reviewSummaries(orgId: string): Promise<Map<string, ReviewSummary>> {
  const [rs, cs] = await Promise.all([
    db.select({ kitId: schema.kitReviews.kitId, status: schema.kitReviews.status }).from(schema.kitReviews).where(eq(schema.kitReviews.orgId, orgId)),
    db.select({ kitId: schema.reviewComments.kitId }).from(schema.reviewComments)
      .where(and(eq(schema.reviewComments.orgId, orgId), isNull(schema.reviewComments.resolvedAt), isNull(schema.reviewComments.parentId))),
  ])
  const m = new Map<string, ReviewSummary>()
  const of = (id: string): ReviewSummary => { if (!m.has(id)) m.set(id, { total: 0, pending: 0, approved: 0, changes: 0, open: 0 }); return m.get(id)! }
  for (const r of rs) { const x = of(r.kitId); x.total++; x[r.status]++ }
  for (const c of cs) of(c.kitId).open++
  return m
}

export async function listKits(orgId: string): Promise<Json[]> {
  const [kits, arts, reviews] = await Promise.all([
    db.select({ k: schema.kits, by: schema.users.name }).from(schema.kits).leftJoin(schema.users, eq(schema.users.id, schema.kits.createdBy)).where(eq(schema.kits.orgId, orgId)).orderBy(desc(schema.kits.updatedAt)),
    db.select().from(schema.artifacts).where(eq(schema.artifacts.orgId, orgId)).orderBy(schema.artifacts.createdAt),
    reviewSummaries(orgId),
  ])
  return kits.map(({ k, by }) => ({
    id: k.id, title: k.title, desc: k.goal, skill: k.skillId, level: k.level, stage: k.stage, img: k.img, createdBy: by ?? '',
    updated: fmt(k.updatedAt), updatedAt: k.updatedAt, artifacts: arts.filter((a) => a.kitId === k.id).map(artifactMeta), review: reviews.get(k.id) ?? null,
  }))
}

async function skillName(orgId: string, id: string | null): Promise<string> {
  if (!id) return 'chưa chọn'
  const [s] = await db.select().from(schema.skills).where(and(eq(schema.skills.id, id), eq(schema.skills.orgId, orgId)))
  return s?.name ?? id
}

export async function briefOf(k: Kit): Promise<KitBrief> {
  const d = k.details as Json
  return { title: k.title, goal: k.goal, audience: d.audience ?? '', goals: d.goals ?? [], takeaways: d.takeaways ?? [], metrics: d.metrics ?? [], skillName: await skillName(k.orgId, k.skillId), level: k.level ?? 1, practice: d.practice ?? 'balanced' }
}

export async function patchKit(id: string, set: Partial<Kit>, details?: Json): Promise<void> {
  const [k] = await db.select().from(schema.kits).where(eq(schema.kits.id, id))
  await db.update(schema.kits).set({ ...set, ...(details ? { details: { ...(k.details as Json), ...details } } : {}), updatedAt: new Date() }).where(eq(schema.kits.id, id))
}

/** Gộp kết quả tìm kiếm nhiều câu hỏi, bỏ trùng, giữ thứ tự liên quan */
async function gather(orgId: string, sourceIds: string[], queries: string[], perQuery = 4, max = 14): Promise<Hit[]> {
  if (!sourceIds.length || !queries.length) return []
  const vecs = await embed(orgId, queries)
  const lists = await Promise.all(vecs.map((v) => searchByVector(orgId, sourceIds, v, perQuery)))
  const seen = new Map<string, Hit>()
  // xen kẽ kết quả từng truy vấn để mỗi mục dàn ý đều có đoạn nguồn
  for (let i = 0; i < perQuery; i++) for (const l of lists) { const h = l[i]; if (h && !seen.has(h.id)) seen.set(h.id, h) }
  return [...seen.values()].slice(0, max)
}

// ---------- Job: chi tiết ----------
defineJob('kit.draft', async ({ job, report }) => {
  const k = await getKit(job.orgId, String(job.payload.kitId))
  const d = k.details as Json
  await report(15, 'Đọc tài liệu nguồn')
  const srcs = k.sourceIds.length ? await db.select().from(schema.sources).where(inArray(schema.sources.id, k.sourceIds)) : []
  const hits = await gather(k.orgId, k.sourceIds, [d.goalText ?? k.goal], 10, 10)
  const skills = await db.select({ id: schema.skills.id, name: schema.skills.name }).from(schema.skills).where(eq(schema.skills.orgId, k.orgId))
  await report(45, 'Viết mục tiêu, đối tượng và kế hoạch tài liệu')
  const r = await draftDetails(k.orgId, d.goalText ?? k.goal, skills, hits, srcs.map((s) => s.name), srcs.filter((s) => s.sensitive).map((s) => s.name))
  const skillOk = skills.some((s) => s.id === r.skillId)
  await patchKit(k.id, {
    title: r.title, goal: r.desc,
    skillId: k.skillId ?? (skillOk ? r.skillId : null),
    level: k.level ?? Math.min(3, Math.max(1, r.level)),
  }, {
    audience: r.audience, goals: r.goals, takeaways: r.takeaways, metrics: r.metrics, practice: r.practice,
    plan: ensureQr(r.plan).slice(0, 5), warnings: r.warnings, job: null,
  })
  return { kitId: k.id }
})

const ensureQr = (plan: PlanItem[]): PlanItem[] => plan.some((p) => p.type === 'qr') ? plan : [{ type: 'qr', title: 'Những điều cần biết', summary: 'Tài liệu nhanh tối đa 3 bài, kèm bài kiểm tra.' }, ...plan]

// ---------- Job: dàn ý ----------
defineJob('kit.outline', async ({ job, report }) => {
  const k = await getKit(job.orgId, String(job.payload.kitId))
  const brief = await briefOf(k)
  const plan = (k.details as Json).plan as PlanItem[]
  let done = 0
  await report(10, 'Lập dàn ý từng tài liệu')
  const out = await Promise.all(plan.map(async (p) => {
    if (p.outline || p.type === 'exam') return p
    const hits = await gather(k.orgId, k.sourceIds, [`${p.title}. ${p.summary}`, ...brief.goals.slice(0, 2)], 5, 10)
    const outline = await draftOutline(k.orgId, p.type, brief, p, hits)
    done++
    await report(10 + Math.round((85 * done) / plan.length), `Đã lập dàn ý: ${p.title}`)
    return { ...p, outline }
  }))
  // giữ các thay đổi người soạn làm trong lúc chờ (đọc lại kế hoạch mới nhất)
  const latest = ((await getKit(job.orgId, k.id)).details as Json).plan as PlanItem[]
  const merged = latest.map((p) => p.outline ? p : out.find((o) => o.title === p.title && o.type === p.type) ?? p)
  await patchKit(k.id, { stage: 'outline' }, { plan: merged, job: null })
  return { kitId: k.id }
})

// ---------- Chuyển bản nháp AI sang cấu trúc nội dung ----------
const srcRef = (code: string | null | undefined, hits: Hit[]): Json => {
  const m = code?.match(/S(\d+)/)
  const h = m ? hits[Number(m[1]) - 1] : undefined
  return h ? { src: `${h.sourceName} · ${h.section}`, srcRef: { sourceId: h.sourceId, chunkId: h.id, version: h.version } } : {}
}
const NEEDS_SRC = new Set(['heading', 'para', 'list', 'flash', 'accordion', 'tabs', 'timeline', 'sorting', 'table', 'code', 'process'])
const clean = (o: Json): Json => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined))

export function qrContent(r: QrDraft, kit: Kit, hits: Hit[], hasSources: boolean): Json {
  const lessons = r.lessons.slice(0, 3).map((l) => ({
    id: uid('l'), kind: 'lesson', title: l.title,
    blocks: [{ id: uid('b'), t: 'image', img: l.img, cap: l.title }, ...l.blocks.filter((b) => b.t !== 'image').map((b) => {
      const { accordion, timeline, src, ...rest } = b
      const ref = srcRef(src, hits)
      const items = b.t === 'accordion' || b.t === 'tabs' ? accordion : b.t === 'timeline' ? timeline : rest.items
      const block = clean({ ...rest, items, id: uid('b'), ...ref })
      if (block.t === 'kc') return { ...block, choices: block.choices ?? [], correct: Math.max(0, Math.min((block.choices?.length ?? 1) - 1, block.correct ?? 0)) }
      if (NEEDS_SRC.has(block.t) && hasSources && !ref.src) return { ...block, nosrc: true }
      return block
    })],
  }))
  const questions = r.questions.map((q) => clean({
    id: uid('q'), type: q.type, level: Math.min(3, Math.max(1, q.level)), approved: false, q: q.q,
    choices: q.choices ?? undefined, answer: q.answer, rubric: q.rubric, starter: q.starter,
    pairs: q.type === 'match' ? q.pairs : undefined, items: q.type === 'order' ? q.order : undefined, groups: q.type === 'cat' ? q.groups : undefined,
    tests: q.tests?.map((t) => ({ name: t.name, args: t.args, expected: t.expected })), ...srcRef(q.src, hits),
  }))
  return {
    lessons: [...lessons, { id: 'quiz', kind: 'quiz', title: 'Bài kiểm tra' }],
    quiz: { mode: 'practice', skill: kit.skillId, level: kit.level ?? 1, passScore: 80, attempts: 3, minutes: 20, proctor: false, pick: Math.min(10, questions.length), questions },
  }
}

export function deckContent(r: DeckDraft, hits: Hit[]): Json {
  return { slides: r.slides.map((s) => clean({ ...s, id: uid('s'), src: undefined, ...srcRef(s.src, hits) })) }
}

const CHARS_PER_SEC = 14
export function videoContent(r: DeckDraft, hits: Hit[]): Json {
  let t = 0
  const chapters: Json[] = [], transcript: Json[] = []
  const slides = r.slides.map((s) => {
    const at = t
    chapters.push({ t: at, title: s.title })
    for (const sentence of s.notes.split(/(?<=[.!?])\s+/).filter(Boolean)) { transcript.push({ t, x: sentence }); t += Math.max(3, Math.round(sentence.length / CHARS_PER_SEC)) }
    return clean({ ...s, id: uid('s'), t: at, src: undefined, ...srcRef(s.src, hits) })
  })
  return { ai: true, voice: 'Giọng đọc AI có sẵn (alloy)', slides, chapters, transcript, checkpoints: [], duration: t, render: { status: 'none' } }
}

export function scenarioContent(r: ScenarioDraft): Json {
  return {
    experience: 'photo', frame: 'full', character: r.character, learner: r.learner, intro: r.intro,
    scenes: r.scenes.map((s) => ({
      id: uid('sc'), title: s.title, goal: s.goal,
      cards: [{ id: uid('c'), kind: 'char', text: s.line }, { id: uid('c'), kind: 'decision', choices: s.choices }],
    })),
  }
}

const IMG_OF: Record<string, string> = { qr: 'office', deck: 'desk', scenario: 'person', video: 'video', guide: 'screen', exam: 'desk' }

export async function createArtifact(k: Kit, p: PlanItem, status: 'generating' | 'draft' = 'generating', content: Json = {}): Promise<Artifact> {
  const [a] = await db.insert(schema.artifacts).values({
    orgId: k.orgId, kitId: k.id, type: p.type as ArtifactType, title: p.title || 'Tài liệu mới', summary: p.summary ?? '', status, img: IMG_OF[p.type] ?? 'office', content: { ...content, plan: p },
  }).returning()
  return a
}

// ---------- Job: soạn một tài liệu ----------
defineJob('artifact.generate', async ({ job, report }) => {
  const [a] = await db.select().from(schema.artifacts).where(eq(schema.artifacts.id, String(job.payload.artifactId)))
  if (!a) return
  const k = await getKit(a.orgId, a.kitId)
  const brief = await briefOf(k)
  const p = (a.content as Json).plan as PlanItem
  const o = p.outline ?? {}
  try {
    await report(10, 'Tìm đoạn nguồn liên quan')
    let content: Json
    if (p.type === 'qr') {
      const secs = (o.sections ?? []) as { t: string; items: string[] }[]
      const hits = await gather(k.orgId, k.sourceIds, secs.length ? secs.map((s) => `${s.t}. ${s.items.join('. ')}`) : [p.title], 4, 16)
      await report(30, 'Viết bài học và câu hỏi')
      content = qrContent(await draftQr(k.orgId, brief, p, { sections: secs.length ? secs : [{ t: p.title, items: [] }] }, hits), k, hits, k.sourceIds.length > 0)
    } else if (p.type === 'deck' || p.type === 'video') {
      const titles = ((p.type === 'deck' ? o.slides : o.chapters) ?? [p.title]) as string[]
      const hits = await gather(k.orgId, k.sourceIds, titles, 3, 14)
      await report(30, p.type === 'deck' ? 'Viết slide và ghi chú' : 'Viết kịch bản video')
      const r = await draftDeck(k.orgId, brief, p, titles, hits, p.type === 'video')
      content = p.type === 'deck' ? deckContent(r, hits) : videoContent(r, hits)
    } else {
      const so = { character: o.character ?? 'Chị Lan · Trưởng nhóm', learner: o.learner ?? brief.audience, situation: o.situation ?? p.summary, goals: o.goals ?? [p.title] }
      const hits = await gather(k.orgId, k.sourceIds, [so.situation, ...so.goals], 3, 12)
      await report(30, 'Viết lời thoại và lựa chọn')
      content = scenarioContent(await draftScenario(k.orgId, brief, p, so, hits))
    }
    await db.update(schema.artifacts).set({ content: { ...content, plan: p }, status: a.publishedVersion ? 'published' : 'draft', updatedAt: new Date() }).where(eq(schema.artifacts.id, a.id))
    return { artifactId: a.id }
  } catch (e) {
    if (job.attempts >= 2) await db.update(schema.artifacts).set({ status: 'failed', updatedAt: new Date() }).where(eq(schema.artifacts.id, a.id))
    throw e
  }
})
