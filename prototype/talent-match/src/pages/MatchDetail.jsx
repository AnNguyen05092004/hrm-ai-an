// Phân tích một cặp hồ sơ × vị trí: điểm tổng → nhóm → tiêu chí → bằng chứng trong CV.
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, Star, CalendarCheck, AlertTriangle, ArrowUpRight, MapPin, Clock } from 'lucide-react'
import { useStore, displayName } from '../store.jsx'
import { matchScore, rankJobs, GRADES, gainIfMet } from '../lib/match.js'
import { totalYears, fmtYears } from '../lib/criteria.js'
import { interviewQuestion } from '../lib/insights.js'
import { Card, Button, ScoreRing, GradeChip, Avatar, SourceBadge, StatusIcon, AiTag, cx } from '../ui.jsx'
import { ContributionBar, GroupBreakdown } from '../components/Breakdown.jsx'
import NotFound from './NotFound.jsx'

function SideList({ title, children, extra }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2"><p className="font-semibold">{title}</p>{extra}</div>
      <div className="mt-3 space-y-2.5">{children}</div>
    </Card>
  )
}

export default function MatchDetail() {
  const { jobId, cvId } = useParams()
  const s = useStore()
  const job = s.job(jobId)
  const cv = s.cv(cvId)
  const criteria = job ? s.criteriaOf(job.id) : null
  const m = useMemo(() => (job && cv ? matchScore(job, cv, criteria) : null), [job, cv, criteria])
  if (!m) return <NotFound />

  const starred = s.isShortlisted(job.id, cv.id)
  const invited = s.isInvited(job.id, cv.id)
  const others = rankJobs(cv, s.jobs.filter((j) => j.id !== job.id), (j) => s.criteriaOf(j.id)).slice(0, 3)
  const name = displayName(cv, s.masked)

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-mute" aria-label="Đường dẫn">
        <Link to="/jobs" className="hover:text-ink">Tin tuyển dụng</Link><ChevronRight size={14} aria-hidden />
        <Link to={`/jobs/${job.id}`} className="hover:text-ink">{job.title}</Link><ChevronRight size={14} aria-hidden />
        <span className="text-ink">{name}</span>
      </nav>

      <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Avatar name={cv.name} masked={s.masked} size={52} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold"><Link to={`/candidates/${cv.id}`} className="hover:text-brand-700">{name}</Link></h1>
              <SourceBadge source={cv.source} appliedHere={s.hasApplied(cv.id, job.id)} />
            </div>
            <p className="mt-0.5 text-sm text-mute">{cv.headline} · {fmtYears(totalYears(cv))} kinh nghiệm</p>
            <p className="mt-1 flex flex-wrap gap-x-4 text-[13px] text-mute">
              <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden />{cv.city}</span>
              <span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden />Nhận việc sau {cv.noticeDays} ngày</span>
              <span>Ứng với: <b className="font-medium text-ink">{job.title}</b></span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { s.toggleShortlist(job.id, cv.id); s.notify(starred ? 'Đã bỏ khỏi danh sách rút gọn' : 'Đã thêm vào danh sách rút gọn') }}>
            <Star size={16} className={starred ? 'text-amber-500' : ''} fill={starred ? 'currentColor' : 'none'} aria-hidden />
            {starred ? 'Trong danh sách rút gọn' : 'Thêm vào danh sách rút gọn'}
          </Button>
          <Button variant="primary" disabled={invited} onClick={() => { s.invite(job.id, cv.id); s.notify(`Đã gửi lời mời phỏng vấn tới ${name}`) }}>
            <CalendarCheck size={16} aria-hidden />{invited ? 'Đã mời phỏng vấn' : 'Mời phỏng vấn'}
          </Button>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Card className="p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <ScoreRing value={m.score} grade={m.grade} size={112} stroke={9} />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <GradeChip grade={m.grade} size="lg" />
                  <span className="text-lg font-semibold">{GRADES[m.grade].label}</span>
                  <span className="text-sm text-mute">· {m.raw.toLocaleString('vi-VN')} / 100 điểm</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-1"><StatusIcon status="met" />Đạt <b className="tabular-nums">{m.counts.met}</b></span>
                  <span className="inline-flex items-center gap-1"><StatusIcon status="partial" />Một phần <b className="tabular-nums">{m.counts.partial}</b></span>
                  <span className="inline-flex items-center gap-1"><StatusIcon status="missing" />Thiếu <b className="tabular-nums">{m.counts.missing}</b></span>
                  <span className="text-mute">trên {m.counts.total} tiêu chí</span>
                </div>
                <ContributionBar m={m} />
              </div>
            </div>
            {m.knockouts.length > 0 && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm text-danger-800">
                <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden />
                <p>Chưa đạt tiêu chí bắt buộc: <b>{m.knockouts.map((k) => k.label).join(', ')}</b>. Hồ sơ được giới hạn tối đa hạng C; người tuyển dụng vẫn có thể mời nếu thấy phù hợp.</p>
              </div>
            )}
          </Card>

          {m.groups.map((g) => <GroupBreakdown key={g.id} group={g} />)}
        </div>

        <aside className="space-y-4">
          <SideList title="Điểm mạnh">
            {m.strengths.map((i) => (
              <p key={i.id} className="flex items-start gap-2 text-sm"><StatusIcon status="met" />
                <span><b className="font-medium">{i.label}</b> <span className="text-mute">· {i.have}</span></span>
              </p>
            ))}
            {!m.strengths.length && <p className="text-sm text-mute">Chưa có tiêu chí nào đạt trọn vẹn.</p>}
          </SideList>

          <SideList title="Khoảng trống" extra={<span className="text-xs text-mute">điểm có thể thêm</span>}>
            {m.gaps.slice(0, 6).map((i) => (
              <div key={i.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-start gap-2"><StatusIcon status={i.status} />
                  <span className="min-w-0"><b className="font-medium">{i.label}</b><span className="block text-xs text-mute">{i.have} · cần {i.need}</span></span>
                </span>
                <span className="shrink-0 tabular-nums text-brand-700">+{gainIfMet(i).toLocaleString('vi-VN')}</span>
              </div>
            ))}
            {!m.gaps.length && <p className="text-sm text-mute">Hồ sơ đáp ứng mọi tiêu chí.</p>}
          </SideList>

          {m.experience && (
            <SideList title="Độ lệch kinh nghiệm">
              <div className="flex items-end justify-between">
                <p className="text-sm text-mute">Liên quan <b className="text-ink">{fmtYears(m.experience.years)}</b> · yêu cầu ≥ {m.experience.need} năm</p>
                <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold',
                  { good: 'bg-emerald-50 text-emerald-800', warn: 'bg-amber-50 text-amber-800', bad: 'bg-danger-50 text-danger-700' }[m.experience.tone])}>{m.experience.label}</span>
              </div>
            </SideList>
          )}

          <SideList title="Câu hỏi làm rõ khi phỏng vấn" extra={<AiTag />}>
            {m.gaps.slice(0, 4).map((i, idx) => (
              <p key={i.id} className="flex gap-2 text-sm"><span className="tabular-nums text-mute">{idx + 1}.</span><span>{interviewQuestion(i, job)}</span></p>
            ))}
            {!m.gaps.length && <p className="text-sm text-mute">Không có khoảng trống cần làm rõ.</p>}
          </SideList>

          <SideList title="Hồ sơ này còn phù hợp với">
            {others.map(({ job: j, m: om }) => (
              <Link key={j.id} to={`/jobs/${j.id}/match/${cv.id}`} className="group flex items-center gap-3 rounded-lg p-1 hover:bg-soft">
                <ScoreRing value={om.score} grade={om.grade} size={38} stroke={4} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium group-hover:text-brand-700">{j.title}</span><span className="text-xs text-mute">{j.dept}</span></span>
                <ArrowUpRight size={15} className="text-mute" aria-hidden />
              </Link>
            ))}
          </SideList>
        </aside>
      </div>
    </div>
  )
}
