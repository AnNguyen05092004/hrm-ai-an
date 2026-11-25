// Nhập gói SCORM: giải nén, đọc imsmanifest.xml, kiểm tra như LMS thật làm trước khi đưa lên danh mục,
// rồi lưu các tệp vào Cache Storage để Service Worker phục vụ ở /pkg/<mã gói>/...
import { unzipSync, strFromU8 } from 'fflate'

const CACHE = 'scorm-packages'
const ADLCP = 'http://www.adlnet.org/xsd/adlcp_rootv1p2'
const MIME = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', json: 'application/json', xml: 'application/xml', xsd: 'application/xml', txt: 'text/plain; charset=utf-8',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon',
  mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', vtt: 'text/vtt; charset=utf-8', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', pdf: 'application/pdf',
}
const mimeOf = (name) => MIME[name.split('.').pop().toLowerCase()] ?? 'application/octet-stream'
const fileUrl = (id, name) => new URL(`/pkg/${id}/${name.split('/').map(encodeURIComponent).join('/')}`, location.origin).href
const byTag = (root, tag) => [...root.getElementsByTagNameNS('*', tag)]
const text = (el) => el?.textContent.trim() ?? ''

/**
 * Đọc gói .zip. Trả về thông tin gói, danh sách kiểm tra và các tệp (chưa lưu).
 * checks: [{ ok: true|false|'warn', label, detail }]; gói chỉ nhập được khi không có mục ok === false.
 */
export async function readPackage(file) {
  if (!/\.zip$/i.test(file.name)) throw new Error('Chọn tệp .zip của gói SCORM')
  let raw
  try { raw = unzipSync(new Uint8Array(await file.arrayBuffer())) } catch { throw new Error('Tệp không phải .zip hợp lệ hoặc bị hỏng') }
  const files = Object.fromEntries(Object.entries(raw).filter(([n]) => !n.endsWith('/') && !n.startsWith('__MACOSX/')))
  const size = Object.values(files).reduce((n, b) => n + b.length, 0)
  const checks = []
  const add = (ok, label, detail = '') => checks.push({ ok, label, detail })

  const man = files['imsmanifest.xml']
  if (!man) {
    const nested = Object.keys(files).find((n) => n.endsWith('/imsmanifest.xml'))
    add(false, 'Có imsmanifest.xml ở gốc gói', nested ? `Đang nằm trong thư mục ${nested.replace(/imsmanifest\.xml$/, '')}: nén lại từ bên trong thư mục đó` : 'Không thấy tệp mô tả gói, đây không phải gói SCORM')
    return { checks, files, size, info: null }
  }
  const doc = new DOMParser().parseFromString(strFromU8(man), 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) {
    add(false, 'Có imsmanifest.xml ở gốc gói', 'Tệp có nhưng XML bị lỗi, không đọc được')
    return { checks, files, size, info: null }
  }
  add(true, 'Có imsmanifest.xml ở gốc gói')

  const ver = text(byTag(doc, 'schemaversion')[0])
  if (ver === '1.2') add(true, 'Chuẩn SCORM 1.2', `schemaversion = ${ver}`)
  else add(false, 'Chuẩn SCORM 1.2', ver ? `Gói khai báo "${ver}" (SCORM 2004). Cổng đào tạo demo nhận SCORM 1.2, đúng định dạng LMS xuất` : 'Manifest không ghi schemaversion')

  const orgs = byTag(doc, 'organizations')[0]
  const org = byTag(doc, 'organization').find((o) => o.getAttribute('identifier') === orgs?.getAttribute('default')) ?? byTag(doc, 'organization')[0]
  const item = org && byTag(org, 'item').find((i) => i.getAttribute('identifierref'))
  const title = text([...(org?.children ?? [])].find((c) => c.localName === 'title')) || text(item && [...item.children].find((c) => c.localName === 'title'))
  add(!!item, 'Có khóa học và mục học', item ? `"${title || 'không tên'}" · ${byTag(org, 'item').length} mục` : 'Manifest không có organization/item trỏ tới nội dung')

  const res = item && byTag(doc, 'resource').find((r) => r.getAttribute('identifier') === item.getAttribute('identifierref'))
  const href = res?.getAttribute('href') ?? ''
  const launch = href.split(/[?#]/)[0]
  const scormType = res?.getAttributeNS(ADLCP, 'scormtype') ?? res?.getAttribute('adlcp:scormtype')
  if (!res) add(false, 'Tệp khởi chạy', 'Không thấy resource mà mục học trỏ tới')
  else if (!files[launch]) add(false, 'Tệp khởi chạy', `Manifest trỏ tới "${href}" nhưng gói không có tệp này`)
  else add(scormType === 'sco' ? true : 'warn', 'Tệp khởi chạy', `${href} · ${scormType === 'sco' ? 'SCO (gửi kết quả về cổng)' : 'asset: chỉ hiển thị, không gửi kết quả'}`)

  const declared = byTag(doc, 'file').map((f) => f.getAttribute('href')).filter(Boolean)
  const missing = declared.filter((h) => !files[h])
  if (declared.length) add(missing.length ? 'warn' : true, 'Đủ tệp khai báo trong manifest', missing.length ? `Thiếu ${missing.length}/${declared.length} tệp: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}` : `${declared.length}/${declared.length} tệp`)

  const ms = text(item && byTag(item, 'masteryscore')[0])
  const mastery = ms === '' ? null : Number(ms)
  add(true, 'Điểm đạt (masteryscore)', mastery == null ? 'Không đặt: cổng ghi trạng thái theo gói báo' : `${mastery}: gói chỉ báo "hoàn thành" kèm điểm thì cổng tự xếp đạt / chưa đạt`)

  return {
    checks, files, size,
    info: { title: title || file.name.replace(/\.zip$/i, ''), identifier: doc.documentElement.getAttribute('identifier') ?? '', version: ver, launch: href, mastery: Number.isFinite(mastery) ? mastery : null, fileCount: Object.keys(files).length, fileName: file.name },
  }
}

/** Lưu tệp của gói vào Cache Storage, báo tiến độ (đã lưu, tổng) */
export async function savePackage(id, files, onProgress = () => {}) {
  const cache = await caches.open(CACHE)
  const names = Object.keys(files)
  for (let i = 0; i < names.length; i++) {
    await cache.put(fileUrl(id, names[i]), new Response(files[names[i]], { headers: { 'content-type': mimeOf(names[i]) } }))
    onProgress(i + 1, names.length)
  }
}

export async function deletePackage(id) {
  const cache = await caches.open(CACHE)
  const prefix = new URL(`/pkg/${id}/`, location.origin).href
  await Promise.all((await cache.keys()).filter((r) => r.url.startsWith(prefix)).map((r) => cache.delete(r)))
}

export const launchUrl = (pkg) => `/pkg/${pkg.id}/${pkg.launch}`

let worker
/** Bật máy chủ tệp của gói (Service Worker) và chờ nó sẵn sàng */
export function ensureWorker() {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return Promise.reject(new Error('Trình duyệt không hỗ trợ Service Worker hoặc trang không chạy trên localhost/https'))
  worker ??= navigator.serviceWorker.register('/sw.js', { scope: '/pkg/' }).then((reg) => new Promise((resolve, reject) => {
    if (reg.active) return resolve(reg)
    const w = reg.installing ?? reg.waiting
    const timer = setTimeout(() => reject(new Error('Máy chủ tệp của gói không khởi động được')), 10000)
    w.addEventListener('statechange', () => {
      if (w.state === 'activated') { clearTimeout(timer); resolve(reg) }
      if (w.state === 'redundant') { clearTimeout(timer); reject(new Error('Máy chủ tệp của gói không khởi động được')) }
    })
  }))
  worker.catch(() => { worker = undefined })
  return worker
}

export const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
