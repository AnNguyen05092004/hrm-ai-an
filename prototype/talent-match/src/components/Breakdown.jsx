// Phân rã điểm top-down: nhóm → tiêu chí → bằng chứng. Dùng chung cho nhà tuyển dụng và ứng viên.
import { useState } from 'react'
import { ChevronDown, Quote, Info } from 'lucide-react'
import { Card, StatusIcon, ReqBadge, Bar, toneOfShare, GROUP_COLOR, cx } from '../ui.jsx'

const fmt = (x) => x.toLocaleString('vi-VN', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
/** Điểm tiêu chí con: giữ tới 2 chữ số để phép cộng ra điểm nhóm khớp đúng, không lệch do làm tròn. */
const fmt2 = (x) => (Math.round(x * 100) / 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })
const pct = (x) => `${(Math.round(x * 1000) / 10).toLocaleString('vi-VN')}%`
const COLS = 'sm:grid-cols-[20px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_104px_92px]'

/** Thanh đóng góp: mỗi nhóm chiếm bề rộng = điểm đạt được; phần xám = điểm chưa đạt. */
export function ContributionBar({ m }) {
  const lost = Math.max(0, 100 - m.raw)
  return (
    <div>
      <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-[#e8ebf1]" role="img" aria-label={`Đạt ${m.raw} trên 100 điểm`}>
        {m.groups.map((g) => g.points > 0.05 && (
          <span key={g.id} style={{ width: `${g.points}%`, background: GROUP_COLOR[g.id] }} title={`${g.name}: ${fmt(g.points)} điểm`} />
        ))}
        {lost > 0.05 && <span style={{ width: `${lost}%` }} title={`Chưa đạt: ${fmt(lost)} điểm`} />}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">
        {m.groups.map((g) => (
          <span key={g.id} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: GROUP_COLOR[g.id] }} aria-hidden />
            {g.name} <b className="tabular-nums text-ink">{fmt(g.points)}</b>/{g.max.toFixed(0)}
          </span>
        ))}
      </div>
    </div>
  )
}

function Evidence({ item }) {
  const [open, setOpen] = useState(false)
  const ev = item.evidence ?? []
  if (!ev.length && !item.note) return null
  const first = ev[0]
  return (
    <div className="space-y-1 text-xs text-mute">
      {item.note && <p className="flex items-start gap-1"><Info size={12} className="mt-0.5 shrink-0" aria-hidden />{item.note}</p>}
      {first && !open && (
        <p className="flex flex-wrap items-center gap-x-1">
          <Quote size={12} className="shrink-0" aria-hidden />
          <span className="text-ink/80">{first.title}</span>{first.org && <span>· {first.org}</span>}{first.period && <span>({first.period})</span>}
          {(ev.length > 1 || first.note) && (
            <button type="button" onClick={() => setOpen(true)} className="ml-1 font-medium text-brand-700 hover:underline">
              {ev.length > 1 ? `Xem ${ev.length} bằng chứng` : 'Xem trích dẫn'}
            </button>
          )}
        </p>
      )}
      {open && ev.map((e) => (
        <p key={`${e.title}-${e.period}`} className="flex items-start gap-1">
          <Quote size={12} className="mt-0.5 shrink-0" aria-hidden />
          <span><span className="text-ink/80">{e.title}</span>{e.org && ` · ${e.org}`}{e.period && ` (${e.period})`}{e.note && <span className="block text-ink/70">“{e.note}”</span>}</span>
        </p>
      ))}
      {open && <button type="button" onClick={() => setOpen(false)} className="font-medium text-brand-700 hover:underline">Thu gọn</button>}
    </div>
  )
}

function ItemLine({ item, groupMax, showEvidence }) {
  const max = item.share * groupMax
  return (
    <div className={cx('grid grid-cols-[20px_minmax(0,1fr)] gap-x-3 border-t border-line px-4 py-3', COLS)}>
      <span className="pt-0.5"><StatusIcon status={item.status} /></span>
      <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-medium text-ink">{item.label}<ReqBadge req={item.req} /></p>
      <p className="col-start-2 mt-1 text-[13px] sm:col-start-auto sm:mt-0"><span className="text-mute sm:hidden">Yêu cầu: </span>{item.need}</p>
      <p className={cx('col-start-2 text-[13px] sm:col-start-auto', item.status === 'missing' ? 'text-danger-700' : 'text-ink')}>
        <span className="text-mute sm:hidden">Hồ sơ: </span>{item.have}
      </p>
      <div className="col-start-2 mt-1 sm:col-start-auto sm:mt-0 sm:text-right" title={`${pct(item.share)} trọng số trong nhóm × ${groupMax.toFixed(0)} điểm của nhóm`}>
        <p className="text-[13px] tabular-nums"><span className="text-mute sm:hidden">Trọng số: </span>{pct(item.share)}<span className="text-mute"> nhóm</span></p>
        <p className="hidden text-[11px] tabular-nums text-mute sm:block">tối đa {fmt2(max)} điểm</p>
      </div>
      <div className="col-start-2 mt-1 sm:col-start-auto sm:mt-0 sm:text-right">
        <p className="text-sm font-semibold tabular-nums">{fmt2(item.points)}<span className="font-normal text-mute">/{fmt2(max)}</span></p>
        <p className="text-[11px] tabular-nums text-mute">đạt {Math.round(item.s * 100)}%</p>
      </div>
      {showEvidence && <div className="col-start-2 mt-1.5 sm:col-span-5"><Evidence item={item} /></div>}
    </div>
  )
}

/** Dòng cộng cuối nhóm: điểm nhóm = tổng điểm các tiêu chí con (trọng số các tiêu chí con cộng đủ 100%). */
function GroupSum({ group }) {
  const exact = group.points
  const rounded = fmt(exact)
  const needsRounding = Math.round(exact * 100) !== Math.round(exact * 10) * 10
  return (
    <div className="flex flex-col gap-1 border-t border-line bg-soft/60 px-4 py-2.5 text-[13px] sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <p className="min-w-0 text-mute">
        Điểm nhóm = {group.items.length > 1 ? 'tổng điểm các tiêu chí' : 'điểm tiêu chí'}
        {group.items.length > 1 && <span className="tabular-nums text-ink/80">: {group.items.map((i) => fmt2(i.points)).join(' + ')}</span>}
      </p>
      <p className="shrink-0 tabular-nums">
        = <b>{fmt2(exact)}</b>{needsRounding && <span className="text-mute"> ≈ {rounded}</span>}
        <span className="text-mute"> / {group.max.toFixed(0)} điểm</span>
      </p>
    </div>
  )
}

export function GroupBreakdown({ group, defaultOpen = true, showEvidence = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-soft/60 sm:grid-cols-[auto_minmax(0,1fr)_200px_auto]">
        <ChevronDown size={18} className={cx('text-mute transition', !open && '-rotate-90')} aria-hidden />
        <span className="flex min-w-0 items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: GROUP_COLOR[group.id] }} aria-hidden />
          <span className="truncate font-semibold">{group.name}</span>
          <span className="shrink-0 text-xs text-mute">trọng số {group.max.toFixed(0)}%</span>
        </span>
        <Bar value={group.s * 100} tone={toneOfShare(group.s)} className="hidden sm:block" />
        <span className="text-sm tabular-nums"><b>{fmt(group.points)}</b><span className="text-mute">/{group.max.toFixed(0)} điểm</span></span>
      </button>
      {open && (
        <div>
          <div className={cx('hidden gap-x-3 border-t border-line bg-soft/60 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-mute sm:grid', COLS)}>
            <span /><span>Tiêu chí</span><span>Yêu cầu</span><span>Hồ sơ</span><span className="text-right">Trọng số</span><span className="text-right">Điểm</span>
          </div>
          {group.items.map((i) => <ItemLine key={i.id} item={i} groupMax={group.max} showEvidence={showEvidence} />)}
          <GroupSum group={group} />
        </div>
      )}
    </Card>
  )
}
