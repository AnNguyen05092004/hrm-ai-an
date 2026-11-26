// Xuất khóa học thành gói SCORM 1.2 để đưa lên LMS khác của công ty (Moodle, SAP SuccessFactors, Cornerstone…).
// Gói gồm: trình học chạy độc lập (dựng từ giao diện học của LMS này), dữ liệu bản đã xuất bản, ảnh, video.
// LMS nhận gói ghi được: đã hoàn thành, điểm bài luyện tập, tiến độ học dở (cmi.suspend_data).
// Đề kiểm tra chính thức không đưa vào gói: đáp án sẽ nằm phía trình duyệt, không giữ được tính bảo mật đề.
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { zipSync, strToU8 } from 'fflate'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { db, schema } from '../../db/client.js'
import { me } from '../../lib/auth.js'
import { AppError, badRequest } from '../../lib/errors.js'
import { audit } from '../../lib/audit.js'
import { getFile } from '../../lib/storage.js'
import { PRESET_IMAGES, presetJpeg } from '../../lib/preset-images.js'
import { learnerView, publishedContent } from '../artifacts/view.js'
import { loadImage } from '../images/routes.js'
import { getKit, themeOf } from './service.js'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
const ORDER = ['qr', 'deck', 'scenario', 'video', 'guide']
const AUTO = new Set(['mc', 'mr', 'fill', 'match', 'order', 'cat'])
const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }

const playerDir = (): string => process.env.SCORM_PLAYER_DIR ?? path.resolve(process.cwd(), '../web/dist-scorm')
const xml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const slugify = (s: string): string => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60) || 'khoa-hoc'

/** Bài luyện tập trong Tài liệu nhanh: chỉ giữ câu chấm tự động được, không đưa đề thi chính thức vào gói */
function offlineQuiz(quiz: Json | undefined): Json | null {
  if (!quiz || quiz.mode !== 'practice') return null
  const questions = (quiz.questions ?? []).filter((q: Json) => q.approved && AUTO.has(q.type))
    .map((q: Json) => ({ id: q.id, type: q.type, q: q.q, choices: q.choices, answer: q.answer, pairs: q.pairs, items: q.items, groups: q.groups }))
  return questions.length ? { passScore: quiz.passScore ?? 80, questions } : null
}

/** Vì sao bài kiểm tra trong Tài liệu nhanh không vào gói: nói đúng nguyên nhân để người soạn biết cần làm gì */
export function quizSkipReason(quiz: Json): string {
  if (quiz.mode !== 'practice') return 'Bài thi chính thức chỉ làm trên LMS này'
  const approved = (quiz.questions ?? []).filter((q: Json) => q.approved)
  if (!approved.length) return 'Chưa duyệt câu hỏi nào. Duyệt câu trong trình soạn rồi xuất bản lại'
  return 'Các câu đã duyệt đều là tự luận hoặc bài code, cần người hoặc máy chủ chấm'
}

/** Duyệt toàn bộ cây nội dung, thay đường dẫn ảnh/video của máy chủ bằng tệp trong gói */
function rewrite(x: unknown, map: (s: string) => string): unknown {
  if (typeof x === 'string') return map(x)
  if (Array.isArray(x)) return x.map((y) => rewrite(y, map))
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, rewrite(v, map)]))
  return x
}

export async function buildScorm(orgId: string, kitId: string): Promise<{ name: string; zip: Uint8Array; items: number; skipped: { title: string; reason: string }[] }> {
  const k = await getKit(orgId, kitId)
  let player: Record<string, Uint8Array>
  try {
    const dir = playerDir()
    const files = await readdir(dir, { recursive: true, withFileTypes: true })
    player = Object.fromEntries(await Promise.all(files.filter((f) => f.isFile()).map(async (f) => {
      const full = path.join(f.parentPath, f.name)
      return [path.relative(dir, full).split(path.sep).join('/').replace(/^scorm\.html$/, 'index.html'), new Uint8Array(await readFile(full))] as const
    })))
    if (!player['index.html']) throw new Error('thiếu index.html')
  } catch {
    throw new AppError(503, 'player_missing', 'Chưa build trình học cho gói SCORM. Chạy: npm run build:scorm -w apps/web')
  }
  const arts = (await db.select().from(schema.artifacts).where(and(eq(schema.artifacts.kitId, k.id), eq(schema.artifacts.orgId, orgId)))).filter((a) => a.publishedVersion)
  const skipped = arts.filter((a) => a.type === 'exam').map((a) => ({ title: a.title, reason: 'Đề kiểm tra chính thức chỉ làm trên LMS này để giữ bảo mật đề và giám sát' }))
  const learn = arts.filter((a) => a.type !== 'exam').sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type) || a.createdAt.getTime() - b.createdAt.getTime())
  if (!learn.length) throw badRequest('Khóa chưa có tài liệu học nào được xuất bản')

  const media: Record<string, Uint8Array> = {}
  const presets = new Set<string>()
  const ownImages = new Set<string>()
  const items: Json[] = []
  for (const a of learn) {
    const { content, title, summary, version } = await publishedContent(a)
    const quiz = offlineQuiz(content.quiz)
    if (a.type === 'qr' && content.quiz && !quiz) skipped.push({ title: `Bài kiểm tra trong "${title}"`, reason: quizSkipReason(content.quiz) })
    const view = learnerView(content)
    if (a.type === 'qr' && !quiz) view.lessons = (view.lessons ?? []).filter((l: Json) => l.kind !== 'quiz')
    const raw = { id: a.id, type: a.type, img: a.img, kitId: k.id, kitTitle: k.title, title, summary, version, draft: false, offline: true, ...view, offlineQuiz: quiz, progress: { done: [], percent: 0 } }
    // tệp video đã dựng của tài liệu này
    const vids = new Set<string>()
    const mapped = rewrite(raw, (s) => {
      const img = /^\/api\/images\/([\w-]+)$/.exec(s)
      if (img) { ownImages.add(img[1]); return `media/img-${img[1]}` }
      const vid = /^\/api\/media\/([\w-]+)\/(video-\d+\.(?:mp4|vtt))$/.exec(s)
      if (vid && vid[1] === a.id) { vids.add(vid[2]); return `media/${a.id}-${vid[2]}` }
      return s
    }) as Json
    for (const f of vids) media[`media/${a.id}-${f}`] = new Uint8Array(await getFile(`videos/${a.id}/${f}`))
    JSON.stringify(mapped, (key, v) => { if ((key === 'img' || key === 'bgImg') && typeof v === 'string' && PRESET_IMAGES[v]) presets.add(v); return v })
    items.push(mapped)
  }
  if (PRESET_IMAGES[k.img]) presets.add(k.img)
  // ảnh của công ty: giữ đuôi tệp theo định dạng thật
  const ownExt: Record<string, string> = {}
  for (const id of ownImages) {
    const f = await loadImage(orgId, id)
    if (f) { ownExt[id] = EXT[f.mime] ?? 'png'; media[`media/img-${id}.${ownExt[id]}`] = new Uint8Array(f.data) }
  }
  const presetFiles: Record<string, string> = {}
  for (const key of presets) {
    const jpg = await presetJpeg(key)
    if (jpg) { media[`media/preset-${key}.jpg`] = new Uint8Array(jpg); presetFiles[key] = `media/preset-${key}.jpg` }
  }
  const course = {
    version: 1, exportedAt: new Date().toISOString(),
    course: { id: k.id, title: k.title, desc: k.goal, img: k.img, theme: themeOf(k) },
    items: rewrite(items, (s) => { const m = /^media\/img-([\w-]+)$/.exec(s); return m ? (ownExt[m[1]] ? `media/img-${m[1]}.${ownExt[m[1]]}` : '') : s }),
    presets: presetFiles, skipped,
  }
  const files: Record<string, Uint8Array> = { ...player, ...media, 'course.js': strToU8(`window.COURSE = ${JSON.stringify(course).replace(/</g, '\\u003c')};\n`) }
  const mastery = Math.max(...items.map((x) => Number(x.offlineQuiz?.passScore ?? 0)), 0)
  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="lms-${k.id}" version="1" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="org-1">
    <organization identifier="org-1">
      <title>${xml(k.title)}</title>
      <item identifier="item-1" identifierref="res-1" isvisible="true">
        <title>${xml(k.title)}</title>${mastery ? `\n        <adlcp:masteryscore>${mastery}</adlcp:masteryscore>` : ''}
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
${Object.keys(files).sort().map((f) => `      <file href="${xml(f)}"/>`).join('\n')}
    </resource>
  </resources>
</manifest>
`
  files['imsmanifest.xml'] = strToU8(manifest)
  return { name: `${slugify(k.title)}-scorm12.zip`, zip: zipSync(files, { level: 6 }), items: items.length, skipped }
}

export const scormRoutes: FastifyPluginAsyncZod = async (app) => {
  // Xem trước nội dung gói (tài liệu nào được đưa vào, phần nào bỏ ra và vì sao)
  app.get('/:id/export/scorm/info', { schema: { params: z.object({ id: z.string() }) } }, async (req) => {
    const u = me(req)
    const k = await getKit(u.orgId, req.params.id)
    const arts = (await db.select().from(schema.artifacts).where(eq(schema.artifacts.kitId, k.id)))
    // đề kiểm tra xuất riêng (QTI 2.1 kèm đáp án) để LMS công ty tự quản lý và chấm
    const exams = await Promise.all(arts.filter((a) => a.type === 'exam' && a.publishedVersion).map(async (a) => {
      const qs = (((await publishedContent(a)).content.quiz?.questions ?? []) as Json[]).filter((q) => q.approved)
      return { id: a.id, title: a.title, questions: qs.length, manual: qs.filter((q) => q.type === 'essay' || q.type === 'code').length }
    }))
    return {
      exams,
      included: arts.filter((a) => a.publishedVersion && a.type !== 'exam').map((a) => ({ id: a.id, type: a.type, title: a.title })),
      excluded: arts.filter((a) => !a.publishedVersion || a.type === 'exam').map((a) => ({ id: a.id, type: a.type, title: a.title, reason: !a.publishedVersion ? 'Chưa xuất bản' : 'Không vào gói SCORM để giữ bảo mật đề. Thi trên LMS này, hoặc tải riêng đề kèm đáp án ở mục dưới để LMS công ty tự chấm' })),
    }
  })

  app.get('/:id/export/scorm', { schema: { params: z.object({ id: z.string() }) } }, async (req, reply) => {
    const u = me(req)
    const r = await buildScorm(u.orgId, req.params.id)
    await audit(u, 'kit.export_scorm', req.params.id, { items: r.items, size: r.zip.length })
    return reply.type('application/zip').header('content-disposition', `attachment; filename="${r.name}"; filename*=UTF-8''${encodeURIComponent(r.name)}`).send(Buffer.from(r.zip))
  })
}
