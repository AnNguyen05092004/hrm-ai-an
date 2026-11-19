// F02–F03: dựng video từ slide + giọng đọc AI (giọng có sẵn), chép lời và chia chương theo thời lượng thật.
// Mỗi slide là một đoạn được lưu theo hash nội dung: sửa slide hay lời đọc nào thì chỉ dựng lại đoạn đó.
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, writeFile, access, readdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db/client.js'
import { tts, isMock } from '../../lib/ai/index.js'
import { defineJob } from '../../lib/jobs.js'
import { filePath } from '../../lib/storage.js'

const run = promisify(execFile)
// tăng khi đổi cách vẽ slide để các đoạn đã lưu được dựng lại
const RENDER_VERSION = 2
type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
const W = 1280, H = 720
const esc = (s: string): string => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Ngắt dòng theo số ký tự gần đúng (font Arial) */
function wrap(text: string, max: number, lines = 3): string[] {
  const out: string[] = []
  let cur = ''
  for (const w of String(text ?? '').split(/\s+/)) {
    if ((cur + ' ' + w).trim().length > max) { if (cur) out.push(cur); cur = w } else cur = `${cur} ${w}`.trim()
    if (out.length === lines) break
  }
  if (cur && out.length < lines) out.push(cur)
  if (out.length === lines && text.length > out.join(' ').length) out[lines - 1] = `${out[lines - 1].replace(/\s+\S*$/, '')}…`
  return out
}
const tspans = (lines: string[], x: number, y: number, lh: number, size: number, weight = 400, fill = '#111'): string =>
  lines.map((l, i) => `<text x="${x}" y="${y + i * lh}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(l)}</text>`).join('')

// Định dạng người soạn đặt trên slide (SlideKit): st[phần] = { x, y (% khung), size (hệ số), color, b, i }, boxes[], bg
type St = { x?: number; y?: number; size?: number; color?: string; b?: boolean; i?: boolean }
const HEX = /^#[0-9a-f]{3,8}$/i
const color = (c: unknown): string | null => (typeof c === 'string' && HEX.test(c) ? c : null)
const px = W / 960 // slide trên web thiết kế theo bề ngang 960

/** Áp định dạng lên một nhóm chữ: màu, đậm/nghiêng, phóng to quanh góc trên trái (ax, ay), dời vị trí */
function restyle(frag: string, st: St | undefined, ax: number, ay: number): string {
  if (!st || !frag) return frag
  let f = frag
  const c = color(st.color)
  if (c) f = f.replace(/(<text\b[^>]*?) fill="[^"]*"/g, `$1 fill="${c}"`)
  if (typeof st.b === 'boolean') f = f.replace(/(<text\b[^>]*?) font-weight="[^"]*"/g, `$1 font-weight="${st.b ? 700 : 400}"`)
  if (st.i) f = f.replace(/<text\b/g, '<text font-style="italic"')
  const k = Number(st.size) > 0 ? Number(st.size) : 1
  const dx = ((Number(st.x) || 0) / 100) * W, dy = ((Number(st.y) || 0) / 100) * H
  if (k === 1 && !dx && !dy) return f
  return `<g transform="translate(${(ax + dx).toFixed(1)} ${(ay + dy).toFixed(1)}) scale(${k}) translate(${-ax} ${-ay})">${f}</g>`
}

function boxSvg(b: Json): string {
  const k = Number(b.size) > 0 ? Number(b.size) : 1
  const fs = 22 * k * px, lh = fs * 1.3
  const x = (Number(b.x) / 100) * W, y = (Number(b.y) / 100) * H, w = (Number(b.w) / 100) * W
  const per = Math.max(4, Math.floor(w / (fs * 0.5)))
  const lines = String(b.text ?? '').split('\n').flatMap((l) => (l.trim() ? wrap(l, per, 30) : ['']))
  const fill = color(b.fill), pad = fill ? 10 * px : 0
  const rect = fill ? `<rect x="${x}" y="${y}" width="${w}" height="${lines.length * lh + pad * 2}" rx="${6 * px}" fill="${fill}"/>` : ''
  let text = tspans(lines, x + pad, y + pad + fs, lh, fs, b.b ? 700 : 400, color(b.color) ?? '#262626')
  if (b.i) text = text.replace(/<text\b/g, '<text font-style="italic"')
  return rect + text
}

export function slideSvg(s: Json, n: number, total: number): string {
  const st = (k: string): St | undefined => s.st?.[k]
  const ky = s.layout === 'cover' ? 236 : 74
  const kicker = s.kicker ? restyle(tspans([String(s.kicker).toUpperCase()], s.layout === 'cover' ? 90 : 80, ky, 0, 18, 700, s.layout === 'cover' ? '#fdba74' : '#ff6119'), st('kicker'), 80, ky - 18) : ''
  const head = s.layout === 'cover' ? '' : restyle(tspans(wrap(s.title, 40, 2), 80, 120, 58, 48, 700), st('title'), 80, 80)
  let body = ''
  const items: string[] = (s.items ?? []).filter(Boolean)
  if (s.layout === 'cover') {
    const subY = 300 + wrap(s.title, 30, 3).length * 76 + 20
    body = `<rect width="${W}" height="${H}" fill="${color(s.bg) ?? '#1e293b'}"/>${restyle(tspans(wrap(s.title, 30, 3), 90, 300, 76, 64, 800, '#ffffff'), st('title'), 90, 250)}${s.sub ? restyle(tspans(wrap(s.sub, 60, 2), 90, subY, 40, 30, 400, '#e2e8f0'), st('sub'), 90, subY - 30) : ''}<rect x="90" y="${subY + (s.sub ? 70 : 10)}" width="86" height="7" fill="#ff6119"/>`
  } else if (s.layout === 'two' && s.cols) {
    body = (s.cols as string[][]).slice(0, 2).map((c, i) => `<rect x="${80 + i * 570}" y="230" width="540" height="400" rx="20" fill="#f4f4f5"/>${tspans(wrap(c[0], 26, 1), 110 + i * 570, 290, 0, 32, 700)}${c.slice(1, 5).map((x, j) => tspans(wrap(x, 34, 2), 110 + i * 570, 350 + j * 70, 34, 26)).join('')}`).join('')
  } else if (s.layout === 'table' && s.head) {
    const cols = s.head.length, cw = (W - 160) / cols
    body = `<rect x="80" y="230" width="${W - 160}" height="56" fill="#ff6119"/>${(s.head as string[]).map((h, i) => tspans(wrap(h, 24, 1), 100 + i * cw, 268, 0, 24, 700, '#fff')).join('')}${(s.rows ?? []).slice(0, 6).map((r: string[], j: number) => r.map((c, i) => tspans(wrap(c, Math.floor(cw / 13), 1), 100 + i * cw, 330 + j * 60, 0, 22)).join('')).join('')}`
  } else if (s.layout === 'stat' && s.stats) {
    body = (s.stats as string[][]).slice(0, 3).map((x, i) => `${tspans([x[0]], 100 + i * 380, 400, 0, 80, 800, '#ff6119')}${tspans(wrap(x[1], 24, 2), 100 + i * 380, 460, 32, 24)}`).join('')
  } else if (s.layout === 'quote') {
    body = `${tspans(wrap(`“${s.quote ?? ''}”`, 44, 4), 120, 300, 56, 40, 400)}${tspans([`— ${s.by ?? ''}`], 120, 560, 0, 26, 400, '#555')}`
  } else {
    body = items.slice(0, 5).map((x, i) => `${s.layout === 'steps' ? `<circle cx="104" cy="${262 + i * 86}" r="22" fill="#ff6119"/><text x="104" y="${271 + i * 86}" font-size="24" font-weight="700" fill="#fff" text-anchor="middle">${i + 1}</text>` : `<circle cx="100" cy="${258 + i * 86}" r="8" fill="#ff6119"/>`}${tspans(wrap(x, 54, 2), 145, 268 + i * 86, 34, 30)}`).join('')
  }
  if (s.layout !== 'cover') body = `<rect width="11" height="${H}" fill="#ff6119"/>${restyle(body, st('body'), 80, 230)}`
  const boxes = ((s.boxes ?? []) as Json[]).map(boxSvg).join('')
  const foot = `<text x="80" y="${H - 34}" font-size="18" fill="#888">Nội dung do AI tạo, đã được chuyên gia duyệt</text><text x="${W - 80}" y="${H - 34}" font-size="18" fill="#888" text-anchor="end">${n}/${total}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Arial, Helvetica, sans-serif"><rect width="${W}" height="${H}" fill="${color(s.bg) ?? '#fff'}"/>${body}${kicker}${head}${boxes}${foot}</svg>`
}

const pngOf = (svg: string): Buffer => new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'Arial' } }).render().asPng()

async function duration(file: string): Promise<number> {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
  return Number(stdout.trim()) || 0
}
const exists = (p: string): Promise<boolean> => access(p).then(() => true, () => false)

/** Dựng một đoạn: ảnh slide + lời đọc (không có TTS thì im lặng theo độ dài lời) */
async function segment(orgId: string, dir: string, s: Json, n: number, total: number): Promise<{ file: string; seconds: number; reused: boolean }> {
  const key = crypto.createHash('sha1').update(JSON.stringify({ ...s, id: undefined, t: undefined, n, total, v: RENDER_VERSION })).digest('hex').slice(0, 16)
  const file = path.join(dir, `seg-${key}.mp4`)
  if (await exists(file)) return { file, seconds: await duration(file), reused: true }
  const png = path.join(dir, `seg-${key}.png`), mp3 = path.join(dir, `seg-${key}.mp3`)
  await writeFile(png, pngOf(slideSvg(s, n, total)))
  const voice = s.notes?.trim() ? await tts(orgId, s.notes) : null
  if (voice) {
    await writeFile(mp3, voice)
    await run('ffmpeg', ['-y', '-loop', '1', '-i', png, '-i', mp3, '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-r', '10', '-c:a', 'aac', '-b:a', '128k', '-shortest', file])
  } else {
    const secs = Math.max(4, Math.round(String(s.notes ?? '').length / 14))
    await run('ffmpeg', ['-y', '-loop', '1', '-i', png, '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(secs), '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-r', '10', '-c:a', 'aac', '-shortest', file])
  }
  return { file, seconds: await duration(file), reused: false }
}

const vttTime = (t: number): string => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}` }

export async function renderVideo(artifactId: string, report: (p: number, m: string) => Promise<void>): Promise<Json> {
  const [a] = await db.select().from(schema.artifacts).where(eq(schema.artifacts.id, artifactId))
  const c = a.content as Json
  const slides: Json[] = c.slides ?? []
  if (!slides.length) throw new Error('Video chưa có slide để dựng')
  const dir = filePath(`videos/${a.id}`)
  await mkdir(dir, { recursive: true })
  const segs: { file: string; seconds: number; reused: boolean }[] = []
  for (const [i, s] of slides.entries()) {
    await report(5 + Math.round((80 * i) / slides.length), `Đang dựng đoạn ${i + 1}/${slides.length}${isMock() ? '' : ' (giọng đọc AI)'}`)
    segs.push(await segment(a.orgId, dir, s, i + 1, slides.length))
  }
  await report(90, 'Đang ghép video và chép lời')
  const list = path.join(dir, 'list.txt')
  await writeFile(list, segs.map((s) => `file '${path.basename(s.file)}'`).join('\n'))
  const name = `video-${Date.now()}.mp4`
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', path.join(dir, name)])

  // mốc thời gian thật: chương theo slide, lời thoại chia theo độ dài câu trong từng đoạn
  let t = 0
  const chapters: Json[] = [], transcript: Json[] = []
  const timed = slides.map((s, i) => {
    const at = Math.round(t)
    chapters.push({ t: at, title: s.title })
    const sentences: string[] = String(s.notes ?? '').split(/(?<=[.!?])\s+/).filter(Boolean)
    const total = sentences.reduce((n, x) => n + x.length, 0) || 1
    let off = 0
    for (const x of sentences) { transcript.push({ t: Math.round(t + off), x }); off += (segs[i].seconds * x.length) / total }
    t += segs[i].seconds
    return { ...s, t: at }
  })
  const vttName = name.replace('.mp4', '.vtt')
  const cues = transcript.map((x, i) => `${vttTime(x.t)} --> ${vttTime(transcript[i + 1]?.t ?? t)}\n${x.x}`).join('\n\n')
  await writeFile(path.join(dir, vttName), `WEBVTT\n\n${cues}\n`)
  // giữ 3 bản dựng gần nhất (bản đã xuất bản có thể đang trỏ tới bản cũ), giữ các đoạn để dùng lại
  const olds = (await readdir(dir)).filter((f) => /^video-\d+\.mp4$/.test(f)).sort().reverse().slice(3)
  for (const f of olds) for (const x of [f, f.replace('.mp4', '.vtt')]) await unlink(path.join(dir, x)).catch(() => {})
  const reused = segs.filter((s) => s.reused).length
  const render = { status: 'done', url: `/api/media/${a.id}/${name}`, vtt: `/api/media/${a.id}/${vttName}`, at: new Date().toISOString(), reused, total: segs.length }
  const [fresh] = await db.select({ content: schema.artifacts.content }).from(schema.artifacts).where(eq(schema.artifacts.id, a.id))
  await db.update(schema.artifacts).set({ content: { ...(fresh.content as Json), slides: timed, chapters, transcript, duration: Math.round(t), render }, updatedAt: new Date() }).where(eq(schema.artifacts.id, a.id))
  return { reused, total: segs.length, duration: Math.round(t) }
}

defineJob('video.render', async ({ job, report }) => {
  const id = String(job.payload.artifactId)
  try {
    return await renderVideo(id, report)
  } catch (e) {
    const [a] = await db.select({ content: schema.artifacts.content }).from(schema.artifacts).where(eq(schema.artifacts.id, id))
    if (a) await db.update(schema.artifacts).set({ content: { ...(a.content as Json), render: { status: 'failed', error: e instanceof Error ? e.message.slice(0, 300) : 'Lỗi dựng video' } } }).where(eq(schema.artifacts.id, id))
    throw e
  }
})
