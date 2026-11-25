// Màn nhân viên: khóa được giao trên cổng đào tạo, mở gói SCORM để học
import { BookOpen, PlayCircle } from 'lucide-react'
import { humanTime } from './scormApi'
import { isDone, recKey, statusOf, useData } from './store'
import { Badge } from './ui'
import { fmtDate, fmtDateTime } from './format'

const actionOf = (s) => (s === 'not attempted' ? 'Bắt đầu học' : isDone(s) ? 'Xem lại' : 'Học tiếp')
/** Nút của thẻ đề kiểm tra: theo lượt đã dùng */
const examAction = (p, rec) => {
  const used = (rec.attempts ?? []).filter((a) => a.status !== 'in_progress').length
  if ((rec.attempts ?? []).some((a) => a.status === 'in_progress')) return 'Làm tiếp bài thi'
  if (statusOf(rec) === 'passed') return 'Xem kết quả'
  return used >= p.exam.attempts ? 'Xem kết quả' : used ? `Làm lại (còn ${p.exam.attempts - used} lượt)` : 'Làm bài'
}

export default function MyCourses({ learner, onOpen }) {
  const { packages, records } = useData()
  const mine = packages.filter((p) => p.assigned.some((a) => a.userId === learner.id))
  if (!mine.length) {
    return (
      <div className="card flex flex-col items-center px-6 py-14 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-ink"><BookOpen size={26} /></span>
        <h2 className="mt-4 text-[18px]">Bạn chưa được giao khóa nào</h2>
        <p className="mt-1.5 text-[14px] text-ink-muted">Khóa quản trị đào tạo giao sẽ hiện ở đây.</p>
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
            <div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted font-display text-[18px] font-semibold text-ink">{p.title.trim()[0]?.toUpperCase()}</span><Badge status={s} /></div>
            <h3 className="mt-3 text-[16px] leading-6">{p.title}</h3>
            <div className="mt-1 text-[13px] text-ink-subtle">{p.kind === 'qti' ? `Đề kiểm tra · ${p.exam.pick} câu · ${p.exam.minutes} phút` : `Khóa học trực tuyến · SCORM ${p.version}`}</div>
            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-[13px]">
              <dt className="text-ink-subtle">Hạn hoàn thành</dt><dd className="text-right font-medium">{a.due ? fmtDate(a.due) : 'Không đặt'}</dd>
              <dt className="text-ink-subtle">Điểm</dt><dd className="text-right font-medium">{rec.score?.raw || '—'}{p.mastery != null ? <span className="font-normal text-ink-subtle"> / đạt từ {p.mastery}</span> : ''}</dd>
              {p.kind === 'qti' ? <><dt className="text-ink-subtle">Lượt đã dùng</dt><dd className="text-right font-medium">{(rec.attempts ?? []).filter((a) => a.status !== 'in_progress').length}/{p.exam.attempts}</dd></> : <><dt className="text-ink-subtle">Thời gian đã học</dt><dd className="text-right font-medium">{rec.total_time ? humanTime(rec.total_time) : '—'}</dd></>}
              <dt className="text-ink-subtle">Học gần nhất</dt><dd className="text-right font-medium">{fmtDateTime(rec.lastAt)}</dd>
            </dl>
            <button className="btn-dark mt-5 w-full" onClick={() => onOpen(p)}><PlayCircle size={17} />{p.kind === 'qti' ? examAction(p, rec) : actionOf(s)}</button>
          </article>
        )
      })}
    </div>
  )
}
