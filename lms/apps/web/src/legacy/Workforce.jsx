import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Target, Check, ArrowRight, Users, Plus, Send, ChevronRight, ChevronDown, Search, Filter, Trash2, UserCheck, Info, X, Wand2, BadgeCheck, TrendingUp, TrendingDown, FileCode2, MessagesSquare, ClipboardCheck, Activity, UserRound, ClipboardList } from 'lucide-react'
import { useStore, useRole } from '../store'
import { SKILLS } from '../data'
import { UNIT, DUES, DEPTS, POSITIONS, TEAM, KPIS, KPI_EXAMPLES, SKILL_HINTS, EVIDENCE, LEVEL_HISTORY, AUTO_RULE, MONTHS, TRAIN_START, KPI_TREND, TRAIN_STATS } from '../data-team'
import { PRESETS } from '../presets'
import { draftKit } from '../gen'
import { Avatar, Thumb, Spinner, Drawer, Modal } from '../ui'
import { TopOrg } from '../Shell'
import Advisor from './Advisor'

/* ---------- Mô hình tính khoảng trống ---------- */
const DEF = { kpis: ['k1', 'k2', 'k3', 'k4'], analyzed: false, assigned: {}, customKpis: [], members: [], lv: {}, resolved: {}, history: [], extraPending: [], placement: {} }
const getWf = (S) => ({ ...DEF, ...(S.wf || {}) })
const skillName = (sk) => SKILLS.find((s) => s.id === sk)?.name || sk
const SHORT = { cicd: 'CI/CD', docker: 'Docker', sql: 'SQL', sec: 'ATTT', cloud: 'Cloud', mlops: 'MLOps', agent: 'AI agent', req: 'Yêu cầu', lead: 'Kèm cặp', cs: 'Khiếu nại', sales: 'Bán hàng', onb: 'Nội quy', safety: 'ATLĐ', ml: 'Huấn luyện ML', k8s: 'K8s' }
const initials = (n) => n.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase()
const POS_DEPT = { head: 'mgmt', pm: 'prod', ba: 'prod', tl: 'plat', devops: 'plat', be: 'dev', fe: 'dev', mobile: 'dev', ml: 'ai', data: 'ai', qa: 'qa' }
const PRESET_OF = { onb: 'onboard' }
const presetFor = (sk) => PRESETS.find((p) => p.id === PRESET_OF[sk]) || PRESETS.find((p) => p.kit?.skill === sk)
// Khóa trong thư viện cho kỹ năng: ưu tiên bộ đã soạn xong
const kitFor = (S, sk) => { const ks = S.kits.filter((k) => k.skill === sk); return ks.find((k) => !k.stage) || ks[0] || null }

function build(S, wf, K) {
  const team = [...TEAM, ...wf.members].map((p) => ({ ...p, lv: { ...p.lv, ...(wf.lv[p.id] || {}) } }))
  // Mức cần = khung năng lực của vị trí, hoặc cao hơn nếu KPI tự thêm yêu cầu
  const need = (p, sk) => Math.max(POSITIONS[p.pos]?.need[sk] || 0, ...K.filter((k) => k.boost && k.skills.includes(sk) && k.boost.roles.includes(p.pos)).map((k) => k.boost.level))
  const cur = (p, sk) => p.lv[sk] || 0
  const gap = (p, sk) => Math.max(0, need(p, sk) - cur(p, sk))
  const skills = SKILLS.map((s) => s.id).filter((sk) => K.some((k) => k.skills.includes(sk)))
  const mentorOf = (p, sk) => team.filter((m) => m.id !== p.id && cur(m, sk) >= need(p, sk)).sort((a, b) => cur(b, sk) - cur(a, sk))[0]
  const recs = skills.map((sk) => {
    const kit = kitFor(S, sk), pr = presetFor(sk)
    const L = kit?.level || pr?.kit.level || 2 // một khóa chỉ đưa người học tới mức của khóa
    const G = team.filter((p) => gap(p, sk) > 0)
    const ks = K.filter((k) => k.skills.includes(sk))
    return { sk, kit, pr, L, G, B: G.filter((p) => cur(p, sk) < L), R: G.filter((p) => cur(p, sk) >= L), kpis: ks, score: G.reduce((s, p) => s + gap(p, sk), 0) * ks.length }
  }).filter((r) => r.G.length).sort((a, b) => b.score - a.score)
  const after = (p, sk) => { const r = recs.find((x) => x.sk === sk); return r ? Math.max(cur(p, sk), Math.min(need(p, sk), r.L)) : cur(p, sk) }
  const ready = (future) => {
    let a = 0, b = 0
    team.forEach((p) => skills.forEach((sk) => { const n = need(p, sk); if (!n) return; b += n; a += Math.min(n, future ? after(p, sk) : cur(p, sk)) }))
    return b ? Math.round((a / b) * 100) : 100
  }
  const unused = skills.filter((sk) => !team.some((p) => need(p, sk)))
  return { team, need, cur, gap, skills, recs, mentorOf, after, ready, unused }
}

const STATE = { late: ['Chậm tiến độ', 'bg-red-50 text-red-600'], risk: ['Có rủi ro', 'bg-amber-50 text-amber-700'], ok: ['Đúng tiến độ', 'bg-emerald-50 text-emerald-700'] }
const cellCls = (g, n) => !n ? 'text-neutral-300' : g === 0 ? 'bg-emerald-50 text-emerald-700' : g === 1 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'

const Bar = ({ now, next }) => (
  <div className="relative h-1.5 rounded-full bg-neutral-200">
    {next != null && <div className="absolute inset-y-0 left-0 rounded-full bg-sky-200" style={{ width: `${next}%` }} />}
    <div className="absolute inset-y-0 left-0 rounded-full bg-sky-500" style={{ width: `${now}%` }} />
  </div>
)

function LevelPick({ value, onChange, need }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3].map((v) => (
        <button key={v} onClick={() => onChange(v)} title={`Mức ${v}`}
          className={`h-7 w-7 rounded-md border text-[12px] font-semibold transition ${value === v ? 'border-ink bg-ink text-white' : need && v === need ? 'border-dashed border-neutral-400 text-neutral-600' : 'border-line text-neutral-500 hover:bg-neutral-50'}`}>{v}</button>
      ))}
    </div>
  )
}

const People = ({ list, max = 5 }) => (
  <span className="flex -space-x-1.5">{list.slice(0, max).map((p) => <span key={p.id} title={p.name} className="rounded-full ring-2 ring-white"><Avatar text={initials(p.name)} size={26} color={p.color} /></span>)}{list.length > max && <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-neutral-100 text-[11px] font-semibold ring-2 ring-white">+{list.length - max}</span>}</span>
)

/* ---------- Thêm KPI ---------- */
function KpiModal({ open, onClose, onSave }) {
  const blank = { title: '', metric: '', now: '', target: '', due: '31/03/2027', skills: [], roles: [], level: 2 }
  const [f, setF] = useState(blank)
  useEffect(() => { if (open) setF(blank) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const up = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const tog = (k, v) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }))
  const hints = SKILL_HINTS.filter(([, re]) => re.test(f.title)).map(([sk]) => sk).filter((sk) => !f.skills.includes(sk))
  const ok = f.title.trim() && f.skills.length
  return (
    <Modal open={open} onClose={onClose} title="Thêm KPI" sub="AI dùng KPI này để tìm kỹ năng đội còn thiếu và đề xuất khóa." w={620}
      footer={<><button className="btn-ghost" onClick={onClose}>Hủy</button><button disabled={!ok} className="btn-dark" onClick={() => onSave(f)}>Thêm KPI</button></>}>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px]"><span className="text-neutral-500">Ví dụ:</span>{KPI_EXAMPLES.map((e) => <button key={e.title} onClick={() => setF((x) => ({ ...x, ...e, skills: SKILL_HINTS.filter(([, re]) => re.test(e.title)).map(([sk]) => sk) }))} className="rounded-full border border-line px-3 py-1 hover:bg-neutral-50">{e.title}</button>)}</div>
      <label className="label text-[14px]">Tên KPI</label>
      <input autoFocus className="field py-2.5" value={f.title} onChange={(e) => up('title', e.target.value)} placeholder="Ví dụ: Giảm 30% thời gian phản hồi khách hàng" />
      <div className="mt-4 grid grid-cols-4 gap-3">
        {[['metric', 'Chỉ số đo', 'Giờ phản hồi'], ['now', 'Hiện tại', '12 giờ'], ['target', 'Mục tiêu', '≤ 8 giờ']].map(([k, l, ph]) => <div key={k}><label className="label text-[14px]">{l}</label><input className="field py-2.5" value={f[k]} onChange={(e) => up(k, e.target.value)} placeholder={ph} /></div>)}
        <div><label className="label text-[14px]">Hạn</label><select className="field py-2.5" value={f.due} onChange={(e) => up('due', e.target.value)}>{[...DUES, '30/06/2027', '31/12/2027'].map((d) => <option key={d}>{d}</option>)}</select></div>
      </div>
      <label className="label mt-5 text-[14px]">Kỹ năng ảnh hưởng tới KPI</label>
      <div className="flex flex-wrap gap-2">
        {f.skills.map((sk) => <span key={sk} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[13px] font-medium text-white">{skillName(sk)}<button onClick={() => tog('skills', sk)}><X size={13} /></button></span>)}
        {f.skills.length === 0 && <span className="text-[13px] text-neutral-500">Chưa chọn kỹ năng nào.</span>}
      </div>
      {hints.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]"><span className="flex items-center gap-1 font-medium text-violet-700"><Sparkles size={13} />AI gợi ý</span>{hints.map((sk) => <button key={sk} onClick={() => tog('skills', sk)} className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-800 hover:bg-violet-100"><Plus size={12} />{skillName(sk)}</button>)}</div>}
      <div className="mt-3"><select className="field py-2 text-[14px]" value="" onChange={(e) => e.target.value && tog('skills', e.target.value)}><option value="">+ Chọn thêm kỹ năng…</option>{SKILLS.filter((s) => !f.skills.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name} · {s.comp}</option>)}</select></div>
      <label className="label mt-5 text-[14px]">Yêu cầu thêm cho vị trí <span className="font-normal text-neutral-500">(tùy chọn)</span></label>
      <p className="-mt-1 mb-2 text-[13px] text-neutral-600">Khi KPI cần mức cao hơn khung năng lực hiện tại, chọn vị trí và mức cần đạt.</p>
      <div className="flex flex-wrap gap-2">{Object.entries(POSITIONS).map(([k, p]) => <button key={k} onClick={() => tog('roles', k)} className={`rounded-full border px-3 py-1 text-[13px] ${f.roles.includes(k) ? 'border-ink bg-neutral-100 font-semibold' : 'border-line text-neutral-600 hover:bg-neutral-50'}`}>{p.name}</button>)}</div>
      {f.roles.length > 0 && <div className="mt-3 flex items-center gap-3 text-[14px]">Mức cần đạt <LevelPick value={f.level} onChange={(v) => up('level', Math.max(1, v))} /></div>}
    </Modal>
  )
}

/* ---------- Thêm nhân viên ---------- */
function MemberModal({ open, onClose, onSave }) {
  const [f, setF] = useState({ name: '', pos: 'be', dept: 'dev', lv: {}, place: true })
  useEffect(() => { if (open) setF({ name: '', pos: 'be', dept: 'dev', lv: {}, place: true }) }, [open])
  const needs = Object.entries(POSITIONS[f.pos].need)
  return (
    <Modal open={open} onClose={onClose} title="Thêm nhân viên" sub="Mức kỹ năng lấy từ hồ sơ năng lực; có thể chỉnh lại sau." w={560}
      footer={<><button className="btn-ghost" onClick={onClose}>Hủy</button><button disabled={!f.name.trim()} className="btn-dark" onClick={() => onSave(f)}>Thêm</button></>}>
      <label className="label text-[14px]">Họ và tên</label>
      <input autoFocus className="field py-2.5" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ví dụ: Nguyễn Văn Bình" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div><label className="label text-[14px]">Vị trí</label><select className="field py-2.5" value={f.pos} onChange={(e) => setF({ ...f, pos: e.target.value, dept: POS_DEPT[e.target.value] || f.dept, lv: {} })}>{Object.entries(POSITIONS).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}</select></div>
        <div><label className="label text-[14px]">Bộ phận</label><select className="field py-2.5" value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value })}>{Object.entries(DEPTS).map(([k, d]) => <option key={k} value={k}>{d}</option>)}</select></div>
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
        <input type="checkbox" checked={f.place} onChange={(e) => setF({ ...f, place: e.target.checked })} className="mt-1 h-4 w-4 accent-neutral-900" />
        <span><span className="flex items-center gap-1.5 text-[14px] font-semibold"><Sparkles size={14} className="text-violet-600" />Để AI xếp mức bằng bài kiểm tra 10 phút</span><span className="mt-0.5 block text-[13px] text-neutral-600">Nhân viên nhận bài kiểm tra theo kỹ năng của vị trí. AI chấm và đề xuất mức, bạn xác nhận ở tab Đánh giá năng lực.</span></span>
      </label>
      {!f.place && <><label className="label mt-5 text-[14px]">Mức kỹ năng hiện tại</label>
      <div className="divide-y divide-line rounded-xl border border-line">
        {needs.map(([sk, n]) => <div key={sk} className="flex items-center justify-between px-4 py-2.5 text-[14px]"><span>{skillName(sk)}<span className="ml-2 text-[12px] text-neutral-500">vị trí cần mức {n}</span></span><LevelPick value={f.lv[sk] || 0} need={n} onChange={(v) => setF({ ...f, lv: { ...f.lv, [sk]: v } })} /></div>)}
      </div></>}
    </Modal>
  )
}

/* ---------- Giao khóa ---------- */
function AssignModal({ r, m, current, onClose, onSave }) {
  const [sel, setSel] = useState([])
  const [due, setDue] = useState(UNIT.due)
  useEffect(() => { if (r) { setSel(current ? current.people.filter((id) => r.G.some((p) => p.id === id)) : r.B.map((p) => p.id)); setDue(current?.due || UNIT.due) } }, [r]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!r) return null
  const shared = r.kit.artifacts.some((x) => m.S.artifacts[x]?.status === 'published')
  return (
    <Modal open onClose={onClose} title="Giao khóa" w={560}
      footer={<><button className="btn-ghost" onClick={onClose}>Hủy</button><button disabled={!sel.length} className="btn-dark" onClick={() => onSave(sel, due)}><Send size={16} />Giao cho {sel.length} người</button></>}>
      <div className="flex items-center gap-3 rounded-xl border border-line p-3">
        <Thumb img={m.S.artifacts[r.kit.artifacts[0]]?.img || 'office'} className="h-12 w-12 shrink-0 rounded-lg" />
        <div className="min-w-0"><div className="truncate text-[15px] font-semibold">{r.kit.title}</div><div className="text-[13px] text-neutral-500">{skillName(r.sk)} · đưa tới mức {r.L} · {r.kit.artifacts.length} tài liệu</div></div>
      </div>
      <div className="mt-5 flex items-center justify-between"><span className="label mb-0 text-[14px]">Người học</span><button className="text-[13px] font-medium text-sky-700 hover:underline" onClick={() => setSel(sel.length === r.G.length ? [] : r.G.map((p) => p.id))}>{sel.length === r.G.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</button></div>
      <div className="mt-2 max-h-[300px] divide-y divide-line overflow-y-auto rounded-xl border border-line scroll-thin">
        {[...r.B, ...r.R].map((p) => { const on = sel.includes(p.id), helps = r.B.includes(p); return (
          <label key={p.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-neutral-50">
            <input type="checkbox" checked={on} onChange={() => setSel(on ? sel.filter((x) => x !== p.id) : [...sel, p.id])} className="h-4 w-4 accent-neutral-900" />
            <Avatar text={initials(p.name)} size={30} color={p.color} />
            <div className="min-w-0 flex-1 leading-tight"><div className="text-[14px] font-medium">{p.name}</div><div className="text-[12px] text-neutral-500">{POSITIONS[p.pos].name}</div></div>
            <span className="text-[12px]">{helps ? <span className="text-neutral-600">mức {m.cur(p, r.sk)} → {Math.min(m.need(p, r.sk), r.L)}</span> : <span className="text-amber-700">khóa chưa đủ mức {m.need(p, r.sk)}</span>}</span>
          </label>) })}
      </div>
      <div className="mt-5 grid grid-cols-2 items-end gap-3">
        <div><label className="label text-[14px]">Hạn hoàn thành</label><select className="field py-2.5" value={due} onChange={(e) => setDue(e.target.value)}>{DUES.map((d) => <option key={d}>{d}</option>)}</select></div>
        <p className="pb-2 text-[12px] text-neutral-500">Người học nhận thông báo và thấy khóa trong “Khóa học của tôi”{!shared && ' sau khi bạn chia sẻ bộ này'}.</p>
      </div>
    </Modal>
  )
}

/* ---------- Đánh giá năng lực ---------- */
const KIND = { exam: [ClipboardCheck, 'Bài thi'], code: [FileCode2, 'Bài code'], scenario: [MessagesSquare, 'Tình huống'], work: [Activity, 'Dữ liệu công việc'], mentor: [UserRound, 'Người kèm cặp'], placement: [ClipboardList, 'Bài xếp mức'] }
const CONF = { high: ['Độ tin cậy cao', 'bg-emerald-50 text-emerald-700'], medium: ['Độ tin cậy trung bình', 'bg-amber-50 text-amber-700'] }

function EvidenceCard({ e, p, m, onOk, onNo }) {
  const from = m.cur(p, e.sk), need = m.need(p, e.sk)
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <Avatar text={initials(p.name)} size={36} color={p.color} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className="text-[15px] font-semibold">{p.name}</span><span className="text-[13px] text-neutral-500">{POSITIONS[p.pos].name}</span><span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${CONF[e.conf][1]}`}>{CONF[e.conf][0]}</span></div>
          <div className="mt-1 text-[14px]"><b>{skillName(e.sk)}</b>: mức {from} <ArrowRight size={13} className="inline text-neutral-400" /> <b>mức {e.to}</b>{need > 0 && <span className="text-neutral-500"> · vị trí cần mức {need}</span>}</div>
        </div>
        <span className="shrink-0 text-[12px] text-neutral-500">{e.at}</span>
      </div>
      <div className="mt-3 divide-y divide-line rounded-xl border border-line">
        {e.items.map(([k, t, r]) => { const [I, l] = KIND[k]; return (
          <div key={t} className="flex items-start gap-3 px-3.5 py-2.5 text-[13px]"><I size={16} className="mt-0.5 shrink-0 text-neutral-500" />{r.length > 32 ? <div className="min-w-0 flex-1"><div className="font-medium">{t}</div><div className="mt-0.5 text-neutral-700">{r}</div><div className="text-[12px] text-neutral-500">{l}</div></div> : <><div className="min-w-0 flex-1"><div className="font-medium">{t}</div><div className="text-[12px] text-neutral-500">{l}</div></div><span className="shrink-0 text-right font-medium">{r}</span></>}</div>
        ) })}
      </div>
      <div className="mt-3 flex items-start gap-1.5 text-[13px] text-neutral-700"><Sparkles size={14} className="mt-0.5 shrink-0 text-violet-600" />{e.why}</div>
      <div className="mt-4 flex justify-end gap-2"><button onClick={onNo} className="btn-ghost h-9 text-[13px]">Giữ mức {from}</button><button onClick={onOk} className="btn-dark h-9 px-4 text-[13px]"><Check size={15} />Xác nhận mức {e.to}</button></div>
    </div>
  )
}

// Biểu đồ đường một chuỗi: mốc bắt đầu đào tạo + đường mục tiêu, rê chuột xem từng tháng
function TrendChart({ t }) {
  const [hv, setHv] = useState(null)
  const W = 520, H = 170, pl = 40, pr = 12, pt = 14, pb = 24
  const raw = Math.max(...t.values, t.target) * 1.1 || 1, mag = 10 ** Math.floor(Math.log10(raw))
  const lo = 0, hi = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((v) => v >= raw)
  const x = (i) => pl + (i * (W - pl - pr)) / (t.values.length - 1)
  const y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb)
  const path = t.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')
  const ticks = [lo, hi / 2, hi]
  const vn = (v) => `${Math.round(v * 100) / 100}`.replace('.', ',')
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHv(null)}>
        {ticks.map((v) => <g key={v}><line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke="#eceae6" /><text x={pl - 6} y={y(v) + 4} textAnchor="end" fontSize="12" fill="#8a8a8a">{vn(v)}</text></g>)}
        <rect x={x(TRAIN_START)} y={pt} width={x(t.values.length - 1) - x(TRAIN_START)} height={H - pt - pb} fill="#f0f7ff" />
        <line x1={x(TRAIN_START)} x2={x(TRAIN_START)} y1={pt} y2={H - pb} stroke="#7aa7d6" strokeDasharray="3 3" />
        <text x={x(TRAIN_START) + 4} y={pt + 10} fontSize="12" fill="#3f6f9f">Bắt đầu đào tạo</text>
        <line x1={pl} x2={W - pr} y1={y(t.target)} y2={y(t.target)} stroke="#555" strokeDasharray="5 4" />
        <text x={pl + 4} y={y(t.target) - 5} fontSize="12" fill="#555">Mục tiêu {vn(t.target)}</text>
        <path d={path} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinejoin="round" />
        {t.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={hv === i ? 5 : 3.5} fill="#0ea5e9" stroke="#fff" strokeWidth="2" />)}
        {MONTHS.map((mo, i) => <text key={mo} x={x(i)} y={H - 6} textAnchor="middle" fontSize="12" fill="#8a8a8a">{mo}</text>)}
        {hv != null && <line x1={x(hv)} x2={x(hv)} y1={pt} y2={H - pb} stroke="#bbb" />}
        {t.values.map((_, i) => <rect key={i} x={x(i) - (W - pl - pr) / (t.values.length - 1) / 2} y={0} width={(W - pl - pr) / (t.values.length - 1)} height={H} fill="transparent" onMouseEnter={() => setHv(i)} />)}
      </svg>
      {hv != null && <div className="pointer-events-none absolute top-0 rounded-lg bg-ink px-2.5 py-1.5 text-[12px] text-white shadow-pop" style={{ left: `${(x(hv) / W) * 100}%`, transform: 'translate(-50%, -100%)' }}>{MONTHS[hv]}/2026 · <b>{t.fmt(t.values[hv])}</b>{hv >= TRAIN_START && ' · đang đào tạo'}</div>}
    </div>
  )
}

function Cohort({ c, lower, fmt }) {
  const mx = Math.max(c.trained, c.untrained) || 1
  const better = lower ? c.trained < c.untrained : c.trained > c.untrained
  const diff = Math.round(Math.abs(c.trained - c.untrained) / (c.untrained || 1) * 100)
  return (
    <div>
      <div className="text-[12px] text-neutral-600">{c.label}</div>
      {[['Đã học', c.trained, c.nT, 'bg-sky-500'], ['Chưa học', c.untrained, c.nU, 'bg-neutral-300']].map(([l, v, n, cl]) => (
        <div key={l} className="mt-1.5 flex items-center gap-2 text-[12px]"><span className="w-[124px] shrink-0 whitespace-nowrap text-neutral-600">{l} ({n} người)</span><div className="h-2.5 flex-1 rounded-r bg-neutral-100"><div className={`h-2.5 rounded-r ${cl}`} style={{ width: `${(v / mx) * 100}%` }} /></div><span className="w-10 shrink-0 text-right font-semibold">{fmt ? fmt(v) : `${v}`.replace('.', ',')}</span></div>
      ))}
      <div className={`mt-1.5 text-[12px] font-medium ${better ? 'text-emerald-700' : 'text-amber-700'}`}>{better ? `Nhóm đã học tốt hơn ${diff}%` : `Chưa thấy khác biệt rõ`}</div>
    </div>
  )
}

/* ---------- Sơ đồ đội ngũ: ai cần học gì ---------- */
const ST_CHIP = {
  assigned: ['bg-emerald-50 text-emerald-700 border-emerald-200', 'Đã giao khóa'],
  course: ['bg-white text-ink border-neutral-300', 'Có khóa, chưa giao'],
  create: ['bg-violet-50 text-violet-700 border-violet-200', 'Chưa có khóa, cần tạo'],
  mentor: ['bg-amber-50 text-amber-700 border-amber-200', 'Cần kèm cặp / khóa nâng cao'],
}
const needsOf = (p, m, wf) => m.recs.filter((r) => r.G.includes(p)).map((r) => ({ sk: r.sk, st: wf.assigned[r.sk]?.people.includes(p.id) ? 'assigned' : r.R.includes(p) ? 'mentor' : r.kit && !r.kit.stage ? 'course' : 'create', cur: m.cur(p, r.sk), need: m.need(p, r.sk) }))

function PersonNode({ p, m, wf, onPerson, onSkill, className = '' }) {
  const ns = needsOf(p, m, wf)
  return (
    <div className={`rounded-xl border border-line bg-white p-2.5 transition hover:shadow-card ${className}`}>
      <button onClick={() => onPerson(p.id)} className="flex w-full items-center gap-2 text-left">
        <Avatar text={initials(p.name)} size={26} color={p.color} />
        <div className="min-w-0 flex-1 leading-tight"><div className="truncate text-[13px] font-semibold">{p.name}</div><div className="truncate text-[11px] text-neutral-500">{POSITIONS[p.pos].name}</div></div>
      </button>
      <div className="mt-2 flex flex-wrap gap-1">
        {ns.length ? ns.map((n) => <button key={n.sk} onClick={() => onSkill(n.sk)} title={`${skillName(n.sk)} · mức ${n.cur} → ${n.need} · ${ST_CHIP[n.st][1]}`} className={`flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium hover:brightness-95 ${ST_CHIP[n.st][0]}`}>{n.st === 'assigned' && <Check size={10} strokeWidth={3} />}{SHORT[n.sk] || skillName(n.sk)}</button>)
          : <span className="text-[11px] font-medium text-emerald-700">Đủ kỹ năng</span>}
      </div>
    </div>
  )
}

function OrgChart({ m, wf, boss, deptSel, setDeptSel, onPerson, onSkill }) {
  const mg = m.team.filter((p) => p.dept === 'mgmt')
  const depts = Object.keys(DEPTS).filter((d) => d !== 'mgmt' && m.team.some((p) => p.dept === d))
  const n = depts.length
  const Line = ({ h = 'h-6' }) => <div className={`mx-auto w-px bg-neutral-300 ${h}`} />
  return (
    <div data-org className="card mt-5 scroll-mt-20 p-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1"><div className="text-[16px] font-semibold">Sơ đồ đội ngũ: ai cần học gì</div><p className="mt-0.5 text-[13px] text-neutral-600">Bấm bộ phận để lọc danh sách bên dưới, bấm người để xem hồ sơ, bấm kỹ năng để tới khóa tương ứng.</p></div>
        <div className="flex flex-wrap gap-3 text-[12px] text-neutral-600">{Object.entries(ST_CHIP).map(([k, [c, l]]) => <span key={k} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded border ${c}`} />{l}</span>)}</div>
      </div>
      <div className="scroll-thin mt-6 overflow-x-auto pb-2">
        <div className="mx-auto min-w-[900px]">
          <div className="mx-auto w-[240px] rounded-xl bg-ink px-4 py-3 text-white">
            <div className="flex items-center gap-2.5"><Avatar text={boss.initials} size={30} color={boss.color} /><div className="leading-tight"><div className="text-[14px] font-semibold">{boss.name}</div><div className="text-[11px] text-white/70">Giám đốc Kỹ thuật · {m.team.length} người</div></div></div>
          </div>
          <Line />
          <div className="flex justify-center gap-3">{mg.map((p) => <PersonNode key={p.id} p={p} m={m} wf={wf} onPerson={onPerson} onSkill={onSkill} className="w-[240px]" />)}</div>
          <Line />
          <div className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            <div className="absolute top-0 h-px bg-neutral-300" style={{ left: `${50 / n}%`, right: `${50 / n}%` }} />
            {depts.map((d) => {
              const ps = m.team.filter((p) => p.dept === d)
              const cnt = {}; ps.forEach((p) => needsOf(p, m, wf).forEach((x) => { cnt[x.sk] = (cnt[x.sk] || 0) + 1 }))
              const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 3)
              const need = ps.filter((p) => needsOf(p, m, wf).length).length
              const on = deptSel === d, dim = deptSel && !on
              return (
                <div key={d} className={`relative px-1.5 pt-6 transition ${dim ? 'opacity-40' : ''}`}>
                  <span className="absolute left-1/2 top-0 h-6 w-px bg-neutral-300" />
                  <button onClick={() => setDeptSel(on ? null : d)} className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${on ? 'border-ink bg-neutral-100 ring-1 ring-ink' : 'border-line bg-neutral-50 hover:bg-neutral-100'}`}>
                    <div className="truncate text-[13px] font-semibold">{DEPTS[d]}</div>
                    <div className="text-[11px] text-neutral-600">{ps.length} người · {need} cần học</div>
                    {top.length > 0 && <div className="mt-1 truncate text-[11px] text-neutral-500">{top.map(([sk, c]) => `${SHORT[sk] || skillName(sk)} ${c}`).join(' · ')}</div>}
                  </button>
                  <div className="ml-3 border-l border-neutral-300 pl-2 pt-2">
                    <div className="space-y-2">{ps.map((p) => <PersonNode key={p.id} p={p} m={m} wf={wf} onPerson={onPerson} onSkill={onSkill} />)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

const STEPS = (k, n) => [`Đọc ${k} KPI đã chọn`, `Đối chiếu khung năng lực của ${n} người`, 'Tìm khóa phù hợp trong Thư viện', 'Xếp ưu tiên theo mức ảnh hưởng tới KPI']

export default function Workforce() {
  const { S, set, say } = useStore()
  const nav = useNavigate()
  const wf = getWf(S)
  const [tab, setTab] = useState('plan')
  const [busy, setBusy] = useState(-1)
  const [who, setWho] = useState(null)
  const [kpiOpen, setKpiOpen] = useState(false)
  const [memOpen, setMemOpen] = useState(false)
  const [asg, setAsg] = useState(null)
  const [adv, setAdv] = useState(false)
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('all')
  const [deptSel, setDeptSel] = useState(null)
  const [hl, setHl] = useState(null)
  const { me } = useRole()

  const allK = [...KPIS, ...wf.customKpis]
  const K = allK.filter((k) => wf.kpis.includes(k.id))
  const m = { ...build(S, wf, K), S }
  const done = wf.analyzed && busy < 0
  const upd = (fn) => set((d) => { d.wf = { ...DEF, ...(d.wf || {}) }; fn(d.wf) })

  useEffect(() => {
    if (busy < 0) return
    if (busy >= 4) { upd((w) => { w.analyzed = true }); setBusy(-1); return }
    const t = setTimeout(() => setBusy(busy + 1), 600)
    return () => clearTimeout(t)
  }, [busy]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleKpi = (id) => upd((w) => { w.kpis = w.kpis.includes(id) ? w.kpis.filter((x) => x !== id) : [...w.kpis, id] })
  const addKpi = (f) => {
    const id = `ck-${Date.now().toString(36)}`
    upd((w) => { w.customKpis.push({ id, title: f.title.trim(), metric: f.metric || 'Chỉ số', now: f.now || '—', target: f.target || '—', due: f.due, state: 'ok', custom: true, skills: f.skills, why: {}, boost: f.roles.length ? { roles: f.roles, level: f.level } : undefined }); w.kpis.push(id) })
    setKpiOpen(false); say('Đã thêm KPI. Bấm “AI lập kế hoạch” để cập nhật đề xuất.')
  }
  const delKpi = (id) => upd((w) => { w.customKpis = w.customKpis.filter((k) => k.id !== id); w.kpis = w.kpis.filter((x) => x !== id) })
  const addMember = (f) => {
    const colors = ['#5b7bd5', '#3a9d8f', '#d0679b', '#c98a2e', '#7d5ba6', '#4f9bd1']
    const id = `m-${Date.now().toString(36)}`
    upd((w) => { w.members.push({ id, name: f.name.trim(), pos: f.pos, dept: f.dept, since: 2026, color: colors[w.members.length % colors.length], lv: f.place ? {} : f.lv, custom: true }); if (f.place) w.placement[id] = 'sent' })
    setMemOpen(false); say(f.place ? `Đã thêm ${f.name.trim()} và gửi bài kiểm tra xếp mức` : `Đã thêm ${f.name.trim()} vào đội`)
  }
  // Đánh giá năng lực
  const pending = [...EVIDENCE, ...wf.extraPending].filter((e) => { const p = m.team.find((x) => x.id === e.pid); return !wf.resolved[e.id] && p && e.to !== m.cur(p, e.sk) })
  const history = [...wf.history, ...LEVEL_HISTORY]
  const okEv = (e, quiet) => {
    const p = m.team.find((x) => x.id === e.pid), from = m.cur(p, e.sk)
    upd((w) => { w.resolved[e.id] = 'ok'; w.lv[e.pid] = { ...(w.lv[e.pid] || {}), [e.sk]: e.to }; w.history.unshift({ pid: e.pid, sk: e.sk, from, to: e.to, at: '18/11', src: e.items[0][1], by: 'you' }) })
    if (!quiet) say(`${p.name}: ${skillName(e.sk)} lên mức ${e.to}`)
  }
  const noEv = (e) => upd((w) => { w.resolved[e.id] = 'no' })
  const okAllHigh = () => { const hs = pending.filter((e) => e.conf === 'high'); hs.forEach((e) => okEv(e, true)); say(`Đã xác nhận ${hs.length} đề xuất có độ tin cậy cao`) }
  const sendPlace = (p) => { upd((w) => { w.placement[p.id] = 'sent' }); say(`Đã gửi bài kiểm tra xếp mức cho ${p.name}`) }
  // Mô phỏng nhân viên làm xong bài xếp mức: AI chấm theo từng kỹ năng của vị trí
  const finishPlace = (p) => {
    const ns = Object.entries(POSITIONS[p.pos].need)
    const ev = ns.map(([sk, n], i) => { const h = [...(p.name + sk)].reduce((a, c) => a + c.charCodeAt(0), 0); const to = Math.max(0, Math.min(3, n - (h % 3 === 0 ? 1 : h % 3 === 1 ? 0 : 2))); const cur = m.cur(p, sk), ok = to >= n ? 8 + (h % 3) : to === 0 ? 2 + (h % 2) : 5 + (h % 2); return { id: `pl-${p.id}-${sk}`, pid: p.id, sk, to, conf: to >= n ? 'high' : 'medium', at: '18/11', why: to < cur ? 'Kết quả thấp hơn mức đang ghi nhận. Nên trao đổi với nhân viên trước khi hạ mức.' : to >= n ? 'Trả lời đúng hầu hết câu ở mức vị trí cần.' : `Đúng phần khái niệm nhưng sai ở câu tình huống mức ${to + 1}.`, items: [['placement', `Bài kiểm tra xếp mức · ${skillName(sk)}`, `Đúng ${ok}/${6 + 4} câu`]], _i: i } }).filter((e) => e.to !== m.cur(p, e.sk) && !pending.some((x) => x.pid === e.pid && x.sk === e.sk))
    upd((w) => { w.placement[p.id] = 'done'; w.extraPending.push(...ev) })
    say(`AI đã chấm bài xếp mức của ${p.name}: ${ev.length} đề xuất chờ xác nhận`); setWho(null); setTab('assess')
  }
  const setLevel = (p, sk, v) => upd((w) => { w.lv[p.id] = { ...(w.lv[p.id] || {}), [sk]: v } })
  const delMember = (p) => { upd((w) => { w.members = w.members.filter((x) => x.id !== p.id) }); setWho(null) }
  const saveAssign = (r, people, due) => {
    // giữ người đã giao ở bộ phận khác khi đang lọc theo bộ phận
    upd((w) => { const keep = (w.assigned[r.sk]?.people || []).filter((id) => !r.G.some((p) => p.id === id)); w.assigned[r.sk] = { kitId: r.kit.id, people: [...keep, ...people], due, kpi: r.kpis[0]?.title || '' } })
    setAsg(null); say(`Đã giao "${r.kit.title}" cho ${people.length} người · hạn ${due}`)
  }
  const assignAll = () => {
    const rs = m.recs.filter((r) => r.kit && !r.kit.stage && r.B.length && !wf.assigned[r.sk])
    upd((w) => { rs.forEach((r) => { w.assigned[r.sk] = { kitId: r.kit.id, people: r.B.map((p) => p.id), due: UNIT.due, kpi: r.kpis[0]?.title || '' } }) })
    say(rs.length ? `Đã giao ${rs.length} khóa cho ${new Set(rs.flatMap((r) => r.B.map((p) => p.id))).size} người · hạn ${UNIT.due}` : 'Các khóa có sẵn đã được giao hết')
  }
  const generate = (r) => {
    const base = r.pr ? draftKit(r.pr.goal, r.pr.files) : draftKit(`Tạo khóa đào tạo ${skillName(r.sk).toLowerCase()} cho ${[...new Set(r.G.map((p) => POSITIONS[p.pos].name))].join(', ')}. Đưa người học lên mức ${r.L}, có bài kiểm tra và tình huống thực hành.`, [])
    const kit = { ...base, fromPlan: r.sk, ...(r.pr ? {} : { skill: r.sk, level: r.L }) }
    set((d) => { d.kits.unshift(kit) })
    nav(`/kit/${kit.id}/loading`)
  }
  const openKit = (k) => nav(k.stage === 'details' ? `/kit/${k.id}/details` : k.stage === 'outline' ? `/kit/${k.id}/outline` : `/kit/${k.id}`)

  const inDept = (p) => !deptSel || p.dept === deptSel
  const view = m.recs.map((r) => ({ ...r, G: r.G.filter(inDept), B: r.B.filter(inDept), R: r.R.filter(inDept) })).filter((r) => r.G.length)
  const goSkill = (sk) => { if (!view.some((r) => r.sk === sk)) setDeptSel(null); setTimeout(() => { document.getElementById(`rec-${sk}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setHl(sk); setTimeout(() => setHl(null), 1600) }, 50) }
  const nowAll = m.ready(false), nextAll = m.ready(true)
  const have = m.recs.filter((r) => r.kit && !r.kit.stage), missing = m.recs.filter((r) => !r.kit || r.kit.stage)
  const gapPeople = new Set(m.recs.flatMap((r) => r.G.map((p) => p.id))).size
  const assignedPeople = new Set(Object.values(wf.assigned).flatMap((x) => x.people)).size
  const assignedCount = Object.keys(wf.assigned).length
  const cols = m.skills.length ? m.skills : [...new Set(Object.values(POSITIONS).flatMap((p) => Object.keys(p.need)))]
  const rows = m.team.filter((p) => (dept === 'all' || p.dept === dept) && p.name.toLowerCase().includes(q.toLowerCase()))
  const whoP = who && m.team.find((p) => p.id === who)

  return (
    <div className="min-h-full">
      <TopOrg />
      <div className="px-8 py-10">
        <div className="flex items-center gap-3">
          <h1 className="flex-1 font-display text-[36px] font-medium">Năng lực đội ngũ</h1>
          <button onClick={() => setMemOpen(true)} className="btn-line"><Users size={17} />Thêm nhân viên</button>
          <button onClick={() => setKpiOpen(true)} className="btn-line"><Plus size={17} />Thêm KPI</button>
        </div>
        <p className="mt-1 text-[16px] text-neutral-600">Chọn KPI cần đạt. AI tìm kỹ năng đội còn thiếu, gợi ý khóa có sẵn và đề xuất tạo khóa mới.</p>

        <div className="mt-7 grid grid-cols-4 gap-4">
          {[['Nhân viên', m.team.length, `${new Set(m.team.map((p) => p.dept)).size} bộ phận`],
            ['Mức sẵn sàng cho KPI', done ? <>{nowAll}%<span className="mx-1.5 text-[20px] text-neutral-400">→</span><span className="text-sky-700">{nextAll}%</span></> : `${nowAll}%`, done ? 'Hiện tại → sau kế hoạch' : 'So với khung năng lực'],
            ['Người còn thiếu kỹ năng', gapPeople, `Theo ${K.length} KPI đang chọn`],
            ['Khóa đã giao', assignedCount, assignedCount ? `${assignedPeople} người đang học` : 'Chưa giao khóa nào']].map(([t, n, s]) => (
            <div key={t} className="card px-5 py-5"><div className="whitespace-nowrap text-[14px] font-medium">{t}</div><div className="mt-1.5 flex items-baseline font-display text-[32px] leading-tight">{n}</div><div className="mt-1 text-[13px] text-neutral-600">{s}</div></div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">{[['plan', 'Kế hoạch theo KPI', Target], ['team', 'Đội ngũ', Users], ['assess', 'Đánh giá năng lực', BadgeCheck, pending.length], ['impact', 'Tác động lên KPI', TrendingUp]].map(([k, l, I, b]) => <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-[16px] ${tab === k ? 'bg-neutral-100 font-semibold' : 'text-neutral-600'}`}><I size={19} />{l}{b > 0 && <span className="rounded-full bg-brand px-2 text-[12px] font-semibold text-white">{b}</span>}</button>)}</div>

        {tab === 'plan' && <>
          {/* KPI */}
          <div className="mt-8 flex items-baseline gap-3"><h2 className="text-[18px] font-semibold">KPI cần đạt</h2><span className="text-[13px] text-neutral-600">Đang chọn {K.length} · bấm thẻ để chọn hoặc bỏ</span></div>
          <div className="mt-4 grid grid-cols-4 gap-4">
            {allK.map((k) => {
              const on = wf.kpis.includes(k.id), [sl, sc] = STATE[k.state]
              const mk = build(S, wf, [k]), n = mk.ready(false), x = mk.ready(true)
              return (
                <div key={k.id} role="button" tabIndex={0} onClick={() => toggleKpi(k.id)} className={`card group relative flex cursor-pointer flex-col p-4 text-left transition hover:shadow-pop ${on ? 'border-ink ring-1 ring-ink' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className={`grid h-[18px] w-[18px] place-items-center rounded border ${on ? 'border-ink bg-ink text-white' : 'border-neutral-300 bg-white'}`}>{on && <Check size={12} strokeWidth={3} />}</span>
                    {k.custom ? <span className="chip">Tự thêm</span> : k.suggested ? <span className="chip bg-violet-50 text-violet-700"><Sparkles size={11} />Gợi ý</span> : <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${sc}`}>{sl}</span>}
                    <span className="flex-1" />
                    {k.custom && <button onClick={(e) => { e.stopPropagation(); delKpi(k.id) }} className="icon-btn -my-1 -mr-1 h-7 w-7 opacity-0 group-hover:opacity-100" title="Xóa KPI"><Trash2 size={14} /></button>}
                  </div>
                  <div className="mt-2.5 text-[15px] font-semibold leading-snug">{k.title}</div>
                  <div className="mt-2 text-[12px] text-neutral-500">{k.metric} · hạn {k.due}</div>
                  <div className="mt-0.5 flex items-center gap-2 whitespace-nowrap text-[14px]"><span className="font-semibold">{k.now}</span><ArrowRight size={13} className="text-neutral-400" /><span className="font-semibold">{k.target}</span></div>
                  <div className="mt-2.5 flex flex-wrap gap-1">{k.skills.map((s) => <span key={s} className="chip">{skillName(s)}</span>)}</div>
                  <div className="flex-1" />
                  <div className="mt-4 flex items-center justify-between text-[12px] text-neutral-600"><span>Sẵn sàng</span><span><b className="text-ink">{n}%</b>{done && on && x > n && <> → <b className="text-sky-700">{x}%</b></>}</span></div>
                  <div className="mt-1.5"><Bar now={n} next={done && on ? x : null} /></div>
                </div>
              )
            })}
            <button onClick={() => setKpiOpen(true)} className="grid min-h-[200px] place-items-center rounded-2xl border-2 border-dashed border-line text-neutral-600 transition hover:border-neutral-400 hover:text-ink">
              <span className="flex flex-col items-center gap-2 text-[14px] font-medium"><Plus size={22} />Thêm KPI của bạn</span>
            </button>
          </div>

          {/* Kế hoạch */}
          <div className="mt-10 flex items-center gap-3">
            <div className="flex-1"><h2 className="text-[18px] font-semibold">Kế hoạch đề xuất</h2>{done && K.length > 0 && <p className="mt-0.5 text-[13px] text-neutral-600">{m.recs.length} kỹ năng · xếp theo mức ảnh hưởng tới KPI</p>}</div>
            {done && have.some((r) => r.B.length && !wf.assigned[r.sk]) && <button onClick={assignAll} className="btn-line"><Send size={16} />Giao tất cả khóa có sẵn</button>}
            <button disabled={!K.length || busy >= 0} onClick={() => setBusy(0)} className="btn-dark"><Sparkles size={17} />{wf.analyzed ? 'Lập lại kế hoạch' : 'AI lập kế hoạch'}</button>
          </div>

          {busy >= 0 && (
            <div className="fade mt-5 card p-6">
              <div className="space-y-3">
                {STEPS(K.length, m.team.length).map((s, i) => (
                  <div key={s} className={`flex items-center gap-3 text-[15px] ${i > busy ? 'text-neutral-400' : ''}`}>
                    {i < busy ? <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white"><Check size={12} /></span> : i === busy ? <Spinner size={20} w={2.5} /> : <span className="h-5 w-5 rounded-full border border-neutral-300" />}{s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!wf.analyzed && busy < 0 && (
            <div className="mt-5 grid place-items-center rounded-2xl border border-line px-6 py-14 text-center">
              <Sparkles size={26} className="text-violet-500" />
              <div className="mt-3 text-[17px] font-semibold">Chưa có kế hoạch</div>
              <p className="mt-1 max-w-[480px] text-[14px] text-neutral-600">Chọn KPI ở trên rồi bấm “AI lập kế hoạch”. AI đối chiếu {m.team.length} người với khung năng lực và tìm khóa phù hợp trong Thư viện.</p>
            </div>
          )}

          {done && K.length === 0 && <p className="mt-5 text-[14px] text-neutral-500">Chọn ít nhất một KPI để xem kế hoạch.</p>}

          {done && K.length > 0 && (
            <div className="fade">
              <div className="mt-5 rounded-2xl border border-line bg-neutral-50/60 px-6 py-5">
                <div className="flex items-center gap-2 text-[15px] font-semibold"><Sparkles size={17} className="text-violet-600" />Tóm tắt</div>
                <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-neutral-700">
                  {m.recs[0] && <li>Ưu tiên số 1 là <b>{skillName(m.recs[0].sk)}</b>: {m.recs[0].G.length} người còn thiếu. {m.recs[0].kpis[0].why[m.recs[0].sk] || `Ảnh hưởng KPI “${m.recs[0].kpis[0].title}”`}.</li>}
                  <li><b>{have.length}</b> kỹ năng đã có khóa, giao được ngay{missing.length > 0 && <>; <b>{missing.length}</b> kỹ năng chưa có khóa, AI đề xuất tạo mới</>}.</li>
                  <li>Hoàn thành trước {UNIT.due}, mức sẵn sàng của đội tăng từ <b>{nowAll}%</b> lên <b>{nextAll}%</b>. Phần còn lại cần kèm cặp 1-1 hoặc khóa nâng cao.</li>
                  {m.unused.length > 0 && <li className="text-amber-700">Chưa vị trí nào cần {m.unused.map(skillName).join(', ')}. Thêm yêu cầu cho vị trí khi tạo KPI.</li>}
                </ul>
              </div>

              <OrgChart m={m} wf={wf} boss={me} deptSel={deptSel} setDeptSel={setDeptSel} onPerson={setWho} onSkill={goSkill} />

              <div className="mt-8 flex items-center gap-3"><h3 className="text-[16px] font-semibold">Kỹ năng cần nâng và khóa đề xuất</h3>{deptSel && <span className="flex items-center gap-1.5 rounded-full bg-neutral-100 py-1 pl-3 pr-1.5 text-[13px]">Bộ phận: <b>{DEPTS[deptSel]}</b><button onClick={() => setDeptSel(null)} className="grid h-5 w-5 place-items-center rounded-full hover:bg-neutral-200"><X size={12} /></button></span>}</div>
              {deptSel && view.length === 0 && <p className="mt-3 text-[14px] text-neutral-500">Bộ phận này đã đủ kỹ năng cho các KPI đang chọn.</p>}
              {view.length > 0 && <div className="mt-3 divide-y divide-line rounded-2xl border border-line">
                {view.map((r, i) => {
                  const as = wf.assigned[r.sk]
                  const arts = r.kit ? r.kit.artifacts.map((x) => S.artifacts[x]).filter(Boolean) : []
                  return (
                    <div key={r.sk} id={`rec-${r.sk}`} className={`flex items-start gap-5 px-5 py-5 transition-colors duration-500 ${hl === r.sk ? 'bg-violet-50' : ''}`}>
                      <span className="mt-0.5 w-5 shrink-0 text-[15px] font-semibold text-neutral-400">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[16px] font-semibold">{skillName(r.sk)}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">{r.kpis.map((k) => <span key={k.id} className="chip"><Target size={11} />{k.title}</span>)}</div>
                        {r.kpis.some((k) => k.why[r.sk]) && <div className="mt-2 text-[13px] text-neutral-600">{r.kpis.map((k) => k.why[r.sk]).filter(Boolean).join(' · ')}</div>}
                        <div className="mt-3 flex items-center gap-2.5 text-[13px]"><People list={r.G} /><b className="whitespace-nowrap">{r.G.length} người thiếu</b><span className="text-neutral-500">{[...new Set(r.G.map((p) => POSITIONS[p.pos].name))].join(', ')}</span></div>
                        {r.R.length > 0 && <div className="mt-2 flex items-start gap-1.5 text-[13px] text-neutral-600"><UserCheck size={14} className="mt-0.5 shrink-0 text-neutral-500" /><span>Cần cao hơn mức {r.L} của khóa: {r.R.map((p, j) => { const mt = m.mentorOf(p, r.sk); return <span key={p.id}>{j > 0 && ' · '}{p.name} {mt ? <span className="text-neutral-500">kèm cặp với {mt.name}</span> : <span className="text-amber-700">cần khóa nâng cao bên ngoài</span>}</span> })}</span></div>}
                      </div>
                      <div className="w-[300px] shrink-0">
                        {r.kit ? (
                          <button onClick={() => openKit(r.kit)} className="flex w-full items-center gap-3 rounded-xl border border-line p-2.5 text-left transition hover:bg-neutral-50">
                            <Thumb img={arts[0]?.img || r.pr?.img || 'office'} className="h-11 w-11 shrink-0 rounded-lg" />
                            <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold">{r.kit.title}</div><div className="text-[12px] text-neutral-500">{r.kit.stage ? 'Đang soạn' : `${arts.length} tài liệu · tới mức ${r.kit.level}`}{!r.kit.stage && !arts.some((a) => a.status === 'published') && ' · chưa chia sẻ'}</div></div>
                            <ChevronRight size={16} className="shrink-0 text-neutral-400" />
                          </button>
                        ) : (
                          <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/40 p-3">
                            <div className="text-[13px] font-semibold">Chưa có khóa trong Thư viện</div>
                            <div className="mt-0.5 text-[12px] text-neutral-600">{r.pr ? <>AI đề xuất “{r.pr.kit.title}”, từ {r.pr.files.length} tài liệu nội bộ</> : 'AI soạn khung khóa; bạn bổ sung tài liệu nguồn'}</div>
                          </div>
                        )}
                        <div className="mt-2.5">
                        {!r.kit ? <button onClick={() => generate(r)} className="btn h-9 w-full bg-violet-600 px-4 text-[13px] text-white hover:bg-violet-700"><Sparkles size={14} />Tạo khóa bằng AI</button>
                          : r.kit.stage ? <button onClick={() => openKit(r.kit)} className="btn-line btn-sm h-9 w-full"><Wand2 size={14} />Tiếp tục soạn</button>
                          : as ? <div className="flex items-center justify-between px-1"><div className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700"><Check size={15} />Đã giao {as.people.length} người</div><div className="text-[12px] text-neutral-500">Hạn {as.due} · <button onClick={() => setAsg(r)} className="font-medium text-sky-700 hover:underline">Sửa</button></div></div>
                          : <button onClick={() => setAsg(r)} className="btn-dark h-9 w-full px-4 text-[13px]"><Send size={14} />Giao khóa</button>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>}
            </div>
          )}
        </>}

        {tab === 'assess' && <>
          <div className="mt-8 flex items-start gap-4 rounded-2xl border border-line bg-neutral-50/60 px-5 py-4">
            <Sparkles size={18} className="mt-0.5 shrink-0 text-violet-600" />
            <div className="flex-1 text-[14px] leading-relaxed text-neutral-700">AI cập nhật mức kỹ năng từ bằng chứng thật: bài thi, bài code, luyện tình huống, dữ liệu công việc và nhận xét của người kèm cặp. {AUTO_RULE}</div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {[['Chờ bạn xác nhận', pending.length, 'Đề xuất có bằng chứng kèm theo'], ['Lượt lên mức 30 ngày', history.length, `${history.filter((h) => h.by === 'auto').length} tự động · ${history.filter((h) => h.by === 'you').length} bạn xác nhận`], ['Nhân viên mới chờ xếp mức', Object.values(wf.placement).filter((x) => x === 'sent').length, 'Đã gửi bài kiểm tra 10 phút']].map(([t, n, sb]) => (
              <div key={t} className="card px-5 py-5"><div className="text-[14px] font-medium">{t}</div><div className="mt-1.5 font-display text-[32px] leading-tight">{n}</div><div className="mt-1 text-[13px] text-neutral-600">{sb}</div></div>
            ))}
          </div>

          <div className="mt-9 flex items-center gap-3"><h2 className="flex-1 text-[18px] font-semibold">Chờ xác nhận ({pending.length})</h2>{pending.some((e) => e.conf === 'high') && <button onClick={okAllHigh} className="btn-line"><Check size={16} />Xác nhận tất cả độ tin cậy cao</button>}</div>
          {pending.length === 0 ? <p className="mt-3 text-[14px] text-neutral-500">Không còn đề xuất nào. Đề xuất mới xuất hiện khi nhân viên làm bài thi, bài code hoặc bài xếp mức.</p> : (
            <div className="mt-4 grid grid-cols-2 gap-4">{pending.map((e) => <EvidenceCard key={e.id} e={e} p={m.team.find((x) => x.id === e.pid)} m={m} onOk={() => okEv(e)} onNo={() => noEv(e)} />)}</div>
          )}

          {Object.entries(wf.placement).some(([, v]) => v === 'sent') && <>
            <h2 className="mt-10 text-[18px] font-semibold">Đang làm bài xếp mức</h2>
            <div className="mt-3 divide-y divide-line rounded-2xl border border-line">
              {Object.entries(wf.placement).filter(([, v]) => v === 'sent').map(([pid]) => { const p = m.team.find((x) => x.id === pid); return p && (
                <div key={pid} className="flex items-center gap-3 px-5 py-3.5"><Avatar text={initials(p.name)} size={32} color={p.color} /><div className="flex-1 leading-tight"><div className="text-[14px] font-medium">{p.name}</div><div className="text-[12px] text-neutral-500">{POSITIONS[p.pos].name} · {Object.keys(POSITIONS[p.pos].need).length} kỹ năng · đã gửi bài 10 phút</div></div><button onClick={() => finishPlace(p)} className="btn-line btn-sm"><Sparkles size={14} />Mô phỏng: đã làm xong</button></div>
              ) })}
            </div>
          </>}

          <h2 className="mt-10 text-[18px] font-semibold">Lịch sử cập nhật mức</h2>
          <table className="mt-3 w-full text-[14px]">
            <thead><tr className="border-b border-line text-left text-[13px] font-semibold text-neutral-600"><th className="px-4 py-3">Nhân viên</th><th>Kỹ năng</th><th>Thay đổi</th><th>Bằng chứng</th><th>Cách cập nhật</th><th className="pr-4 text-right">Ngày</th></tr></thead>
            <tbody>{history.map((h, i) => { const p = m.team.find((x) => x.id === h.pid); return p && (
              <tr key={i} onClick={() => setWho(p.id)} className="cursor-pointer border-b border-line hover:bg-neutral-50">
                <td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><Avatar text={initials(p.name)} size={28} color={p.color} /><span className="font-medium">{p.name}</span></div></td>
                <td>{skillName(h.sk)}</td><td className="whitespace-nowrap">mức {h.from} → <b>{h.to}</b></td><td className="text-[13px] text-neutral-600">{h.src}</td>
                <td>{h.by === 'auto' ? <span className="chip bg-violet-50 text-violet-700"><Sparkles size={11} />Tự động</span> : <span className="chip">Bạn xác nhận</span>}</td>
                <td className="pr-4 text-right text-neutral-500">{h.at}</td>
              </tr>) })}</tbody>
          </table>
        </>}

        {tab === 'impact' && <>
          <div className="mt-8 grid grid-cols-4 gap-4">
            {[['Lượt giao khóa', TRAIN_STATS.assigned + Object.values(wf.assigned).reduce((a, x) => a + x.people.length, 0), 'Từ T9/2026'], ['Tỷ lệ hoàn thành', `${TRAIN_STATS.completion}%`, 'Khóa đã giao, đúng hạn'], ['Tỷ lệ đạt bài thi', `${TRAIN_STATS.pass}%`, 'Thi chính thức lần 1 hoặc 2'], ['Lượt lên mức', history.length, 'Trong 30 ngày qua']].map(([t, n, sb]) => (
              <div key={t} className="card px-5 py-5"><div className="text-[14px] font-medium">{t}</div><div className="mt-1.5 font-display text-[32px] leading-tight">{n}</div><div className="mt-1 text-[13px] text-neutral-600">{sb}</div></div>
            ))}
          </div>
          <div className="mt-8 flex items-baseline gap-3"><h2 className="text-[18px] font-semibold">KPI trước và sau đào tạo</h2><span className="text-[13px] text-neutral-600">{K.length} KPI đang chọn · số liệu theo tháng, T6–T11/2026</span></div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {K.map((k) => { const t = KPI_TREND[k.id]; if (!t) return (
              <div key={k.id} className="card p-5"><div className="text-[15px] font-semibold">{k.title}</div><p className="mt-3 text-[14px] text-neutral-500">Chưa đủ dữ liệu. Cần ít nhất 2 tháng số liệu sau khi giao khóa để AI so sánh.</p></div>)
              const before = t.values[TRAIN_START - 1], now = t.values[t.values.length - 1]
              const ch = Math.round(((now - before) / (before || 1)) * 100), good = t.lower ? now < before : now > before
              const I = (now < before) ? TrendingDown : TrendingUp
              return (
                <div key={k.id} className="card p-5">
                  <div className="flex items-start gap-3"><div className="flex-1"><div className="text-[15px] font-semibold">{k.title}</div><div className="text-[12px] text-neutral-500">{t.label}</div></div>
                    <div className="text-right"><div className="flex items-center justify-end gap-1 text-[14px]"><span className="text-neutral-500">{t.fmt(before)}</span><ArrowRight size={12} className="text-neutral-400" /><b>{t.fmt(now)}</b></div><div className={`flex items-center justify-end gap-1 text-[12px] font-semibold ${good ? 'text-emerald-700' : 'text-amber-700'}`}><I size={13} />{ch > 0 ? '+' : ''}{ch}% từ khi đào tạo</div></div></div>
                  <div className="mt-3"><TrendChart t={t} /></div>
                  <div className="mt-3 border-t border-line pt-3"><Cohort c={t.cohort} lower={t.lower} /></div>
                  <div className="mt-3 flex items-start gap-1.5 text-[13px] text-neutral-700"><Sparkles size={14} className="mt-0.5 shrink-0 text-violet-600" />{t.note}</div>
                </div>
              )
            })}
          </div>
          {K.length === 0 && <p className="mt-4 text-[14px] text-neutral-500">Chọn KPI ở tab Kế hoạch theo KPI để xem tác động.</p>}
          <p className="mt-5 flex items-start gap-1.5 text-[12px] text-neutral-500"><Info size={13} className="mt-0.5 shrink-0" />So sánh nhóm đã học và chưa học cho thấy mối liên hệ, chưa chứng minh nguyên nhân: hai nhóm có thể khác nhau về kinh nghiệm hoặc dự án. AI ghi rõ điều này khi báo cáo.</p>
        </>}

        {tab === 'team' && <>
          <div className="mt-8 flex items-center gap-3">
            <div className="flex h-10 w-64 items-center gap-2 rounded-lg border border-line px-3"><Search size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 text-[15px] outline-none" placeholder="Tìm nhân viên" /></div>
            <div className="relative"><select value={dept} onChange={(e) => setDept(e.target.value)} className="h-10 appearance-none rounded-full border border-line pl-10 pr-8 text-[14px] outline-none"><option value="all">Mọi bộ phận</option>{Object.entries(DEPTS).map(([k, d]) => <option key={k} value={k}>{d}</option>)}</select><Filter size={16} className="pointer-events-none absolute left-4 top-3" /><ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5" /></div>
            <div className="flex-1" />
            <div className="flex gap-4 text-[12px] text-neutral-600">
              {[['bg-emerald-50 border-emerald-200', 'Đạt'], ['bg-amber-50 border-amber-200', 'Thiếu 1 mức'], ['bg-red-50 border-red-200', 'Thiếu 2+ mức']].map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded border ${c}`} />{l}</span>)}
              <span className="flex items-center gap-1.5"><span className="text-neutral-300">–</span>Không cần</span>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-neutral-500"><Info size={13} />Mức hiện tại / mức cần, theo {m.skills.length ? `kỹ năng của ${K.length} KPI đang chọn` : 'mọi kỹ năng trong khung năng lực'}. Bấm một người để xem lộ trình hoặc chỉnh mức.</p>
          <div className="scroll-thin mt-3 overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead><tr className="border-b border-line text-left text-[13px] font-semibold text-neutral-600"><th className="px-4 py-3">Nhân viên</th>{cols.map((sk) => <th key={sk} title={skillName(sk)} className="whitespace-nowrap px-1 py-3 text-center text-[12px]">{SHORT[sk] || skillName(sk)}</th>)}<th className="whitespace-nowrap px-4 text-right">Còn thiếu</th></tr></thead>
              <tbody>
                {rows.map((p) => {
                  const n = m.recs.filter((r) => r.G.includes(p)).length, got = Object.values(wf.assigned).filter((x) => x.people.includes(p.id)).length
                  return (
                    <tr key={p.id} onClick={() => setWho(p.id)} className="cursor-pointer border-b border-line hover:bg-neutral-50">
                      <td className="px-4 py-2.5"><div className="flex items-center gap-3"><Avatar text={initials(p.name)} size={32} color={p.color} /><div className="leading-tight"><div className="whitespace-nowrap font-medium">{p.name}{p.custom && <span className="chip ml-2">Mới thêm</span>}</div><div className="whitespace-nowrap text-[12px] text-neutral-500">{POSITIONS[p.pos].name} · {DEPTS[p.dept]}</div></div></div></td>
                      {cols.map((sk) => { const nd = m.need(p, sk); return <td key={sk} className="px-1 py-2.5 text-center"><span className={`inline-block min-w-[40px] rounded-md px-1.5 py-1 text-[13px] font-semibold ${cellCls(m.gap(p, sk), nd)}`}>{nd ? `${m.cur(p, sk)}/${nd}` : '–'}</span></td> })}
                      <td className="whitespace-nowrap px-4 text-right text-[13px]">{got ? <span className="font-semibold text-emerald-700">Đã giao {got} khóa</span> : n ? <span className="font-semibold">{n} kỹ năng</span> : <span className="text-neutral-500">Đủ</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rows.length === 0 && <p className="py-10 text-center text-[14px] text-neutral-500">Không tìm thấy nhân viên.</p>}
          </div>
          <button onClick={() => setMemOpen(true)} className="btn-ghost mt-3"><Plus size={16} />Thêm nhân viên</button>
        </>}
      </div>

      <Drawer open={!!whoP} onClose={() => setWho(null)} title="Hồ sơ năng lực" side="right" w={460}>
        {whoP && (() => {
          const own = Object.keys(POSITIONS[whoP.pos].need), sks = [...new Set([...own, ...m.skills.filter((sk) => m.need(whoP, sk))])]
          const gs = m.skills.filter((sk) => m.gap(whoP, sk) > 0)
          return (
            <div>
              <div className="flex items-center gap-3"><Avatar text={initials(whoP.name)} size={48} color={whoP.color} /><div className="flex-1"><div className="text-[17px] font-semibold">{whoP.name}</div><div className="text-[13px] text-neutral-500">{POSITIONS[whoP.pos].name} · {DEPTS[whoP.dept]} · từ {whoP.since}</div></div>{whoP.custom && <button onClick={() => delMember(whoP)} className="icon-btn" title="Xóa khỏi đội"><Trash2 size={16} /></button>}</div>

              <div className="mt-6 text-[15px] font-semibold">Lộ trình đề xuất</div>
              {gs.length === 0 ? <p className="mt-2 text-[14px] text-emerald-700">Đã đủ các kỹ năng mà KPI đang chọn cần.</p> : (
                <div className="mt-2 divide-y divide-line rounded-xl border border-line">
                  {gs.map((sk) => {
                    const r = m.recs.find((x) => x.sk === sk), got = wf.assigned[sk]?.people.includes(whoP.id)
                    const helps = r?.B.includes(whoP), mt = m.mentorOf(whoP, sk)
                    return (
                      <div key={sk} className="px-4 py-3 text-[13px]">
                        <div className="flex items-center justify-between"><span className="text-[14px] font-medium">{skillName(sk)}</span><span className="text-neutral-600">mức {m.cur(whoP, sk)} → {m.need(whoP, sk)}</span></div>
                        <div className="mt-1 flex items-center gap-2 text-neutral-600">
                          {helps ? <><span className="flex-1 truncate">{r.kit?.title || r.pr?.kit.title || 'Khóa mới do AI soạn'}{!r.kit && <span className="text-violet-700"> · cần tạo</span>}</span>{got ? <span className="flex items-center gap-1 font-semibold text-emerald-700"><Check size={13} />Đã giao</span> : <span className="text-neutral-500">~{(m.after(whoP, sk) - m.cur(whoP, sk)) * 2} giờ</span>}</>
                            : <span className="flex items-center gap-1.5"><UserCheck size={13} />{mt ? `Kèm cặp 1-1 với ${mt.name}` : 'Cần khóa nâng cao bên ngoài'}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-6 text-[15px] font-semibold">Mức kỹ năng</div>
              <p className="mt-0.5 text-[12px] text-neutral-500">Bấm để chỉnh. Ô viền đứt là mức vị trí cần.</p>
              <div className="mt-2 divide-y divide-line rounded-xl border border-line">
                {sks.map((sk) => <div key={sk} className="flex items-center justify-between px-4 py-2.5 text-[14px]"><span>{skillName(sk)}</span><LevelPick value={m.cur(whoP, sk)} need={m.need(whoP, sk)} onChange={(v) => setLevel(whoP, sk, v)} /></div>)}
              </div>
              {(() => { const hs = history.filter((h) => h.pid === whoP.id), pe = pending.filter((e) => e.pid === whoP.id), pl = wf.placement[whoP.id]; return <>
                <div className="mt-6 text-[15px] font-semibold">Đánh giá bằng AI</div>
                <div className="mt-2 space-y-2 text-[13px]">
                  {pe.length > 0 && <button onClick={() => { setWho(null); setTab('assess') }} className="flex w-full items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-left text-amber-800"><BadgeCheck size={14} />{pe.length} đề xuất lên mức chờ xác nhận<ChevronRight size={14} className="ml-auto" /></button>}
                  {hs.map((h, i) => <div key={i} className="flex items-center gap-2 text-neutral-700"><Check size={13} className="text-emerald-600" />{skillName(h.sk)} mức {h.from} → {h.to}<span className="ml-auto text-[12px] text-neutral-500">{h.by === 'auto' ? 'Tự động' : 'Bạn xác nhận'} · {h.at}</span></div>)}
                  {!pe.length && !hs.length && <p className="text-neutral-500">Chưa có thay đổi mức trong 30 ngày.</p>}
                  {pl === 'sent' ? <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2"><ClipboardList size={14} />Đang làm bài xếp mức<button onClick={() => finishPlace(whoP)} className="ml-auto text-[12px] font-medium text-sky-700 hover:underline">Mô phỏng: đã làm xong</button></div>
                    : <button onClick={() => sendPlace(whoP)} className="btn-line btn-sm mt-1"><ClipboardList size={14} />Gửi bài kiểm tra xếp mức</button>}
                </div>
              </> })()}
              {whoP.learner && <p className="mt-5 rounded-lg bg-sky-50 px-3 py-2 text-[12px] text-sky-800">Đổi sang vai người học ({whoP.name}) để thấy khóa vừa giao trong “Khóa học của tôi”.</p>}
            </div>
          )
        })()}
      </Drawer>

      <KpiModal open={kpiOpen} onClose={() => setKpiOpen(false)} onSave={addKpi} />
      <MemberModal open={memOpen} onClose={() => setMemOpen(false)} onSave={addMember} />
      {!adv && <button onClick={() => setAdv(true)} className="fixed bottom-8 right-6 z-30 flex items-center gap-2 rounded-full border-2 border-violet-400 bg-[#1e1b4b] px-4 py-2.5 text-[14px] font-semibold text-white shadow-pop"><Sparkles size={16} />Hỏi trợ lý AI</button>}
      <Advisor open={adv} onClose={() => setAdv(false)} ctx={{ m, wf, K, allK, pending, kitFor: (sk) => kitFor(S, sk), presetFor, run: (a) => {
        const rec = (sk) => m.recs.find((x) => x.sk === sk)
        if (['person', 'dept', 'tab', 'kpiModal', 'addKpi'].includes(a.kind)) setAdv(false)
        if (a.kind === 'person') setWho(a.id)
        else if (a.kind === 'dept') { upd((w) => { w.analyzed = true }); setTab('plan'); setDeptSel(a.d); setTimeout(() => document.querySelector('[data-org]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80) }
        else if (a.kind === 'tab') setTab(a.tab)
        else if (a.kind === 'say') say(a.msg)
        else if (a.kind === 'copy') { try { navigator.clipboard?.writeText(a.text) } catch { /* bỏ qua */ } say('Đã sao chép báo cáo') }
        else if (a.kind === 'kpiModal') setKpiOpen(true)
        else if (a.kind === 'addKpi') { addKpi({ title: a.title, metric: '', now: '', target: '', due: '31/03/2027', skills: a.skills, roles: [], level: 2 }); setTab('plan'); setBusy(0) }
        else if (a.kind === 'assign') { const r = rec(a.sk); if (r && r.kit) { setAdv(false); setAsg(r) } else say('Kỹ năng này chưa thuộc KPI đang chọn. Chọn KPI liên quan rồi giao khóa.') }
        else if (a.kind === 'gen') generate(rec(a.sk) || { sk: a.sk, pr: presetFor(a.sk), G: [], L: presetFor(a.sk)?.kit.level || 2 })
      } }} />
      <AssignModal r={asg} m={m} current={asg && wf.assigned[asg.sk]} onClose={() => setAsg(null)} onSave={(people, due) => saveAssign(asg, people, due)} />
    </div>
  )
}
