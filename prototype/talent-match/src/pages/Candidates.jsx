import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserX } from 'lucide-react'
import { useStore, displayName } from '../store.jsx'
import { rankJobs } from '../lib/match.js'
import { totalYears, fmtYears } from '../lib/criteria.js'
import { skillName } from '../data/skills.js'
import { Card, Avatar, SourceBadge, ScoreRing, GradeChip, Segmented, Pill, Empty, fmtDate, SOURCE } from '../ui.jsx'

const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')

export default function Candidates() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [source, setSource] = useState('all')
  const best = useMemo(
    () => Object.fromEntries(s.cvs.map((cv) => [cv.id, rankJobs(cv, s.jobs, (j) => s.criteriaOf(j.id))[0]])),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ tính lại khi tiêu chí thay đổi
    [s.criteria, s.cvs, s.jobs],
  )
  const list = s.cvs
    .filter((cv) => source === 'all' || cv.source === source)
    .filter((cv) => !q || norm(`${cv.name} ${cv.headline} ${Object.keys(cv.skills).map(skillName).join(' ')}`).includes(norm(q)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const options = [{ value: 'all', label: 'Tất cả' }, ...Object.entries(SOURCE).map(([value, v]) => ({ value, label: v.label }))]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kho hồ sơ</h1>
          <p className="mt-1 text-sm text-mute">{s.cvs.length} hồ sơ đã chuẩn hoá kỹ năng. Mở một hồ sơ để xem vị trí đang tuyển phù hợp.</p>
        </div>
        <label className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên, chức danh, kỹ năng"
            className="h-10 w-full rounded-full border-0 bg-white pl-9 pr-4 text-sm ring-1 ring-line placeholder:text-mute focus:ring-2 focus:ring-brand-500/40" />
        </label>
      </div>
      <div className="overflow-x-auto pb-1"><Segmented value={source} onChange={setSource} options={options} /></div>

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((cv) => {
          const top = best[cv.id]
          return (
            <Link key={cv.id} to={`/candidates/${cv.id}`} className="group min-w-0">
              <Card className="flex h-full flex-col gap-3 p-4 transition group-hover:ring-ink/20">
                <div className="flex items-start gap-3">
                  <Avatar name={cv.name} masked={s.masked} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold group-hover:text-brand-700">{displayName(cv, s.masked)}</p>
                      <SourceBadge source={cv.source} />
                    </div>
                    <p className="truncate text-[13px] text-mute">{cv.headline} · {fmtYears(totalYears(cv))} · {cv.city}</p>
                  </div>
                  <span className="hidden shrink-0 text-xs text-mute sm:inline">Cập nhật {fmtDate(cv.updatedAt)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(cv.skills).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, lv]) => <Pill key={id}>{skillName(id)} · {lv}/5</Pill>)}
                </div>
                <div className="mt-auto flex items-center gap-3 rounded-xl bg-soft px-3 py-2">
                  <ScoreRing value={top.m.score} grade={top.m.grade} size={36} stroke={4} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-mute">Phù hợp nhất</p>
                    <p className="truncate text-sm font-medium">{top.job.title}</p>
                  </div>
                  <GradeChip grade={top.m.grade} size="sm" />
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
      {!list.length && <Card><Empty icon={UserX} title="Không tìm thấy hồ sơ">Thử từ khoá khác, ví dụ “Python” hoặc “kiểm thử”.</Empty></Card>}
    </div>
  )
}
