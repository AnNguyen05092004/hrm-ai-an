// Tìm việc (bố cục theo Teal Job Search): thanh tìm kiếm + bộ lọc, danh sách bên trái, chi tiết bên phải.
// Khác Teal: mỗi việc có mức phù hợp với CV hiện tại, kèm "Vì sao phù hợp / Còn thiếu".
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Search, MapPin, ArrowRight, Flame, FileUp, Bookmark, BookmarkCheck, FileText, CheckCircle2, ChevronDown } from 'lucide-react'
import { useStore } from '../store.jsx'
import { GRADES } from '../lib/match.js'
import { fold } from '../lib/extract.js'
import { SKILLS } from '../data/skills.js'
import { ExplainCard } from '../components/Explain.jsx'
import { SkillChip, ScoreRing, Empty, daysSince, buttonCls, cx } from '../ui.jsx'
import { useMyRanking } from './useMyRanking.js'

const NEW_DAYS = 21
const SORTS = { match: 'Phù hợp nhất', new: 'Mới đăng', salary: 'Lương cao nhất' }
const MODES = ['Tại văn phòng', 'Hybrid', 'Từ xa']
const SALARIES = [30, 40, 50]
const pill = 'h-9 cursor-pointer appearance-none rounded-md border border-line bg-white pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40'

function Pick({ label, value, onChange, options }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={pill}>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden />
    </label>
  )
}

const posted = (job) => `${daysSince(job.openedAt)} ngày trước`
const money = (job) => (job.salary.max ? `${job.salary.min}–${job.salary.max} triệu` : 'Thoả thuận')

function Detail({ job, m, cvId, tracked, onTrack }) {
  const s = useStore()
  const [more, setMore] = useState(false)
  const applied = s.hasApplied(cvId, job.id)
  const skills = m.groups.flatMap((g) => g.items).filter((i) => i.type === 'skill')
  return (
    <article className="px-5 py-6 sm:px-8">
      <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-[26px]">{job.title}</h2>
      <p className="mt-2 text-[15px] font-medium">{job.dept.toUpperCase()} • {job.city}</p>
      <p className="mt-1 text-[15px]">{posted(job)} • {money(job)} • {job.mode}</p>
      <div className="mt-5 flex flex-wrap gap-3 border-b border-line pb-5">
        <button type="button" disabled={applied} onClick={() => { s.apply(cvId, job.id); s.notify(`Đã ứng tuyển “${job.title}”`) }} className={buttonCls('primary', 'md', 'px-5')}>
          {applied ? <><CheckCircle2 size={17} aria-hidden />Đã ứng tuyển</> : <><FileUp size={17} aria-hidden />Ứng tuyển</>}
        </button>
        <button type="button" onClick={onTrack} className={buttonCls('secondary', 'md')}>{tracked ? <><BookmarkCheck size={17} className="text-brand-600" aria-hidden />Đã lưu</> : <><Bookmark size={17} aria-hidden />Lưu việc</>}</button>
        <Link to={`/me/resume/match/${job.id}`} className={buttonCls('secondary', 'md')}><FileText size={17} aria-hidden />Đối chiếu CV</Link>
      </div>

      <section className="mt-6 rounded-md border border-line p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-mute">Mức phù hợp với CV của bạn</p>
        <ExplainCard m={m} ring={80} />
        <div className="mt-5 flex flex-wrap gap-1.5 border-t border-line pt-4">
          {skills.map((i) => <SkillChip key={i.id} status={i.status} title={i.note}>{i.near ? `${i.label} ≈ ${i.near}` : i.label}{SKILLS[i.skill].kind === 'soft' ? ' (mềm)' : ''}</SkillChip>)}
        </div>
      </section>

      <section className="mt-7">
        <h3 className="text-lg font-semibold">Về vị trí</h3>
        <p className={cx('mt-3 text-[15px] leading-relaxed', !more && 'line-clamp-3')}>{job.summary}</p>
        {job.summary.length > 160 && <button type="button" onClick={() => setMore((x) => !x)} className="mt-1 text-[15px] font-medium text-brand-600 underline underline-offset-4">{more ? 'Thu gọn' : 'Xem thêm'}</button>}
      </section>
      {job.responsibilities.length > 0 && (
        <section className="mt-7">
          <h3 className="text-lg font-semibold">Trách nhiệm</h3>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-relaxed">{job.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
        </section>
      )}
      <section className="mt-7">
        <h3 className="text-lg font-semibold">Yêu cầu</h3>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-relaxed">{job.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>
    </article>
  )
}

export default function MyJobs() {
  const { jobId } = useParams()
  const { cv, ranking, tracker, setTrack, untrack } = useMyRanking()
  const [draft, setDraft] = useState({ q: '', city: '' })
  const [query, setQuery] = useState({ q: '', city: '' })
  const [sort, setSort] = useState('match')
  const [mode, setMode] = useState('')
  const [salary, setSalary] = useState('')
  const panel = useRef(null)

  const list = useMemo(() => ranking
    .filter(({ job }) => !query.q || fold(`${job.title} ${job.dept}`).includes(fold(query.q)))
    .filter(({ job }) => !query.city || fold(job.city).includes(fold(query.city)) || (job.mode === 'Từ xa' && /xa/.test(fold(query.city))))
    .filter(({ job }) => !mode || job.mode === mode)
    .filter(({ job }) => !salary || job.salary.max >= Number(salary))
    .sort((a, b) => (sort === 'new' ? b.job.openedAt.localeCompare(a.job.openedAt) : sort === 'salary' ? b.job.salary.max - a.job.salary.max : 0)),
  [ranking, query, mode, salary, sort])
  const current = list.find((r) => r.job.id === jobId) ?? list[0]
  const filtered = query.q || query.city || mode || salary || sort !== 'match'
  const clear = () => { setDraft({ q: '', city: '' }); setQuery({ q: '', city: '' }); setMode(''); setSalary(''); setSort('match') }

  useEffect(() => {
    panel.current?.scrollTo({ top: 0 })
    if (jobId && window.innerWidth < 1024) panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [jobId])

  return (
    <div className="flex min-h-screen flex-col">
      <h1 className="sr-only">Tìm việc</h1>
      <div className="border-b border-line px-4 py-4 sm:px-8">
        <form onSubmit={(e) => { e.preventDefault(); setQuery(draft) }} className="flex items-center rounded-md border border-brand-200 bg-white p-1.5 focus-within:ring-2 focus-within:ring-brand-500/30">
          <label className="flex flex-1 items-center gap-2.5 px-3"><Search size={20} className="shrink-0 text-ink/70" aria-hidden />
            <input value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} placeholder="Tìm theo chức danh" aria-label="Tìm theo chức danh" className="h-10 w-full border-0 bg-transparent text-[15px] placeholder:text-mute focus:outline-none" />
          </label>
          <span className="h-8 w-px bg-line" aria-hidden />
          <label className="flex flex-1 items-center gap-2.5 px-3"><MapPin size={20} className="shrink-0 text-ink/70" aria-hidden />
            <input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Thành phố hoặc “từ xa”" aria-label="Thành phố" className="h-10 w-full border-0 bg-transparent text-[15px] placeholder:text-mute focus:outline-none" />
          </label>
          <button type="submit" aria-label="Tìm" className="flex h-9 w-10 shrink-0 items-center justify-center rounded-md bg-brand-600 text-white hover:bg-brand-700"><ArrowRight size={20} /></button>
        </form>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-4 py-4 sm:px-8">
        <Pick label="Sắp xếp" value={sort} onChange={setSort} options={Object.entries(SORTS).map(([k, v]) => [k, `Sắp xếp: ${v}`])} />
        <Pick label="Hình thức" value={mode} onChange={setMode} options={[['', 'Hình thức làm việc'], ...MODES.map((x) => [x, x])]} />
        <Pick label="Lương" value={salary} onChange={setSalary} options={[['', 'Mức lương'], ...SALARIES.map((x) => [x, `Tối đa ≥ ${x} triệu`])]} />
        {filtered && <button type="button" onClick={clear} className="h-9 px-3 text-sm hover:underline">Xoá lọc</button>}
        <span className="ml-auto text-sm text-mute">Mức phù hợp tính theo CV của <b className="font-medium text-ink">{cv.name}</b></span>
      </div>

      <div className="grid flex-1 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)]">
        <div className="relative border-line lg:h-[calc(100vh-150px)] lg:overflow-y-auto lg:border-r">
          <p className="border-b border-line px-5 py-5 text-lg font-semibold sm:px-8">{list.length} việc đang tuyển</p>
          {list.length ? (
            <ul>
              {list.map(({ job, m }) => {
                const active = current?.job.id === job.id
                return (
                  <li key={job.id} className="border-b border-line">
                    <Link to={`/me/jobs/${job.id}`} aria-current={active ? 'true' : undefined}
                      className={cx('relative flex gap-3 py-5 pl-5 pr-4 sm:pl-8', active ? 'bg-paper before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-brand-600' : 'hover:bg-paper/70')}>
                      <span className="min-w-0 flex-1">
                        {daysSince(job.openedAt) <= NEW_DAYS && <span className="mb-1 inline-flex items-center gap-1 text-sm text-[#c2410c]"><Flame size={16} aria-hidden />Việc mới</span>}
                        <span className={cx('block text-base leading-snug', active ? 'font-semibold' : 'font-medium text-ink/90')}>{job.title}</span>
                        <span className="mt-1 block text-sm text-ink/75">{job.dept} • {job.city}</span>
                        <span className="block text-sm text-mute">{posted(job)} • {money(job)} • {job.mode}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-center gap-1 pt-1" title={GRADES[m.grade].label}>
                        <ScoreRing value={m.score} grade={m.grade} size={44} stroke={4} />
                        {tracker[job.id] && <BookmarkCheck size={15} className="text-brand-600" aria-label="Đã lưu" />}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : <Empty icon={Search} title="Không có việc phù hợp bộ lọc">Thử bỏ bớt điều kiện. <button type="button" onClick={clear} className="font-medium text-brand-600 underline">Xoá lọc</button></Empty>}
        </div>
        <div ref={panel} className="relative scroll-mt-28 border-t border-line lg:h-[calc(100vh-150px)] lg:overflow-y-auto lg:border-t-0">
          {current && <Detail key={current.job.id} job={current.job} m={current.m} cvId={cv.id} tracked={Boolean(tracker[current.job.id])}
            onTrack={() => (tracker[current.job.id] ? untrack(current.job.id) : setTrack(current.job.id, {}))} />}
        </div>
      </div>
    </div>
  )
}
