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
import { presetJpeg } from '../../lib/preset-images.js'
import { loadImage } from '../images/routes.js'

const run = promisify(execFile)
// tăng khi đổi cách vẽ slide để các đoạn đã lưu được dựng lại
const RENDER_VERSION = 3
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

// Định dạng người soạn đặt trên slide (xem đầu SlideKit.jsx): st[phần] = { x, y (% khung), size (hệ số), color, b, i, u },
// bg, bgImg + bgTone, boxes[] gồm hộp chữ, ảnh (kind: 'img') và hình khối (kind: 'shape')
type St = { x?: number; y?: number; size?: number; color?: string; b?: boolean; i?: boolean; u?: boolean; font?: string }
// font chọn trên slide (cùng khóa với slideModel.js); máy chủ chưa cài font Google thì resvg dùng font dự phòng kế tiếp
const FONT_STACK: Record<string, string> = {
  be: "'Be Vietnam Pro', Arial, sans-serif", inter: 'Inter, Arial, sans-serif', roboto: 'Roboto, Arial, sans-serif',
  montserrat: 'Montserrat, Arial, sans-serif', nunito: "Nunito, 'Arial Rounded MT Bold', Arial, sans-serif", oswald: "Oswald, 'Arial Narrow', Arial, sans-serif",
  merri: 'Merriweather, Georgia, serif', lora: 'Lora, Georgia, serif', playfair: "'Playfair Display', Georgia, serif",
  mono: "'Roboto Mono', 'Courier New', monospace", script: "'Dancing Script', 'Snell Roundhand', 'Brush Script MT', Georgia, cursive",
}
const fontOf = (key: unknown): string | undefined => (typeof key === 'string' && Object.hasOwn(FONT_STACK, key) ? FONT_STACK[key] : undefined)
const withFont = (f: string, key: unknown): string => { const ff = fontOf(key); return ff ? f.replace(/<text\b/g, `<text font-family="${ff}"`) : f }
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
  if (st.u) f = f.replace(/<text\b/g, '<text text-decoration="underline"')
  f = withFont(f, st.font)
  const k = Number(st.size) > 0 ? Number(st.size) : 1
  const dx = ((Number(st.x) || 0) / 100) * W, dy = ((Number(st.y) || 0) / 100) * H
  if (k === 1 && !dx && !dy) return f
  return `<g transform="translate(${(ax + dx).toFixed(1)} ${(ay + dy).toFixed(1)}) scale(${k}) translate(${-ax} ${-ay})">${f}</g>`
}

/** Hộp chữ; trả cả chiều cao để xoay quanh tâm */
function textBoxSvg(b: Json): { svg: string; h: number } {
  const k = Number(b.size) > 0 ? Number(b.size) : 1
  const fs = 22 * k * px, lh = fs * 1.3
  const x = (Number(b.x) / 100) * W, y = (Number(b.y) / 100) * H, w = (Number(b.w) / 100) * W
  const per = Math.max(4, Math.floor(w / (fs * 0.5)))
  const lines = String(b.text ?? '').split('\n').flatMap((l) => (l.trim() ? wrap(l, per, 30) : ['']))
  const fill = color(b.fill), pad = fill ? 10 * px : 0
  const rect = fill ? `<rect x="${x}" y="${y}" width="${w}" height="${lines.length * lh + pad * 2}" rx="${6 * px}" fill="${fill}"/>` : ''
  let text = tspans(lines, x + pad, y + pad + fs, lh, fs, b.b ? 700 : 400, color(b.color) ?? '#262626')
  if (b.i) text = text.replace(/<text\b/g, '<text font-style="italic"')
  if (b.u) text = text.replace(/<text\b/g, '<text text-decoration="underline"')
  return { svg: rect + withFont(text, b.font), h: lines.length * lh + pad * 2 }
}

/** Hình khối: chữ nhật, bo góc, tròn (nét vẽ nằm trong khung như trên web); đường thẳng, mũi tên nằm giữa khung cao 28 */
function shapeSvg(b: Json, x: number, y: number, w: number, h: number): string {
  const sw = Math.max(1, Number(b.sw) || 3) * px
  if (b.shape === 'line' || b.shape === 'arrow') {
    const c = color(b.stroke) ?? color(b.fill) ?? '#111827', cy = y + 14 * px
    const hw = b.shape === 'arrow' ? ((Number(b.sw) || 3) * 2.6 + 9) * px : 0, hh = ((Number(b.sw) || 3) * 1.6 + 5) * px
    const head = hw ? `<polygon points="${x + w - hw},${cy - hh} ${x + w},${cy} ${x + w - hw},${cy + hh}" fill="${c}"/>` : ''
    return `<line x1="${x}" y1="${cy}" x2="${x + w - hw * 0.9}" y2="${cy}" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>${head}`
  }
  const fill = color(b.fill) ?? 'none', stroke = color(b.stroke)
  const st = stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : '', i = stroke ? sw / 2 : 0
  if (b.shape === 'circle') return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${Math.max(0, w / 2 - i)}" ry="${Math.max(0, h / 2 - i)}" fill="${fill}"${st}/>`
  return `<rect x="${x + i}" y="${y + i}" width="${Math.max(0, w - 2 * i)}" height="${Math.max(0, h - 2 * i)}" rx="${b.shape === 'round' ? 18 * px : 0}" fill="${fill}"${st}/>`
}

/** Phần tử đặt tự do (hộp chữ, ảnh, hình) theo thứ tự lớp; pics: ảnh đã tải dạng data URI theo id phần tử */
function elSvg(b: Json, idx: number, pics: Record<string, string>): string {
  if (!b || typeof b !== 'object') return ''
  const x = (Number(b.x) / 100) * W, y = (Number(b.y) / 100) * H, w = (Number(b.w) / 100) * W, h = ((Number(b.h) || 20) / 100) * H
  let out = '', cy = y + h / 2
  if (b.kind === 'img') {
    const pic = pics[`el:${b.id}`]
    if (!pic) return ''
    out = `<defs><clipPath id="el${idx}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${b.r ? 14 * px : 0}"/></clipPath></defs><image href="${pic}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#el${idx})"/>`
  } else if (b.kind === 'shape') {
    out = shapeSvg(b, x, y, w, h)
    if (b.shape === 'line' || b.shape === 'arrow') cy = y + 14 * px
  } else { const t = textBoxSvg(b); out = t.svg; cy = y + t.h / 2 }
  const rot = Number(b.rot)
  if (Number.isFinite(rot) && rot) out = `<g transform="rotate(${Math.max(-360, Math.min(360, rot))} ${(x + w / 2).toFixed(1)} ${cy.toFixed(1)})">${out}</g>`
  const op = Number(b.op)
  return op > 0 && op < 1 ? `<g opacity="${op}">${out}</g>` : out
}

const TONE_FILL: Record<string, string> = { light: '<rect width="1280" height="720" fill="#ffffff" fill-opacity="0.78"/>', dark: '<rect width="1280" height="720" fill="#0f172a" fill-opacity="0.6"/>', none: '' }
/** Phủ tối: chữ mặc định chuyển sang sáng (chữ người soạn đã chọn màu giữ nguyên vì restyle chạy sau) */
const onDark = (f: string): string => f.replace(/fill="#111"/g, 'fill="#f8fafc"').replace(/fill="#555"/g, 'fill="#cbd5e1"')

export function slideSvg(s: Json, n: number, total: number, accent = '#ff6119', pic: string | null = null, pics: Record<string, string> = {}): string {
  return slideSvgRaw(s, n, total, pic, pics).replaceAll('#ff6119', color(accent) ?? '#ff6119')
}

function slideSvgRaw(s: Json, n: number, total: number, pic: string | null, pics: Record<string, string>): string {
  const st = (k: string): St | undefined => s.st?.[k]
  const dark = s.layout !== 'cover' && !!pics.bg && s.bgTone === 'dark'
  const tone = (f: string, keep = false): string => (dark && !keep ? onDark(f) : f)
  const ky = s.layout === 'cover' ? 236 : 74
  const kicker = s.kicker ? restyle(tone(tspans([String(s.kicker).toUpperCase()], s.layout === 'cover' ? 90 : 80, ky, 0, 18, 700, s.layout === 'cover' ? '#e2e8f0' : '#ff6119')), st('kicker'), 80, ky - 18) : ''
  const head = s.layout === 'cover' ? '' : restyle(tone(tspans(wrap(s.title, 40, 2), 80, 120, 58, 48, 700)), st('title'), 80, 80)
  let body = ''
  const items: string[] = (s.items ?? []).filter(Boolean)
  if (s.layout === 'cover') {
    const subY = 300 + wrap(s.title, 30, 3).length * 76 + 20
    const back = pic && !color(s.bg)
      ? `<image href="${pic}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/><defs><linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#020617" stop-opacity=".92"/><stop offset=".55" stop-color="#0f172a" stop-opacity=".6"/><stop offset="1" stop-color="#0f172a" stop-opacity=".1"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#shade)"/>`
      : `<rect width="${W}" height="${H}" fill="${color(s.bg) ?? '#1e293b'}"/>`
    body = `${back}${restyle(tspans(wrap(s.title, 30, 3), 90, 300, 76, 64, 800, '#ffffff'), st('title'), 90, 250)}${s.sub ? restyle(tspans(wrap(s.sub, 60, 2), 90, subY, 40, 30, 400, '#e2e8f0'), st('sub'), 90, subY - 30) : ''}<rect x="90" y="${subY + (s.sub ? 70 : 10)}" width="86" height="7" fill="#ff6119"/>`
  } else if (s.layout === 'two' && s.cols) {
    body = (s.cols as string[][]).slice(0, 2).map((c, i) => `<rect x="${80 + i * 570}" y="230" width="540" height="400" rx="20" fill="#f4f4f5"/>${tspans(wrap(c[0], 26, 1), 110 + i * 570, 290, 0, 32, 700)}${c.slice(1, 5).map((x, j) => tspans(wrap(x, 34, 2), 110 + i * 570, 350 + j * 70, 34, 26)).join('')}`).join('')
  } else if (s.layout === 'table' && s.head) {
    const cols = s.head.length, cw = (W - 160) / cols
    body = `<rect x="80" y="230" width="${W - 160}" height="56" fill="#ff6119"/>${(s.head as string[]).map((h, i) => tspans(wrap(h, 24, 1), 100 + i * cw, 268, 0, 24, 700, '#fff')).join('')}${(s.rows ?? []).slice(0, 6).map((r: string[], j: number) => r.map((c, i) => tspans(wrap(c, Math.floor(cw / 13), 1), 100 + i * cw, 330 + j * 60, 0, 22)).join('')).join('')}`
  } else if (s.layout === 'stat' && s.stats) {
    body = (s.stats as string[][]).slice(0, 3).map((x, i) => `${tspans([x[0]], 100 + i * 380, 400, 0, 80, 800, '#ff6119')}${tspans(wrap(x[1], 24, 2), 100 + i * 380, 460, 32, 24)}`).join('')
  } else if (s.layout === 'quote') {
    body = `${tspans(wrap(`“${s.quote ?? ''}”`, 44, 4), 120, 300, 56, 40, 400)}${tspans([`— ${s.by ?? ''}`], 120, 560, 0, 26, 400, '#555')}`
  } else if (s.layout === 'image' && pic) {
    body = `<defs><clipPath id="pic"><rect x="700" y="220" width="500" height="340" rx="14"/></clipPath></defs><image href="${pic}" x="700" y="220" width="500" height="340" preserveAspectRatio="xMidYMid slice" clip-path="url(#pic)"/>${items.slice(0, 5).map((x, i) => `<circle cx="100" cy="${258 + i * 86}" r="8" fill="#ff6119"/>${tspans(wrap(x, 30, 2), 125, 268 + i * 86, 34, 28)}`).join('')}`
  } else {
    body = items.slice(0, 5).map((x, i) => `${s.layout === 'steps' ? `<circle cx="104" cy="${262 + i * 86}" r="22" fill="#ff6119"/><text x="104" y="${271 + i * 86}" font-size="24" font-weight="700" fill="#fff" text-anchor="middle">${i + 1}</text>` : `<circle cx="100" cy="${258 + i * 86}" r="8" fill="#ff6119"/>`}${tspans(wrap(x, 54, 2), 145, 268 + i * 86, 34, 30)}`).join('')
  }
  // nền ảnh của slide thường; cột và bảng có nền sáng riêng nên giữ chữ tối
  const back = s.layout !== 'cover' && pics.bg ? `<image href="${pics.bg}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>${TONE_FILL[s.bgTone ?? 'light'] ?? TONE_FILL.light}` : ''
  if (s.layout !== 'cover') body = `${back}<rect width="11" height="${H}" fill="#ff6119"/>${restyle(tone(body, ['two', 'table'].includes(s.layout)), st('body'), 80, 230)}`
  const boxes = ((s.boxes ?? []) as Json[]).map((b, i) => elSvg(b, i, pics)).join('')
  const foot = `<text x="80" y="${H - 34}" font-size="18" fill="#888">Nội dung do AI tạo, đã được chuyên gia duyệt</text><text x="${W - 80}" y="${H - 34}" font-size="18" fill="#888" text-anchor="end">${n}/${total}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${fontOf(s.font) ?? 'Arial, Helvetica, sans-serif'}"><rect width="${W}" height="${H}" fill="${color(s.bg) ?? '#fff'}"/>${body}${kicker}${head}${boxes}${foot}</svg>`
}

const pngOf = (svg: string): Buffer => new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'Arial' } }).render().asPng()

async function duration(file: string): Promise<number> {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
  return Number(stdout.trim()) || 0
}
const exists = (p: string): Promise<boolean> => access(p).then(() => true, () => false)

/** Dựng một đoạn: ảnh slide + lời đọc (không có TTS thì im lặng theo độ dài lời) */
async function segment(orgId: string, dir: string, s: Json, n: number, total: number, accent: string, pic: string | null, pics: Record<string, string>): Promise<{ file: string; seconds: number; reused: boolean }> {
  const key = crypto.createHash('sha1').update(JSON.stringify({ ...s, id: undefined, t: undefined, n, total, accent, v: RENDER_VERSION })).digest('hex').slice(0, 16)
  const file = path.join(dir, `seg-${key}.mp4`)
  if (await exists(file)) return { file, seconds: await duration(file), reused: true }
  const png = path.join(dir, `seg-${key}.png`), mp3 = path.join(dir, `seg-${key}.mp3`)
  await writeFile(png, pngOf(slideSvg(s, n, total, accent, pic, pics)))
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

/** Ảnh của slide dạng data URI: ảnh tải lên/AI tạo đọc từ kho, ảnh có sẵn tải một lần rồi lưu đệm */
async function picture(orgId: string, img: unknown): Promise<string | null> {
  if (typeof img !== 'string' || !img) return null
  const own = /^\/api\/images\/([\w-]+)$/.exec(img)
  if (own) {
    const f = await loadImage(orgId, own[1])
    return f ? `data:${f.mime};base64,${f.data.toString('base64')}` : null
  }
  const jpg = await presetJpeg(img)
  return jpg ? `data:image/jpeg;base64,${jpg.toString('base64')}` : null // không tải được ảnh thì slide vẫn dựng, chỉ thiếu ảnh
}

/** Ảnh nền và ảnh chèn của slide, tải trước khi dựng */
async function slidePictures(orgId: string, s: Json): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (s.layout !== 'cover' && s.bgImg) { const p = await picture(orgId, s.bgImg); if (p) out.bg = p }
  for (const b of (s.boxes ?? []) as Json[]) {
    if (b?.kind !== 'img') continue
    const p = await picture(orgId, b.img || 'desk')
    if (p) out[`el:${b.id}`] = p
  }
  return out
}

const vttTime = (t: number): string => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}` }

export async function renderVideo(artifactId: string, report: (p: number, m: string) => Promise<void>): Promise<Json> {
  const [a] = await db.select().from(schema.artifacts).where(eq(schema.artifacts.id, artifactId))
  const c = a.content as Json
  const slides: Json[] = c.slides ?? []
  const [k] = await db.select({ details: schema.kits.details }).from(schema.kits).where(eq(schema.kits.id, a.kitId))
  const accent = String(((k?.details as Json)?.theme as Json)?.accent ?? '#ff6119')
  if (!slides.length) throw new Error('Video chưa có slide để dựng')
  const dir = filePath(`videos/${a.id}`)
  await mkdir(dir, { recursive: true })
  const segs: { file: string; seconds: number; reused: boolean }[] = []
  for (const [i, s] of slides.entries()) {
    await report(5 + Math.round((80 * i) / slides.length), `Đang dựng đoạn ${i + 1}/${slides.length}${isMock() ? '' : ' (giọng đọc AI)'}`)
    segs.push(await segment(a.orgId, dir, s, i + 1, slides.length, accent, s.layout === 'cover' || s.layout === 'image' ? await picture(a.orgId, s.img) : null, await slidePictures(a.orgId, s)))
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
