// Khối giải thích điểm (Explainable AI): "Vì sao phù hợp" và "Còn thiếu" luôn đặt cạnh con số %.
import { ThumbsUp, Target } from 'lucide-react'
import { gainIfMet, GRADES } from '../lib/match.js'
import { StatusIcon, ScoreRing, cx } from '../ui.jsx'

const fmtGain = (x) => `+${x.toLocaleString('vi-VN')}%`

function evidenceOf(item) {
  const ev = item.evidence?.[0]
  if (ev?.org) return `${ev.title} · ${ev.org}`
  return item.note ?? null
}

export function WhyList({ m, limit = 4, compact }) {
  const list = m.strengths.slice(0, limit)
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-800"><ThumbsUp size={14} aria-hidden />Vì sao phù hợp</p>
      {list.length ? (
        <ul className={cx('mt-2', compact ? 'space-y-1.5' : 'space-y-2')}>
          {list.map((i) => (
            <li key={i.id} className="flex items-start gap-2 text-sm">
              <StatusIcon status="met" size={15} />
              <span className="min-w-0">
                <span className="font-medium">{i.label}</span>
                <span className="text-mute"> · {i.have}</span>
                {!compact && evidenceOf(i) && <span className="block truncate text-xs text-mute">{evidenceOf(i)}</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-sm text-mute">Chưa có tiêu chí nào đạt trọn vẹn.</p>}
    </div>
  )
}

export function GapList({ m, limit = 4, compact, onPick }) {
  const list = m.gaps.slice(0, limit)
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-danger-700"><Target size={14} aria-hidden />Còn thiếu</p>
      {list.length ? (
        <ul className={cx('mt-2', compact ? 'space-y-1.5' : 'space-y-2')}>
          {list.map((i) => {
            const body = (
              <>
                <StatusIcon status={i.status} size={15} />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{i.label}</span>
                  {i.knockout && <span className="ml-1.5 rounded bg-ink px-1 py-px text-[10px] font-medium text-white">Bắt buộc</span>}
                  {!compact && <span className="block text-xs text-mute">Cần {i.need} · có {i.have}</span>}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-emerald-700">{fmtGain(gainIfMet(i))}</span>
              </>
            )
            return (
              <li key={i.id}>
                {onPick && i.type === 'skill'
                  ? <button type="button" onClick={(e) => onPick(i.skill, e.currentTarget)} className="-mx-1.5 flex w-[calc(100%+0.75rem)] items-start gap-2 rounded-lg px-1.5 py-0.5 text-left text-sm hover:bg-soft">{body}</button>
                  : <div className="flex items-start gap-2 text-sm">{body}</div>}
              </li>
            )
          })}
        </ul>
      ) : <p className="mt-2 text-sm text-mute">Hồ sơ đáp ứng mọi tiêu chí.</p>}
    </div>
  )
}

/** Thẻ tóm tắt: % + hạng + Vì sao phù hợp + Còn thiếu, cùng một hàng. */
export function ExplainCard({ m, ring = 84, onPick, children }) {
  return (
    <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-2">
        <ScoreRing value={m.score} grade={m.grade} size={ring} stroke={8} />
        <div>
          <p className="font-semibold">{GRADES[m.grade].label}</p>
          <p className="text-xs text-mute">Đạt {m.counts.met}/{m.counts.total} tiêu chí</p>
          {children}
        </div>
      </div>
      <WhyList m={m} compact />
      <GapList m={m} compact onPick={onPick} />
    </div>
  )
}
