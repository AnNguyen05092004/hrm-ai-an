// Trang chủ ứng viên (bố cục theo Teal Home): banner, Mục tiêu nghề nghiệp + hướng dẫn | Bắt đầu (danh sách việc cần làm).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Star, WandSparkles, PencilLine, ChevronsRight, FileText, Columns2, Send, ArrowRight, Check } from 'lucide-react'
import { useStore } from '../store.jsx'
import { completeness } from '../lib/cvEdit.js'
import { GRADES } from '../lib/match.js'
import { WhyList, GapList } from '../components/Explain.jsx'
import { Bar, Button, ScoreRing, buttonCls, cx } from '../ui.jsx'
import { Logo } from '../Shell.jsx'
import { useMyRanking } from './useMyRanking.js'

const fieldCls = 'mt-1 h-9 w-full rounded-md border border-line bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40'

export function Banner({ to }) {
  return (
    <div className="flex flex-col gap-5 rounded-md bg-brand-600 px-6 py-6 text-white xl:flex-row xl:items-center xl:justify-between xl:px-8">
      <p className="text-lg font-medium xl:whitespace-nowrap">Tăng tốc tìm việc với Talent Match</p>
      <ul className="flex flex-wrap gap-x-7 gap-y-2 text-[15px] xl:flex-nowrap">
        <li className="inline-flex items-center gap-2.5 whitespace-nowrap"><BarChart3 size={24} aria-hidden />Chấm điểm có trọng số</li>
        <li className="inline-flex items-center gap-2.5 whitespace-nowrap"><Star size={20} aria-hidden />Đủ từ khoá trong JD</li>
        <li className="inline-flex items-center gap-2.5 whitespace-nowrap"><WandSparkles size={20} aria-hidden />AI giải thích từng con số</li>
      </ul>
      <Link to={to} className={buttonCls('gold', 'lg', 'self-start rounded-md px-5 xl:self-auto')}>Đối chiếu ngay</Link>
    </div>
  )
}

function Goals({ cv }) {
  const s = useStore()
  const key = `goal:${cv.id}`
  const goal = s.pref(key, { focus: 'Phát triển kỹ năng mới', title: cv.headline, date: '2027-03', min: cv.salary ?? 0, max: cv.salary ? Math.round(cv.salary * 1.3) : 0 })
  const [edit, setEdit] = useState(null)
  const month = (ym) => `tháng ${Number(ym.slice(5))}/${ym.slice(0, 4)}`
  if (edit) {
    return (
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); s.setPref(key, edit); setEdit(null); s.notify('Đã lưu mục tiêu nghề nghiệp') }}>
        <label className="block text-sm text-mute">Trọng tâm<input className={fieldCls} value={edit.focus} onChange={(e) => setEdit({ ...edit, focus: e.target.value })} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-mute">Chức danh mục tiêu<input className={fieldCls} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></label>
          <label className="block text-sm text-mute">Thời điểm<input type="month" className={fieldCls} value={edit.date} onChange={(e) => e.target.value && setEdit({ ...edit, date: e.target.value })} /></label>
          <label className="block text-sm text-mute">Lương từ (triệu)<input type="number" min={0} className={fieldCls} value={edit.min} onChange={(e) => setEdit({ ...edit, min: Number(e.target.value) })} /></label>
          <label className="block text-sm text-mute">đến (triệu)<input type="number" min={0} className={fieldCls} value={edit.max} onChange={(e) => setEdit({ ...edit, max: Number(e.target.value) })} /></label>
        </div>
        <div className="flex gap-2"><Button type="submit" variant="primary">Lưu</Button><Button variant="ghost" onClick={() => setEdit(null)}>Huỷ</Button></div>
      </form>
    )
  }
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <h2 className="text-lg font-medium">Mục tiêu tiếp theo: {goal.focus}</h2>
        <button type="button" onClick={() => setEdit(goal)} className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-700 hover:underline"><PencilLine size={16} aria-hidden />Sửa mục tiêu</button>
      </div>
      <dl className="mt-6 grid grid-cols-1 gap-4 border-b border-line pb-6 sm:grid-cols-3">
        <div><dt className="text-sm text-mute">Chức danh mục tiêu</dt><dd className="mt-1 text-sm font-semibold">{goal.title}</dd></div>
        <div><dt className="text-sm text-mute">Thời điểm</dt><dd className="mt-1 text-sm font-semibold">{month(goal.date)}</dd></div>
        <div><dt className="text-sm text-mute">Mức lương mục tiêu</dt><dd className="mt-1 text-sm font-semibold">{goal.min} – {goal.max} triệu</dd></div>
      </dl>
    </>
  )
}

function Intro() {
  const s = useStore()
  const seen = s.pref('seenIntro', false)
  return (
    <>
      <Link to="/rules" className="group mt-8 block overflow-hidden rounded-md border border-line" aria-label="Xem cách Talent Match chấm điểm">
        <div className="relative grid h-64 grid-rows-2 sm:h-72">
          <div className="bg-brand-600" />
          <div className="bg-gold-500" />
          <div className="absolute inset-0 flex items-center justify-between gap-6 px-8">
            <div className="flex items-center gap-3 self-start pt-6 text-white">
              <span className="rounded-full bg-white p-1.5"><Logo size={30} /></span>
              <span className="text-lg font-semibold leading-tight">Cách chấm điểm top-down<span className="block text-sm font-normal text-white/80">Talent Match</span></span>
            </div>
            <p className="hidden text-right text-5xl font-extrabold leading-[0.95] tracking-tight text-white drop-shadow-sm sm:block">Bắt đầu<br />nhanh</p>
          </div>
          <span className="absolute bottom-6 left-8 inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-[15px] font-medium text-ink shadow-pop transition group-hover:scale-105">Xem cách chấm điểm<ArrowRight size={17} aria-hidden /></span>
        </div>
      </Link>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Logo size={44} />
          <div><p className="text-lg font-medium">Tìm hiểu cách hệ thống hoạt động</p><p className="text-sm text-ink/80">Xem tổng quan cách chấm điểm có trọng số và cách đọc phần giải thích.</p></div>
        </div>
        <Button variant="outline" onClick={() => s.setPref('seenIntro', !seen)}>{seen ? <><Check size={16} aria-hidden />Đã xem</> : 'Đánh dấu đã xem'}</Button>
      </div>
    </>
  )
}

function Task({ icon: Icon, title, children, action, done }) {
  return (
    <li className="flex flex-col gap-4 border-t border-line py-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', done ? 'bg-brand-600 text-white' : 'bg-soft text-ink/40')}>{done ? <Check size={18} aria-hidden /> : <Icon size={20} aria-hidden />}</span>
        <div className="max-w-md"><p className={cx('text-lg font-medium', done && 'text-mute line-through decoration-ink/30')}>{title}</p><p className="mt-0.5 text-sm leading-relaxed text-ink/80">{children}</p></div>
      </div>
      <div className="shrink-0 pl-14 sm:pl-0">{action}</div>
    </li>
  )
}

export default function Home() {
  const s = useStore()
  const { cv, ranking, tracker } = useMyRanking()
  const done = completeness(s.rawCv(cv.id))
  const tracked = Object.values(tracker)
  const applied = tracked.filter((t) => ['applied', 'interviewing', 'negotiating', 'accepted'].includes(t.status)).length
  const top = ranking[0].job
  const tasks = [
    { ok: tracked.length > 0, icon: ChevronsRight, title: 'Thêm việc vào bảng theo dõi', text: 'Lưu việc từ mục Tìm việc hoặc Tìm việc bằng AI để theo dõi trạng thái ứng tuyển.', to: '/me/jobs', cta: 'Lưu việc' },
    { ok: done.pct >= 75, icon: FileText, title: 'Hoàn thiện CV trong Trình tạo CV', text: `Tải CV có sẵn hoặc sửa từng mục. CV hiện hoàn thiện ${done.pct}%.`, to: '/me/resume', cta: 'Mở trình tạo CV' },
    { ok: s.isCvEdited(cv.id) || cv.source === 'upload', icon: Columns2, title: 'Đối chiếu CV với một vị trí', text: 'Xem JD và CV cạnh nhau, bấm từ khoá còn thiếu để bổ sung.', to: `/me/resume/match/${top.id}`, cta: 'Đối chiếu' },
    { ok: applied > 0, icon: Send, title: 'Ứng tuyển vị trí đầu tiên', text: 'Ứng tuyển 1 chạm bằng CV hiện tại khi mức phù hợp đã đủ tốt.', to: `/me/jobs/${top.id}`, cta: 'Tìm việc' },
  ]
  const pct = Math.round((tasks.filter((t) => t.ok).length / tasks.length) * 100)

  return (
    <div className="px-4 py-6 sm:px-8">
      <h1 className="sr-only">Trang chủ</h1>
      <Banner to={`/me/resume/match/${top.id}`} />
      <div className="mt-6 grid border-t border-line lg:grid-cols-2">
        <section className="py-8 lg:border-r lg:border-line lg:pr-10">
          <Goals key={cv.id} cv={cv} />
          <Intro />
        </section>
        <section className="border-t border-line py-8 lg:border-t-0 lg:pl-10">
          <h2 className="text-lg font-medium">Bắt đầu</h2>
          <div className="mt-6 flex items-baseline justify-between text-xl font-medium"><span>Hoàn thành {pct}%</span><span>{tasks.filter((t) => t.ok).length}/{tasks.length} việc</span></div>
          <Bar value={pct} className="mt-4 h-2" tone="bg-brand-600" />
          <ul className="mt-8">
            {tasks.map((t) => (
              <Task key={t.title} icon={t.icon} title={t.title} done={t.ok} action={<Link to={t.to} className={buttonCls('outline', 'md')}>{t.cta}</Link>}>{t.text}</Task>
            ))}
          </ul>
        </section>
      </div>

      <section className="border-t border-line pt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-medium">Việc hợp với CV của bạn</h2>
          <Link to="/me/jobs" className="text-sm font-medium text-brand-600 hover:underline">Xem tất cả</Link>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {ranking.slice(0, 3).map(({ job, m }) => (
            <div key={job.id} className="flex flex-col rounded-md border border-line p-5">
              <div className="flex items-start gap-3">
                <ScoreRing value={m.score} grade={m.grade} size={52} stroke={5} />
                <div className="min-w-0"><p className="font-semibold leading-snug">{job.title}</p><p className="text-sm text-mute">{GRADES[m.grade].label} · {job.city} · {job.mode}</p></div>
              </div>
              <div className="mt-4 grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-1"><WhyList m={m} limit={2} compact /><GapList m={m} limit={2} compact /></div>
              <Link to={`/me/resume/match/${job.id}`} className={buttonCls('outline', 'md', 'mt-5 self-start')}>Đối chiếu và chỉnh CV</Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
