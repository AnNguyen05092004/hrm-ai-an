import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, Wallet, Clock, ChevronRight, Briefcase, FileUp } from 'lucide-react'
import { useStore } from '../store.jsx'
import { rankCandidates } from '../lib/match.js'
import { Card, Button, GradeChip, GRADE_TONE, Segmented, AiTag, Empty, daysSince, cx } from '../ui.jsx'
import UploadJd from '../components/UploadJd.jsx'

const GOOD = ['A', 'B']

export function useJobRankings() {
  const s = useStore()
  return useMemo(
    () => Object.fromEntries(s.jobs.map((j) => [j.id, rankCandidates(j, s.cvs, s.criteriaOf(j.id))])),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ tính lại khi tiêu chí thay đổi
    [s.criteria, s.cvs, s.jobs],
  )
}

function Stat({ label, value, hint }) {
  return (
    <Card className="px-4 py-3.5">
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-mute">{hint}</p>
    </Card>
  )
}

function GradeBar({ ranking }) {
  const counts = { A: 0, B: 0, C: 0, D: 0 }
  ranking.forEach(({ m }) => { counts[m.grade] += 1 })
  const shown = ['A', 'B', 'C']
  const total = shown.reduce((s, g) => s + counts[g], 0) || 1
  return (
    <div className="w-full">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-[#e8ebf1]">
        {shown.map((g) => counts[g] > 0 && <span key={g} className={GRADE_TONE[g].bar} style={{ width: `${(counts[g] / total) * 100}%` }} />)}
      </div>
      <div className="mt-1.5 flex gap-3 text-xs text-mute">
        {shown.map((g) => <span key={g} className="tabular-nums"><b className="font-semibold text-ink">{counts[g]}</b> hạng {g}</span>)}
      </div>
    </div>
  )
}

function JobRow({ job, ranking }) {
  const s = useStore()
  const status = s.statusOf(job.id)
  const applicants = ranking.filter(({ cv }) => s.hasApplied(cv.id, job.id)).length
  const fromPool = ranking.filter(({ cv, m }) => GOOD.includes(m.grade) && !s.hasApplied(cv.id, job.id)).length
  const top = ranking[0]
  return (
    <Link to={`/jobs/${job.id}`} className="group block">
      <Card className="grid gap-4 px-5 py-4 transition group-hover:ring-ink/20 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-semibold text-ink group-hover:text-brand-700">{job.title}</h2>
            {status === 'draft' ? <AiTag>Chờ chốt tiêu chí</AiTag> : null}
          </div>
          <p className="mt-0.5 text-xs text-mute">{[job.code, job.dept, job.level].filter((x) => x && x !== '—').join(' · ')}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-mute">
            <span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden />{job.city} · {job.mode}</span>
            <span className="inline-flex items-center gap-1"><Wallet size={14} aria-hidden />{job.salary.min}–{job.salary.max} triệu</span>
            <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden />Mở {daysSince(job.openedAt)} ngày</span>
          </div>
        </div>
        <GradeBar ranking={ranking} />
        <div className="text-[13px]">
          <p><b className="tabular-nums">{applicants}</b> <span className="text-mute">người ứng tuyển</span></p>
          <p className={cx(fromPool ? 'text-brand-700' : 'text-mute')}><b className="tabular-nums">{fromPool}</b> gợi ý hạng A–B từ kho</p>
        </div>
        <div className="flex items-center justify-between gap-3 md:justify-end">
          {top && (
            <span className="flex items-center gap-2 text-xs text-mute" title="Hồ sơ phù hợp nhất">
              Cao nhất <b className="text-sm tabular-nums text-ink">{top.m.score}%</b> <GradeChip grade={top.m.grade} size="sm" />
            </span>
          )}
          <ChevronRight size={18} className="text-mute transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
        </div>
      </Card>
    </Link>
  )
}

export default function Jobs() {
  const s = useStore()
  const rankings = useJobRankings()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [upload, setUpload] = useState(false)
  const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
  const list = s.jobs
    .filter((j) => filter === 'all' || s.statusOf(j.id) === 'draft')
    .filter((j) => !q || norm(`${j.title} ${j.code} ${j.dept}`).includes(norm(q)))
  const drafts = s.jobs.filter((j) => s.statusOf(j.id) === 'draft').length
  const poolSuggest = s.jobs.reduce((n, j) => n + rankings[j.id].filter(({ cv, m }) => GOOD.includes(m.grade) && !s.hasApplied(cv.id, j.id)).length, 0)
  const gradeA = s.jobs.reduce((n, j) => n + rankings[j.id].filter(({ m }) => m.grade === 'A').length, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tin tuyển dụng</h1>
          <p className="mt-1 text-sm text-mute">Mỗi vị trí được chấm với toàn bộ {s.cvs.length} hồ sơ trong kho theo tiêu chí và trọng số riêng.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <label className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm vị trí, mã tin, phòng ban" aria-label="Tìm tin tuyển dụng"
              className="h-11 w-full rounded-md border border-line bg-white pl-9 pr-4 text-sm placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          </label>
          <Button variant="primary" size="lg" onClick={() => setUpload(true)}><FileUp size={17} aria-hidden />Tải JD lên</Button>
        </div>
      </div>
      {upload && <UploadJd onClose={() => setUpload(false)} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Vị trí đang mở" value={s.jobs.length} hint={`${s.jobs.reduce((n, j) => n + j.headcount, 0)} chỉ tiêu`} />
        <Stat label="Lượt ghép hạng A" value={gradeA} hint="Trên tất cả vị trí" />
        <Stat label="Gợi ý từ kho hồ sơ" value={poolSuggest} hint="Hạng A–B chưa ứng tuyển" />
        <Stat label="Chờ chốt tiêu chí" value={drafts} hint="AI đã trích từ JD" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: `Tất cả (${s.jobs.length})` }, { value: 'draft', label: `Chờ chốt tiêu chí (${drafts})` }]} />
      </div>

      <div className="space-y-3">
        {list.map((job) => <JobRow key={job.id} job={job} ranking={rankings[job.id]} />)}
        {!list.length && <Card><Empty icon={Briefcase} title="Không có vị trí phù hợp bộ lọc">Thử bỏ từ khoá tìm kiếm hoặc chọn “Tất cả”.</Empty></Card>}
      </div>
    </div>
  )
}
