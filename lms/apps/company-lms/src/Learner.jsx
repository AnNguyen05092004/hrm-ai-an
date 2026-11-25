// Màn nhân viên: khóa được giao trên cổng đào tạo, mở gói SCORM để học
import { BookOpen, PlayCircle } from 'lucide-react'
import { humanTime } from './scormApi'
import { isDone, recKey, statusOf, useData } from './store'
import { Badge } from './ui'
import { fmtDate, fmtDateTime } from './format'

const actionOf = (s) => (s === 'not attempted' ? 'Bắt đầu học' : isDone(s) ? 'Xem lại' : 'Học tiếp')

export default function MyCourses({ learner, onOpen }) {
  const { packages, records } = useData()
  const mine = packages.filter((p) => p.assigned.some((a) => a.userId === learner.id))
  if (!mine.length) {
    return (
      <div className="card flex flex-col items-center px-6 py-14 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-co-50 text-co-700"><BookOpen size={26} /></span>
        <h2 className="mt-4 text-[18px] font-semibold">Bạn chưa được giao khóa nào</h2>
        <p className="mt-1.5 text-[14px] text-slate-600">Khóa quản trị đào tạo giao sẽ hiện ở đây.</p>
      </div>
    )
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {mine.map((p) => {
        const a = p.assigned.find((x) => x.userId === learner.id)
        const rec = records[recKey(p.id, learner.id)] ?? {}
        const s = statusOf(rec)
        return (
          <article key={p.id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-co-700 text-[18px] font-bold text-white">{p.title.trim()[0]?.toUpperCase()}</span><Badge status={s} /></div>
            <h3 className="mt-3 text-[16px] font-semibold leading-snug">{p.title}</h3>
            <div className="mt-1 text-[13px] text-slate-500">Khóa học trực tuyến · SCORM {p.version}</div>
            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-[13px]">
              <dt className="text-slate-500">Hạn hoàn thành</dt><dd className="text-right font-medium">{a.due ? fmtDate(a.due) : 'Không đặt'}</dd>
              <dt className="text-slate-500">Điểm</dt><dd className="text-right font-medium">{rec.score?.raw || '—'}{p.mastery != null ? <span className="font-normal text-slate-500"> / đạt từ {p.mastery}</span> : ''}</dd>
              <dt className="text-slate-500">Thời gian đã học</dt><dd className="text-right font-medium">{rec.total_time ? humanTime(rec.total_time) : '—'}</dd>
              <dt className="text-slate-500">Học gần nhất</dt><dd className="text-right font-medium">{fmtDateTime(rec.lastAt)}</dd>
            </dl>
            <button className="btn-primary mt-5 w-full" onClick={() => onOpen(p)}><PlayCircle size={17} />{actionOf(s)}</button>
          </article>
        )
      })}
    </div>
  )
}
