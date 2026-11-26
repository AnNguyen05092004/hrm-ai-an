// Cây tiêu chí top-down: Tổng 100 → nhóm (trọng số) → tiêu chí (mức độ, trọng số trong nhóm, mức yêu cầu).
// Chỉnh đến đâu, bảng xếp hạng bên phải tính lại đến đó (so với bản đang áp dụng).
import { useMemo, useState } from 'react'
import { ChevronDown, Plus, X, RotateCcw, Scale, ArrowUp, ArrowDown, Minus, Quote, AlertCircle } from 'lucide-react'
import { useStore, displayName } from '../store.jsx'
import { rankCandidates, distributeByReq, groupWeightTotal, REQ } from '../lib/match.js'
import { labelOf, needOf, newItem } from '../lib/criteria.js'
import { SKILLS, LEVELS, DEGREES, DOMAINS, CERTS } from '../data/skills.js'
import { Card, Button, Segmented, GradeChip, AiTag, GROUP_COLOR, cx } from '../ui.jsx'

const SKILL_GROUP_KIND = { skills: 'hard', soft: 'soft' }
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

function NumberInput({ value, onChange, min = 0, max = 100, step = 1, suffix, label, className }) {
  return (
    <label className={cx('inline-flex items-center gap-1 rounded-lg bg-white px-2 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand-500/40', className)}>
      <input type="number" aria-label={label} value={value} min={min} max={max} step={step}
        onChange={(e) => onChange(Math.max(min, Math.min(max, num(e.target.value))))}
        className="h-8 w-12 border-0 bg-transparent p-0 text-right text-sm tabular-nums focus:ring-0" />
      {suffix && <span className="text-xs text-mute">{suffix}</span>}
    </label>
  )
}

const selectCls = 'h-8 rounded-lg border-0 bg-white px-2 text-sm ring-1 ring-line focus:ring-2 focus:ring-brand-500/40'

function ParamEditor({ item, onChange }) {
  if (item.type === 'skill') {
    return (
      <select aria-label="Mức yêu cầu" value={item.level} onChange={(e) => onChange({ level: num(e.target.value) })} className={selectCls}>
        {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>{LEVELS[l]} ({l}/5)</option>)}
      </select>
    )
  }
  if (item.type === 'years') return <NumberInput label="Số năm tối thiểu" value={item.min} min={0.5} max={15} step={0.5} suffix="năm" onChange={(min) => onChange({ min })} />
  if (item.type === 'lang') {
    return (
      <select aria-label="Điểm tối thiểu" value={item.min} onChange={(e) => onChange({ min: num(e.target.value) })} className={selectCls}>
        {[4.5, 5, 5.5, 6, 6.5, 7, 7.5].map((b) => <option key={b} value={b}>IELTS {b.toFixed(1)}</option>)}
      </select>
    )
  }
  if (item.type === 'degree') {
    return (
      <select aria-label="Bậc học tối thiểu" value={item.min} onChange={(e) => onChange({ min: num(e.target.value) })} className={selectCls}>
        {[1, 2, 3, 4].map((d) => <option key={d} value={d}>{DEGREES[d]}</option>)}
      </select>
    )
  }
  return null
}

function ItemRow({ item, job, eff, onChange, onRemove }) {
  return (
    <div className="grid gap-x-3 gap-y-2 border-t border-line px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
      <div className="min-w-0 md:col-span-4 md:-mb-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-ink">{labelOf(item)}
          <span className="inline-flex min-w-0 items-center gap-1 text-xs font-normal text-mute" title="Câu trong JD mà AI trích ra">
            <Quote size={11} className="shrink-0" aria-hidden />{item.src}
          </span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented size="sm" value={item.req} onChange={(req) => onChange({ req })} options={Object.entries(REQ).map(([value, r]) => ({ value, label: r.label }))} />
      </div>
      <div className="flex items-center gap-2">
        <ParamEditor item={item} onChange={onChange} />
        {!['skill', 'years', 'lang', 'degree'].includes(item.type) && <span className="text-xs text-mute">{needOf(item, job)}</span>}
      </div>
      <div className="flex items-center gap-2">
        <NumberInput label="Trọng số trong nhóm" value={item.weight} suffix="%" onChange={(weight) => onChange({ weight })} />
        <span className="w-20 text-right text-xs tabular-nums text-mute" title="Trọng số trên tổng điểm">= {eff.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} điểm</span>
      </div>
      <button type="button" onClick={onRemove} className="justify-self-end rounded-full p-1.5 text-mute hover:bg-soft hover:text-danger-700" aria-label={`Bỏ tiêu chí ${labelOf(item)}`}>
        <X size={16} />
      </button>
    </div>
  )
}

/** Các loại tiêu chí con có thể thêm vào từng nhóm (mỗi loại đều có cách chấm trong lib/criteria.scoreItem). */
function addOptions(group) {
  const used = new Set(group.items.map((i) => `${i.type}:${i.skill ?? i.domain ?? i.cert ?? (i.domains ?? []).join('+')}`))
  const fresh = (list) => list.filter(([key]) => !used.has(key))
  const kind = SKILL_GROUP_KIND[group.id]
  if (kind) {
    return [['Kỹ năng', fresh(Object.entries(SKILLS).filter(([, sk]) => sk.kind === kind).map(([id, sk]) => [`skill:${id}`, sk.name]))]]
  }
  if (group.id === 'experience') {
    return [
      ['Số năm kinh nghiệm theo lĩnh vực', fresh(Object.entries(DOMAINS).map(([id, name]) => [`years:${id}`, `Kinh nghiệm ${name}`]))],
      ['Từng làm trong lĩnh vực', fresh(Object.entries(DOMAINS).map(([id, name]) => [`domain:${id}`, `Từng làm lĩnh vực ${name}`]))],
    ]
  }
  if (group.id === 'education') return [['Chứng chỉ', fresh(Object.entries(CERTS).map(([id, name]) => [`cert:${id}`, name]))]]
  return []
}

function AddCriterion({ group, onAdd }) {
  const groups = addOptions(group).filter(([, list]) => list.length)
  if (!groups.length) return null
  return (
    <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
      <Plus size={15} className="text-mute" aria-hidden />
      <select value="" onChange={(e) => e.target.value && onAdd(newItem(e.target.value))} className={cx(selectCls, 'max-w-full text-mute')} aria-label={`Thêm tiêu chí vào nhóm ${group.name}`}>
        <option value="">Thêm tiêu chí con…</option>
        {groups.map(([label, list]) => (
          <optgroup key={label} label={label}>{list.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</optgroup>
        ))}
      </select>
    </div>
  )
}

function GroupCard({ group, totalGroups, job, onGroup, onItem, onRemove, onAdd }) {
  const [open, setOpen] = useState(group.id === 'skills')
  const itemTotal = group.items.reduce((s, i) => s + num(i.weight), 0)
  const share = totalGroups ? (group.weight / totalGroups) * 100 : 0
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-expanded={open}>
          <ChevronDown size={18} className={cx('shrink-0 text-mute transition', !open && '-rotate-90')} aria-hidden />
          <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: GROUP_COLOR[group.id] }} aria-hidden />
          <span className="font-semibold text-ink">{group.name}</span>
          <span className="text-xs text-mute">{group.items.length} tiêu chí</span>
        </button>
        <input type="range" min={0} max={70} value={group.weight} onChange={(e) => onGroup({ weight: num(e.target.value) })} className="w-28 sm:w-40" aria-label={`Trọng số nhóm ${group.name}`} />
        <NumberInput label={`Trọng số nhóm ${group.name}`} value={group.weight} suffix="%" onChange={(weight) => onGroup({ weight })} />
      </div>
      {open && (
        <div className="bg-soft/40">
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2 text-xs text-mute">
            <span>Trọng số các tiêu chí con: <b className={cx('tabular-nums', itemTotal === 100 ? 'text-ink' : 'text-amber-700')}>{itemTotal}/100</b> · nhóm chiếm {share.toFixed(0)} điểm
              {itemTotal !== 100 && itemTotal > 0 && <span className="text-amber-700"> · khi chấm sẽ quy đổi theo tỷ lệ về 100</span>}
            </span>
            <button type="button" onClick={() => onGroup({ items: distributeByReq(group.items) })} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
              <Scale size={13} aria-hidden />Phân bổ theo mức độ (3 : 2 : 1)
            </button>
          </div>
          {group.items.map((item) => (
            <ItemRow key={item.id} item={item} job={job} eff={itemTotal ? (share * num(item.weight)) / itemTotal : 0}
              onChange={(p) => onItem(item.id, p)} onRemove={() => onRemove(item.id)} />
          ))}
          {!group.items.length && <p className="border-t border-line px-4 py-3 text-sm text-mute">Nhóm không có tiêu chí — không tính vào điểm.</p>}
          <AddCriterion group={group} onAdd={onAdd} />
        </div>
      )}
    </Card>
  )
}

function WeightBar({ groups }) {
  const active = groups.filter((g) => g.items.length && g.weight > 0)
  const total = active.reduce((s, g) => s + g.weight, 0) || 1
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {active.map((g) => <span key={g.id} style={{ width: `${(g.weight / total) * 100}%`, background: GROUP_COLOR[g.id] }} title={`${g.name}: ${g.weight}%`} />)}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">
        {active.map((g) => (
          <span key={g.id} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: GROUP_COLOR[g.id] }} aria-hidden />{g.name} <b className="tabular-nums text-ink">{g.weight}%</b>
          </span>
        ))}
      </div>
    </div>
  )
}

function Preview({ job, draft, saved }) {
  const s = useStore()
  const before = useMemo(() => rankCandidates(job, s.cvs, saved), [job, s.cvs, saved])
  const after = useMemo(() => rankCandidates(job, s.cvs, draft), [job, s.cvs, draft])
  const prevRank = Object.fromEntries(before.map(({ cv }, i) => [cv.id, i]))
  const prevScore = Object.fromEntries(before.map(({ cv, m }) => [cv.id, m]))
  return (
    <Card className="p-4 lg:sticky lg:top-6">
      <p className="font-semibold">Xem trước xếp hạng</p>
      <p className="mt-0.5 text-xs text-mute">So với bộ tiêu chí đang áp dụng</p>
      <ol className="mt-3 space-y-1">
        {after.slice(0, 8).map(({ cv, m }, i) => {
          const move = prevRank[cv.id] - i
          const delta = m.score - prevScore[cv.id].score
          const MoveIcon = move > 0 ? ArrowUp : move < 0 ? ArrowDown : Minus
          return (
            <li key={cv.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm hover:bg-soft">
              <span className="w-4 text-right text-xs tabular-nums text-mute">{i + 1}</span>
              <MoveIcon size={13} className={move > 0 ? 'text-emerald-600' : move < 0 ? 'text-danger-600' : 'text-line'} aria-label={move ? `${move > 0 ? 'Lên' : 'Xuống'} ${Math.abs(move)} bậc` : 'Giữ nguyên'} />
              <span className="min-w-0 flex-1 truncate">{displayName(cv, s.masked)}</span>
              {delta !== 0 && <span className={cx('text-xs tabular-nums', delta > 0 ? 'text-emerald-700' : 'text-danger-700')}>{delta > 0 ? '+' : ''}{delta}</span>}
              <span className="w-9 text-right font-semibold tabular-nums">{m.score}%</span>
              <GradeChip grade={m.grade} size="sm" />
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

export default function JobCriteria({ job, onDone }) {
  const s = useStore()
  const saved = s.criteriaOf(job.id)
  const [draft, setDraft] = useState(saved)
  const total = groupWeightTotal(draft)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const badGroup = draft.groups.find((g) => g.items.length && g.items.reduce((n, i) => n + num(i.weight), 0) === 0)
  const t = draft.thresholds
  const badThresholds = !(t.A > t.B && t.B > t.C && t.C > 0)
  const canSave = total === 100 && !badGroup && !badThresholds

  const setGroup = (gid, p) => setDraft((d) => ({ ...d, groups: d.groups.map((g) => (g.id === gid ? { ...g, ...p } : g)) }))
  const setItem = (gid, iid, p) => setDraft((d) => ({ ...d, groups: d.groups.map((g) => (g.id === gid ? { ...g, items: g.items.map((i) => (i.id === iid ? { ...i, ...p } : i)) } : g)) }))
  const removeItem = (gid, iid) => setGroup(gid, { items: draft.groups.find((g) => g.id === gid).items.filter((i) => i.id !== iid) })
  const addItem = (gid, item) => setDraft((d) => ({ ...d, groups: d.groups.map((g) => (g.id === gid ? { ...g, items: [...g.items, item] } : g)) }))
  const rebalance = () => {
    const active = draft.groups.filter((g) => g.items.length)
    const sum = active.reduce((n, g) => n + g.weight, 0) || 1
    const scaled = active.map((g) => ({ id: g.id, w: Math.round((g.weight / sum) * 100) }))
    const diff = 100 - scaled.reduce((n, x) => n + x.w, 0)
    const fixed = Object.fromEntries(scaled.map((x, i) => [x.id, x.w + (i === 0 ? diff : 0)]))
    setDraft((d) => ({ ...d, groups: d.groups.map((g) => (g.id in fixed ? { ...g, weight: fixed[g.id] } : { ...g, weight: 0 })) }))
  }
  const save = () => { s.saveCriteria(job.id, draft); s.notify('Đã lưu và chốt tiêu chí — xếp hạng đã cập nhật'); onDone() }
  const restoreAi = () => { s.resetCriteria(job.id); setDraft(job.criteria); s.notify('Đã khôi phục tiêu chí AI đề xuất') }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Điểm phù hợp = Σ trọng số nhóm × trọng số tiêu chí × mức đạt</p>
              <p className="mt-0.5 text-xs text-mute">Tiêu chí bắt buộc đạt dưới 50% → hồ sơ tối đa hạng C. {s.statusOf(job.id) === 'draft' && <AiTag>AI trích từ JD – cần chốt</AiTag>}</p>
            </div>
            <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums ring-1',
              total === 100 ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200')}>
              Tổng nhóm {total}/100
            </span>
          </div>
          <WeightBar groups={draft.groups} />
          {total !== 100 && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-amber-800">
              <AlertCircle size={15} aria-hidden />Tổng trọng số các nhóm phải bằng 100.
              <button type="button" onClick={rebalance} className="font-medium text-brand-700 hover:underline">Tự cân về 100 theo tỷ lệ</button>
            </p>
          )}
        </Card>

        {draft.groups.map((g) => (
          <GroupCard key={g.id} group={g} totalGroups={total} job={job}
            onGroup={(p) => setGroup(g.id, p)} onItem={(iid, p) => setItem(g.id, iid, p)}
            onRemove={(iid) => removeItem(g.id, iid)} onAdd={(item) => addItem(g.id, item)} />
        ))}

        <Card className="flex flex-wrap items-center gap-4 p-4">
          <p className="text-sm font-semibold">Ngưỡng xếp hạng</p>
          {['A', 'B', 'C'].map((g) => (
            <span key={g} className="inline-flex items-center gap-2 text-sm"><GradeChip grade={g} size="sm" />từ
              <NumberInput label={`Ngưỡng hạng ${g}`} value={t[g]} min={1} max={100} suffix="%" onChange={(v) => setDraft((d) => ({ ...d, thresholds: { ...d.thresholds, [g]: v } }))} />
            </span>
          ))}
          <span className="text-sm text-mute">· còn lại là hạng D</span>
          {badThresholds && <span className="text-sm text-amber-800">Ngưỡng phải giảm dần A &gt; B &gt; C.</span>}
        </Card>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-pop ring-1 ring-line backdrop-blur">
          <Button variant="ghost" onClick={restoreAi}><RotateCcw size={15} aria-hidden />Khôi phục đề xuất AI</Button>
          <div className="flex items-center gap-2">
            {badGroup && <span className="text-sm text-amber-800">Nhóm “{badGroup.name}” chưa có trọng số.</span>}
            <Button disabled={!dirty} onClick={() => setDraft(saved)}>Huỷ thay đổi</Button>
            <Button variant="primary" disabled={!canSave || (!dirty && s.statusOf(job.id) !== 'draft')} onClick={save}>Lưu & chốt tiêu chí</Button>
          </div>
        </div>
      </div>
      <aside><Preview job={job} draft={draft} saved={saved} /></aside>
    </div>
  )
}
