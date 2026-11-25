// Đọc gói đề IMS QTI 2.1 và chấm theo đúng khai báo trong gói, như một LMS công ty tự quản lý đề.
// Câu khách quan chấm ngay (correctResponse / mapping / responseProcessing); tự luận và code đánh dấu externalScored,
// người chấm (hoặc AI của cổng) chấm theo rubricBlock view="scorer".
import { strFromU8 } from 'fflate'

const byTag = (root, tag) => [...root.getElementsByTagNameNS('*', tag)]
const child = (el, tag) => [...(el?.children ?? [])].filter((c) => c.localName === tag)
const txt = (el) => el?.textContent.trim() ?? ''
const parse = (s) => {
  const d = new DOMParser().parseFromString(s, 'application/xml')
  if (d.getElementsByTagName('parsererror').length) throw new Error('XML lỗi')
  return d
}
const values = (decl, tag) => byTag(decl, tag)[0] ? byTag(byTag(decl, tag)[0], 'value').map(txt) : []
/** so khớp câu điền: bỏ dấu tiếng Việt, hoa thường, khoảng trắng đầu cuối */
export const fold = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()

/** Một assessmentItem → câu hỏi của cổng */
export function parseItem(xml) {
  const d = parse(xml)
  const item = d.documentElement
  const decl = byTag(d, 'responseDeclaration').find((r) => r.getAttribute('identifier') === 'RESPONSE')
  const correct = decl ? values(decl, 'correctResponse') : []
  const mapping = decl ? byTag(decl, 'mapEntry').map((m) => ({ key: m.getAttribute('mapKey'), value: Number(m.getAttribute('mappedValue')), caseSensitive: m.getAttribute('caseSensitive') !== 'false' })) : []
  const base = { id: item.getAttribute('identifier'), title: item.getAttribute('title') ?? '' }
  const promptOf = (el) => txt(byTag(el, 'prompt')[0])
  const scorer = byTag(d, 'rubricBlock').find((r) => (r.getAttribute('view') ?? '').includes('scorer'))

  const choice = byTag(d, 'choiceInteraction')[0]
  if (choice) {
    const multi = choice.getAttribute('maxChoices') !== '1'
    return { ...base, kind: multi ? 'mr' : 'mc', prompt: promptOf(choice), shuffle: choice.getAttribute('shuffle') === 'true', choices: byTag(choice, 'simpleChoice').map((c) => ({ id: c.getAttribute('identifier'), text: txt(c) })), correct }
  }
  const entry = byTag(d, 'textEntryInteraction')[0]
  if (entry) {
    // câu hỏi là đoạn văn có ô trống ở giữa: tách phần trước và sau ô
    const p = entry.parentElement
    const before = [], after = []
    let seen = false
    for (const n of p.childNodes) { if (n === entry) seen = true; else (seen ? after : before).push(n.textContent) }
    return { ...base, kind: 'fill', before: before.join('').trim(), after: after.join('').trim(), accepted: mapping.length ? mapping.filter((m) => m.value > 0).map((m) => m.key) : correct, caseSensitive: mapping.some((m) => m.caseSensitive) }
  }
  const match = byTag(d, 'matchInteraction')[0]
  if (match) {
    const [l, r] = byTag(match, 'simpleMatchSet').map((set) => byTag(set, 'simpleAssociableChoice').map((c) => ({ id: c.getAttribute('identifier'), text: txt(c) })))
    return { ...base, kind: 'match', prompt: promptOf(match), left: l ?? [], right: r ?? [], correct, weights: Object.fromEntries(mapping.map((m) => [m.key, m.value])) }
  }
  const order = byTag(d, 'orderInteraction')[0]
  if (order) {
    // gói khai báo cộng điểm theo từng vị trí (index) thì chấm từng phần, không thì đúng hết mới có điểm
    const partial = byTag(d, 'index').length > 0
    return { ...base, kind: 'order', prompt: promptOf(order), choices: byTag(order, 'simpleChoice').map((c) => ({ id: c.getAttribute('identifier'), text: txt(c) })), correct, partial }
  }
  const ext = byTag(d, 'extendedTextInteraction')[0]
  if (ext) {
    const code = ext.getAttribute('format') === 'preformatted'
    const rows = scorer ? byTag(scorer, 'tr').filter((tr) => byTag(tr, 'td').length).map((tr) => byTag(tr, 'td').map(txt)) : []
    return {
      ...base, kind: code ? 'code' : 'text', prompt: promptOf(ext), placeholder: ext.getAttribute('placeholderText') ?? '',
      external: byTag(d, 'outcomeDeclaration').find((o) => o.getAttribute('identifier') === 'SCORE')?.getAttribute('externalScored') ?? 'human',
      rubric: code ? rows.map(([name, args, expected]) => `${name}: solve(...${args}) → ${expected}`) : (scorer ? byTag(scorer, 'li').map(txt) : []),
      note: scorer ? child(scorer, 'p').map(txt).filter((t, i) => i > 0).join(' ') : '',
    }
  }
  return { ...base, kind: 'unsupported', prompt: txt(byTag(d, 'itemBody')[0]).slice(0, 200) }
}

/** Gói QTI: test.xml + items → đề của cổng. checks theo cùng kiểu với gói SCORM */
export function readQti(files, doc) {
  const checks = []
  const add = (ok, label, detail = '') => checks.push({ ok, label, detail })
  const testRes = byTag(doc, 'resource').find((r) => (r.getAttribute('type') ?? '').startsWith('imsqti_test'))
  const testHref = testRes?.getAttribute('href') ?? ''
  if (!files[testHref]) { add(false, 'Có tệp đề (assessmentTest)', `Manifest trỏ tới "${testHref}" nhưng gói không có`); return { checks, info: null } }
  let test
  try { test = parse(strFromU8(files[testHref])) } catch { add(false, 'Có tệp đề (assessmentTest)', `${testHref} bị lỗi XML`); return { checks, info: null } }
  add(true, 'Chuẩn IMS QTI 2.1', `${testHref} · assessmentTest`)
  const dir = testHref.includes('/') ? testHref.replace(/[^/]+$/, '') : ''
  const refs = byTag(test, 'assessmentItemRef').map((r) => dir + r.getAttribute('href'))
  const questions = [], broken = []
  for (const href of refs) {
    try { if (!files[href]) throw new Error(); questions.push(parseItem(strFromU8(files[href]))) } catch { broken.push(href) }
  }
  add(broken.length ? false : true, 'Đọc được mọi câu hỏi', broken.length ? `Lỗi ${broken.length}/${refs.length} câu: ${broken.slice(0, 3).join(', ')}` : `${questions.length}/${refs.length} câu`)
  const unsupported = questions.filter((q) => q.kind === 'unsupported').length
  if (unsupported) add('warn', 'Dạng câu cổng hỗ trợ', `${unsupported} câu dạng cổng chưa hiển thị được, sẽ bỏ qua`)
  const auto = questions.filter((q) => !['text', 'code', 'unsupported'].includes(q.kind))
  const withKey = auto.filter((q) => (q.correct?.length ?? 0) > 0 || (q.accepted?.length ?? 0) > 0)
  add(withKey.length === auto.length ? true : 'warn', 'Có đáp án cho câu chấm tự động', `${withKey.length}/${auto.length} câu`)
  const manual = questions.filter((q) => q.kind === 'text' || q.kind === 'code')
  if (manual.length) add(manual.every((q) => q.rubric.length) ? true : 'warn', 'Có tiêu chí cho câu chấm tay', `${manual.length} câu tự luận/code · ${manual.filter((q) => q.rubric.length).length} câu có tiêu chí`)
  const sel = byTag(test, 'selection')[0]
  const pick = Math.min(Number(sel?.getAttribute('select') ?? questions.length), questions.length)
  const minutes = Math.round(Number(byTag(test, 'timeLimits')[0]?.getAttribute('maxTime') ?? 0) / 60)
  const passOut = byTag(test, 'outcomeDeclaration').find((o) => o.getAttribute('identifier') === 'PASS_SCORE')
  const passScore = passOut ? Number(txt(byTag(passOut, 'value')[0])) : null
  const attempts = Number(byTag(test, 'itemSessionControl')[0]?.getAttribute('maxAttempts') ?? 1) || 1
  add(true, 'Cấu hình đề', `Rút ${pick}/${questions.length} câu · ${minutes ? `${minutes} phút` : 'không giới hạn giờ'} · đạt từ ${passScore ?? '—'}% · ${attempts} lượt`)
  let aiPrompt = ''
  try { aiPrompt = files['exam.json'] ? JSON.parse(strFromU8(files['exam.json'])).aiGrading?.essayPrompt ?? '' : '' } catch { /* không có thì dùng lời nhắc mặc định của cổng */ }
  return {
    checks,
    info: {
      kind: 'qti', version: 'QTI 2.1', title: test.documentElement.getAttribute('title') ?? 'Đề kiểm tra', identifier: doc.documentElement.getAttribute('identifier') ?? '',
      exam: { pick, minutes, passScore, attempts, questions: questions.filter((q) => q.kind !== 'unsupported'), aiPrompt },
      mastery: passScore, launch: testHref,
    },
  }
}

/** Chấm một câu khách quan: trả 0..1; câu chấm tay trả null */
export function gradeItem(q, a) {
  if (q.kind === 'mc' || q.kind === 'mr') {
    const got = new Set([].concat(a ?? []))
    return got.size === q.correct.length && q.correct.every((c) => got.has(c)) ? 1 : 0
  }
  if (q.kind === 'fill') {
    const norm = q.caseSensitive ? (s) => String(s ?? '').trim() : fold
    return q.accepted.map(norm).includes(norm(a)) ? 1 : 0
  }
  if (q.kind === 'match') {
    const pairs = Object.entries(a ?? {}).filter(([, r]) => r).map(([l, r]) => `${l} ${r}`)
    const w = Object.keys(q.weights).length ? q.weights : Object.fromEntries(q.correct.map((p) => [p, 1 / q.correct.length]))
    return Math.min(1, Math.round(pairs.reduce((s, p) => s + (w[p] ?? 0), 0) * 1000) / 1000)
  }
  if (q.kind === 'order') {
    const got = a ?? []
    if (!q.partial) return q.correct.every((c, i) => got[i] === c) ? 1 : 0
    return Math.round((q.correct.filter((c, i) => got[i] === c).length / q.correct.length) * 1000) / 1000
  }
  return null
}

/** Lời nhắc để AI của cổng chấm nháp một câu tự luận theo tiêu chí */
export function aiPromptFor(exam, q, answer) {
  const tpl = exam.aiPrompt || 'Chấm nháp câu tự luận theo tiêu chí, trích bằng chứng cho từng tiêu chí.\nCâu hỏi: {{question}}\nTiêu chí:\n{{rubric}}\nBài làm:\n{{answer}}'
  return tpl.replace('{{question}}', q.prompt).replace('{{rubric}}', q.rubric.map((c, i) => `${i}. ${c}`).join('\n')).replace('{{answer}}', answer || '(bỏ trống)')
}
