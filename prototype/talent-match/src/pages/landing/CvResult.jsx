// Kết quả khi thả CV ở trang đích: AI đọc được gì + các vị trí phù hợp nhất, mỗi vị trí có giải thích.
import { useState } from 'react'
import { ChevronDown, Lock, MapPin, Languages, GraduationCap, Briefcase } from 'lucide-react'
import { LEVELS, SKILLS, DEGREES } from '../../data/skills.js'
import { totalYears, fmtYears, period } from '../../lib/criteria.js'
import { GRADES } from '../../lib/match.js'
import { ExplainCard } from '../../components/Explain.jsx'
import { Card, ScoreRing, AiTag, cx } from '../../ui.jsx'

export function ParsedCv({ cv }) {
  const skills = Object.entries(cv.skills).sort((a, b) => b[1] - a[1])
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2"><p className="font-semibold">AI đọc được từ CV</p><AiTag>Tự động</AiTag></div>
      <p className="mt-3 text-lg font-semibold">{cv.name}</p>
      <p className="text-sm text-mute">{cv.headline}</p>
      <ul className="mt-3 space-y-1.5 text-sm">
        <li className="flex items-center gap-2"><Briefcase size={14} className="text-mute" aria-hidden />{fmtYears(totalYears(cv))} kinh nghiệm · {cv.history.length} vị trí</li>
        <li className="flex items-center gap-2"><MapPin size={14} className="text-mute" aria-hidden />{cv.city}</li>
        <li className="flex items-center gap-2"><Languages size={14} className="text-mute" aria-hidden />{cv.english.label}</li>
        <li className="flex items-center gap-2"><GraduationCap size={14} className="text-mute" aria-hidden />{DEGREES[cv.education.level]} · {cv.education.major}</li>
      </ul>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-mute">{skills.length} kỹ năng</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {skills.map(([id, lv]) => <span key={id} className="rounded-full bg-soft px-2 py-0.5 text-xs ring-1 ring-line">{SKILLS[id].name} <span className="text-mute">· {LEVELS[lv]}</span></span>)}
      </div>
      {cv.history.length > 0 && (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-mute">Kinh nghiệm</p>
          <ul className="mt-2 space-y-2">
            {cv.history.map((e) => (
              <li key={`${e.from}-${e.org}`} className="text-sm"><span className="font-medium">{e.title}</span><span className="block text-xs text-mute">{e.org} · {period(e)}</span></li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-4 flex items-start gap-1.5 text-xs text-mute"><Lock size={12} className="mt-0.5 shrink-0" aria-hidden />Email và số điện thoại không được trích xuất hay lưu lại.</p>
    </Card>
  )
}

export default function CvResult({ ranking, selected, onSelect }) {
  const [open, setOpen] = useState(selected)
  return (
    <Card className="divide-y divide-line">
      <div className="px-5 py-4">
        <p className="font-semibold">Vị trí phù hợp nhất với CV này</p>
        <p className="text-xs text-mute">Chấm với {ranking.length} vị trí đang tuyển theo cùng bộ tiêu chí có trọng số.</p>
      </div>
      {ranking.slice(0, 5).map(({ job, m }) => {
        const isOpen = open === job.id
        return (
          <div key={job.id}>
            <button type="button" onClick={() => { setOpen(isOpen ? null : job.id); onSelect(job.id) }} aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-paper">
              <ScoreRing value={m.score} grade={m.grade} size={44} stroke={4.5} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{job.title}</span>
                <span className="block truncate text-xs text-mute">{GRADES[m.grade].label} · {job.dept} · {job.city}</span>
              </span>
              <ChevronDown size={16} className={cx('shrink-0 text-mute transition', isOpen && 'rotate-180')} aria-hidden />
            </button>
            {isOpen && <div className="bg-paper/60 px-5 pb-5 pt-2"><ExplainCard m={m} ring={72} /></div>}
          </div>
        )
      })}
    </Card>
  )
}
