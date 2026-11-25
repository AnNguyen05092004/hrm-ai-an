// Phân tích theo khóa kiểu từ trên xuống: mỗi khóa một dòng → bung tài liệu trong khóa, hoặc bung danh sách
// người được giao → mở chi tiết một người (tiến độ từng tài liệu, lượt thi, mức kỹ năng, câu hỏi Tutor).
import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ChevronDown, Users, ArrowUpRight, Clock, CheckCircle2, Hourglass, FileWarning, MessageCircleQuestion, MessageSquareWarning, Target, Flag, ArrowRight } from 'lucide-react'
import { FormatGlyph, Avatar, Spinner, Drawer } from '../ui'
import { TYPE_ORDER, FORMATS } from '../data'
import { dueState } from './Course'
import { get } from '../api'

const DAY = 86_400_000
/** "hôm nay 09:58", "hôm qua", "3 ngày trước", hoặc ngày */
function ago(d) {
  if (!d) return null
  const t = new Date(d), days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / DAY)
  if (days <= 0) return `hôm nay ${t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  if (days === 1) return 'hôm qua'
  if (days < 30) return `${days} ngày trước`
  return t.toLocaleDateString('vi-VN')
}
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

const Bar = ({ v, className = 'w-20', tone = 'bg-sky-500' }) => (
  <span className={`inline-block h-1.5 shrink-0 rounded-full bg-neutral-200 align-middle ${className}`}><span className={`block h-1.5 rounded-full ${v >= 100 ? 'bg-emerald-500' : tone}`} style={{ width: `${Math.max(0, Math.min(100, v))}%` }} /></span>
)
const Pct = ({ v }) => (v == null ? <span className="text-neutral-400">—</span> : <span className="flex items-center gap-2"><Bar v={v} className="w-16" /><span className="tabular-nums">{v}%</span></span>)

const EXAM = { passed: [CheckCircle2, 'Đạt', 'text-emerald-700'], failed: [FileWarning, 'Chưa đạt', 'text-red-600'], grading: [Hourglass, 'Chờ chấm', 'text-amber-700'] }
function examLabel(e) {
  if (!e.attempts) return <span className="text-neutral-400">Chưa thi</span>
  if (e.passed) return <span className="font-semibold text-emerald-700">Đạt{e.best != null && ` · ${e.best}%`}</span>
  if (e.grading) return <span className="font-semibold text-amber-700">Chờ chấm</span>
  return <span className="font-semibold text-red-600">Chưa đạt{e.best != null && ` · ${e.best}%`}</span>
}

// lọc danh sách người trong khóa
const FILTERS = [
  ['all', 'Tất cả', () => true], ['late', 'Quá hạn', (p) => p.overdue], ['new', 'Chưa bắt đầu', (p) => !p.started],
  ['doing', 'Đang học', (p) => p.started && !p.done], ['done', 'Đã xong', (p) => p.done],
]

function groupByKit(rows, kitList) {
  const m = new Map()
  for (const r of rows) m.set(r.kitId, [...(m.get(r.kitId) ?? []), r])
  return [...m.entries()].map(([id, list]) => ({ id, title: kitList.find((k) => k.id === id)?.title ?? 'Khóa học', docs: [...list].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)) }))
}

/** Bảng theo khóa: rows = số liệu từng tài liệu, kits = số liệu theo người của từng khóa */
export function CourseTable({ rows, kits, kitList, focus }) {
  const nav = useNavigate()
  const groups = groupByKit(rows, kitList)
    .map((g) => ({ ...g, s: kits[g.id] ?? { people: [], started: 0, done: 0, overdue: 0, avgPercent: null } }))
    .sort((a, b) => (b.docs.some((r) => r.id === focus) - a.docs.some((r) => r.id === focus)) || b.s.people.length - a.s.people.length || a.title.localeCompare(b.title, 'vi'))
  const [docsOpen, setDocsOpen] = useState(() => new Set(groups.filter((g) => g.docs.some((r) => r.id === focus)).map((g) => g.id)))
  const [peopleOpen, setPeopleOpen] = useState(() => new Set())
  const [person, setPerson] = useState(null) // { kitId, userId }
  const toggle = (set, setter, id) => { const n = new Set(set); if (n.has(id)) n.delete(id); else n.add(id); setter(n) }
  const allOpen = groups.length > 0 && groups.every((g) => docsOpen.has(g.id))
  const COLS = 8

  return (
    <>
      <div className="mt-4 flex items-center gap-3 text-[13px] text-neutral-500">
        <span>Bấm <ChevronRight size={13} className="inline" /> để xem tài liệu trong khóa, bấm số người để xem ai được giao và tiến độ từng người.</span>
        <div className="flex-1" />
        <button onClick={() => setDocsOpen(allOpen ? new Set() : new Set(groups.map((g) => g.id)))} className="font-medium text-sky-700 hover:underline">{allOpen ? 'Thu gọn tất cả' : 'Mở tất cả tài liệu'}</button>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[920px] text-[14px]">
          <thead><tr className="border-b border-line text-left text-[13px] text-neutral-500">
            <th className="py-2 pl-2 font-medium">Khóa · tài liệu</th><th className="font-medium">Người được giao</th><th className="font-medium">Bắt đầu</th><th className="font-medium">Học xong</th>
            <th className="font-medium">Tiến độ TB</th><th className="font-medium">Lượt thi · đạt</th><th className="font-medium">Điểm TB</th><th className="pr-2 font-medium">Hỏi Tutor · chưa trả lời</th>
          </tr></thead>
          <tbody>{groups.map((g) => {
            const open = docsOpen.has(g.id), pOpen = peopleOpen.has(g.id), s = g.s
            const att = g.docs.reduce((n, r) => n + r.attempts, 0), passed = g.docs.reduce((n, r) => n + r.passed, 0)
            // điểm TB của khóa: trung bình theo số lượt đã chấm của từng đề
            const scored = g.docs.filter((r) => r.avgScore != null), w = scored.reduce((n, r) => n + Math.max(1, r.attempts - (r.grading ?? 0)), 0)
            const avg = scored.length ? Math.round(scored.reduce((n, r) => n + r.avgScore * Math.max(1, r.attempts - (r.grading ?? 0)), 0) / w) : null
            const asked = g.docs.reduce((n, r) => n + r.tutorAsked, 0), missed = g.docs.reduce((n, r) => n + r.tutorMissed, 0)
            return (
              <Fragment key={g.id}>
                <tr className={`border-b border-line ${open || pOpen ? 'bg-neutral-50' : 'hover:bg-neutral-50/70'}`}>
                  <td className="py-3 pl-2">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toggle(docsOpen, setDocsOpen, g.id)} aria-expanded={open} aria-label={open ? 'Thu gọn tài liệu' : 'Xem tài liệu trong khóa'} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-neutral-500 hover:bg-neutral-200/70 hover:text-ink">
                        {open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                      </button>
                      <button onClick={() => toggle(docsOpen, setDocsOpen, g.id)} className="text-left font-semibold">{g.title}</button>
                      <span className="whitespace-nowrap text-[12px] text-neutral-500">{g.docs.length} tài liệu</span>
                      <button onClick={() => nav(`/kit/${g.id}`)} title="Mở trang khóa" aria-label="Mở trang khóa" className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-neutral-400 hover:bg-neutral-200/70 hover:text-ink"><ArrowUpRight size={14} /></button>
                    </div>
                  </td>
                  <td>
                    {s.people.length ? (
                      <button onClick={() => toggle(peopleOpen, setPeopleOpen, g.id)} aria-expanded={pOpen} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-semibold transition ${pOpen ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-neutral-400'}`}>
                        <Users size={14} />{s.people.length} người{pOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    ) : <span className="text-neutral-400">Chưa giao</span>}
                    {s.overdue > 0 && <div className="mt-0.5 text-[12px] font-semibold text-red-600">{s.overdue} quá hạn</div>}
                  </td>
                  <td className="tabular-nums">{s.people.length ? s.started : '—'}</td>
                  <td className="tabular-nums">{s.people.length ? s.done : '—'}</td>
                  <td><Pct v={s.avgPercent} /></td>
                  <td className="tabular-nums">{att} · {passed}</td>
                  <td className="tabular-nums">{avg == null ? '—' : `${avg}%`}</td>
                  <td className="pr-2 tabular-nums">{asked} · <span className={missed ? 'font-semibold text-amber-700' : ''}>{missed}</span></td>
                </tr>
                {pOpen && <tr className="border-b border-line bg-neutral-50"><td colSpan={COLS} className="px-2 pb-4 pt-1"><PeoplePanel people={s.people} onOpen={(userId) => setPerson({ kitId: g.id, userId })} /></td></tr>}
                {open && g.docs.map((r) => (
                  <tr key={r.id} className={`border-b border-line ${r.id === focus ? 'bg-sky-50' : 'bg-white'}`}>
                    <td className="py-2.5 pl-12"><button onClick={() => nav(`/edit/${r.id}`)} className="flex items-center gap-2 text-left font-medium hover:underline"><FormatGlyph type={r.type} size={15} />{r.title}</button></td>
                    <td className="tabular-nums text-neutral-700">{r.assigned}</td><td className="tabular-nums text-neutral-700">{r.started}</td><td className="tabular-nums text-neutral-700">{r.completed}</td>
                    <td className="text-neutral-400">—</td>
                    <td className="tabular-nums text-neutral-700">{r.type === 'exam' || r.attempts ? `${r.attempts} · ${r.passed}` : '—'}</td>
                    <td className="tabular-nums text-neutral-700">{r.avgScore == null ? '—' : `${r.avgScore}%`}</td>
                    <td className="pr-2 tabular-nums text-neutral-700">{r.tutorAsked} · <span className={r.tutorMissed ? 'font-semibold text-amber-700' : ''}>{r.tutorMissed}</span></td>
                  </tr>
                ))}
              </Fragment>
            )
          })}</tbody>
        </table>
      </div>
      <PersonDrawer at={person} onClose={() => setPerson(null)} />
    </>
  )
}

/** Danh sách người được giao trong một khóa, lọc theo trạng thái */
function PeoplePanel({ people, onOpen }) {
  const [f, setF] = useState('all')
  const shown = people.filter(FILTERS.find((x) => x[0] === f)[2])
  return (
    <div className="fade rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-2.5">
        {FILTERS.map(([k, l, fn]) => { const n = people.filter(fn).length; return (
          <button key={k} onClick={() => setF(k)} disabled={!n && k !== 'all'} className={`rounded-full px-2.5 py-1 text-[12px] font-medium disabled:opacity-40 ${f === k ? 'bg-ink text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}>{l} {n}</button>) })}
      </div>
      {shown.length === 0 ? <p className="px-4 py-4 text-[13px] text-neutral-500">Không có ai ở nhóm này.</p> : (
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[12px] text-neutral-500"><th className="px-4 py-2 font-medium">Người học</th><th className="font-medium">Tiến độ</th><th className="font-medium">Hạn</th><th className="font-medium">Học gần nhất</th><th className="font-medium">Thi</th><th className="font-medium">Hỏi Tutor</th><th /></tr></thead>
          <tbody>{shown.map((p) => { const [dl, dc] = p.done ? ['Đã hoàn thành', 'text-emerald-700'] : dueState(p.due); return (
            <tr key={p.userId} onClick={() => onOpen(p.userId)} className="cursor-pointer border-t border-line hover:bg-neutral-50">
              <td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><Avatar text={p.initials} size={30} color={p.color} /><div className="min-w-0 leading-tight"><div className="font-semibold text-ink">{p.name}</div><div className="truncate text-[12px] text-neutral-500">{[p.title, p.dept].filter(Boolean).join(' · ')}</div></div></div></td>
              <td><div className="flex items-center gap-2"><Bar v={p.percent} /><span className="w-9 tabular-nums font-semibold">{p.percent}%</span></div><div className="text-[12px] text-neutral-500">{p.doneDocs}/{p.docs} tài liệu xong</div></td>
              <td className={`whitespace-nowrap ${dc}`}>{dl}</td>
              <td className="whitespace-nowrap text-neutral-600">{ago(p.lastAt) ?? <span className="text-neutral-400">Chưa mở</span>}</td>
              <td className="whitespace-nowrap">{examLabel(p.exam)}</td>
              <td className="tabular-nums text-neutral-600">{p.tutor || '—'}</td>
              <td className="pr-4 text-right"><span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-sky-700">Chi tiết<ArrowRight size={13} /></span></td>
            </tr>) })}</tbody>
        </table>
      )}
    </div>
  )
}

/** Chi tiết một người trong một khóa */
function PersonDrawer({ at, onClose }) {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['analytics-person', at?.kitId, at?.userId], queryFn: () => get(`/analytics/kits/${at.kitId}/people/${at.userId}`), enabled: !!at })
  const d = q.data
  const s = d?.summary
  const [dl, dc] = s ? (s.done ? ['Đã hoàn thành', 'text-emerald-700'] : dueState(s.due)) : ['', '']
  const tile = (label, value, sub, cls = '') => <div className="rounded-xl border border-line p-3"><div className="text-[12px] text-neutral-500">{label}</div><div className={`mt-0.5 text-[20px] font-semibold tabular-nums ${cls}`}>{value}</div>{sub && <div className="text-[12px] text-neutral-500">{sub}</div>}</div>
  return (
    <Drawer open={!!at} onClose={onClose} side="right" w={560} title="Chi tiết học viên">
      {q.isLoading || !d ? <div className="py-10"><Spinner /></div> : q.error ? <p className="text-[14px] text-red-600">{q.error.message}</p> : <>
        <div className="flex items-center gap-3">
          <Avatar text={d.user.initials} size={48} color={d.user.color} />
          <div className="min-w-0"><div className="text-[18px] font-semibold">{d.user.name}</div><div className="truncate text-[13px] text-neutral-500">{[d.user.title, d.user.dept].filter(Boolean).join(' · ')}</div><div className="text-[12px] text-neutral-400">{d.user.email}</div></div>
        </div>
        <div className="mt-4 rounded-xl bg-neutral-50 px-3 py-2 text-[13px]"><span className="text-neutral-500">Khóa:</span> <span className="font-semibold">{d.kit.title}</span>{s?.reason && <span className="text-neutral-500"> · {s.reason}</span>}</div>

        {s ? <div className="mt-3 grid grid-cols-2 gap-2.5">
          {tile('Tiến độ khóa', `${s.percent}%`, <span className="mt-1 block"><Bar v={s.percent} className="w-full" /></span>)}
          {tile('Tài liệu đã xong', `${s.doneDocs}/${s.docs}`, s.lastAt ? `Học gần nhất ${ago(s.lastAt)}` : 'Chưa mở tài liệu nào')}
          {tile('Hạn', s.due ? fmtDay(s.due) : '—', <span className={dc}>{dl}</span>)}
          {tile('Thi', s.exam.attempts ? (s.exam.best != null ? `${s.exam.best}%` : '—') : '—', s.exam.attempts ? `${s.exam.attempts} lượt · ${s.exam.passed} đạt${s.exam.grading ? ` · ${s.exam.grading} chờ chấm` : ''}` : 'Chưa thi', s.exam.passed ? 'text-emerald-700' : '')}
        </div> : <p className="mt-3 rounded-xl border border-dashed border-line px-3 py-2.5 text-[13px] text-neutral-500">Người này không được giao khóa này, chỉ có hoạt động bên dưới.</p>}

        {d.skill && <section className="mt-5">
          <h4 className="flex items-center gap-1.5 text-[14px] font-semibold"><Target size={15} className="text-violet-600" />Kỹ năng của khóa</h4>
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-[13px]">
            <span className="font-medium">{d.skill.name}</span><div className="flex-1" />
            <span>Hiện tại <b className="tabular-nums">mức {d.skill.level}</b></span>
            {d.skill.target != null && <span className={d.skill.level >= d.skill.target ? 'font-semibold text-emerald-700' : 'text-neutral-500'}>{d.skill.level >= d.skill.target ? 'Đã đạt mục tiêu' : `Mục tiêu mức ${d.skill.target}`}</span>}
          </div>
          {d.skill.events.length > 0 && <ul className="mt-1.5 space-y-1 pl-1 text-[12px] text-neutral-500">{d.skill.events.map((e, i) => <li key={i}>Mức {e.from} → {e.to} · {e.reason} · {fmtDay(e.at)}</li>)}</ul>}
        </section>}

        <section className="mt-5">
          <h4 className="text-[14px] font-semibold">Tài liệu trong khóa</h4>
          {d.items.length === 0 ? <p className="mt-2 text-[13px] text-neutral-500">Chưa có tài liệu nào được giao.</p> : <div className="mt-2 divide-y divide-line rounded-xl border border-line">
            {d.items.map((x) => (
              <div key={x.id} className="px-3 py-2.5">
                <div className="flex items-center gap-2 text-[13px]"><FormatGlyph type={x.type} size={14} /><span className="min-w-0 flex-1 truncate font-medium">{x.title}</span>{!x.assigned && <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500">Không được giao</span>}<span className="w-10 shrink-0 text-right font-semibold tabular-nums">{x.percent}%</span></div>
                <div className="mt-1.5 flex items-center gap-2 pl-[22px]"><Bar v={x.percent} className="w-full" /></div>
                <div className="mt-1 pl-[22px] text-[12px] text-neutral-500">
                  {x.type === 'exam' ? (x.percent >= 100 ? 'Đã thi đạt' : 'Chưa thi đạt')
                    : x.lastAt ? [`${FORMATS[x.type]?.name ?? ''}: xong ${x.steps} phần`, `mở ${x.sessions} lần`, `gần nhất ${ago(x.lastAt)}`, x.completedAt && `hoàn thành ${fmtDay(x.completedAt)}`].filter(Boolean).join(' · ') : 'Chưa mở'}
                  {x.assigned && x.due && <span> · hạn {fmtDay(x.due)}</span>}
                </div>
              </div>
            ))}
          </div>}
        </section>

        <section className="mt-5">
          <h4 className="text-[14px] font-semibold">Lượt thi</h4>
          {d.attempts.length === 0 ? <p className="mt-2 text-[13px] text-neutral-500">Chưa có lượt thi nào.</p> : <div className="mt-2 divide-y divide-line rounded-xl border border-line">
            {d.attempts.map((t) => { const [I, l, c] = EXAM[t.status] ?? EXAM.grading; return (
              <button key={t.id} onClick={() => nav(`/grading?attempt=${t.id}`)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] hover:bg-neutral-50">
                <I size={16} className={`shrink-0 ${c}`} />
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{t.title}</div><div className="text-[12px] text-neutral-500">{t.mode === 'official' ? 'Chính thức' : 'Luyện tập'} · nộp {ago(t.submittedAt)}{t.flags > 0 && <span className="text-amber-700"> · <Flag size={11} className="inline" /> {t.flags} cờ giám sát</span>}</div></div>
                <span className={`shrink-0 font-semibold ${c}`}>{l}{t.score != null && t.status !== 'grading' && ` · ${t.score}%`}</span>
                <ArrowUpRight size={14} className="shrink-0 text-neutral-400" />
              </button>) })}
          </div>}
        </section>

        <section className="mt-5">
          <h4 className="text-[14px] font-semibold">Câu đã hỏi AI Tutor</h4>
          {d.tutor.length === 0 ? <p className="mt-2 text-[13px] text-neutral-500">Chưa hỏi câu nào.</p> : <ul className="mt-2 space-y-1.5">
            {d.tutor.map((m) => (
              <li key={m.id} className="flex gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-[13px]">
                {m.found ? <MessageCircleQuestion size={15} className="mt-0.5 shrink-0 text-sky-600" /> : <MessageSquareWarning size={15} className="mt-0.5 shrink-0 text-amber-600" />}
                <div className="min-w-0"><div>"{m.question}"</div><div className="text-[12px] text-neutral-500">{m.title} · {ago(m.at)}{!m.found && <span className="font-semibold text-amber-700"> · khóa chưa có câu trả lời</span>}</div></div>
              </li>
            ))}
          </ul>}
        </section>
        <p className="mt-5 flex items-center gap-1.5 text-[12px] text-neutral-400"><Clock size={12} />Lần xem chi tiết này được ghi vào nhật ký thao tác.</p>
      </>}
    </Drawer>
  )
}
