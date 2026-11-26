import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, MapPin, Wallet, Users, CalendarDays, CheckCircle2 } from 'lucide-react'
import { useStore } from '../store.jsx'
import { isDirty, draftKey } from '../lib/jdDraft.js'
import { Tabs, AiTag, Pill, fmtDate } from '../ui.jsx'
import JobCandidates from './JobCandidates.jsx'
import JobCriteria from './JobCriteria.jsx'
import JobDescription from './JobDescription.jsx'
import NotFound from './NotFound.jsx'

export function JobHeader({ job }) {
  const s = useStore()
  const status = s.statusOf(job.id)
  return (
    <div>
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-mute hover:text-ink"><ChevronLeft size={16} aria-hidden />Tin tuyển dụng</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
          <p className="mt-1 text-sm text-mute">{[job.code, job.dept, job.team, job.level].filter((x) => x && x !== '—').join(' · ')}</p>
        </div>
        {status === 'draft'
          ? <AiTag>Tiêu chí do AI trích – chờ chốt</AiTag>
          : <span className="inline-flex items-center gap-1 text-sm text-emerald-700"><CheckCircle2 size={16} aria-hidden />Đã chốt tiêu chí</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Pill><MapPin size={13} aria-hidden />{job.city} · {job.mode}</Pill>
        <Pill><Wallet size={13} aria-hidden />{job.salary.min}–{job.salary.max} triệu/tháng</Pill>
        <Pill><Users size={13} aria-hidden />Tuyển {job.headcount} người</Pill>
        <Pill><CalendarDays size={13} aria-hidden />Mở từ {fmtDate(job.openedAt)}</Pill>
        <Pill>Tuyển dụng: {job.recruiter} · Quản lý: {job.manager}</Pill>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'candidates', label: 'Ứng viên phù hợp' },
  { id: 'criteria', label: 'Tiêu chí & trọng số' },
  { id: 'jd', label: 'Mô tả công việc' },
]

export default function JobDetail() {
  const { jobId } = useParams()
  const s = useStore()
  const [params, setParams] = useSearchParams()
  const job = s.job(jobId)
  if (!job) return <NotFound />
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'candidates'
  const tabs = TABS.map((t) => (t.id === 'jd' && isDirty(job, s.pref(draftKey(job.id), null)) ? { ...t, label: `${t.label} · nháp chưa lưu` } : t))
  const setTab = (id) => setParams(id === 'candidates' ? {} : { tab: id }, { replace: true })

  return (
    <div className="space-y-5">
      <JobHeader job={job} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'candidates' && <JobCandidates job={job} onEditCriteria={() => setTab('criteria')} />}
      {tab === 'criteria' && <JobCriteria key={job.id} job={job} onDone={() => setTab('candidates')} />}
      {tab === 'jd' && <JobDescription job={job} onEditCriteria={() => setTab('criteria')} />}
    </div>
  )
}
