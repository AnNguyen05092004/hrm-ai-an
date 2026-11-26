// JD → kho hồ sơ: xếp hạng toàn bộ hồ sơ theo Match Score, lọc theo hạng, nguồn, tiêu chí đã đạt.
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Star, Columns3, SlidersHorizontal, SearchX } from 'lucide-react'
import { useStore, displayName } from '../store.jsx'
import { rankCandidates } from '../lib/match.js'
import { totalYears, fmtYears } from '../lib/criteria.js'
import { Card, Button, GradeChip, ScoreRing, SkillChip, SourceBadge, Avatar, KnockoutNote, Empty, toneOfShare, cx } from '../ui.jsx'

const MAX_COMPARE = 4
const SORTS = { score: 'Điểm phù hợp', years: 'Số năm kinh nghiệm', updated: 'Mới cập nhật' }
const sourceKey = (cv, appliedHere) => (appliedHere ? 'here' : cv.source === 'applied' ? 'pool' : cv.source)
const SOURCE_FILTERS = [['here', 'Ứng tuyển vị trí này'], ['pool', 'Kho hồ sơ'], ['internal', 'Nội bộ'], ['referral', 'Giới thiệu']]

function Check({ checked, onChange, children, count }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-sm hover:bg-soft">
      <span className="flex min-w-0 items-center gap-2"><input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 shrink-0 rounded" />{children}</span>
      {count != null && <span className="text-xs tabular-nums text-mute">{count}</span>}
    </label>
  )
}

function GroupBars({ groups }) {
  return (
    <div className="flex items-end gap-1" aria-label="Mức đạt theo nhóm tiêu chí">
      {groups.map((g) => (
        <span key={g.id} className="flex flex-col items-center gap-1" title={`${g.name}: đạt ${Math.round(g.s * 100)}% · ${g.points.toFixed(1)}/${g.max.toFixed(0)} điểm`}>
          <span className="relative block h-7 w-2.5 overflow-hidden rounded-sm bg-[#e8ebf1]">
            <span className={cx('absolute inset-x-0 bottom-0 rounded-sm', toneOfShare(g.s))} style={{ height: `${g.s * 100}%` }} />
          </span>
        </span>
      ))}
    </div>
  )
}

function Filters({ jobId, ranking, f, setF, mustItems }) {
  const s = useStore()
  const count = (pred) => ranking.filter(pred).length
  const toggle = (key, val) => setF((p) => ({ ...p, [key]: p[key].includes(val) ? p[key].filter((x) => x !== val) : [...p[key], val] }))
  return (
    <Card className="space-y-5 p-4 lg:sticky lg:top-6">
      <section>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-mute">Hạng phù hợp</p>
        {['A', 'B', 'C', 'D'].map((g) => (
          <Check key={g} checked={f.grades.includes(g)} onChange={() => toggle('grades', g)} count={count(({ m }) => m.grade === g)}>
            <GradeChip grade={g} size="sm" showLabel />
          </Check>
        ))}
      </section>
      <section>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-mute">Nguồn hồ sơ</p>
        {SOURCE_FILTERS.map(([k, label]) => (
          <Check key={k} checked={f.sources.includes(k)} onChange={() => toggle('sources', k)}
            count={count(({ cv }) => sourceKey(cv, s.hasApplied(cv.id, jobId)) === k)}>{label}</Check>
        ))}
      </section>
      <section>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-mute">Phải đạt tiêu chí</p>
        <Check checked={f.noKnockout} onChange={() => setF((p) => ({ ...p, noKnockout: !p.noKnockout }))} count={count(({ m }) => !m.knockouts.length)}>
          Đủ mọi tiêu chí bắt buộc
        </Check>
        {mustItems.map((it) => (
          <Check key={it.id} checked={f.required.includes(it.id)} onChange={() => toggle('required', it.id)}
            count={count(({ m }) => m.groups.some((g) => g.items.some((i) => i.id === it.id && i.status === 'met')))}>
            <span className="truncate">{it.label}</span>
          </Check>
        ))}
      </section>
      <section>
        <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-mute">
          Điểm tối thiểu <span className="text-sm normal-case tabular-nums text-ink">{f.min}%</span>
        </label>
        <input type="range" min={0} max={95} step={5} value={f.min} onChange={(e) => setF((p) => ({ ...p, min: Number(e.target.value) }))} className="mt-2 w-full" aria-label="Điểm tối thiểu" />
      </section>
    </Card>
  )
}

function CandidateRow({ job, rank, cv, m, selected, onSelect, canSelect }) {
  const s = useStore()
  const appliedHere = s.hasApplied(cv.id, job.id)
  const starred = s.isShortlisted(job.id, cv.id)
  const items = m.groups.flatMap((g) => g.items).filter((i) => i.type === 'skill')
  const met = items.filter((i) => i.status === 'met').sort((a, b) => b.eff - a.eff).slice(0, 3)
  const gaps = m.gaps.filter((i) => i.type === 'skill').slice(0, 2)
  return (
    <Card className={cx('flex flex-col gap-3 px-4 py-3.5 transition sm:flex-row sm:items-center', selected && 'ring-2 ring-brand-500/50')}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <input type="checkbox" checked={selected} disabled={!selected && !canSelect} onChange={onSelect} className="mt-2.5 h-4 w-4 rounded" aria-label="Chọn để so sánh" />
        <span className="mt-2 w-5 shrink-0 text-right text-xs tabular-nums text-mute">{rank}</span>
        <Avatar name={cv.name} masked={s.masked} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link to={`/jobs/${job.id}/match/${cv.id}`} className="font-semibold text-ink hover:text-brand-700">{displayName(cv, s.masked)}</Link>
            <SourceBadge source={cv.source} appliedHere={appliedHere} />
            {starred && <span className="inline-flex h-5 items-center rounded bg-amber-50 px-1.5 text-[11px] font-medium text-amber-800">Danh sách rút gọn</span>}
          </div>
          <p className="mt-0.5 truncate text-[13px] text-mute">{cv.headline} · {fmtYears(totalYears(cv))} · {cv.city}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {met.map((i) => <SkillChip key={i.id} status="met">{i.label}</SkillChip>)}
            {gaps.map((i) => <SkillChip key={i.id} status={i.status} title={i.note}>{i.near ? `${i.label} ≈ ${i.near}` : i.label}</SkillChip>)}
          </div>
          {m.knockouts.length > 0 && <div className="mt-1.5"><KnockoutNote items={m.knockouts} compact /></div>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 pl-[4.25rem] sm:pl-0">
        <GroupBars groups={m.groups} />
        <Link to={`/jobs/${job.id}/match/${cv.id}`} className="flex items-center gap-2.5" title="Xem phân tích chi tiết">
          <ScoreRing value={m.score} grade={m.grade} size={50} />
          <GradeChip grade={m.grade} />
        </Link>
        <button type="button" onClick={() => { s.toggleShortlist(job.id, cv.id); s.notify(starred ? 'Đã bỏ khỏi danh sách rút gọn' : 'Đã thêm vào danh sách rút gọn') }}
          className={cx('rounded-full p-2 transition hover:bg-soft', starred ? 'text-amber-500' : 'text-mute')} aria-pressed={starred} aria-label="Danh sách rút gọn">
          <Star size={18} fill={starred ? 'currentColor' : 'none'} />
        </button>
      </div>
    </Card>
  )
}

export default function JobCandidates({ job, onEditCriteria }) {
  const s = useStore()
  const navigate = useNavigate()
  const criteria = s.criteriaOf(job.id)
  const ranking = useMemo(() => rankCandidates(job, s.cvs, criteria), [job, s.cvs, criteria])
  const mustItems = ranking[0]?.m.groups.flatMap((g) => g.items).filter((i) => i.req === 'must' && i.type !== 'location') ?? []
  const [f, setF] = useState({ grades: ['A', 'B', 'C'], sources: SOURCE_FILTERS.map(([k]) => k), noKnockout: false, required: [], min: 0 })
  const [sort, setSort] = useState('score')
  const [picked, setPicked] = useState([])

  const list = ranking
    .filter(({ m }) => f.grades.includes(m.grade) && m.score >= f.min && (!f.noKnockout || !m.knockouts.length))
    .filter(({ cv }) => f.sources.includes(sourceKey(cv, s.hasApplied(cv.id, job.id))))
    .filter(({ m }) => f.required.every((id) => m.groups.some((g) => g.items.some((i) => i.id === id && i.status === 'met'))))
    .map((r) => ({ ...r, rank: ranking.indexOf(r) + 1 }))
    .sort((a, b) => (sort === 'years' ? totalYears(b.cv) - totalYears(a.cv) : sort === 'updated' ? b.cv.updatedAt.localeCompare(a.cv.updatedAt) : 0))
  const hiddenD = ranking.filter(({ m }) => m.grade === 'D').length
  const nItems = criteria.groups.reduce((n, g) => n + g.items.length, 0)
  const togglePick = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside>
        <details className="group lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-medium ring-1 ring-line">
            Bộ lọc <span className="text-xs font-normal text-mute">{f.grades.join(', ')} · từ {f.min}%</span>
          </summary>
          <div className="mt-3"><Filters jobId={job.id} ranking={ranking} f={f} setF={setF} mustItems={mustItems} /></div>
        </details>
        <div className="hidden lg:block"><Filters jobId={job.id} ranking={ranking} f={f} setF={setF} mustItems={mustItems} /></div>
      </aside>
      <section className="min-w-0 space-y-3">
        {s.statusOf(job.id) === 'draft' && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold-500/60 bg-gold-500/10 px-4 py-3 text-sm">
            <p className="min-w-0">Xếp hạng đang dùng <b>tiêu chí AI vừa trích từ JD</b>. Kiểm tra lại các tiêu chí và trọng số rồi chốt để dùng chính thức.</p>
            <Button variant="secondary" size="sm" onClick={onEditCriteria}><SlidersHorizontal size={14} aria-hidden />Kiểm tra tiêu chí</Button>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-mute">
            <b className="text-ink tabular-nums">{list.length}</b> hồ sơ · chấm theo {nItems} tiêu chí{s.isEdited(job.id) && ' (đã chỉnh)'}
            <span className="ml-2 hidden xl:inline" title={criteria.groups.filter((g) => g.items.length && g.weight > 0).map((g) => g.name).join(' → ')}>· cột nhỏ = mức đạt từng nhóm tiêu chí</span>
            <button type="button" onClick={onEditCriteria} className="ml-2 inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
              <SlidersHorizontal size={14} aria-hidden />Chỉnh tiêu chí
            </button>
          </p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-mute">
              Sắp xếp
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 rounded-full border-0 bg-white px-3 text-sm text-ink ring-1 ring-line focus:ring-2 focus:ring-brand-500/40">
                {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <Button variant={picked.length >= 2 ? 'primary' : 'secondary'} disabled={picked.length < 2}
              onClick={() => navigate(`/compare?job=${job.id}&ids=${picked.join(',')}`)}>
              <Columns3 size={16} aria-hidden />So sánh{picked.length ? ` (${picked.length})` : ''}
            </Button>
          </div>
        </div>
        {list.map(({ cv, m, rank }) => (
          <CandidateRow key={cv.id} job={job} rank={rank} cv={cv} m={m} selected={picked.includes(cv.id)}
            canSelect={picked.length < MAX_COMPARE} onSelect={() => togglePick(cv.id)} />
        ))}
        {!list.length && <Card><Empty icon={SearchX} title="Không có hồ sơ khớp bộ lọc">Nới điều kiện lọc, hoặc giảm điểm tối thiểu.</Empty></Card>}
        {!f.grades.includes('D') && hiddenD > 0 && (
          <button type="button" onClick={() => setF((p) => ({ ...p, grades: [...p.grades, 'D'] }))} className="w-full rounded-2xl border border-dashed border-line py-3 text-sm text-mute hover:bg-white hover:text-ink">
            Hiện thêm {hiddenD} hồ sơ hạng D (ít phù hợp)
          </button>
        )}
      </section>
    </div>
  )
}
