// Nửa trái của Chế độ đối chiếu: JD với từ khoá tô màu theo trạng thái trong CV. Bấm từ khoá để chèn vào CV.
import { MapPin, Wallet, Building2 } from 'lucide-react'
import { segment } from '../../lib/extract.js'
import { SKILLS } from '../../data/skills.js'
import { StatusIcon, cx } from '../../ui.jsx'

export const MARK = {
  met: 'bg-emerald-100 text-emerald-900 decoration-emerald-500 hover:bg-emerald-200',
  partial: 'bg-amber-100 text-amber-900 decoration-amber-500 hover:bg-amber-200',
  missing: 'bg-rose-100 text-rose-900 decoration-rose-500 hover:bg-rose-200',
}
const clean = (t) => t.replace(/…/g, '').trim()

function Highlighted({ text, bySkill, onPick }) {
  return segment(text).map((p, i) => {
    const item = p.skill && bySkill[p.skill]
    if (!item) return <span key={i}>{p.text}</span>
    return (
      <button key={i} type="button" onClick={(e) => onPick(p.skill, e.currentTarget)}
        title={`${item.label}: ${{ met: 'đã có', partial: 'đạt một phần', missing: 'chưa có' }[item.status]} — bấm để xử lý`}
        className={cx('rounded px-0.5 font-medium underline decoration-2 underline-offset-[3px] transition', MARK[item.status])}>
        {p.text}
      </button>
    )
  })
}

function Chips({ title, items, onPick }) {
  if (!items.length) return null
  const met = items.filter((i) => i.status === 'met').length
  return (
    <div>
      <p className="mb-2 flex items-baseline justify-between text-xs font-semibold uppercase tracking-wide text-mute">
        {title}<span className="normal-case tabular-nums">có {met}/{items.length}</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <button key={i.id} type="button" onClick={(e) => onPick(i.skill, e.currentTarget)}
            className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition',
              i.status === 'met' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100'
                : i.status === 'partial' ? 'bg-amber-50 text-amber-900 ring-amber-200 hover:bg-amber-100'
                  : 'bg-white text-rose-800 ring-rose-200 hover:bg-rose-50')}>
            <StatusIcon status={i.status} size={12} />{i.label}{i.near && <span className="font-normal opacity-75">≈ {i.near}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function JdPane({ job, m, onPick }) {
  const items = m.groups.flatMap((g) => g.items)
  const skillItems = items.filter((i) => i.type === 'skill')
  const bySkill = Object.fromEntries(skillItems.map((i) => [i.skill, i]))
  const other = items.filter((i) => i.type !== 'skill')
  const linked = (line) => other.filter((i) => line.includes(clean(i.src)) || clean(i.src).includes(line.slice(0, 24)))

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-mute">Mô tả công việc</p>
        <h2 className="mt-1 text-lg font-semibold leading-snug">{job.title}</h2>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-mute">
          <span className="inline-flex items-center gap-1"><Building2 size={13} aria-hidden />{job.dept}</span>
          <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden />{job.city} · {job.mode}</span>
          {job.salary.max > 0 && <span className="inline-flex items-center gap-1"><Wallet size={13} aria-hidden />{job.salary.min}–{job.salary.max} triệu</span>}
        </p>
      </div>

      <div className="space-y-4 rounded-xl bg-paper p-4 ring-1 ring-line">
        <Chips title="Kỹ năng chuyên môn" items={skillItems.filter((i) => SKILLS[i.skill].kind === 'hard')} onPick={onPick} />
        <Chips title="Kỹ năng mềm" items={skillItems.filter((i) => SKILLS[i.skill].kind === 'soft')} onPick={onPick} />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mute">Yêu cầu khác</p>
          <ul className="grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
            {other.map((i) => (
              <li key={i.id} className="flex items-start gap-2 text-[13px]"><StatusIcon status={i.status} size={14} />
                <span className="min-w-0">{i.label}<span className="block text-xs text-mute">có {i.have} · cần {i.need}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mute" aria-label="Chú thích màu">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-emerald-100 ring-1 ring-emerald-300" />CV đã có</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-amber-100 ring-1 ring-amber-300" />Có nhưng chưa đủ / gần đúng</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-rose-100 ring-1 ring-rose-300" />CV chưa có</span>
      </div>

      <article className="space-y-4 text-[14.5px] leading-7 text-ink/90">
        <p><Highlighted text={job.summary} bySkill={bySkill} onPick={onPick} /></p>
        {job.responsibilities.length > 0 && (
          <section>
            <h3 className="font-semibold text-ink">Trách nhiệm</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {job.responsibilities.map((r) => <li key={r}><Highlighted text={r} bySkill={bySkill} onPick={onPick} /></li>)}
            </ul>
          </section>
        )}
        <section>
          <h3 className="font-semibold text-ink">Yêu cầu</h3>
          <ul className="mt-1 space-y-1.5">
            {job.requirements.map((r) => {
              const tags = linked(r)
              return (
                <li key={r} className="flex gap-2">
                  <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" aria-hidden />
                  <span className="min-w-0">
                    <Highlighted text={r} bySkill={bySkill} onPick={onPick} />
                    {tags.map((t) => (
                      <span key={t.id} className="ml-1.5 inline-flex translate-y-[-1px] items-center gap-1 whitespace-nowrap rounded-full bg-white px-1.5 text-[11px] leading-5 text-mute ring-1 ring-line">
                        <StatusIcon status={t.status} size={11} />{t.have}
                      </span>
                    ))}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      </article>
    </div>
  )
}
