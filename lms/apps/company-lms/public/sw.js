// Máy chủ tệp của cổng đào tạo (demo): phục vụ các tệp trong gói SCORM đã giải nén, lưu ở Cache Storage.
// Gói chạy cùng nguồn với cổng nên tìm được window.API ở cửa sổ cha, như trên một LMS thật.
const CACHE = 'scorm-packages'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/pkg/')) return
  e.respondWith(serve(e.request, url))
})

async function serve(req, url) {
  const hit = await (await caches.open(CACHE)).match(url.origin + url.pathname)
  if (!hit) return new Response('Không có tệp này trong gói', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  // video cần trả từng đoạn (Range) để tua được
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '')
  if (!range) return hit
  const blob = await hit.blob()
  const start = range[1] ? Number(range[1]) : Math.max(0, blob.size - Number(range[2]))
  const end = range[1] && range[2] ? Math.min(Number(range[2]), blob.size - 1) : blob.size - 1
  if (start >= blob.size || start > end) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${blob.size}` } })
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: { 'content-type': hit.headers.get('content-type') ?? 'application/octet-stream', 'content-range': `bytes ${start}-${end}/${blob.size}`, 'content-length': String(end - start + 1), 'accept-ranges': 'bytes' },
  })
}
