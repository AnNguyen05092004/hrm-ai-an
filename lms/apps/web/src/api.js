// Gọi API backend. Mọi request ghi gửi kèm header x-lms để chống CSRF.
export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code }
}

export async function api(path, { method = 'GET', body, form, signal } = {}) {
  // gói SCORM: không có máy chủ, trình học gọi vào bộ xử lý cục bộ (scorm/main.jsx)
  if (typeof window !== 'undefined' && window.__LMS_OFFLINE__) return window.__LMS_OFFLINE__(path, { method, body })
  const headers = { 'x-lms': '1' }
  let payload
  if (form) payload = form
  else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body) }
  let res
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload, credentials: 'same-origin', signal })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new ApiError(0, 'network', 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.')
  }
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? 'Có lỗi xảy ra')
  return data
}

export const get = (p) => api(p)
export const post = (p, body) => api(p, { method: 'POST', body: body ?? {} })
export const patch = (p, body) => api(p, { method: 'PATCH', body })
export const del = (p) => api(p, { method: 'DELETE' })
