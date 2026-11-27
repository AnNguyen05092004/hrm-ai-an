// API nhận gói của LMS công ty (bản demo): Studio gửi gói SCORM / đề QTI qua đây, người quản trị LMS xem rồi nhập.
//   POST   /lms-api/packages               nhận tệp .zip (Bearer token, Idempotency-Key chống trùng)
//   GET    /lms-api/packages               danh sách gói đã nhận (màn quản trị cùng nguồn)
//   GET    /lms-api/packages/:id/file      tải tệp gói
//   POST   /lms-api/packages/:id/imported  đánh dấu đã nhập vào cổng đào tạo
// Gói lưu ở apps/company-lms/.inbox (đổi bằng LMS_INBOX_DIR). Token đọc từ LMS_API_TOKEN (lms/.env), giống bên Studio.
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const INBOX = process.env.LMS_INBOX_DIR ? path.resolve(process.env.LMS_INBOX_DIR) : path.join(here, '.inbox')
const INDEX = path.join(INBOX, 'index.json')
const MAX_BYTES = 200 * 1024 * 1024

function envToken() {
  if (process.env.LMS_API_TOKEN) return process.env.LMS_API_TOKEN
  const file = path.resolve(here, '../../.env')
  if (!existsSync(file)) return ''
  const line = readFileSync(file, 'utf8').split('\n').find((l) => l.startsWith('LMS_API_TOKEN='))
  return line ? line.slice('LMS_API_TOKEN='.length).trim() : ''
}

const load = () => { try { return JSON.parse(readFileSync(INDEX, 'utf8')) } catch { return [] } }
const save = (list) => { mkdirSync(INBOX, { recursive: true }); writeFileSync(INDEX, JSON.stringify(list, null, 2)) }
const send = (res, status, body) => { res.statusCode = status; res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)) }
const fail = (res, status, message) => send(res, status, { error: { message } })
const sameToken = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

function readBody(req) {
  return new Promise((resolve, reject) => {
    const parts = []
    let size = 0
    req.on('data', (c) => { size += c.length; if (size > MAX_BYTES) { reject(new Error('too_large')); req.destroy() } else parts.push(c) })
    req.on('end', () => resolve(Buffer.concat(parts)))
    req.on('error', reject)
  })
}

async function receive(req, res) {
  const token = envToken()
  const auth = req.headers.authorization ?? ''
  if (!token || !auth.startsWith('Bearer ') || !sameToken(auth.slice(7), token)) return fail(res, 401, 'Sai hoặc thiếu token API')
  const kind = req.headers['x-package-kind']
  if (kind !== 'scorm' && kind !== 'qti') return fail(res, 400, 'X-Package-Kind phải là scorm hoặc qti')
  const key = String(req.headers['idempotency-key'] ?? '').slice(0, 100)
  const list = load()
  const dup = key && list.find((p) => p.key === key)
  if (dup) return send(res, 200, { id: dup.id, status: 'received', receivedAt: dup.receivedAt })
  let body
  try { body = await readBody(req) } catch { return fail(res, 413, 'Gói quá lớn (tối đa 200 MB)') }
  if (body.length < 4 || body[0] !== 0x50 || body[1] !== 0x4b) return fail(res, 400, 'Tệp gửi lên không phải .zip')
  const id = `pkg-${randomUUID().slice(0, 8)}`
  let title = 'Gói không tên'
  try { title = decodeURIComponent(String(req.headers['x-package-title'] ?? '')) || title } catch { /* giữ tên mặc định */ }
  mkdirSync(INBOX, { recursive: true })
  writeFileSync(path.join(INBOX, `${id}.zip`), body)
  const rec = { id, key, kind, title, sourceRef: String(req.headers['x-source-ref'] ?? ''), size: body.length, receivedAt: Date.now(), importedAt: null }
  save([rec, ...list])
  return send(res, 201, { id, status: 'received', receivedAt: rec.receivedAt })
}

function handle(req, res, next) {
  const url = new URL(req.url, 'http://x')
  if (!url.pathname.startsWith('/lms-api/')) return next()
  const m = url.pathname.match(/^\/lms-api\/packages(?:\/([\w-]+)(?:\/(file|imported))?)?$/)
  if (!m) return fail(res, 404, 'Không có đường dẫn này')
  const [, id, action] = m
  if (!id && req.method === 'POST') return receive(req, res).catch(() => fail(res, 500, 'Lỗi khi nhận gói'))
  if (!id && req.method === 'GET') return send(res, 200, load().map(({ key: _k, ...p }) => p))
  const rec = load().find((p) => p.id === id)
  if (!rec) return fail(res, 404, 'Không có gói này')
  if (action === 'file' && req.method === 'GET') {
    res.setHeader('content-type', 'application/zip')
    return res.end(readFileSync(path.join(INBOX, `${rec.id}.zip`)))
  }
  if (action === 'imported' && req.method === 'POST') {
    save(load().map((p) => (p.id === id ? { ...p, importedAt: Date.now() } : p)))
    return send(res, 200, { ok: true })
  }
  return fail(res, 405, 'Phương thức không hỗ trợ')
}

/** Plugin Vite: gắn API nhận gói vào máy chủ dev và preview */
export default function lmsApi() {
  return { name: 'lms-api', configureServer: (s) => { s.middlewares.use(handle) }, configurePreviewServer: (s) => { s.middlewares.use(handle) } }
}
