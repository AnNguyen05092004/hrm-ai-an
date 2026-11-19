// Chữ có định dạng trong bài học: lưu dạng chuỗi với một tập thẻ nhỏ, cố định.
//   <b> <i> <u> <s> <br> <span data-c="màu"> <mark data-c="màu"> <a href="https://…">
// Mọi thứ khác là chữ thường (đã thoát &lt; &gt; &amp;). Chuỗi cũ không có thẻ vẫn hiện đúng như trước.
// Hiển thị chỉ đi qua richHtml(): chỉ nhận đúng các thẻ trên, nên không chèn được mã lạ (XSS).

export const COLORS = [
  ['', 'Mặc định', null],
  ['brand', 'Màu nhấn của khóa', 'rgb(var(--brand-rgb, 255 97 25))'],
  ['red', 'Đỏ', '#dc2626'],
  ['amber', 'Cam đất', '#b45309'],
  ['green', 'Xanh lá', '#047857'],
  ['blue', 'Xanh dương', '#1d4ed8'],
  ['violet', 'Tím', '#6d28d9'],
  ['gray', 'Xám', '#6b7280'],
]
export const MARKS = [
  ['', 'Không tô', null],
  ['yellow', 'Vàng', '#fef08a'],
  ['green', 'Xanh lá', '#bbf7d0'],
  ['blue', 'Xanh dương', '#bfdbfe'],
  ['pink', 'Hồng', '#fbcfe8'],
]
const C_NAMES = COLORS.map((c) => c[0]).filter(Boolean)
const M_NAMES = MARKS.map((c) => c[0]).filter(Boolean)

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s) => esc(s).replace(/"/g, '&quot;')
export const safeHref = (u) => { const s = String(u ?? '').trim(); return /^(https?:\/\/|mailto:)[^\s"<>]+$/i.test(s) ? s : '' }

// Thẻ hợp lệ (đúng dạng mà editorToRich ghi ra) và thực thể HTML đã thoát
const TOKEN = /<(\/?)(b|i|u|s|br|span|mark|a)((?:\s+data-c="[a-z]+")|(?:\s+href="[^"<>]*"))?\s*\/?>|&(amp|lt|gt|quot|#39|nbsp);/g

/** Chuỗi lưu trữ → HTML an toàn để hiển thị */
export function richHtml(s) {
  if (s == null || s === '') return ''
  const str = String(s)
  let out = '', last = 0
  const open = []
  for (const m of str.matchAll(TOKEN)) {
    out += esc(str.slice(last, m.index)).replace(/\n/g, '<br>')
    last = m.index + m[0].length
    if (m[4]) { out += m[0]; continue } // thực thể đã thoát sẵn
    const [, close, tag, attr = ''] = m
    if (tag === 'br') { out += '<br>'; continue }
    if (close) {
      const at = open.lastIndexOf(tag)
      if (at < 0) continue
      while (open.length > at) out += `</${open.pop()}>`
      continue
    }
    let a = ''
    if (tag === 'span' || tag === 'mark') {
      const c = /data-c="([a-z]+)"/.exec(attr)?.[1]
      if (!c || !(tag === 'span' ? C_NAMES : M_NAMES).includes(c)) continue
      a = ` data-c="${c}"`
    } else if (tag === 'a') {
      const href = safeHref(/href="([^"]*)"/.exec(attr)?.[1]?.replace(/&amp;/g, '&'))
      if (!href) continue
      a = ` href="${escAttr(href)}" target="_blank" rel="noopener noreferrer"`
    }
    open.push(tag)
    out += `<${tag}${a}>`
  }
  out += esc(str.slice(last)).replace(/\n/g, '<br>')
  while (open.length) out += `</${open.pop()}>`
  return out
}

/** Bỏ định dạng, lấy chữ thuần (đếm ký tự, tìm kiếm, gợi ý…) */
export function richText(s) {
  if (s == null) return ''
  return String(s).replace(/<br\s*\/?>/g, '\n').replace(/<\/?(b|i|u|s|span|mark|a)\b[^>]*>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
}

export const isRich = (s) => typeof s === 'string' && /<(b|i|u|s|br|span|mark|a)[\s>/]/.test(s)

// ---------- trình soạn ----------
// Trong ô soạn, màu chữ và tô nền ở dạng trình duyệt tự xử lý được (font color / background-color),
// để lệnh tô màu tách, gộp vùng chọn đúng. Khi lưu thì đổi về dạng gọn ở trên.
const hexOf = (name, list) => list.find((c) => c[0] === name)?.[2]
const toRgb = (hex) => { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) }
const nearest = (css, list) => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(css ?? '') ?? (/^#[0-9a-f]{6}$/i.test(css ?? '') ? [null, ...toRgb(css)] : null)
  if (!m || m[4] === '0') return ''
  const [r, g, b] = [m[1], m[2], m[3]].map(Number)
  let best = '', d = 30 * 30 * 3 // chỉ nhận màu gần đúng bảng màu
  for (const [name, , hex] of list) {
    if (!name || !hex?.startsWith('#')) continue
    const [R, G, B] = toRgb(hex), x = (R - r) ** 2 + (G - g) ** 2 + (B - b) ** 2
    if (x < d) { d = x; best = name }
  }
  return best
}
export const BRAND_PROBE = '#010203' // màu tạm cho "màu nhấn" khi soạn (không trùng màu nào trong bảng)
export const DEFAULT_PROBE = '#030201' // màu tạm cho "mặc định": khi lưu thì bỏ thẻ màu

/** Chuỗi lưu trữ → HTML đặt vào ô soạn */
export function richToEditor(s) {
  return richHtml(s)
    .replace(/<span data-c="([a-z]+)">/g, (_, c) => `<font color="${c === 'brand' ? BRAND_PROBE : hexOf(c, COLORS)}">`).replace(/<\/span>/g, '</font>')
    .replace(/<mark data-c="([a-z]+)">/g, (_, c) => `<span style="background-color: ${hexOf(c, MARKS)}">`).replace(/<\/mark>/g, '</span>')
    .replace(/ target="_blank" rel="noopener noreferrer"/g, '')
}

/** DOM của ô soạn → chuỗi lưu trữ (chỉ giữ thẻ cho phép, gộp cách viết khác nhau của trình duyệt) */
export function editorToRich(root) {
  const walk = (node, ctx) => {
    let out = ''
    node.childNodes.forEach((n, idx) => {
      if (n.nodeType === 3) { out += esc(n.nodeValue.replace(/\u00a0/g, ' ')); return }
      if (n.nodeType !== 1) return
      const tag = n.tagName.toLowerCase()
      if (tag === 'br') { out += '<br>'; return }
      // xuống dòng kiểu <div>/<p> của trình duyệt → <br>
      const block = tag === 'div' || tag === 'p'
      const st = n.style ?? {}
      const wraps = []
      if (tag === 'b' || tag === 'strong' || st.fontWeight === 'bold' || Number(st.fontWeight) >= 600) wraps.push(['b'])
      if (tag === 'i' || tag === 'em' || st.fontStyle === 'italic') wraps.push(['i'])
      if (tag === 'u' || /underline/.test(st.textDecoration ?? st.textDecorationLine ?? '')) wraps.push(['u'])
      if (tag === 's' || tag === 'strike' || tag === 'del' || /line-through/.test(st.textDecoration ?? st.textDecorationLine ?? '')) wraps.push(['s'])
      const color = tag === 'font' ? n.getAttribute('color') : st.color
      if (color) {
        const c = color.toLowerCase() === BRAND_PROBE ? 'brand' : color.toLowerCase() === DEFAULT_PROBE ? '' : nearest(color, COLORS)
        if (c) wraps.push(['span', ` data-c="${c}"`])
      }
      if (st.backgroundColor) { const c = nearest(st.backgroundColor, MARKS); if (c) wraps.push(['mark', ` data-c="${c}"`]) }
      if (tag === 'mark') { const c = n.getAttribute('data-c'); wraps.push(['mark', ` data-c="${M_NAMES.includes(c) ? c : 'yellow'}"`]) }
      if (tag === 'a') { const h = safeHref(n.getAttribute('href')); if (h) wraps.push(['a', ` href="${escAttr(h)}"`]) }
      // không lồng cùng một thẻ hai lần
      const fresh = wraps.filter(([t]) => !ctx.includes(t))
      let inner = walk(n, [...ctx, ...fresh.map(([t]) => t)])
      for (let k = fresh.length - 1; k >= 0; k--) inner = inner ? `<${fresh[k][0]}${fresh[k][1] ?? ''}>${inner}</${fresh[k][0]}>` : ''
      if (block && idx > 0 && !out.endsWith('<br>')) out += '<br>'
      out += inner
    })
    return out
  }
  return walk(root, [])
    .replace(/<(b|i|u|s)><\/\1>/g, '')
    .replace(/<\/(b|i|u|s)><\1>/g, '') // gộp hai đoạn liền nhau cùng định dạng
    .replace(/(<br>)+$/, '')
}
