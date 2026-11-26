// Hồ sơ đã được chuẩn hoá (AI đọc CV → kỹ năng, mức, kinh nghiệm theo lĩnh vực).
import { GraduationCap, Languages, Award, MapPin, Wallet, Clock } from 'lucide-react'
import { SKILLS, DOMAINS, DEGREES, CERTS, LEVELS, skillName } from '../data/skills.js'
import { monthsBetween, fmtYears, period } from '../lib/criteria.js'
import { Card, Pill } from '../ui.jsx'

function Dots({ level }) {
  return (
    <span role="img" className="inline-flex gap-0.5" aria-label={`${LEVELS[level]} (${level}/5)`} title={`${LEVELS[level]} (${level}/5)`}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= level ? 'h-1.5 w-3 rounded-full bg-ink' : 'h-1.5 w-3 rounded-full bg-[#e2e5ec]'} />)}
    </span>
  )
}

function Section({ title, children }) {
  return (
    <section className="border-t border-line px-5 py-4 first:border-t-0">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-mute">{title}</h2>
      {children}
    </section>
  )
}

export default function CvView({ cv }) {
  const skills = Object.entries(cv.skills).sort((a, b) => b[1] - a[1])
  const hard = skills.filter(([id]) => SKILLS[id]?.kind === 'hard')
  const soft = skills.filter(([id]) => SKILLS[id]?.kind === 'soft')
  return (
    <Card>
      <Section title="Tóm tắt"><p className="text-[15px] leading-relaxed">{cv.summary}</p></Section>
      <Section title="Kinh nghiệm">
        <ol className="relative space-y-4 border-l border-line pl-5">
          {cv.history.map((e) => (
            <li key={`${e.org}-${e.from}`} className="relative">
              <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-ink ring-1 ring-line" aria-hidden />
              <p className="font-medium">{e.title}</p>
              <p className="text-[13px] text-mute">{e.org} · {period(e)} · {fmtYears(monthsBetween(e.from, e.to) / 12)}</p>
              <p className="mt-1 text-sm">{e.note}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {e.tags.map((t) => <Pill key={t} className="bg-indigo-50 text-indigo-700 ring-indigo-100">{DOMAINS[t]}</Pill>)}
                {e.skills.map((k) => <Pill key={k}>{skillName(k)}</Pill>)}
              </div>
            </li>
          ))}
        </ol>
      </Section>
      <Section title="Kỹ năng">
        <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {[...hard, ...soft].map(([id, lv]) => (
            <div key={id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{skillName(id)}{SKILLS[id]?.kind === 'soft' && <span className="text-xs text-mute"> · mềm</span>}</span>
              <Dots level={lv} />
            </div>
          ))}
        </div>
      </Section>
      <Section title="Học vấn, ngoại ngữ, chứng chỉ">
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2"><GraduationCap size={16} className="text-mute" aria-hidden />{DEGREES[cv.education.level]} {cv.education.major} · {cv.education.school}</p>
          <p className="flex items-center gap-2"><Languages size={16} className="text-mute" aria-hidden />Tiếng Anh {cv.english.label}</p>
          {cv.certs.map((c) => <p key={c} className="flex items-center gap-2"><Award size={16} className="text-mute" aria-hidden />{CERTS[c]}</p>)}
        </div>
      </Section>
      <Section title="Nguyện vọng">
        <div className="flex flex-wrap gap-2">
          <Pill><MapPin size={13} aria-hidden />{cv.city}{cv.relocate ? ' · sẵn sàng chuyển nơi ở' : ''}</Pill>
          <Pill><Wallet size={13} aria-hidden />Kỳ vọng {cv.salary} triệu</Pill>
          <Pill><Clock size={13} aria-hidden />Nhận việc sau {cv.noticeDays} ngày</Pill>
        </div>
      </Section>
    </Card>
  )
}
