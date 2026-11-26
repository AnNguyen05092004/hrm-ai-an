// Kết quả khi thả JD ở trang đích: cây tiêu chí AI trích ra + ứng viên phù hợp trong kho (ẩn danh khi chưa lưu).
import { useState } from 'react'
import { ChevronDown, EyeOff } from 'lucide-react'
import { GROUP_COLOR, ReqBadge, Card, ScoreRing, Avatar, AiTag, cx } from '../../ui.jsx'
import { GRADES } from '../../lib/match.js'
import { ExplainCard } from '../../components/Explain.jsx'
import { displayName } from '../../store.jsx'

export function ParsedJd({ job, m }) {
  const groups = m.groups
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2"><p className="font-semibold">Tiêu chí AI trích từ JD</p><AiTag>Tự động</AiTag></div>
      <p className="mt-3 text-lg font-semibold">{job.title}</p>
      <p className="text-sm text-mute">{job.city} · {job.mode}{job.salaryKnown ? ` · ${job.salary.min}–${job.salary.max} triệu` : ''}</p>
      <div className="mt-4 space-y-4">
        {groups.map((g) => (
          <div key={g.id}>
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 font-medium"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_COLOR[g.id] }} aria-hidden />{g.name}</span>
              <span className="tabular-nums text-mute">{Math.round(g.max)} điểm</span>
            </div>
            <ul className="mt-1.5 space-y-1 pl-[18px]">
              {g.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="min-w-0 truncate">{i.label} <span className="text-mute">· {i.need}</span></span>
                  <ReqBadge req={i.req} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function JdResult({ ranking }) {
  const [open, setOpen] = useState(ranking[0]?.cv.id)
  return (
    <Card className="divide-y divide-line">
      <div className="px-5 py-4">
        <p className="font-semibold">Ứng viên phù hợp trong kho hồ sơ</p>
        <p className="flex items-center gap-1.5 text-xs text-mute"><EyeOff size={12} aria-hidden />Đang ẩn danh — lưu tin để xem hồ sơ đầy đủ. Chấm trên {ranking.length} hồ sơ.</p>
      </div>
      {ranking.slice(0, 5).map(({ cv, m }) => {
        const isOpen = open === cv.id
        return (
          <div key={cv.id}>
            <button type="button" onClick={() => setOpen(isOpen ? null : cv.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-paper">
              <Avatar name={cv.name} masked size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{displayName(cv, true)}</span>
                <span className="block truncate text-xs text-mute">{cv.headline} · {GRADES[m.grade].label}</span>
              </span>
              <ScoreRing value={m.score} grade={m.grade} size={44} stroke={4.5} />
              <ChevronDown size={16} className={cx('shrink-0 text-mute transition', isOpen && 'rotate-180')} aria-hidden />
            </button>
            {isOpen && <div className="bg-paper/60 px-5 pb-5 pt-2"><ExplainCard m={m} ring={72} /></div>}
          </div>
        )
      })}
    </Card>
  )
}
