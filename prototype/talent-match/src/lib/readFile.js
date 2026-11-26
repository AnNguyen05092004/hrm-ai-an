// Đọc nội dung file người dùng kéo thả (PDF hoặc văn bản thuần) ngay trên trình duyệt — file không gửi đi đâu.
const MAX_BYTES = 5 * 1024 * 1024
const MAX_PAGES = 6

async function readPdf(file) {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages = []
  for (let i = 1; i <= Math.min(doc.numPages, MAX_PAGES); i += 1) {
    const content = await (await doc.getPage(i)).getTextContent()
    pages.push(content.items.map((it) => it.str + (it.hasEOL ? '\n' : '')).join(''))
  }
  return pages.join('\n')
}

/** PDF tự xuống dòng giữa câu: nối dòng bắt đầu bằng chữ thường vào dòng trước. */
export function unwrapLines(text) {
  return text.split('\n').reduce((out, line) => {
    const prev = out[out.length - 1]
    if (prev && /^\p{Ll}/u.test(line.trim()) && !/[.:;!?]$/.test(prev.trim())) out[out.length - 1] = `${prev.trimEnd()} ${line.trim()}`
    else out.push(line)
    return out
  }, []).join('\n')
}

/** @param {File} file @returns {Promise<string>} */
export async function readFileText(file) {
  const name = file.name.toLowerCase()
  if (file.size > MAX_BYTES) throw new Error('File lớn hơn 5 MB. Hãy dùng bản PDF gọn hơn.')
  let text
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    try { text = unwrapLines(await readPdf(file)) } catch { throw new Error('Không mở được file PDF này. File có thể bị khoá mật khẩu hoặc hỏng.') }
  } else if (/\.(txt|md)$/.test(name) || file.type.startsWith('text/')) {
    text = await file.text()
  } else {
    throw new Error('Định dạng chưa hỗ trợ. Hãy dùng file PDF hoặc TXT (bản Word: lưu thành PDF trước).')
  }
  if (text.replace(/\s/g, '').length < 40) throw new Error('Không đọc được chữ trong file. Có thể đây là bản scan dạng ảnh — hãy dùng PDF xuất từ Word/Google Docs.')
  return text
}
