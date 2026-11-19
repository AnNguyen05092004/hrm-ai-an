// Kế hoạch đào tạo: tiêu chí (bộ phận, hạn) → phân tích → sơ đồ KPI → kỹ năng → khóa học → người học, chia đợt theo hạn.
import { Target, Wand2, BookOpen, AlertTriangle, CalendarDays, Building2, RefreshCw } from 'lucide-react'
import { Avatar, Spinner, FormatGlyph } from '../ui'

const DAY = 864e5
export const planDue = (days = 90) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10)
const fmt = (d) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** Tiêu chí đang chọn, dạng so sánh được để biết kết quả phân tích đã cũ hay chưa */
export const criteriaKey = (m, scope, due) => JSON.stringify({ k: m.kpis.filter((k) => k.active).map((k) => `${k.id}:${k.skills.map((s) => s.skillId).join(',')}`).sort(), s: [...scope].sort(), due })

/** Thu kế hoạch về các bộ phận đã chọn (chỉ giữ người thuộc phạm vi) */
export function scopeRecs(m, scope) {
  if (!scope.length) return m.recs
  const inScope = new Set(m.team.filter((p) => scope.includes(p.deptId)).map((p) => p.id))
  const keep = (ids) => ids.filter((id) => inScope.has(id))
  return m.recs.map((r) => ({ ...r, gap: keep(r.gap), byCourse: keep(r.byCourse), assigned: keep(r.assigned), completed: keep(r.completed), beyondCourse: keep(r.beyondCourse) })).filter((r) => r.gap.length)
}

/** Chia kỹ năng (đã xếp theo ưu tiên) thành tối đa 3 đợt đều nhau trong thời hạn kế hoạch */
export function planWaves(recs, due) {
  const n = Math.min(3, recs.length)
  if (!n) return []
  const start = Date.now(), end = Math.max(new Date(due).getTime(), start + 7 * DAY), per = Math.ceil(recs.length / n)
  return Array.from({ length: n }, (_, i) => ({
    n: i + 1,
    from: new Date(start + ((end - start) * i) / n).toISOString().slice(0, 10),
    to: new Date(start + ((end - start) * (i + 1)) / n).toISOString().slice(0, 10),
    skills: recs.slice(i * per, (i + 1) * per).map((r) => r.skillId),
  })).filter((w) => w.skills.length)
}

export function PlanCriteria({ m, scope, setScope, due, setDue, onAnalyze, busy, analyzed, stale }) {
  const depts = m.depts.filter((d) => m.team.some((p) => p.deptId === d.id))
  const active = m.kpis.filter((k) => k.active).length
  const toggle = (id) => setScope(scope.includes(id) ? scope.filter((x) => x !== id) : [...scope, id])
  const minDue = planDue(7)
  return (
    <div className="mt-5 grid grid-cols-[1fr_260px] gap-6 border-t border-line pt-5">
      <div>
        <div className="flex items-center gap-2 text-[14px] font-semibold"><Building2 size={16} />Bộ phận áp dụng</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={() => setScope([])} aria-pressed={!scope.length} className={`rounded-full border px-3 py-1.5 text-[13px] ${!scope.length ? 'border-ink bg-ink text-white' : 'border-line hover:bg-neutral-50'}`}>Tất cả bộ phận</button>
          {depts.map((d) => { const on = scope.includes(d.id); const n = m.team.filter((p) => p.deptId === d.id).length; return (
            <button key={d.id} onClick={() => toggle(d.id)} aria-pressed={on} className={`rounded-full border px-3 py-1.5 text-[13px] ${on ? 'border-ink bg-ink text-white' : 'border-line hover:bg-neutral-50'}`}>{d.name} <span className={on ? 'text-white/70' : 'text-neutral-500'}>· {n}</span></button>) })}
        </div>
      </div>
      <label className="block">
        <div className="flex items-center gap-2 text-[14px] font-semibold"><CalendarDays size={16} />Hạn hoàn thành kế hoạch</div>
        <input type="date" className="field mt-2 py-2" min={minDue} value={due} onChange={(e) => setDue(e.target.value)} />
        <div className="mt-1 text-[12px] text-neutral-500">Chia lộ trình thành các đợt trong thời hạn này.</div>
      </label>
      <div className="col-span-2 flex items-center gap-4 rounded-xl bg-neutral-50 px-4 py-3">
        <div className="flex-1 text-[14px] text-neutral-700">
          {active ? <><b>{active} KPI</b> đang bật · {scope.length ? <b>{scope.length} bộ phận</b> : <b>tất cả bộ phận</b>} · hạn <b>{fmt(due)}</b></> : <span className="text-amber-700">Bật ít nhất một KPI để phân tích.</span>}
          {analyzed && stale && <span className="ml-2 inline-flex items-center gap-1 text-amber-700"><AlertTriangle size={14} />Tiêu chí đã đổi, kết quả bên dưới chưa cập nhật.</span>}
        </div>
        <button className="btn-dark h-10" disabled={!active || busy || due < minDue} onClick={onAnalyze}>
          {busy ? <Spinner size={16} w={2} /> : analyzed ? <RefreshCw size={16} /> : <Wand2 size={16} />}{busy ? 'Đang phân tích…' : analyzed ? 'Phân tích lại' : 'Phân tích và lập kế hoạch'}</button>
      </div>
    </div>
  )
}

const ROW = 92, KPI_H = 64, COL = { kpi: [0, 23], skill: [29, 52], course: [58, 79], people: [85, 100] }

/** Sơ đồ kế hoạch: mỗi hàng là một kỹ năng cần bù, nối từ KPI cần nó tới khóa học và người cần học */
export function PlanFlow({ m, recs, waves, onSkill, onAssign, onGenerate, gen }) {
  if (!recs.length) return null
  const rowOf = Object.fromEntries(recs.map((r, i) => [r.skillId, i]))
  // xếp KPI theo vị trí trung bình của các kỹ năng nó cần, để đường nối ít cắt nhau
  const kpis = m.kpis.filter((k) => recs.some((r) => r.kpiIds.includes(k.id)))
    .map((k) => { const rows = recs.filter((r) => r.kpiIds.includes(k.id)).map((r) => rowOf[r.skillId]); return { k, at: rows.reduce((a, b) => a + b, 0) / rows.length } })
    .sort((a, b) => a.at - b.at).map((x) => x.k)
  const H = Math.max(recs.length * ROW, kpis.length * (KPI_H + 14))
  const ys = (i) => ((i + 0.5) * H) / recs.length, yk = (i) => ((i + 0.5) * H) / kpis.length
  const curve = (x1, y1, x2, y2) => { const mx = (x1 + x2) / 2; return `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}` }
  const waveOf = (sk) => waves.find((w) => w.skills.includes(sk))
  const person = (id) => m.team.find((p) => p.id === id)
  const box = (col, y, h) => ({ left: `${COL[col][0]}%`, width: `${COL[col][1] - COL[col][0]}%`, top: y - h / 2, height: h })
  return (
    <div className="scroll-thin overflow-x-auto pb-2">
      <div className="min-w-[980px]">
        <div className="relative mb-2 h-5 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">
          {[['kpi', 'KPI cần đạt'], ['skill', 'Kỹ năng cần bù · theo ưu tiên'], ['course', 'Khóa học'], ['people', 'Người học']].map(([c, l]) => <span key={c} className="absolute" style={{ left: `${COL[c][0]}%` }}>{l}</span>)}
        </div>
        <div className="relative" style={{ height: H }}>
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" aria-hidden>
            {kpis.flatMap((k, ki) => recs.filter((r) => r.kpiIds.includes(k.id)).map((r) => <path key={`${k.id}-${r.skillId}`} d={curve(COL.kpi[1], yk(ki), COL.skill[0], ys(rowOf[r.skillId]))} fill="none" stroke="#c4b5fd" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />))}
            {recs.map((r, i) => <g key={r.skillId}>
              <path d={curve(COL.skill[1], ys(i), COL.course[0], ys(i))} fill="none" stroke={r.courses.length ? '#a3a3a3' : '#f59e0b'} strokeDasharray={r.courses.length ? undefined : '4 4'} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              <path d={curve(COL.course[1], ys(i), COL.people[0], ys(i))} fill="none" stroke="#a3a3a3" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </g>)}
          </svg>

          {kpis.map((k, i) => (
            <div key={k.id} className="absolute flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3" style={box('kpi', yk(i), KPI_H)} title={k.name}>
              <Target size={16} className="shrink-0 text-violet-600" />
              <div className="min-w-0"><div className="line-clamp-2 text-[13px] font-semibold leading-snug">{k.name}</div>{k.target && <div className="truncate text-[11px] text-violet-700">mục tiêu {k.target}</div>}</div>
            </div>))}

          {recs.map((r, i) => {
            const w = waveOf(r.skillId), left = r.byCourse.filter((id) => !r.assigned.includes(id))
            const need = Math.max(...r.gap.map((id) => m.cells[id]?.[r.skillId]?.need ?? 1))
            return (
              <div key={r.skillId}>
                <button onClick={() => onSkill(r.skillId)} className="absolute rounded-xl border border-line bg-white px-3 py-2 text-left shadow-sm transition hover:border-neutral-400" style={box('skill', ys(i), ROW - 16)}>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold"><span className="rounded bg-ink px-1.5 py-px text-white">#{i + 1}</span>{w && <span className="text-neutral-500">Đợt {w.n} · đến {fmt(w.to)}</span>}</div>
                  <div className="mt-1 truncate text-[14px] font-semibold">{r.skillName}</div>
                  <div className="truncate text-[12px] text-neutral-500">Thiếu {r.gap.length} người · cần mức {need}</div>
                </button>
                {r.courses.length ? (
                  <div className="absolute flex flex-col justify-center rounded-xl border border-line bg-white px-3" style={box('course', ys(i), ROW - 16)}>
                    <div className="flex items-center gap-1.5 text-[13px] font-medium"><FormatGlyph type={r.courses[0].type} size={13} /><span className="truncate">{r.courses[0].title}</span></div>
                    <div className="mt-0.5 text-[12px] text-neutral-500">{r.courses.length > 1 ? `+${r.courses.length - 1} tài liệu · ` : ''}đưa tới mức {r.courseLevel}</div>
                  </div>
                ) : (
                  <div className="absolute flex flex-col justify-center gap-1.5 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3" style={box('course', ys(i), ROW - 16)}>
                    <div className="truncate text-[13px] font-medium text-amber-900">Thư viện chưa có khóa</div>
                    <button className="flex w-fit items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-white disabled:opacity-50" disabled={gen === r.skillId} onClick={() => onGenerate(r)}>{gen === r.skillId ? <Spinner size={12} w={2} /> : <Wand2 size={12} />}Tạo khóa bằng AI</button>
                  </div>
                )}
                <div className="absolute flex flex-col justify-center gap-1 rounded-xl border border-line bg-white px-3" style={box('people', ys(i), ROW - 16)}>
                  <div className="flex items-center">{r.gap.slice(0, 4).map((id, j) => { const p = person(id); return p && <span key={id} className={j ? '-ml-2' : ''}><Avatar text={p.initials} size={24} color={p.color} /></span> })}
                    {r.gap.length > 4 && <span className="-ml-2 grid h-6 w-6 place-items-center rounded-full bg-neutral-200 text-[10px] font-semibold ring-2 ring-white">+{r.gap.length - 4}</span>}</div>
                  {r.courses.length && left.length ? <button onClick={() => onAssign(r)} className="flex items-center gap-1 text-left text-[12px] font-semibold text-ink hover:underline"><BookOpen size={12} />Giao cho {left.length} người</button>
                    : <span className="text-[12px] text-neutral-500">{r.assigned.length ? `Đã giao ${r.assigned.length} · xong ${r.completed.length}` : `${r.gap.length} người`}</span>}
                </div>
              </div>)
          })}
        </div>
      </div>
    </div>
  )
}

/** Lộ trình theo đợt: mỗi đợt là một khoảng thời gian trong hạn kế hoạch, gồm các kỹ năng ưu tiên tương ứng */
export function PlanWaves({ waves, recs }) {
  const by = Object.fromEntries(recs.map((r) => [r.skillId, r]))
  return (<>
    <div className="mb-2 flex items-center gap-4 text-[12px] text-neutral-600"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Đã có khóa, giao được ngay</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Cần tạo khóa trước</span></div>
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${waves.length}, minmax(0, 1fr))` }}>{waves.map((w) => (
      <div key={w.n} className="rounded-xl border border-line p-4">
        <div className="flex items-baseline gap-2"><span className="text-[15px] font-semibold">Đợt {w.n}</span><span className="text-[12px] text-neutral-500">{fmt(w.from)} – {fmt(w.to)}</span></div>
        <ul className="mt-2 space-y-1.5">{w.skills.map((sk) => { const r = by[sk]; return (
          <li key={sk} className="flex items-center gap-2 text-[13px]"><span className={`h-2 w-2 shrink-0 rounded-full ${r.courses.length ? 'bg-emerald-500' : 'bg-amber-500'}`} /><span className="flex-1 truncate">{r.skillName}</span><span className="text-neutral-500">{r.gap.length} người</span></li>) })}</ul>
      </div>))}</div>
  </>)
}
