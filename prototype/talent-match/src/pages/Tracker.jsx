// Theo dõi việc làm (bố cục theo Teal Job Tracker): dải trạng thái hình mũi tên, thanh công cụ, bảng có cột viền và sắp xếp.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Plus, Search, List, LayoutGrid, ChevronsRight, ArrowUp, ArrowDown, Trash2, BriefcaseBusiness } from 'lucide-react'
import { GRADES } from '../lib/match.js'
import { STAGES, ALL_STATUSES, addDays } from '../lib/tracker.js'
import { Button, ScoreRing, Empty, fmtDate, cx } from '../ui.jsx'
import Modal from '../components/Modal.jsx'
import { useMyRanking } from './useMyRanking.js'

const NOTCH = 16
const shape = (first) => (first
  ? `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%)`
  : `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%, ${NOTCH}px 50%)`)

function Step({ label, count, active, first, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cx('relative h-[68px] min-w-[132px] flex-1', active ? 'bg-gold-500' : 'bg-line hover:bg-ink/25')} style={{ clipPath: shape(first) }}>
      <span className={cx('absolute flex flex-col items-center justify-center bg-white', active ? 'inset-[2px]' : 'inset-px')} style={{ clipPath: shape(first) }}>
        <span className="text-[22px] font-semibold leading-none tabular-nums">{count || <span className="tracking-[0.2em] text-mute">––</span>}</span>
        <span className={cx('mt-2 text-[13px] font-medium uppercase tracking-wide', active ? 'text-ink' : 'text-mute')}>{label}</span>
      </span>
    </button>
  )
}

function Stars({ value, onChange, label }) {
  return (
    <span className="inline-flex" role="radiogroup" aria-label={`Mức hứng thú – ${label}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} sao`} onClick={() => onChange(n)} className="p-0.5">
          <Star size={17} className={n <= value ? 'fill-gold-400 text-gold-400' : 'text-ink/25'} aria-hidden />
        </button>
      ))}
    </span>
  )
}

const COLUMNS = [
  { id: 'title', label: 'Vị trí', get: (r) => r.job.title },
  { id: 'dept', label: 'Phòng ban', get: (r) => r.job.dept },
  { id: 'salary', label: 'Lương tối đa', get: (r) => r.job.salary.max },
  { id: 'city', label: 'Địa điểm', get: (r) => `${r.job.city} ${r.job.mode}` },
  { id: 'status', label: 'Trạng thái', get: (r) => ALL_STATUSES.findIndex((x) => x.id === r.t.status) },
  { id: 'score', label: 'Phù hợp', get: (r) => r.m.raw },
  { id: 'savedAt', label: 'Ngày lưu', get: (r) => r.t.savedAt },
  { id: 'deadline', label: 'Hạn nộp', get: (r) => r.deadline },
  { id: 'appliedAt', label: 'Ngày ứng tuyển', get: (r) => r.t.appliedAt ?? '' },
  { id: 'follow', label: 'Hẹn hỏi lại', get: (r) => r.follow ?? '' },
  { id: 'excitement', label: 'Hứng thú', get: (r) => r.t.excitement },
]
const DEADLINE_DAYS = 45
const FOLLOW_DAYS = 7

export default function Tracker() {
  const { ranking, tracker, setTrack, untrack } = useMyRanking()
  const [stage, setStage] = useState(null)
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [view, setView] = useState('list')
  const [sort, setSort] = useState({ id: 'savedAt', dir: -1 })
  const [selected, setSelected] = useState([])
  const [adding, setAdding] = useState(false)

  const rows = useMemo(() => ranking.filter(({ job }) => tracker[job.id]).map(({ job, m }) => {
    const t = tracker[job.id]
    return { job, m, t, deadline: addDays(job.openedAt, DEADLINE_DAYS), follow: t.appliedAt ? addDays(t.appliedAt, FOLLOW_DAYS) : null }
  }), [ranking, tracker])
  const col = COLUMNS.find((c) => c.id === sort.id)
  const shown = rows
    .filter((r) => !stage || r.t.status === stage)
    .filter((r) => !q || r.job.title.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (col.get(a) > col.get(b) ? 1 : col.get(a) < col.get(b) ? -1 : 0) * sort.dir)
  const untracked = ranking.filter(({ job }) => !tracker[job.id])
  const allChecked = shown.length > 0 && shown.every((r) => selected.includes(r.job.id))
  const toggle = (id) => setSelected((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))
  const th = 'border-b border-r border-line px-3 py-3 text-left text-sm font-medium whitespace-nowrap last:border-r-0'
  const td = 'border-b border-r border-line px-3 py-3 text-sm whitespace-nowrap last:border-r-0'

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3 sm:px-8">
        <h1 className="inline-flex items-center gap-2 rounded-md bg-[#eef1f0] px-4 py-2 text-[15px] font-medium text-brand-600"><ChevronsRight size={18} aria-hidden />Việc làm</h1>
      </div>

      <div className="border-b border-line px-4 py-6 sm:px-8">
        <div className="relative flex gap-1 overflow-x-auto pb-1" aria-label="Lọc theo trạng thái">
          {STAGES.map((st, i) => (
            <Step key={st.id} first={i === 0} label={st.label} count={rows.filter((r) => r.t.status === st.id).length}
              active={stage === st.id} onClick={() => setStage(stage === st.id ? null : st.id)} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-8">
        <div className="flex items-center gap-2">
          {searching
            ? <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => !q && setSearching(false)} placeholder="Tìm vị trí" aria-label="Tìm vị trí"
              className="h-9 w-56 rounded-md border border-line px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
            : <button type="button" onClick={() => setSearching(true)} aria-label="Tìm kiếm" className="flex h-9 w-10 items-center justify-center rounded-md border border-line hover:bg-soft"><Search size={17} /></button>}
          <label className="flex h-9 items-center gap-2.5 rounded-md border border-line px-3 text-sm">
            <input type="checkbox" checked={allChecked} onChange={() => setSelected(allChecked ? [] : shown.map((r) => r.job.id))} className="h-[18px] w-[18px]" aria-label="Chọn tất cả" />
            {selected.length} đã chọn
          </label>
          {selected.length > 0 && <Button variant="secondary" className="h-9" onClick={() => { untrack(...selected); setSelected([]) }}><Trash2 size={15} aria-hidden />Bỏ theo dõi</Button>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-line p-0.5" role="group" aria-label="Kiểu hiển thị">
            <button type="button" onClick={() => setView('list')} aria-pressed={view === 'list'} aria-label="Dạng bảng" className={cx('flex h-9 w-10 items-center justify-center rounded', view === 'list' ? 'bg-brand-600 text-white' : 'text-ink/70 hover:bg-soft')}><List size={17} /></button>
            <button type="button" onClick={() => setView('grid')} aria-pressed={view === 'grid'} aria-label="Dạng thẻ" className={cx('flex h-9 w-10 items-center justify-center rounded', view === 'grid' ? 'bg-brand-600 text-white' : 'text-ink/70 hover:bg-soft')}><LayoutGrid size={17} /></button>
          </div>
          <Button variant="primary" onClick={() => setAdding(true)} disabled={!untracked.length}><Plus size={18} aria-hidden />Thêm việc</Button>
        </div>
      </div>

      {!shown.length ? (
        <Empty icon={BriefcaseBusiness} title={rows.length ? 'Không có việc ở bước này' : 'Chưa theo dõi việc nào'}>Bấm “Thêm việc” để lưu một vị trí đang tuyển.</Empty>
      ) : view === 'list' ? (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[1320px] border-separate border-spacing-0">
            <thead className="bg-white">
              <tr>
                <th className={cx(th, 'w-12')}><span className="sr-only">Chọn</span></th>
                {COLUMNS.map((c) => (
                  <th key={c.id} className={th} aria-sort={sort.id === c.id ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" onClick={() => setSort({ id: c.id, dir: sort.id === c.id ? -sort.dir : 1 })} className="inline-flex w-full items-center justify-between gap-2">
                      {c.label}
                      {sort.id === c.id ? (sort.dir > 0 ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />) : <ArrowUp size={14} className="text-ink/25" aria-hidden />}
                    </button>
                  </th>
                ))}
                <th className={th}><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ job, m, t, deadline, follow }) => (
                <tr key={job.id} className={cx('hover:bg-paper', selected.includes(job.id) && 'bg-brand-50/60')}>
                  <td className={cx(td, 'text-center')}><input type="checkbox" checked={selected.includes(job.id)} onChange={() => toggle(job.id)} aria-label={`Chọn ${job.title}`} className="h-[18px] w-[18px]" /></td>
                  <td className="min-w-[220px] max-w-[260px] border-b border-r border-line px-3 py-3 text-sm"><Link to={`/me/jobs/${job.id}`} className="hover:underline">{job.title}</Link></td>
                  <td className={td}>{job.dept}</td>
                  <td className={cx(td, 'tabular-nums')}>{job.salary.max ? `${job.salary.max} triệu` : '—'}</td>
                  <td className={td}>{job.mode === 'Từ xa' ? 'Từ xa' : job.city}</td>
                  <td className={td}>
                    <select value={t.status} onChange={(e) => setTrack(job.id, { status: e.target.value })} aria-label={`Trạng thái – ${job.title}`}
                      className="-ml-1 cursor-pointer rounded border-0 bg-transparent py-0.5 pl-1 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40">
                      {ALL_STATUSES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
                    </select>
                  </td>
                  <td className={td}><span className="inline-flex items-center gap-2" title={GRADES[m.grade].label}><ScoreRing value={m.score} grade={m.grade} size={32} stroke={3.5} /></span></td>
                  <td className={cx(td, 'tabular-nums')}>{fmtDate(t.savedAt)}</td>
                  <td className={cx(td, 'tabular-nums')}>{fmtDate(deadline)}</td>
                  <td className={cx(td, 'tabular-nums', !t.appliedAt && 'text-mute')}>{t.appliedAt ? fmtDate(t.appliedAt) : 'Chưa có'}</td>
                  <td className={cx(td, 'tabular-nums', !follow && 'text-mute')}>{follow ? fmtDate(follow) : 'Chưa có'}</td>
                  <td className={td}><Stars value={t.excitement} onChange={(n) => setTrack(job.id, { excitement: n })} label={job.title} /></td>
                  <td className={td}><Link to={`/me/resume/match/${job.id}`} className="font-medium text-brand-600 hover:underline">Đối chiếu CV</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 px-4 pb-8 sm:grid-cols-2 sm:px-8 xl:grid-cols-3">
          {shown.map(({ job, m, t }) => (
            <div key={job.id} className="rounded-md border border-line p-4">
              <div className="flex items-start gap-3">
                <ScoreRing value={m.score} grade={m.grade} size={44} stroke={4} />
                <div className="min-w-0 flex-1"><Link to={`/me/jobs/${job.id}`} className="font-medium hover:underline">{job.title}</Link><p className="text-sm text-mute">{job.dept} · {job.city}</p></div>
                <input type="checkbox" checked={selected.includes(job.id)} onChange={() => toggle(job.id)} aria-label={`Chọn ${job.title}`} className="mt-1 h-[18px] w-[18px]" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <select value={t.status} onChange={(e) => setTrack(job.id, { status: e.target.value })} aria-label={`Trạng thái – ${job.title}`} className="h-9 rounded-md border border-line bg-white pl-2.5 pr-8 text-sm">
                  {ALL_STATUSES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
                </select>
                <Stars value={t.excitement} onChange={(n) => setTrack(job.id, { excitement: n })} label={job.title} />
              </div>
              <Link to={`/me/resume/match/${job.id}`} className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">Đối chiếu CV</Link>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <Modal title="Thêm việc vào bảng theo dõi" onClose={() => setAdding(false)}>
          <ul className="mt-3 max-h-[60vh] space-y-1 overflow-y-auto">
            {untracked.map(({ job, m }) => (
              <li key={job.id}>
                <button type="button" onClick={() => { setTrack(job.id, {}); setAdding(false) }} className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-soft">
                  <ScoreRing value={m.score} grade={m.grade} size={36} stroke={3.5} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{job.title}</span><span className="block text-xs text-mute">{job.dept} · {job.city} · {job.mode}</span></span>
                  <Plus size={16} className="text-mute" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  )
}
