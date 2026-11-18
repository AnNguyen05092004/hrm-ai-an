// AI Tutor giả lập: trả lời từ chính nội dung khóa (bài học hoặc lời thoại video), có trích nguồn và nút mở đúng chỗ.
// Thứ tự: chặn câu hỏi bài thi → câu hỏi chung (chào, khả năng, tóm tắt…) → câu trả lời người soạn viết sẵn (art.tutor)
// → câu trả lời Docker mẫu → tìm từ khóa trong nội dung → không tìm thấy (gửi người soạn).

const fold = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
const STOP = new Set(fold('là và của có cho các những một được không thì mà với này đó khi nào gì sao thế nào làm như trong ra vào để tôi mình em anh chị bạn ạ nhé ơi vậy hay hoặc cần muốn biết hỏi giúp về lại nữa rồi đã đang sẽ bị nên phải cái việc người khóa bài học').split(' '))

// Các đoạn nội dung tìm được: mỗi bài học hoặc mỗi chương video
function sections(art) {
  if (art?.lessons) return art.lessons.filter((l) => l.kind === 'lesson').map((l, i) => {
    const parts = [l.title]; let src
    const add = (x) => { const t = typeof x === 'string' ? x : Array.isArray(x) ? x.map((y) => (typeof y === 'string' ? y : y?.t || '')).join(' – ') : x?.t || x?.text || x?.h || x?.title || ''; if (t) parts.push(t) }
    l.blocks.forEach((b) => {
      if (b.t === 'kc' || b.t === 'gap') return // câu kiểm tra nhanh và chỗ nguồn còn thiếu không dùng làm câu trả lời
      ;[b.h, b.p, b.intro, b.cap].forEach(add)
      ;[...(b.items || []), ...(b.steps || []), ...(b.rows || [])].forEach(add)
      ;(b.cards || []).forEach((c) => add(c.f && c.b ? `${c.f}: ${c.b}` : c))
      if (!src && b.src) src = b.src
    })
    return { label: `Bài ${i + 1} · ${l.title}`, btn: `Mở Bài ${i + 1}`, jump: l.id, parts, src }
  })
  if (art?.chapters) return art.chapters.map((c, i) => {
    const next = art.chapters[i + 1]?.t ?? Infinity
    const lines = (art.transcript || []).filter((x) => x.t >= c.t && x.t < next).map((x) => x.x)
    return { label: `Chương ${i + 1} · ${c.title}`, btn: `Xem ${String(Math.floor(c.t / 60)).padStart(2, '0')}:${String(c.t % 60).padStart(2, '0')}`, jump: c.t, parts: [c.title, ...lines], src: 'Lời thoại video' }
  })
  return []
}

// Từ đồng nghĩa Anh–Việt hay gặp
const SYN = { database: 'co so du lieu', db: 'co so du lieu', backup: 'sao luu', restore: 'khoi phuc', password: 'mat khau', deploy: 'trien khai', test: 'kiem thu', cost: 'chi phi', phishing: 'lua dao' }
const words = (q) => [...new Set(fold(q).replace(/\b(database|db|backup|restore|password|deploy|test|cost|phishing)\b/g, (w) => `${w} ${SYN[w]}`).replace(/[^a-z0-9\s/-]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)))]

function search(q, secs) {
  const ws = words(q)
  if (!ws.length) return []
  return secs.map((s) => {
    const hay = fold(s.parts.join(' \n '))
    const hit = ws.filter((w) => hay.includes(w))
    // ưu tiên câu chứa nhiều từ khóa nhất làm trích đoạn
    const best = (s.parts.length > 1 ? s.parts.slice(1) : s.parts).map((p) => ({ p, n: ws.filter((w) => fold(p).includes(w)).length })).sort((a, b) => b.n - a.n)[0]
    return { s, n: hit.length, long: hit.some((w) => w.length >= 5), snip: best?.p }
  }).filter((r) => r.n >= 2 || (r.n === 1 && r.long && ws.length <= 2)).sort((a, b) => b.n - a.n).slice(0, 2)
}

const cut = (t, n = 120) => (t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, '')}…` : t)
const NONE = (extra = '') => ({ none: true, text: `Mình không tìm thấy nội dung này trong khóa học hay các khóa đã chia sẻ, nên không đoán.${extra} Câu hỏi đã được gửi cho người soạn để bổ sung.`, suggest: ['Tóm tắt khóa này', 'Bạn có thể giúp gì?'] })

export const STARTERS = (docker, art) => [
  ['bulb', 'Giải thích đơn giản hơn'],
  ['list', 'Tóm tắt khóa này'],
  ['search', 'Tìm trong nội dung khóa'],
  ['book', docker && !art?.tutor && art?.lessons ? 'Mình chỉ cần học phần sao lưu' : 'Mình chỉ cần học một phần'],
]

export function tutorAnswer(q, docker, art) {
  const s = q.toLowerCase().trim()
  const secs = sections(art)
  const unit = art?.chapters ? 'chương' : 'bài'

  // 1. Không trả lời câu hỏi bài thi
  if (/đáp án|bài thi|câu thi|đề thi|đề kiểm tra|(câu|câu hỏi) (số )?\d+/.test(s)) return { text: 'Mình không hỗ trợ trả lời câu hỏi bài thi hay bài kiểm tra. Mình có thể giải thích lại phần kiến thức liên quan nếu bạn nói rõ chủ đề.', suggest: ['Tóm tắt khóa này'] }

  // 2. Câu hỏi chung
  if (/^(hi|hello|chào|xin chào|alo)\b/.test(s) || /bạn (là ai|có thể làm gì|làm được gì|giúp (được )?gì)|^(bạn )?(có thể )?giúp (được )?gì|dùng (tutor|bạn) (thế nào|sao)/.test(s)) return {
    text: `Mình là AI Tutor của khóa “${art?.title || 'này'}”. Mình chỉ trả lời từ nội dung khóa và các khóa đã chia sẻ, có ghi nguồn. Mình có thể:`,
    list: ['Giải thích lại một phần theo cách đơn giản hơn', `Tóm tắt khóa hoặc chỉ ${unit} bạn cần học`, 'Tìm một khái niệm, lệnh hay quy định trong khóa', 'Gửi câu hỏi chưa có câu trả lời cho người soạn'],
    note: 'Mình không trả lời câu hỏi bài thi và tự tắt trong lúc thi chính thức.',
    suggest: ['Tóm tắt khóa này', 'Giải thích đơn giản hơn', 'Tìm trong nội dung khóa'],
  }
  if (/cảm ơn|cám ơn|thank|ok rồi|hiểu rồi/.test(s)) return { text: 'Không có gì. Cần gì cứ hỏi tiếp nhé, chúc bạn học tốt!' }
  if (/tóm tắt|tổng quan|nội dung chính|(khóa|bài) này (nói|dạy|học|có) (về )?gì/.test(s)) return secs.length ? {
    text: `${art.summary ? `${cut(art.summary, 180)} ` : ''}Khóa gồm ${secs.length} ${unit}:`, list: secs.map((x) => x.label),
    jump: secs.slice(0, 3).map((x) => [x.btn, x.jump]), suggest: ['Mình chỉ cần học một phần'],
  } : NONE()
  if (/^tìm( kiếm)?( trong)?( nội dung)?( khóa)?( học)?$/.test(s)) return {
    text: 'Bạn muốn tìm gì? Gõ một khái niệm, lệnh hay tình huống, mình chỉ tới đúng đoạn trong khóa. Ví dụ:',
    suggest: secs.flatMap((x) => x.parts.slice(1, 3)).filter((x) => x.length < 40).slice(0, 3).concat(secs.length ? [] : ['Tóm tắt khóa này']),
  }
  if (/chỉ cần (học )?(một|1) phần|học phần nào|bắt đầu từ đâu|học gì trước/.test(s) && !(docker && !art?.tutor && art?.lessons)) return secs.length ? {
    text: `Bạn có thể học riêng từng ${unit}. Chọn phần bạn cần:`, list: secs.map((x) => x.label), jump: secs.map((x) => [x.btn, x.jump]).slice(0, 4),
  } : NONE()

  // 3. Câu trả lời người soạn đã viết sẵn cho khóa
  const hit = art?.tutor?.find((x) => new RegExp(x.k, 'i').test(s))
  if (hit) return { text: hit.text, list: hit.list, src: hit.src, jump: hit.jump }

  // 4. Câu trả lời mẫu của khóa Docker
  if (docker && !art?.tutor && art?.lessons) {
    if (/compose|windows|tmpfs|swarm/.test(s)) return NONE(' Bạn có thể hỏi người phụ trách khóa.')
    if (/đơn giản|simple|dễ hiểu|ví dụ/.test(s)) return { text: 'Hiểu đơn giản: container giống phòng khách sạn, trả phòng là dọn sạch. Volume giống tủ gửi đồ ở sảnh: đổi phòng bao nhiêu lần đồ vẫn còn.', src: 'Bài 1 · Vì sao dữ liệu container biến mất', jump: [['Mở Bài 1', 'l1'], ['Xem video 00:00', 0]], suggest: ['Khác nhau giữa bind mount và named volume?'] }
    if (/chỉ cần|sao lưu|backup|khôi phục/.test(s)) return { text: 'Nếu bạn chỉ cần phần sao lưu, xem riêng các phần sau, không cần học cả khóa:', list: ['Bài 3 · Các bước sao lưu', 'Video · chương "Sao lưu volume" 04:48–06:40', 'Bài 3 · Lệnh sao lưu mẫu'], src: 'Runbook-Backup-v2.docx · mục 2', jump: [['Mở Bài 3', 'l3'], ['Xem video 04:48', 288]] }
    if (/bind|named|khác|chọn/.test(s)) return { text: 'Named volume do Docker quản lý, hợp cho dữ liệu cần giữ như cơ sở dữ liệu. Bind mount gắn thẳng thư mục trên máy, hợp khi sửa code ở máy cá nhân.', src: 'Docker-Volumes-NoiBo.pdf · mục 3', jump: [['Mở Bài 2', 'l2'], ['Xem video 01:35', 95]], suggest: ['Mình chỉ cần học phần sao lưu'] }
    if (/kubernetes|k8s|pvc/.test(s)) return { text: 'Khóa này không nói về Kubernetes. Mình tìm thấy trong khóa khác đã chia sẻ:', list: ['Kubernetes cơ bản · Bài 3 "PersistentVolume" · phút 05:10'], src: 'Thư viện khóa học' }
  }

  // 5. "Giải thích đơn giản hơn" cho khóa chưa có câu viết sẵn
  if (/đơn giản|dễ hiểu|simple/.test(s)) return secs.length ? {
    text: `Nói ngắn gọn, khóa này giúp bạn: ${secs.map((x) => x.parts[0].toLowerCase()).join('; ')}. Bạn muốn mình giải thích kỹ phần nào?`,
    suggest: secs.slice(0, 3).map((x) => `Giải thích ${x.parts[0].toLowerCase()}`),
  } : NONE()

  // 6. Tìm từ khóa trong nội dung
  const found = search(q.replace(/^giải thích\s*/i, ''), secs)
  if (found.length) return {
    text: found.length > 1 ? 'Mình tìm thấy nội dung liên quan ở hai chỗ:' : 'Mình tìm thấy trong khóa:',
    list: found.map((r) => `${r.s.label}: “${cut(r.snip || r.s.parts[0])}”`),
    src: found[0].s.src, jump: found.map((r) => [r.s.btn, r.s.jump]),
  }

  return NONE(docker ? ' Bạn có thể hỏi người phụ trách khóa.' : '')
}
