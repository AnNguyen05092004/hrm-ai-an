// Hồ sơ → kho JD: xếp hạng mọi vị trí đang tuyển cho một hồ sơ (gợi ý vị trí / luân chuyển nội bộ).
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, MapPin, Wallet, Star, ArrowRightLeft } from 'lucide-react'
import { useStore, displayName } from '../store.jsx'
import { rankJobs, GRADES } from '../lib/match.js'
import { totalYears, fmtYears } from '../lib/criteria.js'
import { Card, Button, Avatar, SourceBadge, ScoreRing, GradeChip, SkillChip, KnockoutNote, cx } from '../ui.jsx'
import CvView from '../components/CvView.jsx'
import NotFound from './NotFound.jsx'

function JobMatchRow({ cv, job, m, best }) {
  const s = useStore()
  const starred = s.isShortlisted(job.id, cv.id)
  const internal = cv.source === 'internal'
  const gaps = m.gaps.slice(0, 3)
  return (
    <Card className={cx('p-4', best && 'ring-2 ring-emerald-500/40')}>
      <div className="flex items-start gap-3">
        <ScoreRing value={m.score} grade={m.grade} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/jobs/${job.id}/match/${cv.id}`} className="font-semibold hover:text-brand-700">{job.title}</Link>
            <GradeChip grade={m.grade} size="sm" />
          </div>
          <p className="mt-0.5 text-[13px] text-mute">{job.dept} · {job.level}</p>
          <p className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-mute">
            <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden />{job.city} · {job.mode}</span>
            <span className="inline-flex items-center gap-1"><Wallet size={13} aria-hidden />{job.salary.min}–{job.salary.max} triệu</span>
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-mute">{GRADES[m.grade].label} · đạt {m.counts.met}/{m.counts.total} tiêu chí</p>
      {gaps.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {gaps.map((i) => <SkillChip key={i.id} status={i.status} title={i.note}>{i.near ? `${i.label} ≈ ${i.near}` : i.label}</SkillChip>)}
        </div>
      )}
      {m.knockouts.length > 0 && <div className="mt-2"><KnockoutNote items={m.knockouts} compact /></div>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to={`/jobs/${job.id}/match/${cv.id}`} className="inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium ring-1 ring-line hover:bg-soft">Xem phân tích</Link>
        <Button size="sm" variant={starred ? 'secondary' : 'subtle'} onClick={() => { s.toggleShortlist(job.id, cv.id); s.notify(starred ? `Đã bỏ khỏi danh sách rút gọn “${job.title}”` : `${internal ? 'Đã đề xuất luân chuyển sang' : 'Đã gán vào'} “${job.title}”`) }}>
          <Star size={14} fill={starred ? 'currentColor' : 'none'} className={starred ? 'text-amber-500' : ''} aria-hidden />
          {starred ? (internal ? 'Đã đề xuất luân chuyển' : 'Đã gán vào tin') : (internal ? 'Đề xuất luân chuyển' : 'Gán vào tin tuyển dụng')}
        </Button>
      </div>
    </Card>
  )
}

export default function CandidateDetail() {
  const { cvId } = useParams()
  const s = useStore()
  const cv = s.cv(cvId)
  const ranking = useMemo(
    () => (cv ? rankJobs(cv, s.jobs, (j) => s.criteriaOf(j.id)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ tính lại khi hồ sơ hoặc tiêu chí thay đổi
    [cv, s.criteria, s.jobs],
  )
  if (!cv) return <NotFound />
  const good = ranking.filter(({ m }) => m.grade === 'A' || m.grade === 'B').length

  return (
    <div className="space-y-5">
      <Link to="/candidates" className="inline-flex items-center gap-1 text-sm text-mute hover:text-ink"><ChevronLeft size={16} aria-hidden />Kho hồ sơ</Link>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={cv.name} masked={s.masked} size={56} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{displayName(cv, s.masked)}</h1>
            <SourceBadge source={cv.source} />
          </div>
          <p className="mt-0.5 text-sm text-mute">{cv.headline} · {fmtYears(totalYears(cv))} kinh nghiệm · {cv.city}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <CvView cv={cv} />
        <aside className="space-y-3">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              {cv.source === 'internal' ? <><ArrowRightLeft size={16} aria-hidden />Cơ hội luân chuyển nội bộ</> : 'Vị trí đang tuyển phù hợp'}
            </p>
            <p className="mt-0.5 text-sm text-mute">Chấm với {s.jobs.length} tin đang mở · {good} vị trí hạng A–B</p>
          </div>
          {ranking.slice(0, 5).map(({ job, m }, i) => <JobMatchRow key={job.id} cv={cv} job={job} m={m} best={i === 0 && m.grade === 'A'} />)}
          {ranking.length > 5 && (
            <details className="group">
              <summary className="cursor-pointer list-none rounded-2xl border border-dashed border-line py-2.5 text-center text-sm text-mute hover:bg-white hover:text-ink">
                Xem {ranking.length - 5} vị trí còn lại
              </summary>
              <div className="mt-3 space-y-3">{ranking.slice(5).map(({ job, m }) => <JobMatchRow key={job.id} cv={cv} job={job} m={m} />)}</div>
            </details>
          )}
        </aside>
      </div>
    </div>
  )
}
