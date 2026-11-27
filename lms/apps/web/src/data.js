// Hằng số giao diện: dạng tài liệu, mức kỹ năng, ảnh minh họa.

export const FORMATS = {
  master: {
    name: 'Nội dung gốc', en: 'Master Content', bg: '#eceef1', fg: '#20242d',
    desc: 'Bản nội dung đầy đủ để duyệt; mọi định dạng soạn từ bản này', long: 'Soạn và duyệt nội dung một lần; chốt xong mới tạo Tài liệu nhanh, slide, video, tình huống, đề kiểm tra', note: 'Chỉ dùng nội bộ, không xuất cho người học',
  },
  qr: {
    name: 'Tài liệu nhanh', en: 'Quick Reference', bg: '#e3f1fd', fg: '#1e88e5',
    desc: 'Những điều cốt lõi trong một khóa ngắn', long: 'Một khóa ngắn bao quát toàn bộ chủ đề', note: 'Nên gọn, khoảng 3 bài',
  },
  deck: {
    name: 'Bộ slide', en: 'Training Deck', bg: '#fff1dc', fg: '#e8930c',
    desc: 'Slide gọn đẹp, dễ chia sẻ và cập nhật', long: 'Slide để trình bày hoặc gửi đi',
  },
  guide: {
    name: 'Hướng dẫn từng bước', en: 'Guide', bg: '#e5f6e1', fg: '#4caf3d',
    desc: 'Các bước để hoàn thành một việc', long: 'Hướng dẫn từng bước kèm ảnh chụp từ video', req: 'Cần video có lời thuyết minh. Tối đa 500 MB, 45 phút.',
  },
  scenario: {
    name: 'Tình huống', en: 'Scenario', bg: '#ece9fd', fg: '#7765e3',
    desc: 'Luyện hội thoại với tình huống thật', long: 'Một đoạn chat mô phỏng có các lựa chọn trả lời',
  },
  video: {
    name: 'Video tương tác', en: 'Interactive Video', bg: '#fde3e3', fg: '#e32b22',
    desc: 'Video có chương và điểm kiểm tra', long: 'Chương và điểm kiểm tra gắn vào video', req: 'Tải video lên, hoặc để AI tạo video từ slide và giọng đọc AI.',
  },
  exam: {
    name: 'Đề kiểm tra', en: 'Assessment', bg: '#e0f5ee', fg: '#0f9f6e',
    desc: 'Đề thi riêng, rút ngẫu nhiên từ ngân hàng câu', long: 'Ngân hàng câu theo mức, mỗi người một đề, có giờ, lượt và giám sát',
  },
}
// thứ tự học trong một khóa
export const TYPE_ORDER = ['master', 'qr', 'deck', 'scenario', 'video', 'guide', 'exam']

/** Dạng câu hỏi, theo thứ tự hiện trong menu */
export const QTYPES = { mc: 'Một đáp án', mr: 'Nhiều đáp án', tf: 'Đúng / Sai', fill: 'Điền chỗ trống', order: 'Sắp thứ tự', match: 'Ghép cặp', cat: 'Phân loại kéo thả', essay: 'Tự luận', code: 'Bài code' }
const TF = () => [{ t: 'Đúng', ok: true, fb: '' }, { t: 'Sai', ok: false, fb: '' }]
/** Trường cần có của từng dạng câu (câu mới, hoặc đổi dạng câu đang có): giữ phần đã nhập nếu dùng lại được */
export function questionFields(t, x = {}) {
  if (t === 'tf') return { choices: TF() }
  if (t === 'mc' || t === 'mr') return { choices: x.choices && x.type !== 'tf' ? x.choices : [{ t: '', ok: true, fb: '' }, { t: '', ok: false, fb: '' }] }
  if (t === 'fill') return { answer: x.answer ?? '' }
  if (t === 'order') return { items: x.items ?? ['', '', ''] }
  if (t === 'match') return { pairs: x.pairs ?? [{ l: '', r: '' }, { l: '', r: '' }, { l: '', r: '' }] }
  if (t === 'cat') return { groups: x.groups ?? [{ name: 'Nhóm 1', items: [''] }, { name: 'Nhóm 2', items: [''] }] }
  if (t === 'essay') return { rubric: x.rubric ?? [''] }
  if (t === 'code') return { tests: x.tests ?? [{ name: '', args: '[]', expected: '' }], starter: x.starter ?? 'function solve() {\n  \n}' }
  return {}
}

export const LEVELS = [
  { v: 1, name: 'Mức 1 · Biết khái niệm', kinds: 'Trắc nghiệm' },
  { v: 2, name: 'Mức 2 · Làm được khi có hướng dẫn', kinds: 'Trắc nghiệm tình huống + tự luận ngắn' },
  { v: 3, name: 'Mức 3 · Làm độc lập', kinds: 'Bài code / thực hành + tự luận tình huống' },
]

const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`
export const IMG = {
  server: { src: U('1605745341112-85968b19335b'), grad: 'linear-gradient(135deg,#1f2a37,#8aa0b6)' },
  rack: { src: U('1558494949-ef010cbdcc31'), grad: 'linear-gradient(135deg,#0f172a,#334155)' },
  desk: { src: U('1517694712202-14dd9538aa97'), grad: 'linear-gradient(135deg,#0f172a,#64748b)' },
  person: { src: U('1573497019940-1c28c88b4f3e'), grad: 'linear-gradient(135deg,#ede9fe,#e0f2fe)' },
  video: { src: U('1498050108023-c5249f4df085'), grad: 'linear-gradient(135deg,#334155,#cbd5e1)' },
  screen: { src: U('1454165804606-c3d57bc86b40'), grad: 'linear-gradient(135deg,#14532d,#bbf7d0)' },
  office: { src: U('1521737604893-d14cc237f11d'), grad: 'linear-gradient(135deg,#7c2d12,#fed7aa)' },
  meeting: { src: U('1552664730-d307ca884978'), grad: 'linear-gradient(135deg,#78350f,#fde68a)' },
  team: { src: U('1600880292203-757bb62b4baf'), grad: 'linear-gradient(135deg,#7c2d12,#fed7aa)' },
  cyber: { src: U('1550751827-4bd374c3f58b'), grad: 'linear-gradient(135deg,#020617,#334155)' },
  phish: { src: U('1563013544-824ae1b704d3'), grad: 'linear-gradient(135deg,#78716c,#e7e5e4)' },
  lock: { src: U('1614064641938-3bbee52942c7'), grad: 'linear-gradient(135deg,#14532d,#ef4444)' },
  mobile: { src: U('1586953208448-b95a79798f07'), grad: 'linear-gradient(135deg,#e5e7eb,#f8fafc)' },
  dash: { src: U('1551288049-bebda4e38f71'), grad: 'linear-gradient(135deg,#0f172a,#1e3a8a)' },
  charts: { src: U('1460925895917-afdab827c52f'), grad: 'linear-gradient(135deg,#44403c,#d6d3d1)' },
  code: { src: U('1555066931-4365d14bab8c'), grad: 'linear-gradient(135deg,#0f172a,#1e293b)' },
  plan: { src: U('1531403009284-440f080d1e12'), grad: 'linear-gradient(135deg,#e2e8f0,#f8fafc)' },
  sketch: { src: U('1581291518857-4e27b48ff24e'), grad: 'linear-gradient(135deg,#d6d3d1,#fafaf9)' },
  support: { src: U('1553775282-20af80779df7'), grad: 'linear-gradient(135deg,#d6d3d1,#f5f5f4)' },
  openoffice: { src: U('1556761175-b413da4baf72'), grad: 'linear-gradient(135deg,#78350f,#e7e5e4)' },
  handshake: { src: U('1521791136064-7986c2920216'), grad: 'linear-gradient(135deg,#334155,#e2e8f0)' },
  teamwork: { src: U('1600880292089-90a7e086ee0c'), grad: 'linear-gradient(135deg,#1e3a8a,#e2e8f0)' },
  man: { src: U('1507003211169-0a1dd7228f2d'), grad: 'linear-gradient(135deg,#78716c,#e7e5e4)' },
  man2: { src: U('1500648767791-00dcc994a43e'), grad: 'linear-gradient(135deg,#475569,#cbd5e1)' },
  terminal: { src: U('1518432031352-d6fc5c10da5a'), grad: 'linear-gradient(135deg,#0a0a0a,#3f3f46)' },
  devscreen: { src: U('1504639725590-34d0984388bd'), grad: 'linear-gradient(135deg,#0f172a,#334155)' },
  earth: { src: U('1451187580459-43490279c0fa'), grad: 'linear-gradient(135deg,#020617,#1e3a8a)' },
  nodes: { src: U('1639322537228-f710d846310a'), grad: 'linear-gradient(135deg,#020617,#1e40af)' },
  ai: { src: U('1677442136019-21780ecad995'), grad: 'linear-gradient(135deg,#312e81,#a5b4fc)' },
  ml: { src: U('1591453089816-0fbb971b454c'), grad: 'linear-gradient(135deg,#e7e5e4,#fafaf9)' },
  servers: { src: U('1558494949-ef010cbdcc31'), grad: 'linear-gradient(135deg,#0f172a,#334155)' },
  laptopglow: { src: U('1531297484001-80022131f5a1'), grad: 'linear-gradient(135deg,#0a0a0a,#7c3aed)' },
  setup: { src: U('1550439062-609e1531270e'), grad: 'linear-gradient(135deg,#0a0a0a,#404040)' },
  devs: { src: U('1522071820081-009f0129c71c'), grad: 'linear-gradient(135deg,#78350f,#e7e5e4)' },
  man5: { src: U('1560250097-0b93528c311a'), grad: 'linear-gradient(135deg,#94a3b8,#e2e8f0)' },
  woman5: { src: U('1580489944761-15a19d654956'), grad: 'linear-gradient(135deg,#e5e7eb,#f9fafb)' },
  woman6: { src: U('1534528741775-53994a69daeb'), grad: 'linear-gradient(135deg,#4338ca,#a5b4fc)' },
  shop: { src: U('1556742049-0cfed4f6a45d'), grad: 'linear-gradient(135deg,#a8a29e,#f5f5f4)' },
  store: { src: U('1556740738-b6a63e27c4df'), grad: 'linear-gradient(135deg,#78350f,#fef3c7)' },
  receipt: { src: U('1554224155-6726b3ff858f'), grad: 'linear-gradient(135deg,#e7e5e4,#fafaf9)' },
  piggy: { src: U('1607863680198-23d4b2565df0'), grad: 'linear-gradient(135deg,#7c2d12,#fca5a5)' },
  notes: { src: U('1488190211105-8b0e65b80b4e'), grad: 'linear-gradient(135deg,#78350f,#d6d3d1)' },
  sign: { src: U('1450101499163-c8848c66ca85'), grad: 'linear-gradient(135deg,#334155,#e2e8f0)' },
  writing: { src: U('1434030216411-0b793f4b4173'), grad: 'linear-gradient(135deg,#d6d3d1,#f5f5f4)' },
  welcome: { src: U('1529156069898-49953e39b3ac'), grad: 'linear-gradient(135deg,#0ea5e9,#fde68a)' },
  loft: { src: U('1559136555-9303baea8ebd'), grad: 'linear-gradient(135deg,#44403c,#e7e5e4)' },
  workshop: { src: U('1557804506-669a67965ba0'), grad: 'linear-gradient(135deg,#78350f,#e7e5e4)' },
  warehouse: { src: U('1586528116311-ad8dd3c8310d'), grad: 'linear-gradient(135deg,#a16207,#e2e8f0)' },
  man3: { src: U('1472099645785-5658abf4ff4e'), grad: 'linear-gradient(135deg,#9ca3af,#f3f4f6)' },
  man4: { src: U('1506794778202-cad84cf45f1d'), grad: 'linear-gradient(135deg,#0a0a0a,#404040)' },
  woman4: { src: U('1438761681033-6461ffad8d80'), grad: 'linear-gradient(135deg,#0c4a6e,#bae6fd)' },
  woman3: { src: U('1573496359142-b8d87734a5a2'), grad: 'linear-gradient(135deg,#c2410c,#fed7aa)' },
}

export const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
