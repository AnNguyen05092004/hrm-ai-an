// Trích chữ từ tài liệu nguồn và chia thành đoạn theo mục để AI trích dẫn.
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { badRequest } from './errors.js'

export const ACCEPTED: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
}

export function kindOf(filename: string, mime: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (['pdf', 'docx', 'txt', 'md'].includes(ext)) return ext
  const k = ACCEPTED[mime]
  if (!k) throw badRequest('Chỉ nhận tệp PDF, DOCX, TXT hoặc MD', 'unsupported_file')
  return k
}

export async function extractText(buf: Buffer, kind: string): Promise<string> {
  if (kind === 'pdf') {
    const p = new PDFParse({ data: new Uint8Array(buf) })
    try {
      const r = await p.getText()
      return r.pages.map((pg) => `\n[[trang ${pg.num}]]\n${pg.text}`).join('\n')
    } finally { await p.destroy() }
  }
  if (kind === 'docx') {
    const r = await (mammoth as unknown as { convertToMarkdown: (o: { buffer: Buffer }) => Promise<{ value: string }> }).convertToMarkdown({ buffer: buf })
    return r.value.replace(/__(.+?)__/g, '$1').replace(/\\([.\-()#*_])/g, '$1')
  }
  return buf.toString('utf8')
}

export interface Chunk { section: string; text: string }
const MAX = 1400
const HEADING = /^(#{1,4}\s+.+|(\d+(\.\d+)*)[.)]?\s+[A-ZÀ-Ỹ].{2,80}|[A-ZÀ-Ỹ][A-ZÀ-Ỹ0-9\s,:-]{4,60})$/u

/** Chia theo tiêu đề; đoạn dài thì cắt theo đoạn văn. Nhãn mục dạng "mục 2.1 Tên" hoặc "trang 3". */
export function chunkText(text: string): Chunk[] {
  const out: Chunk[] = []
  let section = 'Phần mở đầu', page = '', buf: string[] = []
  const flush = () => {
    const body = buf.join('\n').trim()
    buf = []
    if (!body) return
    const label = page && !section.startsWith('mục') ? `${section} · ${page}` : section
    for (let i = 0; i < body.length; i += MAX) {
      let piece = body.slice(i, i + MAX)
      if (i + MAX < body.length) { const cutAt = piece.lastIndexOf('\n'); if (cutAt > MAX / 2) { piece = piece.slice(0, cutAt); i -= MAX - cutAt } }
      out.push({ section: label, text: piece.trim() })
    }
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const pg = line.match(/^\[\[trang (\d+)\]\]$/)
    if (pg) { flush(); page = `trang ${pg[1]}`; continue }
    if (line && line.length < 90 && HEADING.test(line)) {
      flush()
      const clean = line.replace(/^#+\s*/, '')
      const num = clean.match(/^(\d+(\.\d+)*)[.)]?\s+(.*)$/)
      section = num ? `mục ${num[1]} ${num[3]}` : clean
      buf.push(clean)
      continue
    }
    buf.push(raw)
  }
  flush()
  return out.filter((c) => c.text.length > 20)
}
