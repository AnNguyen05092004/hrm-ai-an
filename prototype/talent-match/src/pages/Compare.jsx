// Ma trận so sánh 2–4 hồ sơ cho cùng một vị trí, theo đúng cây tiêu chí đang áp dụng.
import { Fragment, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Columns3 } from 'lucide-react'
import { useStore, displayName } from '../store.jsx'
import { matchScore, rankCandidates } from '../lib/match.js'
import { Card, Button, Avatar, ScoreRing, GradeChip, StatusIcon, ReqBadge, Bar, Empty, GROUP_COLOR, toneOfShare, cx } from '../ui.jsx'

const MAX = 4
const fmt = (x) => x.toLocaleString('vi-VN', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

function toCsv(job, cols, masked) {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
  const head = ['Tiêu chí', 'Mức độ', 'Yêu cầu', ...cols.map(({ cv }) => displayName(cv, masked))]
  const rows = [['Điểm phù hợp (%)', '', '', ...cols.map(({ m }) => m.score)], ['Hạng', '', '', ...cols.map(({ m }) => m.grade)]]
  cols[0].m.groups.forEach((g, gi) => {
    rows.push([`[${g.name}]`, '', `${g.max.toFixed(0)} điểm`, ...cols.map(({ m }) => fmt(m.groups[gi].points))])
    g.items.forEach((it, ii) => rows.push([it.label, it.req, it.need, ...cols.map(({ m }) => `${m.groups[gi].items[ii].have} (${Math.round(m.groups[gi].items[ii].s * 100)}%)`)]))
  })
  return [`So sánh hồ sơ – ${job.title} (${job.code})`, head.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n')
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  URL.revokeObjectURL(url)
}

function Picker({ job, ids, setParams }) {
  const s = useStore()
  const top = rankCandidates(job, s.cvs, s.criteriaOf(job.id)).slice(0, 10)
  const toggle = (id) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(0, MAX)
    setParams({ job: job.id, ids: next.join(',') }, { replace: true })
  }
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold">Chọn 2–{MAX} hồ sơ trong top 10</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {top.map(({ cv, m }) => (
          <button key={cv.id} type="button" onClick={() => toggle(cv.id)} aria-pressed={ids.includes(cv.id)}
            disabled={!ids.includes(cv.id) && ids.length >= MAX}
            className={cx('inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm ring-1 transition disabled:opacity-40',
              ids.includes(cv.id) ? 'bg-brand-50 text-brand-800 ring-brand-500/40' : 'bg-white ring-line hover:bg-soft')}>
            <Avatar name={cv.name} masked={s.masked} size={24} />{displayName(cv, s.masked)}
            <span className="tabular-nums text-mute">{m.score}%</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

export default function Compare() {
  const s = useStore()
  const [params, setParams] = useSearchParams()
  const job = s.job(params.get('job')) ?? s.jobs[0]
  const ids = (params.get('ids') ?? '').split(',').filter((id) => s.cv(id))
  const criteria = s.criteriaOf(job.id)
  const cols = useMemo(() => ids.map((id) => ({ cv: s.cv(id), m: matchScore(job, s.cv(id), criteria) })), [ids.join(','), job, criteria]) // eslint-disable-line react-hooks/exhaustive-deps

  const bestOf = (vals) => { const max = Math.max(...vals); return vals.map((v) => cols.length > 1 && v === max && vals.some((x) => x !== max)) }
  const grid = { gridTemplateColumns: `minmax(220px,1.2fr) repeat(${Math.max(cols.length, 1)}, minmax(170px,1fr))` }
  const minWidth = 220 + 170 * cols.length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">So sánh hồ sơ</h1>
          <p className="mt-1 text-sm text-mute">Cùng một bộ tiêu chí và trọng số, đặt cạnh nhau để chọn danh sách rút gọn.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={job.id} onChange={(e) => setParams({ job: e.target.value }, { replace: true })} aria-label="Vị trí"
            className="h-9 rounded-full border-0 bg-white px-3 text-sm ring-1 ring-line focus:ring-2 focus:ring-brand-500/40">
            {s.jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <Button disabled={cols.length < 2} onClick={() => { download(`so-sanh-${job.code}.csv`, toCsv(job, cols, s.masked)); s.notify('Đã xuất bảng so sánh (CSV)') }}>
            <Download size={15} aria-hidden />Xuất CSV
          </Button>
        </div>
      </div>

      <Picker job={job} ids={ids} setParams={setParams} />

      {cols.length < 2 ? (
        <Card><Empty icon={Columns3} title="Chọn ít nhất 2 hồ sơ để so sánh">Có thể chọn ngay ở trên, hoặc tích chọn trong tab “Ứng viên phù hợp” của một vị trí.</Empty></Card>
      ) : (
        <Card className="overflow-x-auto">
          <div style={{ minWidth }}>
            <div className="grid border-b border-line" style={grid}>
              <div className="sticky left-0 z-10 bg-white px-4 py-4 text-sm text-mute">{job.title}<br /><span className="text-xs">{job.code}</span></div>
              {cols.map(({ cv, m }) => (
                <div key={cv.id} className="flex flex-col items-center gap-2 px-3 py-4 text-center">
                  <ScoreRing value={m.score} grade={m.grade} size={56} />
                  <Link to={`/jobs/${job.id}/match/${cv.id}`} className="text-sm font-semibold hover:text-brand-700">{displayName(cv, s.masked)}</Link>
                  <GradeChip grade={m.grade} size="sm" showLabel />
                  {m.knockouts.length > 0 && <span className="text-[11px] text-danger-700">Thiếu bắt buộc: {m.knockouts.map((k) => k.label).join(', ')}</span>}
                </div>
              ))}
            </div>
            {cols[0].m.groups.map((g, gi) => {
              const gBest = bestOf(cols.map(({ m }) => m.groups[gi].points))
              return (
                <Fragment key={g.id}>
                  <div className="grid border-b border-line bg-soft/70" style={grid}>
                    <div className="sticky left-0 z-10 flex items-center gap-2 bg-soft px-4 py-2.5 text-sm font-semibold">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_COLOR[g.id] }} aria-hidden />{g.name}<span className="font-normal text-mute">· {g.max.toFixed(0)} điểm</span>
                    </div>
                    {cols.map(({ cv, m }, ci) => (
                      <div key={cv.id} className="flex items-center gap-2 px-3 py-2.5">
                        <Bar value={m.groups[gi].s * 100} tone={toneOfShare(m.groups[gi].s)} className="flex-1" />
                        <span className={cx('w-16 text-right text-sm tabular-nums', gBest[ci] && 'font-semibold text-emerald-700')}>{fmt(m.groups[gi].points)}</span>
                      </div>
                    ))}
                  </div>
                  {g.items.map((it, ii) => {
                    const iBest = bestOf(cols.map(({ m }) => m.groups[gi].items[ii].s))
                    return (
                      <div key={it.id} className="grid border-b border-line last:border-b-0" style={grid}>
                        <div className="sticky left-0 z-10 bg-white px-4 py-2.5">
                          <p className="flex flex-wrap items-center gap-1.5 text-sm">{it.label}<ReqBadge req={it.req} /></p>
                          <p className="text-xs text-mute">Yêu cầu: {it.need}</p>
                        </div>
                        {cols.map(({ cv, m }, ci) => {
                          const c = m.groups[gi].items[ii]
                          return (
                            <div key={cv.id} className={cx('flex items-start gap-2 px-3 py-2.5 text-[13px]', iBest[ci] && 'bg-emerald-50/60')}>
                              <StatusIcon status={c.status} size={15} />
                              <span className="min-w-0"><span className="block">{c.have}</span><span className="text-xs tabular-nums text-mute">đạt {Math.round(c.s * 100)}%</span></span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </Fragment>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
