// "AI" giả lập: sinh chi tiết bộ đào tạo, dàn ý và nội dung từ mục tiêu + tài liệu.
// Chủ đề khớp một mẫu trong presets.js thì dùng nội dung mẫu đó; không khớp thì soạn khung chung.
import { SEED } from './data'
import { uid } from './store'
import { PRESETS, presetOf, matchPreset } from './presets'

export const EXAMPLE_GOAL = PRESETS[0].goal

// Lấy nội dung mẫu theo khóa đã lưu trong plan ('seed:a-qr' hoặc 'preset:sales:0')
function tplByKey(key) {
  if (!key) return null
  const [kind, a, b] = key.split(':')
  if (kind === 'seed') return SEED.artifacts[a]
  if (kind === 'preset') return PRESETS.find((p) => p.id === a)?.arts[Number(b)]
  return null
}
const presetPlan = (pr) => pr.tpl
  ? pr.tpl.map((id) => ({ type: SEED.artifacts[id].type, title: SEED.artifacts[id].title, summary: SEED.artifacts[id].summary, tpl: `seed:${id}` }))
  : pr.arts.map((a, i) => ({ type: a.type, title: a.title, summary: a.summary, tpl: `preset:${pr.id}:${i}` }))
// Mẫu cùng dạng trong chủ đề (dùng khi người dùng tự thêm tài liệu)
const tplOfType = (kit, type) => { const pr = presetOf(kit); if (!pr) return null; const it = presetPlan(pr).find((x) => x.type === type); return it ? tplByKey(it.tpl) : null }
const tplFor = (p, kit) => tplByKey(p?.tpl) || tplOfType(kit, p?.type)

export function draftKit(goal, files) {
  const pr = matchPreset(goal)
  const srcFiles = files.length ? files : []
  const sources = srcFiles.map((f) => ({ name: f.name, ver: 'v1', size: f.size }))
  if (pr) {
    const base = pr.id === 'docker' ? SEED.kits[0] : pr.kit
    return {
      id: uid('k'), preset: pr.id, goalText: goal, title: base.title,
      desc: pr.id === 'docker' ? base.desc : goal.split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.'),
      audience: base.audience, goals: base.goals, takeaways: base.takeaways, metrics: base.metrics,
      practice: base.practice || 'balanced', delivery: 'self', skill: base.skill, level: base.level,
      sources, plan: presetPlan(pr), artifacts: [], updated: 'Vừa xong', owner: 'AN', stage: 'details',
    }
  }
  const raw = goal.replace(/^tạo (khóa|bài|bộ)( đào tạo)? ?(cho|về)? ?/i, '').split(/[.,]/)[0].trim().slice(0, 48) || 'Bộ đào tạo mới'
  const title = raw.charAt(0).toUpperCase() + raw.slice(1)
  return {
    id: uid('k'), title, goalText: goal,
    desc: `Bộ đào tạo soạn từ mô tả: "${goal.slice(0, 120)}${goal.length > 120 ? '…' : ''}"`,
    audience: 'Nhân viên liên quan tới nội dung đã mô tả.',
    goals: ['Nắm được nội dung chính', 'Áp dụng vào công việc hằng ngày', 'Tránh các lỗi hay gặp'],
    takeaways: ['Giải thích được khái niệm chính', 'Làm đúng các bước cơ bản'],
    metrics: ['Giảm câu hỏi lặp lại gửi bộ phận phụ trách'],
    practice: 'balanced', delivery: 'self', skill: 'onb', level: 1, sources,
    plan: [
      { type: 'qr', title: `${title}: những điều cần biết`, summary: 'Tóm tắt nội dung cốt lõi trong tối đa 3 bài, kèm bài kiểm tra.' },
      { type: 'scenario', title: 'Xử lý tình huống thực tế', summary: 'Người học trả lời một đồng nghiệp trong tình huống thường gặp.' },
    ],
    artifacts: [], updated: 'Vừa xong', owner: 'AN', stage: 'details',
  }
}

// Dàn ý suy ra từ nội dung mẫu, để dàn ý và bản nháp luôn khớp nhau
export function outlineFor(type, kit, p) {
  if (p?.outline) return { ...p.outline, note: 'Bài kiểm tra sẽ được tạo từ nội dung Tài liệu nhanh, theo mức kỹ năng đã chọn.' }
  const t = tplFor(p || { type }, kit)
  if (t) {
    if (type === 'qr') return {
      sections: t.lessons.filter((l) => l.kind === 'lesson').map((l, i) => ({ from: i, t: l.title, items: l.blocks.map((b) => b.h || (b.t === 'kc' && 'Câu hỏi kiểm tra nhanh') || (b.t === 'list' && b.items[0]) || (b.t === 'table' && `Bảng: ${b.head.join(' · ')}`) || (b.t === 'para' && b.p.split('.')[0]) || (b.t === 'image' && `Ảnh: ${b.cap}`)).filter(Boolean).slice(0, 4) })),
      note: 'Bài kiểm tra sẽ được tạo từ nội dung Tài liệu nhanh, theo mức kỹ năng đã chọn.',
    }
    if (type === 'scenario') return { character: `${t.character.name} · ${t.character.role}`, learner: t.learner, situation: t.intro || t.summary, goals: t.scenes.map((s) => s.goal).filter(Boolean) }
    if (type === 'deck') return { slides: t.slides.map((s) => s.title) }
    if (type === 'video') return { chapters: t.chapters.map((c) => c.title), mode: t.ai ? 'ai' : 'upload' }
    if (type === 'guide') return { steps: t.steps.map((s) => s.title) }
  }
  if (type === 'qr') return { sections: ['Tổng quan', 'Các bước thực hiện', 'Lỗi hay gặp'].map((x, i) => ({ from: i, t: x, items: ['Khái niệm chính', 'Ví dụ thực tế'] })), note: 'Bài kiểm tra sẽ được tạo từ nội dung Tài liệu nhanh, theo mức kỹ năng đã chọn.' }
  if (type === 'scenario') return { character: 'Chị Lan · Trưởng nhóm', learner: 'Nhân viên mới', situation: 'Trưởng nhóm hỏi người học cách xử lý một việc thường gặp.', goals: ['Chọn cách làm đúng', 'Giải thích được lý do', 'Tránh lựa chọn rủi ro'] }
  if (type === 'deck') return { slides: ['Mở đầu', 'Nội dung chính', 'Ví dụ', 'Việc cần làm'] }
  if (type === 'video') return { chapters: ['Mở đầu', 'Nội dung chính', 'Tóm tắt'], mode: 'ai' }
  return { steps: ['Mở màn hình', 'Điền thông tin', 'Kiểm tra', 'Gửi'] }
}

// Tạo artifact đầy đủ từ mẫu, đổi id và tiêu đề
export function buildArtifact(p, kit) {
  const t = tplFor(p, kit)
  const map = { qr: 'a-qr', scenario: 'a-scn', deck: 'a-deck', video: 'a-vid', guide: 'a-guide' }
  const a = structuredClone(t || SEED.artifacts[map[p.type]])
  if (!t) Object.assign(a, generic(p.type, kit, a))
  // Dàn ý đã sửa cho slide, video, hướng dẫn, tình huống: đổi tên theo vị trí, thêm khung cho phần mới, bỏ phần đã xóa
  const ol = p.outline
  if (ol?.slides && a.slides) a.slides = ol.slides.map((t, i) => (a.slides[i] ? { ...a.slides[i], title: t } : { id: uid('s'), layout: 'bullets', title: t, items: [''], notes: '' }))
  if (ol?.chapters && a.chapters) { const last = a.chapters[a.chapters.length - 1]?.t || 0; a.chapters = ol.chapters.map((t, i) => (a.chapters[i] ? { ...a.chapters[i], title: t } : { t: last + (i - a.chapters.length + 1) * 60, title: t })); a.duration = Math.max(a.duration || 0, a.chapters[a.chapters.length - 1].t + 60) }
  if (ol?.steps && a.steps) a.steps = ol.steps.map((t, i) => (a.steps[i] ? { ...a.steps[i], title: t } : { title: t, text: '', img: 'screen' }))
  if (ol?.situation != null && a.scenes) {
    const [name, ...role] = (ol.character || '').split(' · ')
    a.intro = ol.situation; a.learner = ol.learner
    if (name) a.character = { ...a.character, name, role: role.join(' · ') || a.character.role }
    a.scenes = ol.goals.map((g, i) => (a.scenes[i] ? { ...a.scenes[i], goal: g } : { id: uid('sc'), title: `Cảnh ${i + 1}`, goal: g, cards: [{ id: uid('c'), kind: 'char', text: '' }, { id: uid('c'), kind: 'decision', choices: [{ t: '', ok: 'good', reply: '' }, { t: '', ok: 'bad', reply: '' }] }] }))
  }
  // Dàn ý đã sửa: giữ bài cũ theo vị trí gốc, đổi tên, bỏ bài đã xóa, dựng khung cho bài mới thêm
  if (p.type === 'qr' && p.outline?.sections && a.lessons) {
    const ls = a.lessons.filter((l) => l.kind === 'lesson'), rest = a.lessons.filter((l) => l.kind !== 'lesson')
    a.lessons = [...p.outline.sections.map((s) => {
      const base = s.from != null ? ls[s.from] : null
      if (base) return { ...base, title: s.t }
      return { id: uid('l'), kind: 'lesson', title: s.t, blocks: [
        { id: uid('b'), t: 'heading', h: s.t, p: 'Bài do bạn thêm vào dàn ý.' },
        ...(s.items.length ? [{ id: uid('b'), t: 'list', intro: 'Nội dung chính:', items: s.items }] : []),
        { id: uid('b'), t: 'gap', p: 'AI chưa tìm thấy nội dung cho bài này trong tài liệu nguồn nên chỉ dựng khung. Thêm tài liệu nguồn hoặc tự viết nội dung.' },
      ] }
    }), ...rest]
  }
  return { ...a, id: uid('a'), type: p.type, kitId: kit.id, title: p.title, summary: p.summary || a.summary, status: 'draft', updated: 'Vừa xong', viewers: 0, sessions: 0, done: 0, link: undefined, gen: true, tutor: a.tutor }
}

// Tên mặc định khi người dùng tự thêm tài liệu vào kế hoạch
export const defaultTitle = (type, kit, fallback) => tplOfType(kit, type)?.title || fallback

// Nội dung chung khi chủ đề không có mẫu: bám theo dàn ý, ghi rõ chỗ cần bổ sung
function generic(type, kit) {
  const o = outlineFor(type, { ...kit, preset: undefined })
  const src = kit.sources[0] ? `${kit.sources[0].name} · mục 1` : undefined
  const gap = { id: uid('b'), t: 'gap', p: kit.sources.length ? 'Một số ý trong dàn ý chưa tìm thấy trong tài liệu nguồn. AI để trống thay vì tự viết.' : 'Chưa có tài liệu nguồn nên AI chỉ soạn khung. Hãy tải tài liệu lên để AI viết nội dung có trích nguồn.' }
  if (type === 'qr') return {
    img: 'office', tutor: [],
    lessons: [...o.sections.map((sec, i) => ({ id: uid('l'), kind: 'lesson', title: sec.t, blocks: [
      { id: uid('b'), t: 'heading', h: sec.t, p: `Bài ${i + 1} của ${kit.title}. ${kit.audience}`, src },
      ...(i < 2 ? [{ id: uid('b'), t: 'image', cap: sec.t, img: i ? 'meeting' : 'team' }] : []),
      { id: uid('b'), t: 'list', intro: 'Học xong bài này, bạn có thể:', items: sec.items },
      ...(i === 0 ? [gap] : []),
    ] })), { id: 'quiz', kind: 'quiz', title: 'Bài kiểm tra' }],
    quiz: { mode: 'practice', skill: kit.skill, level: kit.level, passScore: 70, attempts: 3, minutes: 15, proctor: false, questions: [
      { id: uid('q'), type: 'mc', level: 1, approved: false, q: `Ý nào là mục tiêu chính của khóa "${kit.title}"?`, src, choices: [{ t: kit.goals[0] || 'Nắm được nội dung chính', ok: true, fb: 'Đúng.' }, { t: 'Không có mục tiêu cụ thể', ok: false, fb: 'Xem lại phần mục tiêu.' }] },
    ] },
  }
  if (type === 'scenario') return {
    img: 'person', intro: undefined, character: { name: 'Chị Lan', role: 'Trưởng nhóm' }, learner: o.learner,
    scenes: [{ id: 'sc1', title: 'Cảnh 1', goal: 'Chọn cách làm đúng và giải thích được lý do', cards: [
      { id: uid('c'), kind: 'char', text: `Em mới vào, việc "${kit.title.toLowerCase()}" em định làm thế nào?` },
      { id: uid('c'), kind: 'decision', choices: [
        { t: 'Em làm theo đúng quy trình trong tài liệu và hỏi lại chỗ chưa rõ.', ok: 'good', reply: 'Tốt, cách làm đó an toàn nhất.' },
        { t: 'Em làm theo cách bạn cùng nhóm chỉ, không cần xem quy trình.', ok: 'bad', reply: 'Cách đó dễ sai nếu quy trình vừa thay đổi.' },
      ] },
    ] }],
  }
  if (type === 'deck') return { img: 'desk', slides: o.slides.map((t, i) => i === 0 ? { id: uid('s'), layout: 'cover', title: kit.title, sub: kit.desc.slice(0, 80), notes: '' } : { id: uid('s'), layout: 'bullets', title: t, items: kit.goals.slice(0, 3), notes: '' }) }
  if (type === 'video') return { chapters: o.chapters.map((t, i) => ({ t: i * 120, title: t })), transcript: o.chapters.map((t, i) => ({ t: i * 120, x: `${t}: nội dung đọc từ slide tương ứng.` })), checkpoints: [], duration: o.chapters.length * 120 }
  return {}
}
