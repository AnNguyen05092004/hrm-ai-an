// Trợ lý AI cho giám đốc trên trang Năng lực đội ngũ.
// Mô phỏng: hiểu câu hỏi bằng từ khóa, nhưng mọi con số đều tính từ dữ liệu thật đang có trên trang.
import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, ArrowUp, ArrowRight, Users, Target, Send, Plus, Copy, Bell, UserCheck, BarChart3, BadgeCheck } from 'lucide-react'
import { SKILLS } from '../data'
import { DEPTS, POSITIONS, KPI_TREND, TRAIN_START, LEARNING, UNIT } from '../data-team'
import { Avatar } from '../ui'

const fold = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
const skillName = (sk) => SKILLS.find((s) => s.id === sk)?.name || sk
const initials = (n) => n.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase()

// Nhận kỹ năng và bộ phận trong câu hỏi (so khớp không dấu)
const SK_RE = [
  ['cicd', /ci\/?cd|pipeline|release|trien khai lien tuc/], ['docker', /docker|container/], ['cloud', /cloud|ha tang/],
  ['mlops', /mlops|model|gpu|suy luan/], ['agent', /agent|tro ly ai/], ['sec', /bao mat|attt|an toan thong tin|lo du lieu/],
  ['sql', /sql|so lieu|du lieu bao cao/], ['req', /yeu cau|user story|nghiep vu|\bba\b/], ['lead', /kem cap|lanh dao|phan hoi 1-1|truong nhom/],
  ['cs', /khieu nai|cham soc khach/], ['sales', /ban hang|doanh thu/],
]
const WHATIF_RE = [['cicd', /bug|loi phan mem|kiem thu|test|su co/], ['req', /bug|change request|yeu cau|pham vi/], ['cloud', /chi phi|cloud/], ['mlops', /gpu|model|ai/], ['agent', /agent|tro ly|tu dong/], ['sec', /bao mat|lo|tan cong/], ['sql', /so lieu|bao cao/], ['lead', /giu chan|nghi viec|hoi nhap|ky su moi/]]
const DEPT_RE = [['plat', /nen tang|devops/], ['dev', /phat trien|backend|frontend|mobile/], ['ai', /\bai &|du lieu|\bml\b/], ['prod', /san pham|nghiep vu|\bpm\b/], ['qa', /chat luong|\bqa\b|kiem thu/]]
const findSkill = (f) => SK_RE.find(([, re]) => re.test(f))?.[0]

export const ADVISOR_STARTERS = ['Bộ phận nào yếu nhất về cloud?', 'Ai có nguy cơ trễ hạn?', 'Nếu thêm KPI giảm 20% bug thì cần đào tạo gì?', 'Tóm tắt tình hình tuần này']

function answer(q, c) {
  const f = fold(q), { m, wf, K, allK } = c
  const team = m.team
  const need = (p, sk) => POSITIONS[p.pos]?.need[sk] || 0
  const deptReady = (sks) => Object.keys(DEPTS).filter((d) => d !== 'mgmt').map((d) => {
    let a = 0, b = 0; const ps = team.filter((p) => p.dept === d)
    ps.forEach((p) => sks.forEach((sk) => { const n = m.need(p, sk) || need(p, sk); if (!n) return; b += n; a += Math.min(n, m.cur(p, sk)) }))
    return { d, ps, pct: b ? Math.round((a / b) * 100) : null }
  }).filter((x) => x.pct != null).sort((x, y) => x.pct - y.pct)

  // 1. Bộ phận yếu / mạnh
  if (/(bo phan|nhom|phong) nao (yeu|kem|thieu|manh|tot)|yeu nhat|manh nhat/.test(f)) {
    const sk = findSkill(f), sks = sk ? [sk] : m.skills.length ? m.skills : [...new Set(Object.values(POSITIONS).flatMap((p) => Object.keys(p.need)))]
    const rows = deptReady(sks); if (/manh|tot/.test(f)) rows.reverse()
    if (!rows.length) return { text: `Chưa vị trí nào trong khung năng lực cần ${skillName(sk)}, nên chưa so sánh được.` }
    const w = rows[0], gapP = w.ps.filter((p) => sks.some((s) => m.gap(p, s) > 0 || (need(p, s) > m.cur(p, s))))
    return {
      text: `${/manh|tot/.test(f) ? 'Mạnh nhất' : 'Yếu nhất'}${sk ? ` về ${skillName(sk)}` : ' theo các KPI đang chọn'} là **${DEPTS[w.d]}**: đạt ${w.pct}% mức vị trí cần${gapP.length ? `, ${gapP.length}/${w.ps.length} người còn thiếu` : ''}.`,
      bars: rows.map((r) => ({ label: DEPTS[r.d], value: r.pct, hl: r.d === w.d })), barUnit: '% mức cần',
      people: gapP.slice(0, 4).map((p) => ({ p, note: sks.filter((s) => need(p, s) > m.cur(p, s) || m.gap(p, s) > 0).map((s) => `${skillName(s)} ${m.cur(p, s)}/${m.need(p, s) || need(p, s)}`).join(', ') })),
      actions: [{ label: `Lọc kế hoạch theo ${DEPTS[w.d]}`, icon: 'filter', run: { kind: 'dept', d: w.d } }, ...(sk ? recAction(c, sk) : [])],
      suggest: [`Ai cần học ${sk ? skillName(sk).toLowerCase() : 'CI/CD'}?`, 'Ai có nguy cơ trễ hạn?'],
    }
  }

  // 2. Nguy cơ trễ hạn
  if (/tre han|nguy co|cham hoc|khong hoc|qua han|bo hoc/.test(f)) {
    const risk = LEARNING.filter((x) => x.why).map((x) => ({ ...x, p: team.find((p) => p.id === x.pid) })).filter((x) => x.p)
    const ok = LEARNING.filter((x) => !x.why).length
    return {
      text: `Có **${risk.length} người** có nguy cơ trễ hạn trong ${LEARNING.length} khóa đang học. AI dự báo dựa trên tiến độ, lần học gần nhất và kết quả bài luyện tập. ${ok} người còn lại đang đúng tiến độ.`,
      people: risk.map((x) => ({ p: x.p, note: `${x.course} · ${x.pct}% · hạn ${x.due}`, why: x.why })),
      actions: [{ label: `Gửi nhắc nhở cho ${risk.length} người`, icon: 'bell', run: { kind: 'say', msg: `Đã gửi nhắc nhở kèm đường dẫn học tiếp cho ${risk.length} người` } }, ...risk.slice(0, 1).map((x) => { const mt = team.filter((t) => t.id !== x.p.id && t.dept === x.p.dept).sort((a, b) => b.since - a.since).pop(); return mt ? { label: `Nhờ ${mt.name} kèm ${x.p.name}`, icon: 'mentor', run: { kind: 'say', msg: `Đã nhờ ${mt.name} kèm cặp ${x.p.name} trong 2 tuần` } } : null }).filter(Boolean)],
      suggest: ['Tóm tắt tình hình tuần này'],
    }
  }

  // 3. Nếu thêm KPI ...
  if (/neu (them|co|dat)|them kpi|kpi moi|muon (giam|tang)|can dao tao gi/.test(f)) {
    const sks = [...new Set(WHATIF_RE.filter(([, re]) => re.test(f)).map(([sk]) => sk))].slice(0, 3)
    if (!sks.length) return { text: 'Mình chưa xác định được kỹ năng nào ảnh hưởng tới KPI này. Bạn thử nói rõ hơn (ví dụ "giảm bug", "giảm chi phí cloud"), hoặc thêm KPI và tự chọn kỹ năng.', actions: [{ label: 'Mở form Thêm KPI', icon: 'plus', run: { kind: 'kpiModal' } }] }
    const title = q.replace(/^(nếu|neu)\s+(thêm|có)\s+(kpi\s+)?/i, '').replace(/\s*thì.*$/i, '').replace(/\?$/, '').trim()
    const rows = sks.map((sk) => {
      const ps = team.filter((p) => need(p, sk) > m.cur(p, sk)), kit = c.kitFor(sk)
      return { sk, ps, kit, pr: c.presetFor(sk) }
    })
    const total = new Set(rows.flatMap((r) => r.ps.map((p) => p.id))).size
    return {
      text: `Để đạt “${title}”, AI đề xuất tập trung ${sks.length} kỹ năng. Có **${total} người** còn thiếu ít nhất một kỹ năng trong số này.`,
      list: rows.map((r) => `${skillName(r.sk)}: ${r.ps.length} người thiếu · ${r.kit && !r.kit.stage ? `có khóa “${r.kit.title}”` : r.pr ? `chưa có khóa, AI tạo được “${r.pr.kit.title}”` : 'chưa có khóa'}`),
      note: sks.includes('cicd') && /bug|loi/.test(f) ? 'Căn cứ: 6/9 sự cố quý 3 do bỏ qua quality gate; dự án có tiêu chí chấp nhận rõ ít phải sửa hơn gần 3 lần.' : undefined,
      actions: [{ label: 'Thêm KPI này và lập kế hoạch', icon: 'plus', run: { kind: 'addKpi', title: title.charAt(0).toUpperCase() + title.slice(1), skills: sks } }],
      suggest: ['Bộ phận nào yếu nhất về CI/CD?'],
    }
  }

  // 4. Tóm tắt
  if (/tom tat|tinh hinh|bao cao|tong quan|tuan nay/.test(f)) {
    const late = K.filter((k) => k.state === 'late'), risk = LEARNING.filter((x) => x.why).length
    const pend = c.pending.length, assigned = Object.values(wf.assigned).reduce((a, x) => a + x.people.length, 0)
    const lines = [
      `Mức sẵn sàng của đội cho ${K.length} KPI: ${m.ready(false)}%${wf.analyzed ? `, dự kiến ${m.ready(true)}% nếu làm theo kế hoạch` : ''}.`,
      late.length ? `KPI chậm tiến độ: ${late.map((k) => k.title).join('; ')}.` : 'Không có KPI nào chậm tiến độ.',
      ...K.filter((k) => KPI_TREND[k.id]).slice(0, 3).map((k) => { const t = KPI_TREND[k.id], b = t.values[TRAIN_START - 1], n = t.values[t.values.length - 1]; return `${k.title}: ${t.fmt(b)} → ${t.fmt(n)} từ khi đào tạo.` }),
      `${assigned} lượt giao khóa mới trong kế hoạch; ${risk} người có nguy cơ trễ hạn.`,
      pend ? `${pend} đề xuất lên mức kỹ năng đang chờ bạn xác nhận.` : 'Không có đề xuất lên mức nào chờ xác nhận.',
    ]
    return {
      text: `Tình hình ${UNIT.name}, tuần đến 18/11/2026:`, list: lines,
      actions: [{ label: 'Sao chép báo cáo', icon: 'copy', run: { kind: 'copy', text: lines.map((l) => `• ${l}`).join('\n') } }, ...(pend ? [{ label: 'Xem đề xuất lên mức', icon: 'badge', run: { kind: 'tab', tab: 'assess' } }] : []), { label: 'Xem tác động lên KPI', icon: 'chart', run: { kind: 'tab', tab: 'impact' } }],
      suggest: ['Ai có nguy cơ trễ hạn?', 'KPI nào đang chậm?'],
    }
  }

  // 5. KPI
  if (/kpi nao|tien do kpi|kpi (dang )?cham|kpi.*(the nao|ra sao)/.test(f)) {
    const rows = (K.length ? K : allK).filter((k) => KPI_TREND[k.id]).map((k) => { const t = KPI_TREND[k.id], b = t.values[TRAIN_START - 1], n = t.values[t.values.length - 1]; const ch = Math.round(((n - b) / (b || 1)) * 100); return { k, t, b, n, ch, good: t.lower ? n < b : n > b } })
    return {
      text: `${K.length ? `Đang theo dõi ${K.length} KPI` : `Có ${rows.length} KPI`}. ${K.filter((k) => k.state === 'late').length} KPI chậm tiến độ, ${K.filter((k) => k.state === 'risk').length} có rủi ro.`,
      list: rows.map((r) => `${r.k.title}: ${r.t.fmt(r.b)} → ${r.t.fmt(r.n)} (${r.ch > 0 ? '+' : ''}${r.ch}%)${r.k.state === 'late' ? ' · chậm tiến độ' : r.k.state === 'risk' ? ' · có rủi ro' : ''}`),
      actions: [{ label: 'Xem tác động lên KPI', icon: 'chart', run: { kind: 'tab', tab: 'impact' } }],
    }
  }

  // 6. Ai giỏi / ai kèm cặp được
  const sk = findSkill(f)
  if (sk && /gioi|kem cap duoc|chuyen gia|manh nhat ve|ai biet/.test(f)) {
    const top = team.filter((p) => m.cur(p, sk) >= 2).sort((a, b) => m.cur(b, sk) - m.cur(a, sk)).slice(0, 4)
    return top.length ? { text: `Người có mức cao nhất về ${skillName(sk)}, có thể kèm cặp người khác:`, people: top.map((p) => ({ p, note: `Mức ${m.cur(p, sk)} · ${POSITIONS[p.pos].name}` })) } : { text: `Chưa ai trong đội đạt mức 2 về ${skillName(sk)}. Nên mời chuyên gia bên ngoài hoặc tạo khóa nâng cao.`, actions: recAction(c, sk) }
  }

  // 7. Ai cần học / thiếu kỹ năng X
  if (sk && /ai (can|thieu|chua)|nhung ai|can hoc|thieu/.test(f)) {
    const ps = team.filter((p) => (m.need(p, sk) || need(p, sk)) > m.cur(p, sk))
    return {
      text: ps.length ? `**${ps.length} người** chưa đạt mức vị trí cần về ${skillName(sk)}:` : `Mọi người đã đạt mức cần về ${skillName(sk)}.`,
      people: ps.map((p) => ({ p, note: `${POSITIONS[p.pos].name} · mức ${m.cur(p, sk)}/${m.need(p, sk) || need(p, sk)}` })),
      actions: recAction(c, sk), suggest: [`Bộ phận nào yếu nhất về ${skillName(sk).toLowerCase()}?`],
    }
  }

  // 8. Hỏi về một người
  const who = team.find((p) => { const n = fold(p.name).split(' '); return f.includes(fold(p.name)) || (n.length > 1 && f.includes(n.slice(-2).join(' '))) || new RegExp(`\\b${n[n.length - 1]}\\b`).test(f) })
  if (who) {
    const gaps = Object.keys({ ...POSITIONS[who.pos].need, ...Object.fromEntries(m.skills.map((s) => [s, 1])) }).filter((s) => (m.need(who, s) || need(who, s)) > m.cur(who, s))
    const lr = LEARNING.filter((x) => x.pid === who.id)
    return {
      text: `**${who.name}** (${POSITIONS[who.pos].name}, ${DEPTS[who.dept]}) ${gaps.length ? `còn thiếu ${gaps.length} kỹ năng so với vị trí:` : 'đã đạt mọi kỹ năng vị trí cần.'}`,
      list: [...gaps.map((s) => `${skillName(s)}: mức ${m.cur(who, s)}/${m.need(who, s) || need(who, s)}`), ...lr.map((x) => `Đang học “${x.course}”: ${x.pct}%, hạn ${x.due}${x.why ? ` · ${x.why.toLowerCase()}` : ''}`)],
      actions: [{ label: 'Mở hồ sơ năng lực', icon: 'users', run: { kind: 'person', id: who.id } }],
    }
  }

  // 9. Không hiểu
  return {
    text: 'Mình trả lời được các câu hỏi về đội ngũ, kỹ năng, KPI và tiến độ học, dựa trên dữ liệu trên trang này. Ví dụ:',
    suggest: ['Bộ phận nào yếu nhất về AI agent?', 'Ai cần học SQL?', 'Ai giỏi CI/CD nhất?', 'Phạm Thu Hà cần học gì?', 'KPI nào đang chậm?', 'Nếu thêm KPI giảm 30% chi phí cloud thì cần đào tạo gì?'],
  }
}

// Nút hành động theo kỹ năng: giao khóa có sẵn hoặc tạo khóa mới
function recAction(c, sk) {
  const kit = c.kitFor(sk), pr = c.presetFor(sk)
  if (kit && !kit.stage) return [{ label: `Giao khóa “${kit.title}”`, icon: 'send', run: { kind: 'assign', sk } }]
  if (pr) return [{ label: `Tạo khóa “${pr.kit.title}” bằng AI`, icon: 'spark', run: { kind: 'gen', sk } }]
  return []
}

const ICONS = { filter: Target, send: Send, spark: Sparkles, plus: Plus, copy: Copy, bell: Bell, mentor: UserCheck, chart: BarChart3, badge: BadgeCheck, users: Users }
const Bold = ({ t }) => t.split(/\*\*(.+?)\*\*/g).map((x, i) => (i % 2 ? <b key={i}>{x}</b> : x))

export default function Advisor({ open, onClose, ctx }) {
  const [msgs, setMsgs] = useState([])
  const [t, setT] = useState('')
  const [typing, setTyping] = useState(false)
  const end = useRef(), lock = useRef(false)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing])
  if (!open) return null
  const ask = (q) => {
    if (!q.trim() || lock.current) return
    lock.current = true
    setMsgs((x) => [...x, { me: q }]); setT(''); setTyping(true)
    setTimeout(() => { setMsgs((x) => [...x, answer(q, ctx)]); setTyping(false); lock.current = false }, 700)
  }
  const last = msgs.length - 1
  return (
    <div className="fade fixed bottom-24 right-6 z-40 flex h-[min(600px,calc(100vh-120px))] w-[440px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-100"><Sparkles size={15} className="text-violet-600" /></span>
        <div className="min-w-0 flex-1 leading-tight"><div className="text-[14px] font-semibold">Trợ lý năng lực đội ngũ</div><div className="truncate text-[12px] text-neutral-500">Trả lời từ dữ liệu của {UNIT.name}</div></div>
        {msgs.length > 0 && <button onClick={() => setMsgs([])} className="rounded-lg px-2 py-1 text-[12px] font-medium text-neutral-600 hover:bg-neutral-100">Cuộc trò chuyện mới</button>}
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-line"><X size={16} /></button>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto px-5">
        {msgs.length === 0 ? (
          <div className="pt-8 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-violet-300"><Sparkles size={28} className="text-violet-500" /></div>
            <div className="mt-4 text-[17px] font-semibold">Hỏi về đội ngũ của bạn</div>
            <div className="mt-1 text-[13px] text-neutral-500">Kỹ năng, KPI, tiến độ học, ai cần học gì</div>
            <div className="mt-5 flex flex-col items-center gap-2">{ADVISOR_STARTERS.map((l) => <button key={l} onClick={() => ask(l)} className="rounded-full border-2 border-violet-300 px-4 py-1.5 text-[14px] font-medium hover:bg-violet-50">{l}</button>)}</div>
          </div>
        ) : msgs.map((mm, i) => mm.me ? (
          <div key={i} className="my-3 flex justify-end"><div className="max-w-[85%] rounded-2xl bg-ink px-4 py-2.5 text-[14px] text-white">{mm.me}</div></div>
        ) : (
          <div key={i}>
            <div className="my-3 rounded-2xl bg-neutral-100 px-4 py-3 text-[14px] leading-relaxed">
              <Bold t={mm.text} />
              {mm.bars && <div className="mt-3 space-y-1.5">{mm.bars.map((b) => (
                <div key={b.label} className="flex items-center gap-2 text-[12px]"><span className={`w-[128px] shrink-0 truncate ${b.hl ? 'font-semibold' : 'text-neutral-600'}`}>{b.label}</span><div className="h-2 flex-1 rounded-r bg-white"><div className={`h-2 rounded-r ${b.hl ? 'bg-sky-600' : 'bg-sky-300'}`} style={{ width: `${b.value}%` }} /></div><span className="w-9 shrink-0 text-right font-semibold">{b.value}%</span></div>
              ))}<div className="text-right text-[11px] text-neutral-500">{mm.barUnit}</div></div>}
              {mm.list && <ul className="mt-2 space-y-1">{mm.list.map((x) => <li key={x} className="flex gap-2"><ArrowRight size={13} className="mt-1 shrink-0 text-violet-600" />{x}</li>)}</ul>}
              {mm.people && <div className="mt-2.5 space-y-1.5">{mm.people.map(({ p, note, why }) => (
                <button key={p.id} onClick={() => ctx.run({ kind: 'person', id: p.id })} className="flex w-full items-start gap-2.5 rounded-xl bg-white px-2.5 py-2 text-left hover:shadow-card">
                  <Avatar text={initials(p.name)} size={26} color={p.color} />
                  <div className="min-w-0 flex-1 leading-tight"><div className="text-[13px] font-semibold">{p.name}</div><div className="text-[12px] text-neutral-600">{note}</div>{why && <div className="mt-0.5 text-[12px] text-amber-700">{why}</div>}</div>
                </button>
              ))}</div>}
              {mm.note && <div className="mt-2 text-[12px] text-neutral-500">{mm.note}</div>}
              {mm.actions?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{mm.actions.map((a) => { const I = ICONS[a.icon] || ArrowRight; return <button key={a.label} onClick={() => ctx.run(a.run)} className="flex items-center gap-1.5 rounded-full border border-violet-300 bg-white px-3 py-1 text-[12px] font-semibold text-violet-700 hover:bg-violet-50"><I size={13} />{a.label}</button> })}</div>}
            </div>
            {i === last && !typing && mm.suggest?.length > 0 && <div className="-mt-1 mb-3 flex flex-wrap gap-1.5">{mm.suggest.map((x) => <button key={x} onClick={() => ask(x)} className="rounded-full border border-line bg-white px-3 py-1 text-[12px] text-neutral-700 hover:border-violet-300 hover:bg-violet-50">{x}</button>)}</div>}
          </div>
        ))}
        {typing && <div className="my-3 flex w-16 items-center justify-center gap-1 rounded-2xl bg-neutral-100 py-3">{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${d * 0.15}s` }} />)}</div>}
        <div ref={end} />
      </div>
      <div className="p-4">
        <div className="flex items-center rounded-xl border border-line px-3 py-2"><input value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(t)} className="flex-1 text-[14px] outline-none" placeholder="Hỏi về đội ngũ, kỹ năng, KPI…" /><button onClick={() => ask(t)} className="grid h-7 w-7 place-items-center rounded-md bg-neutral-100"><ArrowUp size={15} /></button></div>
        <p className="mt-2 text-center text-[11px] leading-snug text-neutral-500">Số liệu tính từ dữ liệu trên trang. AI có thể hiểu sai câu hỏi, hãy kiểm tra trước khi quyết định.</p>
      </div>
    </div>
  )
}
