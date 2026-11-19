import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Target, Plus, Sparkles, Check, Users, BookOpen, Wand2, X, ChevronRight, TrendingUp, ClipboardCheck, Search, UserPlus, AlertTriangle, Trash2 } from 'lucide-react'
import { useStore, useMe } from '../store'
import { Avatar, Modal, Spinner, Toggle, Drawer, FormatGlyph } from '../ui'
import { TopOrg } from '../Shell'
import { get, post, patch, del } from '../api'
import { Advisor } from './Advisor'

const ST = {
  gap: ['bg-red-50 text-red-700 border-red-200', 'Cần học, chưa giao'],
  assigned: ['bg-amber-50 text-amber-800 border-amber-200', 'Đã giao, chưa học'],
  learning: ['bg-sky-50 text-sky-700 border-sky-200', 'Đang học'],
  done: ['bg-emerald-50 text-emerald-700 border-emerald-200', 'Học xong, chờ thi đạt'],
}
const defaultDue = () => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)

function Bar({ now, next }) {
  return <div className="relative h-2.5 rounded-full bg-neutral-100"><div className="absolute h-2.5 rounded-full bg-violet-200" style={{ width: `${next}%` }} /><div className="absolute h-2.5 rounded-full bg-violet-600" style={{ width: `${now}%` }} /></div>
}

function KpiModal({ open, onClose, m, onSaved }) {
  const { say } = useStore()
  const blank = { name: '', metric: '', current: '', target: '', due: '', skills: [] }
  const [f, setF] = useState(blank)
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const suggest = async () => {
    setBusy(true)
    try { const r = await post('/workforce/kpis/suggest-skills', { name: f.name, metric: f.metric, target: f.target }); set('skills', r.skills); if (!r.skills.length) say('AI không tìm thấy kỹ năng phù hợp, hãy chọn tay') } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  const save = async () => { try { await post('/workforce/kpis', f); say('Đã thêm KPI'); setF(blank); onSaved(); onClose() } catch (e) { say(e.message) } }
  const toggleSkill = (id) => set('skills', f.skills.some((s) => s.skillId === id) ? f.skills.filter((s) => s.skillId !== id) : [...f.skills, { skillId: id, boost: 0, positions: [] }])
  return (
    <Modal open={open} onClose={onClose} title="Thêm KPI" sub="Mô tả KPI, AI gợi ý kỹ năng tác động. Bạn chỉnh lại trước khi lưu." w={620}
      footer={<button className="btn-dark h-10" disabled={f.name.trim().length < 3 || !f.skills.length} onClick={save}>Lưu KPI</button>}>
      <label className="label">Tên KPI</label>
      <input className="field" value={f.name} maxLength={200} onChange={(e) => set('name', e.target.value)} placeholder="Ví dụ: Giảm 30% lỗi phát hiện sau release" />
      <div className="mt-3 grid grid-cols-4 gap-3 text-[14px]">
        {[['metric', 'Chỉ số', 'Lỗi / tháng'], ['current', 'Hiện tại', '20'], ['target', 'Mục tiêu', '≤ 14'], ['due', 'Hạn', '31/03/2027']].map(([k, l, ph]) => <label key={k}><div className="mb-1 font-medium">{l}</div><input className="field py-2" value={f[k]} maxLength={100} onChange={(e) => set(k, e.target.value)} placeholder={ph} /></label>)}
      </div>
      <div className="mt-5 flex items-center"><div className="flex-1 font-semibold">Kỹ năng tác động</div><button className="btn-line btn-sm" disabled={f.name.trim().length < 3 || busy} onClick={suggest}>{busy ? <Spinner size={14} w={2} /> : <Sparkles size={14} className="text-violet-600" />}AI gợi ý</button></div>
      {f.skills.map((s) => (
        <div key={s.skillId} className="mt-2 rounded-xl border border-line p-3 text-[14px]">
          <div className="flex items-center gap-2"><b className="flex-1">{m.skills.find((x) => x.id === s.skillId)?.name}</b>
            <select className="rounded-lg border border-line px-2 py-1 text-[13px]" value={s.boost ?? 0} onChange={(e) => set('skills', f.skills.map((x) => (x.skillId === s.skillId ? { ...x, boost: +e.target.value } : x)))}>{[0, 1, 2, 3].map((v) => <option key={v} value={v}>{v ? `Cần tối thiểu mức ${v}` : 'Theo khung vị trí'}</option>)}</select>
            <button onClick={() => toggleSkill(s.skillId)} className="icon-btn h-8 w-8" aria-label="Bỏ"><X size={15} /></button></div>
          {s.why && <div className="mt-1 text-[13px] text-neutral-600">{s.why}</div>}
          {s.boost > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{m.positions.map((p) => { const on = s.positions?.includes(p.id); return <button key={p.id} onClick={() => set('skills', f.skills.map((x) => (x.skillId === s.skillId ? { ...x, positions: on ? x.positions.filter((y) => y !== p.id) : [...(x.positions ?? []), p.id] } : x)))} className={`chip ${on ? 'bg-ink text-white' : ''}`}>{p.name}</button> })}<span className="text-[12px] text-neutral-500">{s.positions?.length ? '' : 'Áp dụng mọi vị trí'}</span></div>}
        </div>
      ))}
      <div className="mt-3 flex flex-wrap gap-1.5">{m.skills.filter((s) => !f.skills.some((x) => x.skillId === s.id)).map((s) => <button key={s.id} onClick={() => toggleSkill(s.id)} className="chip hover:bg-neutral-200"><Plus size={11} />{s.name}</button>)}</div>
    </Modal>
  )
}

function MemberModal({ open, onClose, m, onSaved }) {
  const { say } = useStore()
  const [f, setF] = useState({ name: '', email: '', deptId: '', positionId: '', lv: {} })
  const [created, setCreated] = useState(null)
  const pos = m.positions.find((p) => p.id === f.positionId)
  const save = async () => { try { const r = await post('/workforce/members', f); setCreated({ ...r, email: f.email }); onSaved() } catch (e) { say(e.message) } }
  const close = () => { setCreated(null); setF({ name: '', email: '', deptId: '', positionId: '', lv: {} }); onClose() }
  if (created) return (
    <Modal open={open} onClose={close} title="Đã thêm thành viên" w={480} footer={<button className="btn-dark h-10" onClick={close}>Xong</button>}>
      <p className="text-[14px]">Gửi thông tin đăng nhập cho nhân viên. Mật khẩu tạm chỉ hiện một lần.</p>
      <div className="mt-3 rounded-xl bg-neutral-50 p-4 font-mono text-[14px]">{created.email}<br />{created.tempPassword}</div>
    </Modal>
  )
  return (
    <Modal open={open} onClose={close} title="Thêm thành viên" sub="Tạo tài khoản người học và khai báo mức kỹ năng hiện tại." w={560}
      footer={<button className="btn-dark h-10" disabled={!f.name || !f.email || !f.deptId || !f.positionId} onClick={save}>Thêm</button>}>
      <div className="grid grid-cols-2 gap-3 text-[14px]">
        <label><div className="mb-1 font-medium">Họ tên</div><input className="field py-2" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label><div className="mb-1 font-medium">Email công ty</div><input type="email" className="field py-2" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label><div className="mb-1 font-medium">Bộ phận</div><select className="field py-2" value={f.deptId} onChange={(e) => setF({ ...f, deptId: e.target.value })}><option value="">Chọn</option>{m.depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label><div className="mb-1 font-medium">Vị trí</div><select className="field py-2" value={f.positionId} onChange={(e) => setF({ ...f, positionId: e.target.value })}><option value="">Chọn</option>{m.positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      </div>
      {pos && <><div className="mt-4 text-[14px] font-semibold">Mức kỹ năng hiện tại (khung vị trí yêu cầu)</div>
        {Object.entries(pos.needs).map(([sk, n]) => <div key={sk} className="mt-2 flex items-center gap-3 text-[14px]"><span className="flex-1">{m.skills.find((s) => s.id === sk)?.name} <span className="text-neutral-500">· cần mức {n}</span></span>
          <div className="flex rounded-lg bg-neutral-100 p-0.5">{[0, 1, 2, 3].map((v) => <button key={v} onClick={() => setF({ ...f, lv: { ...f.lv, [sk]: v } })} className={`w-9 rounded-md py-1 text-[13px] ${(f.lv[sk] ?? 0) === v ? 'bg-white font-semibold shadow-card' : 'text-neutral-500'}`}>{v}</button>)}</div></div>)}</>}
    </Modal>
  )
}

function AssignModal({ r, m, onClose, onDone }) {
  const { say } = useStore()
  const free = r ? r.byCourse.filter((id) => !r.assigned.includes(id)) : []
  const [sel, setSel] = useState(() => new Set(free))
  const [due, setDue] = useState(defaultDue)
  const [busy, setBusy] = useState(false)
  if (!r) return null
  const person = (id) => m.team.find((p) => p.id === id)
  const save = async () => {
    setBusy(true)
    try { const x = await post('/workforce/assign', { skillId: r.skillId, userIds: [...sel], due, kpiId: r.kpiIds[0] }); say(`Đã giao ${x.courses} tài liệu cho ${x.people} người`); onDone() } catch (e) { say(e.message) } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title={`Giao khóa: ${r.skillName}`} sub={`${r.courses.length} tài liệu đã xuất bản, đưa người học tới mức ${r.courseLevel}.`} w={560}
      footer={<button className="btn-dark h-10" disabled={!sel.size || busy} onClick={save}>{busy ? <Spinner size={18} w={2} /> : `Giao cho ${sel.size} người`}</button>}>
      <div className="space-y-1">{r.courses.map((c) => <div key={c.id} className="flex items-center gap-2 text-[14px]"><FormatGlyph type={c.type} size={14} />{c.title}</div>)}</div>
      <div className="mt-4 text-[14px] font-semibold">Người cần học</div>
      <div className="scroll-thin mt-2 max-h-[260px] overflow-y-auto rounded-xl border border-line">
        {r.byCourse.map((id) => { const p = person(id); const c = m.cells[id]?.[r.skillId]; const done = r.assigned.includes(id); return (
          <label key={id} className="flex items-center gap-3 border-b border-line px-3 py-2 text-[14px] last:border-0">
            <input type="checkbox" disabled={done} checked={done || sel.has(id)} onChange={(e) => setSel((s) => { const n = new Set(s); if (e.target.checked) n.add(id); else n.delete(id); return n })} />
            <Avatar text={p.initials} size={24} color={p.color} /><span className="flex-1">{p.name}<span className="text-neutral-500"> · {p.title}</span></span><span className="text-[12px] text-neutral-500">{done ? 'Đã giao' : `mức ${c?.cur} → ${c?.need}`}</span>
          </label>) })}
      </div>
      {r.beyondCourse.length > 0 && <p className="mt-3 text-[13px] text-neutral-600">{r.beyondCourse.length} người đã đạt mức của khóa nhưng vẫn thiếu so với vị trí: cần kèm cặp hoặc dự án thực tế, không giao khóa này.</p>}
      <label className="mt-4 flex items-center gap-3 text-[14px]">Hạn hoàn thành <input type="date" className="field w-44 py-1.5" value={due} onChange={(e) => setDue(e.target.value)} /></label>
    </Modal>
  )
}

function PersonNode({ p, m, onPerson, onSkill }) {
  const cells = Object.entries(m.cells[p.id] ?? {}).filter(([, c]) => c.state !== 'ok')
  return (
    <div className="rounded-xl border border-line bg-white p-2.5 transition hover:shadow-card">
      <button onClick={() => onPerson(p.id)} className="flex w-full items-center gap-2 text-left"><Avatar text={p.initials} size={26} color={p.color} /><div className="min-w-0 flex-1 leading-tight"><div className="truncate text-[13px] font-semibold">{p.name}</div><div className="truncate text-[11px] text-neutral-500">{p.title}</div></div></button>
      <div className="mt-2 flex flex-wrap gap-1">{cells.length ? cells.map(([sk, c]) => <button key={sk} onClick={() => onSkill(sk)} title={`${m.skills.find((s) => s.id === sk)?.name} · mức ${c.cur} → ${c.need} · ${ST[c.state][1]}`} className={`flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${ST[c.state][0]}`}>{c.state !== 'gap' && <Check size={10} strokeWidth={3} />}{m.skills.find((s) => s.id === sk)?.name.split(' (')[0].split(' và ')[0]}</button>) : <span className="text-[11px] font-medium text-emerald-700">Đủ kỹ năng</span>}</div>
    </div>
  )
}

function OrgChart({ m, boss, deptSel, setDeptSel, onPerson, onSkill }) {
  const depts = m.depts.filter((d) => m.team.some((p) => p.deptId === d.id))
  const top = depts[0]?.parentId === null ? depts.slice(0, 1) : []
  const rest = depts.filter((d) => !top.includes(d))
  return (
    <div className="card mt-5 p-6">
      <div className="flex flex-wrap items-start gap-4"><div className="flex-1"><div className="text-[16px] font-semibold">Sơ đồ đội ngũ: ai cần học gì</div><p className="mt-0.5 text-[13px] text-neutral-600">Bấm bộ phận để lọc, bấm người để xem hồ sơ, bấm kỹ năng để tới khóa tương ứng.</p></div>
        <div className="flex flex-wrap gap-3 text-[12px] text-neutral-600">{Object.entries(ST).map(([k, [c, l]]) => <span key={k} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded border ${c}`} />{l}</span>)}</div></div>
      <div className="scroll-thin mt-6 overflow-x-auto pb-2"><div className="mx-auto min-w-[900px]">
        <div className="mx-auto w-[240px] rounded-xl bg-ink px-4 py-3 text-white"><div className="flex items-center gap-2.5"><Avatar text={boss.initials} size={30} color={boss.color} /><div className="leading-tight"><div className="text-[14px] font-semibold">{boss.name}</div><div className="text-[11px] text-white/70">{m.team.length} người</div></div></div></div>
        <div className="mx-auto h-6 w-px bg-neutral-300" />
        {top.map((d) => <div key={d.id} className="flex justify-center gap-3">{m.team.filter((p) => p.deptId === d.id).map((p) => <div key={p.id} className="w-[240px]"><PersonNode p={p} m={m} onPerson={onPerson} onSkill={onSkill} /></div>)}</div>)}
        {top.length > 0 && <div className="mx-auto h-6 w-px bg-neutral-300" />}
        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${rest.length}, minmax(0, 1fr))` }}>
          <div className="absolute top-0 h-px bg-neutral-300" style={{ left: `${50 / rest.length}%`, right: `${50 / rest.length}%` }} />
          {rest.map((d) => { const ps = m.team.filter((p) => p.deptId === d.id); const need = ps.filter((p) => Object.values(m.cells[p.id] ?? {}).some((c) => c.state !== 'ok')).length; const on = deptSel === d.id; return (
            <div key={d.id} className={`relative px-1.5 pt-6 transition ${deptSel && !on ? 'opacity-40' : ''}`}>
              <span className="absolute left-1/2 top-0 h-6 w-px bg-neutral-300" />
              <button onClick={() => setDeptSel(on ? null : d.id)} className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${on ? 'border-ink bg-neutral-100 ring-1 ring-ink' : 'border-line bg-neutral-50 hover:bg-neutral-100'}`}><div className="truncate text-[13px] font-semibold">{d.name}</div><div className="text-[11px] text-neutral-600">{ps.length} người · {need} cần học</div></button>
              <div className="ml-3 space-y-2 border-l border-neutral-300 pl-2 pt-2">{ps.map((p) => <PersonNode key={p.id} p={p} m={m} onPerson={onPerson} onSkill={onSkill} />)}</div>
            </div>) })}
        </div>
      </div></div>
    </div>
  )
}

function PersonDrawer({ id, m, onClose, onChanged }) {
  const { say } = useStore()
  const p = m.team.find((x) => x.id === id)
  const d = useQuery({ queryKey: ['member', id], queryFn: () => get(`/workforce/members/${id}`), enabled: !!id })
  if (!p) return null
  const setLevel = async (skillId, level) => { try { await patch(`/workforce/members/${id}/skills`, { skillId, level }); onChanged(); d.refetch() } catch (e) { say(e.message) } }
  const needs = m.positions.find((x) => x.id === p.positionId)?.needs ?? {}
  const skills = [...new Set([...Object.keys(needs), ...Object.keys(p.lv)])]
  return (
    <Drawer open onClose={onClose} title={p.name} side="right" w={480}>
      <div className="text-[14px] text-neutral-600">{p.title} · {m.depts.find((x) => x.id === p.deptId)?.name} · {p.email}</div>
      <div className="mt-5 text-[15px] font-semibold">Mức kỹ năng</div>
      {skills.map((sk) => { const n = m.cells[id]?.[sk]?.need ?? needs[sk] ?? 0; const c = p.lv[sk] ?? 0; return (
        <div key={sk} className="mt-2 flex items-center gap-3 text-[14px]"><span className="flex-1">{m.skills.find((s) => s.id === sk)?.name}{n > 0 && <span className={`ml-1 text-[12px] ${c >= n ? 'text-emerald-700' : 'text-red-600'}`}>· cần {n}</span>}</span>
          <div className="flex rounded-lg bg-neutral-100 p-0.5">{[0, 1, 2, 3].map((v) => <button key={v} onClick={() => setLevel(sk, v)} className={`w-8 rounded-md py-1 text-[13px] ${c === v ? 'bg-white font-semibold shadow-card' : 'text-neutral-500'}`}>{v}</button>)}</div></div>) })}
      <div className="mt-6 text-[15px] font-semibold">Khóa được giao</div>
      {d.data?.learning.length === 0 && <p className="mt-1 text-[13px] text-neutral-500">Chưa có.</p>}
      {d.data?.learning.map((l) => <div key={l.id} className="mt-2 flex items-center gap-2 text-[14px]"><FormatGlyph type={l.type} size={14} /><span className="flex-1 truncate">{l.title}</span><span className={`text-[12px] ${l.due && new Date(l.due) < Date.now() && (l.percent ?? 0) < 100 ? 'font-semibold text-red-600' : 'text-neutral-500'}`}>{l.percent ?? 0}%</span></div>)}
      <div className="mt-6 text-[15px] font-semibold">Lịch sử mức kỹ năng</div>
      {d.data?.events.map((e) => <div key={e.id} className="mt-2 text-[13px]"><b>{m.skills.find((s) => s.id === e.skillId)?.name}</b> {e.from} → {e.to} · {e.reason} · <span className="text-neutral-500">{new Date(e.createdAt).toLocaleDateString('vi-VN')}</span></div>)}
    </Drawer>
  )
}

function Assess({ m, onChanged }) {
  const { say } = useStore()
  const qc = useQueryClient()
  const ev = useQuery({ queryKey: ['evidence'], queryFn: () => get('/workforce/evidence') })
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const decide = async (id, d) => { try { await post(`/workforce/evidence/${id}/${d}`); qc.invalidateQueries({ queryKey: ['evidence'] }); onChanged(); say(d === 'accept' ? 'Đã cập nhật mức kỹ năng' : 'Đã bỏ qua đề xuất') } catch (e) { say(e.message) } }
  const submit = async () => { setBusy(true); try { await post('/workforce/evidence', f); setF(null); qc.invalidateQueries({ queryKey: ['evidence'] }) } catch (e) { say(e.message) } finally { setBusy(false) } }
  const pend = (ev.data ?? []).filter((x) => x.e.status === 'pending'), done = (ev.data ?? []).filter((x) => x.e.status !== 'pending')
  const card = ({ e, name, color }) => (
    <div key={e.id} className="card p-5">
      <div className="flex items-center gap-3"><Avatar text={name.split(' ').pop()[0]} size={32} color={color} /><div className="flex-1"><div className="font-semibold">{name}</div><div className="text-[13px] text-neutral-500">{m.skills.find((s) => s.id === e.skillId)?.name} · đề xuất <b>mức {e.proposedLevel}</b> · độ tin cậy {e.confidence === 'high' ? 'cao' : e.confidence === 'low' ? 'thấp' : 'trung bình'}</div></div>
        {e.status === 'pending' ? <><button className="btn-line btn-sm" onClick={() => decide(e.id, 'reject')}>Bỏ qua</button><button className="btn-dark btn-sm h-8" onClick={() => decide(e.id, 'accept')}><Check size={14} />Duyệt</button></> : <span className={`text-[13px] font-semibold ${e.status === 'accepted' ? 'text-emerald-700' : 'text-neutral-500'}`}>{e.status === 'accepted' ? 'Đã duyệt' : 'Đã bỏ qua'}</span>}</div>
      <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-[13px]"><b>{e.title}</b><div className="mt-1 whitespace-pre-wrap text-neutral-600">{e.text}</div></div>
      <p className="mt-2 text-[13px]"><Sparkles size={13} className="mr-1 inline text-violet-600" />{e.rationale}</p>
    </div>
  )
  return (
    <div className="mt-6">
      <div className="flex items-center"><p className="flex-1 text-[14px] text-neutral-600">AI đề xuất mức kỹ năng từ bằng chứng công việc (bài code, kết quả dự án, nhận xét). Chỉ cập nhật khi bạn duyệt.</p><button className="btn-dark btn-sm h-9" onClick={() => setF({ userId: m.team[0]?.id, skillId: m.kpiSkills[0] ?? m.skills[0].id, kind: 'work', title: '', text: '' })}><Plus size={15} />Thêm bằng chứng</button></div>
      <div className="mt-4 space-y-3">{pend.length ? pend.map(card) : <p className="text-[14px] text-neutral-500">Không có đề xuất chờ duyệt.</p>}</div>
      {done.length > 0 && <><div className="mt-8 text-[15px] font-semibold">Đã xử lý</div><div className="mt-3 space-y-3">{done.slice(0, 10).map(card)}</div></>}
      {f && <Modal open onClose={() => setF(null)} title="Thêm bằng chứng năng lực" w={560} footer={<button className="btn-dark h-10" disabled={busy || f.title.length < 3 || f.text.length < 10} onClick={submit}>{busy ? <Spinner size={18} w={2} /> : <><Sparkles size={15} />AI đánh giá</>}</button>}>
        <div className="grid grid-cols-2 gap-3 text-[14px]">
          <label><div className="mb-1 font-medium">Nhân viên</div><select className="field py-2" value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })}>{m.team.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label><div className="mb-1 font-medium">Kỹ năng</div><select className="field py-2" value={f.skillId} onChange={(e) => setF({ ...f, skillId: e.target.value })}>{m.skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="col-span-2"><div className="mb-1 font-medium">Loại</div><select className="field py-2" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="work">Kết quả công việc</option><option value="code">Bài code / PR</option><option value="review">Nhận xét của quản lý</option></select></label>
          <label className="col-span-2"><div className="mb-1 font-medium">Tiêu đề</div><input className="field py-2" value={f.title} maxLength={200} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ví dụ: Tự sửa pipeline release tháng 11" /></label>
          <label className="col-span-2"><div className="mb-1 font-medium">Mô tả bằng chứng</div><textarea className="field h-28" value={f.text} maxLength={6000} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="Làm gì, mức độ tự chủ, kết quả đo được" /></label>
        </div>
      </Modal>}
    </div>
  )
}

function Trend({ k }) {
  const pts = k.trend ?? []
  if (pts.length < 2) return <p className="mt-3 text-[13px] text-neutral-500">Chưa đủ số liệu theo tháng để vẽ xu hướng.</p>
  const vs = pts.map((p) => p.v), min = Math.min(...vs), max = Math.max(...vs), W = 520, H = 140, pad = 24
  const x = (i) => pad + (i * (W - 2 * pad)) / (pts.length - 1), y = (v) => H - pad - ((v - min) / Math.max(1e-9, max - min)) * (H - 2 * pad)
  const start = k.stats.firstAssigned ? new Date(k.stats.firstAssigned) : null
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full max-w-[560px]" role="img" aria-label={`Xu hướng ${k.name}`}>
      <polyline fill="none" stroke="#7c3aed" strokeWidth="2" points={pts.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')} />
      {pts.map((p, i) => <g key={i}><circle cx={x(i)} cy={y(p.v)} r="4" fill="#7c3aed" stroke="white" strokeWidth="2"><title>{`${p.m}: ${p.v}`}</title></circle><text x={x(i)} y={H - 4} textAnchor="middle" fontSize="11" fill="#737373">{p.m}</text></g>)}
      {start && <text x={W - pad} y={14} textAnchor="end" fontSize="11" fill="#737373">Bắt đầu giao khóa {start.toLocaleDateString('vi-VN')}</text>}
    </svg>
  )
}

function Impact() {
  const q = useQuery({ queryKey: ['impact'], queryFn: () => get('/workforce/impact') })
  if (!q.data) return <div className="mt-6"><Spinner /></div>
  const t = q.data.total
  return (
    <div className="mt-6">
      <div className="grid grid-cols-3 gap-4">{[['Lượt giao theo kế hoạch', t.assigned], ['Tỷ lệ học xong', `${t.completion}%`], ['Tỷ lệ thi đạt', `${t.pass}%`]].map(([l, v]) => <div key={l} className="card p-5"><div className="text-[13px] text-neutral-500">{l}</div><div className="mt-1 font-display text-[30px] font-semibold">{v}</div></div>)}</div>
      <p className="mt-3 text-[13px] text-neutral-500">Số liệu KPI theo tháng lấy từ báo cáo của khối. Đây là tương quan, không phải bằng chứng nhân quả; xem cùng số liệu học và thi.</p>
      {q.data.kpis.map((k) => <div key={k.id} className="card mt-5 p-6"><div className="flex items-start gap-3"><TrendingUp size={18} className="mt-0.5 text-violet-600" /><div className="flex-1"><div className="font-semibold">{k.name}</div><div className="text-[13px] text-neutral-500">{k.metric} · hiện {k.current} → mục tiêu {k.target} · {k.stats.assigned} lượt giao, {k.stats.completion}% học xong</div></div></div><Trend k={k} /></div>)}
    </div>
  )
}

export default function Workforce() {
  const { me } = useMe()
  const { say } = useStore()
  const nav = useNavigate()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['workforce'], queryFn: () => get('/workforce') })
  const [tab, setTab] = useState('plan')
  const [kpiOpen, setKpiOpen] = useState(false)
  const [memOpen, setMemOpen] = useState(false)
  const [asg, setAsg] = useState(null)
  const [who, setWho] = useState(null)
  const [deptSel, setDeptSel] = useState(null)
  const [search, setSearch] = useState('')
  const [gen, setGen] = useState(null)
  const m = q.data
  const refresh = () => qc.invalidateQueries({ queryKey: ['workforce'] })
  const pending = useQuery({ queryKey: ['evidence'], queryFn: () => get('/workforce/evidence') }).data?.filter((x) => x.e.status === 'pending').length ?? 0
  const recs = useMemo(() => (m ? m.recs.filter((r) => !deptSel || r.gap.some((id) => m.team.find((p) => p.id === id)?.deptId === deptSel)) : []), [m, deptSel])
  if (q.isLoading || !m) return <div className="grid h-full place-items-center"><Spinner /></div>
  const toggleKpi = async (k) => { await patch(`/workforce/kpis/${k.id}`, { active: !k.active }); refresh() }
  const delKpi = async (k) => { await del(`/workforce/kpis/${k.id}`); refresh() }
  const generate = async (r) => {
    setGen(r.skillId)
    const kpi = m.kpis.find((k) => r.kpiIds.includes(k.id))
    const level = Math.min(3, Math.max(...r.gap.map((id) => m.cells[id]?.[r.skillId]?.need ?? 1)))
    const roles = [...new Set(r.gap.map((id) => m.team.find((p) => p.id === id)?.title))].join(', ')
    try {
      const x = await post('/kits', { goal: `Tạo khóa ${r.skillName} đưa người học tới mức ${level} để đạt KPI "${kpi?.name}". Người cần học: ${r.gap.length} người (${roles}). ${kpi?.skills.find((s) => s.skillId === r.skillId)?.why ?? ''}`, fromPlan: { kpiId: kpi?.id, skillId: r.skillId, people: r.gap }, level, sourceIds: [] })
      nav(`/kit/${x.id}/loading`, { state: { jobId: x.jobId } })
    } catch (e) { say(e.message); setGen(null) }
  }
  const onSkill = (sk) => { setTab('plan'); setTimeout(() => document.getElementById(`rec-${sk}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50) }
  const person = (id) => m.team.find((p) => p.id === id)
  const team = m.team.filter((p) => (!deptSel || p.deptId === deptSel) && (!search || p.name.toLowerCase().includes(search.toLowerCase())))
  return (
    <div className="min-h-full pb-24">
      <TopOrg />
      <div className="px-10 py-8">
        <div className="flex items-end gap-4"><div className="flex-1"><h1 className="text-[36px] font-semibold">Năng lực đội ngũ</h1><p className="mt-1 text-[15px] text-neutral-600">Từ KPI của khối, xem ai thiếu kỹ năng gì, giao khóa có sẵn hoặc tạo khóa mới bằng AI.</p></div>
          <div className="w-[300px]"><div className="flex justify-between text-[13px]"><span className="font-semibold">Mức sẵn sàng cho KPI</span><span>{m.readiness.now}% → <b className="text-violet-700">{m.readiness.after}%</b></span></div><div className="mt-2"><Bar now={m.readiness.now} next={m.readiness.after} /></div><div className="mt-1 text-[12px] text-neutral-500">Sau khi học xong các khóa đề xuất</div></div></div>
        <div className="mt-6 flex gap-6 border-b border-line">{[['plan', 'Kế hoạch theo KPI', Target], ['team', 'Đội ngũ', Users], ['assess', 'Đánh giá năng lực', ClipboardCheck, pending], ['impact', 'Tác động lên KPI', TrendingUp]].map(([k, l, I, n]) => <button key={k} onClick={() => setTab(k)} className={`-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-[15px] ${tab === k ? 'border-ink font-semibold' : 'border-transparent text-neutral-500'}`}><I size={16} />{l}{n > 0 && <span className="rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">{n}</span>}</button>)}</div>

        {tab === 'plan' && <>
          <div className="mt-6 flex items-center"><div className="flex-1 text-[16px] font-semibold">KPI của khối</div><button className="btn-line btn-sm" onClick={() => setKpiOpen(true)}><Plus size={15} />Thêm KPI</button></div>
          <div className="mt-3 grid grid-cols-2 gap-4">{m.kpis.map((k) => (
            <div key={k.id} className={`group card p-5 ${k.active ? '' : 'opacity-60'}`}>
              <div className="flex items-start gap-3"><Target size={18} className="mt-0.5 shrink-0 text-violet-600" /><div className="flex-1"><div className="font-semibold leading-snug">{k.name}</div><div className="mt-1 text-[13px] text-neutral-500">{[k.metric, k.current && `hiện ${k.current}`, k.target && `mục tiêu ${k.target}`, k.due && `hạn ${k.due}`].filter(Boolean).join(' · ')}</div></div>
                <Toggle on={k.active} onChange={() => toggleKpi(k)} /><button onClick={() => delKpi(k)} className="icon-btn h-8 w-8 opacity-0 group-hover:opacity-100" aria-label="Xóa KPI"><Trash2 size={15} /></button></div>
              <div className="mt-3 flex flex-wrap gap-1.5">{k.skills.map((s) => <span key={s.skillId} className="chip bg-violet-50 text-violet-700" title={s.why}>{m.skills.find((x) => x.id === s.skillId)?.name}{s.boost ? ` · cần mức ${s.boost}` : ''}</span>)}</div>
            </div>))}</div>

          <OrgChart m={m} boss={me} deptSel={deptSel} setDeptSel={setDeptSel} onPerson={setWho} onSkill={onSkill} />

          <div className="mt-8 text-[16px] font-semibold">Kế hoạch đề xuất <span className="font-normal text-neutral-500">· xếp theo mức thiếu × số KPI bị ảnh hưởng{deptSel && ` · lọc: ${m.depts.find((d) => d.id === deptSel)?.name}`}</span></div>
          {recs.length === 0 && <p className="mt-3 text-[14px] text-neutral-500">Đội đã đủ kỹ năng cho các KPI đang theo dõi.</p>}
          <div className="mt-3 space-y-4">{recs.map((r) => { const left = r.byCourse.filter((id) => !r.assigned.includes(id)); return (
            <div key={r.skillId} id={`rec-${r.skillId}`} className="card scroll-mt-24 p-5">
              <div className="flex items-start gap-4">
                <div className="flex-1"><div className="text-[17px] font-semibold">{r.skillName}</div>
                  <div className="mt-1 text-[13px] text-neutral-600">Thiếu: {r.gap.length} người · đã giao {r.assigned.length} · học xong {r.completed.length} · ảnh hưởng {r.kpiIds.length} KPI</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">{r.kpiIds.map((id) => <span key={id} className="chip">{m.kpis.find((k) => k.id === id)?.name}</span>)}</div></div>
                {r.courses.length ? <button className="btn-dark btn-sm h-9" disabled={!left.length} onClick={() => setAsg(r)}><BookOpen size={15} />{left.length ? `Giao khóa cho ${left.length} người` : 'Đã giao đủ'}</button>
                  : <button className="btn-dark btn-sm h-9" disabled={gen === r.skillId} onClick={() => generate(r)}>{gen === r.skillId ? <Spinner size={15} w={2} /> : <Wand2 size={15} />}Tạo khóa bằng AI</button>}
              </div>
              {r.courses.length ? <div className="mt-3 flex flex-wrap gap-2">{r.courses.map((c) => <span key={c.id} className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[13px]"><FormatGlyph type={c.type} size={13} />{c.title}</span>)}<span className="self-center text-[12px] text-neutral-500">đưa tới mức {r.courseLevel}</span></div>
                : <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800"><AlertTriangle size={14} />Thư viện chưa có khóa đã xuất bản cho kỹ năng này.</div>}
              <div className="mt-3 flex flex-wrap gap-1.5">{r.gap.map((id) => { const p = person(id), c = m.cells[id]?.[r.skillId]; return <button key={id} onClick={() => setWho(id)} className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-[12px] ${ST[c?.state ?? 'gap'][0]}`} title={r.mentors[id] ? `Có thể kèm cặp: ${person(r.mentors[id])?.name}` : undefined}><Avatar text={p.initials} size={20} color={p.color} />{p.name} · {c?.cur}→{c?.need}</button> })}</div>
              {r.beyondCourse.length > 0 && r.courses.length > 0 && <p className="mt-2 text-[12px] text-neutral-500">{r.beyondCourse.length} người đã đạt mức của khóa: cần kèm cặp hoặc dự án thực tế{r.beyondCourse.map((id) => r.mentors[id]).filter(Boolean).length ? ` (người kèm gợi ý: ${[...new Set(r.beyondCourse.map((id) => person(r.mentors[id])?.name).filter(Boolean))].join(', ')})` : ''}.</p>}
            </div>) })}</div>
        </>}

        {tab === 'team' && <>
          <div className="mt-6 flex items-center gap-3"><div className="flex w-[300px] items-center gap-2 rounded-lg border border-line px-3"><Search size={15} className="text-neutral-400" /><input className="h-9 flex-1 text-[14px] outline-none" placeholder="Tìm theo tên" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <select className="field w-56 py-2" value={deptSel ?? ''} onChange={(e) => setDeptSel(e.target.value || null)}><option value="">Mọi bộ phận</option>{m.depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select><div className="flex-1" /><button className="btn-line btn-sm" onClick={() => setMemOpen(true)}><UserPlus size={15} />Thêm thành viên</button></div>
          <div className="scroll-thin mt-4 overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="border-b border-line text-left text-neutral-500"><th className="py-2 font-medium">Người</th>{m.kpiSkills.map((sk) => <th key={sk} className="px-2 font-medium">{m.skills.find((s) => s.id === sk)?.name.split(' (')[0]}</th>)}</tr></thead>
            <tbody>{team.map((p) => <tr key={p.id} className="border-b border-line"><td className="py-2"><button onClick={() => setWho(p.id)} className="flex items-center gap-2 text-left"><Avatar text={p.initials} size={26} color={p.color} /><span><span className="font-medium">{p.name}</span><br /><span className="text-neutral-500">{p.title}</span></span></button></td>
              {m.kpiSkills.map((sk) => { const c = m.cells[p.id]?.[sk]; return <td key={sk} className="px-2">{c ? <span className={`inline-block rounded-md border px-2 py-0.5 ${c.state === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ST[c.state][0]}`}>{c.cur}/{c.need}</span> : <span className="text-neutral-300">—</span>}</td> })}</tr>)}</tbody></table></div>
        </>}
        {tab === 'assess' && <Assess m={m} onChanged={refresh} />}
        {tab === 'impact' && <Impact />}
      </div>
      <KpiModal open={kpiOpen} onClose={() => setKpiOpen(false)} m={m} onSaved={refresh} />
      <MemberModal open={memOpen} onClose={() => setMemOpen(false)} m={m} onSaved={refresh} />
      {asg && <AssignModal r={asg} m={m} onClose={() => setAsg(null)} onDone={() => { setAsg(null); refresh() }} />}
      {who && <PersonDrawer id={who} m={m} onClose={() => setWho(null)} onChanged={refresh} />}
      <Advisor m={m} onAction={(a) => {
        if (a.kind === 'person') setWho(a.target)
        else if (a.kind === 'dept') { setTab('plan'); setDeptSel(a.target) }
        else if (a.kind === 'tab') setTab(a.target)
        else { const r = m.recs.find((x) => x.skillId === a.target); if (r && a.kind === 'assign' && r.courses.length) setAsg(r); else if (r) generate(r); else onSkill(a.target) }
      }} />
    </div>
  )
}

export { ChevronRight }
