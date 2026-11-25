import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileWarning, ArrowRight, Clock, Target, CheckCircle2, Hourglass, PlayCircle } from 'lucide-react'
import { useMe } from '../store'
import { TYPE_ORDER } from '../data'
import { dueState } from './Course'
import { Thumb, FormatGlyph, Spinner } from '../ui'
import { TopOrg } from '../Shell'
import { get } from '../api'

/** Gom các tài liệu được giao theo khóa (khóa học); khóa chưa xong và hạn gần lên trước */
function byCourse(items) {
  const m = new Map()
  for (const x of items) {
    const c = m.get(x.kitId) ?? { kitId: x.kitId, title: x.kitTitle, img: x.kitImg ?? x.img, reason: x.reason, items: [], due: null }
    c.items.push(x)
    if (x.due && (!c.due || new Date(x.due) < new Date(c.due))) c.due = x.due
    m.set(x.kitId, c)
  }
  return [...m.values()].map((c) => ({ ...c, items: [...c.items].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)), percent: Math.round(c.items.reduce((n, x) => n + x.percent, 0) / c.items.length) }))
    .sort((a, b) => (a.percent === 100) - (b.percent === 100) || new Date(a.due ?? 8e15) - new Date(b.due ?? 8e15))
}

/** Mục tiêu kỹ năng suy ra từ các khóa được giao: kỹ năng của khóa và mức khóa đưa tới */
function Goals({ items, skills, names }) {
  const goals = new Map()
  for (const x of items) if (x.skillId && x.level) {
    const g = goals.get(x.skillId) ?? { skillId: x.skillId, target: 0, total: 0, done: 0 }
    goals.set(x.skillId, { ...g, target: Math.max(g.target, x.level), total: g.total + 1, done: g.done + (x.percent === 100 ? 1 : 0) })
  }
  const list = [...goals.values()].map((g) => ({ ...g, cur: skills.find((s) => s.skillId === g.skillId)?.level ?? 0, name: names[g.skillId] ?? g.skillId })).filter((g) => g.target > 0).slice(0, 3)
  if (!list.length) return null
  return (
    <div className="mt-7 space-y-3">
      {list.map((g) => { const reached = g.cur >= g.target; return (
        <div key={g.skillId} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-gradient-to-r from-violet-50 to-sky-50 px-4 py-4 md:px-6">
          {reached ? <CheckCircle2 size={22} className="shrink-0 text-emerald-600" /> : <Target size={22} className="shrink-0 text-violet-600" />}
          <div className="min-w-0 flex-1 basis-[200px]"><div className="text-[15px] font-semibold">{reached ? `Đã đạt: ${g.name} mức ${g.cur}` : `Mục tiêu kỹ năng: ${g.name} từ mức ${g.cur} lên mức ${g.target}`}</div><div className="mt-0.5 text-[13px] text-neutral-600">{reached ? 'Mức mới đã cập nhật vào hồ sơ năng lực.' : 'Học xong các khóa được giao rồi thi chính thức. Đạt thì mức mới tự cập nhật vào hồ sơ năng lực.'}</div></div>
          <div className="w-full sm:w-40"><div className="h-2 rounded-full bg-white"><div className={`h-2 rounded-full ${reached ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${reached ? 100 : Math.round((100 * g.done) / g.total)}%` }} /></div><div className="mt-1 text-right text-[12px] text-neutral-600">{reached ? 'Hoàn thành' : `${g.done}/${g.total} khóa đã xong`}</div></div>
        </div>) })}
    </div>
  )
}

const RESULT = { grading: [Hourglass, 'Đang chấm', 'text-amber-600'], passed: [CheckCircle2, 'Đạt', 'text-emerald-600'], failed: [FileWarning, 'Chưa đạt', 'text-red-500'] }

export function MyLearning() {
  const { me } = useMe()
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['my-learning'], queryFn: () => get('/learn/my') })
  const ex = useQuery({ queryKey: ['my-exams'], queryFn: () => get('/exams/my') })
  if (q.isLoading) return <div className="grid h-full place-items-center"><Spinner /></div>
  const items = (q.data?.items ?? []).map((x) => (x.type === 'exam' ? { ...x, percent: x.passed ? 100 : 0 } : x))
  const courses = byCourse(items)
  const late = courses.filter((x) => x.percent < 100 && x.due && new Date(x.due) < Date.now()).length
  const fin = courses.filter((x) => x.percent === 100).length
  const exams = (ex.data ?? []).filter((x) => x.status !== 'in_progress')
  return (
    <div className="min-h-full">
      <TopOrg />
      <div className="px-4 py-6 md:px-8 md:py-8">
        <h1 className="font-display text-[28px] font-medium md:text-[34px]">Chào {me.name.split(' ').pop()}</h1>
        <p className="mt-0.5 text-[15px] text-neutral-600">Các khóa được giao cho bạn. Bí chỗ nào thì bấm "Hỏi AI Tutor" trong khóa.</p>
        <Goals items={courses.map((c) => ({ ...c, skillId: c.items[0]?.skillId, level: c.items[0]?.level }))} skills={q.data?.skills ?? []} names={q.data?.skillNames ?? {}} />

        <div className="mt-10 flex flex-wrap items-baseline gap-x-4 gap-y-1"><h2 className="text-[18px] font-semibold">Khóa của tôi ({courses.length})</h2><span className="text-[13px] text-neutral-600">{courses.length - fin} đang học · {fin} đã xong{late > 0 && <span className="font-semibold text-red-600"> · {late} quá hạn</span>}</span></div>
        {courses.length === 0 ? <p className="mt-4 text-[14px] text-neutral-500">Chưa có khóa nào được giao.</p> : (
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const [dl, dc] = c.percent === 100 ? ['Đã hoàn thành', 'text-emerald-700'] : dueState(c.due)
              return (
                <button key={c.kitId} onClick={() => nav(`/course/${c.kitId}`)} className="card flex flex-col overflow-hidden text-left transition hover:shadow-pop">
                  <Thumb img={c.img} className="h-36">{c.percent === 100 && <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 text-[12px] font-semibold text-emerald-700"><CheckCircle2 size={13} />Đã xong</span>}</Thumb>
                  <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-neutral-600">Khóa học · {c.items.length} phần<span className="flex gap-1">{c.items.map((x) => <FormatGlyph key={x.id} type={x.type} size={14} />)}</span></div>
                    <div className="mt-1.5 text-[15px] font-semibold leading-snug">{c.title}</div>
                    {c.reason && <div className="mt-1 text-[12px] text-neutral-500">{c.reason}</div>}
                    <div className="flex-1" />
                    <div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 rounded-full bg-neutral-200"><div className="h-1.5 rounded-full bg-sky-500" style={{ width: `${c.percent}%` }} /></div><span className="text-[12px] font-semibold">{c.percent}%</span></div>
                    <div className="mt-3 flex items-center justify-between text-[13px]"><span className={`flex items-center gap-1 ${dc}`}><Clock size={13} />{dl}</span><span className="flex items-center gap-1 font-semibold">{c.percent === 0 ? 'Bắt đầu' : c.percent === 100 ? 'Xem lại' : 'Học tiếp'}<ArrowRight size={14} /></span></div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <h2 className="mt-10 text-[18px] font-semibold">Bài thi của tôi</h2>
        {exams.length === 0 ? <p className="mt-3 text-[14px] text-neutral-500">Chưa có bài thi nào. Bài kiểm tra nằm ở cuối mỗi khóa.</p> : (
          <table className="mt-3 w-full text-[14px]"><thead><tr className="border-b border-line text-left text-[13px] font-semibold text-neutral-600"><th className="py-3 pl-2 pr-4 md:px-4">Bài thi</th><th className="hidden pr-6 lg:table-cell">Loại</th><th className="hidden pr-6 lg:table-cell">Nộp lúc</th><th className="pr-6">Kết quả</th><th /></tr></thead>
            <tbody>{exams.map((x) => { const [I, l, c] = RESULT[x.status] ?? RESULT.grading; return (
              <tr key={x.id} className="border-b border-line">
                <td className="py-3 pl-2 pr-4 font-medium md:px-4">{x.title}<div className="mt-0.5 text-[12px] font-normal text-neutral-500 lg:hidden">{x.mode === 'official' ? 'Chính thức' : 'Luyện tập'}{x.submittedAt && ` · ${new Date(x.submittedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}</div></td><td className="hidden whitespace-nowrap pr-6 text-neutral-600 lg:table-cell">{x.mode === 'official' ? 'Chính thức' : 'Luyện tập'}</td><td className="hidden whitespace-nowrap pr-6 tabular-nums text-neutral-600 lg:table-cell">{x.submittedAt ? new Date(x.submittedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                <td className="py-3 pr-3 md:pr-6"><span className={`flex items-center gap-1.5 whitespace-nowrap font-semibold ${c}`}><I size={15} />{l}{x.score != null && x.status !== 'grading' && ` · ${Math.round(x.score)}%`}</span>{x.status === 'grading' && <div className="hidden text-[12px] text-neutral-500 sm:block">Phần chấm tự động đã xong; tự luận chờ người chấm xác nhận</div>}</td>
                <td className="w-px pr-2 text-right md:pr-4"><button onClick={() => nav(`/exam/${x.artifactId}?result=${x.id}`)} aria-label="Xem kết quả" className="btn-line btn-sm whitespace-nowrap max-sm:w-8 max-sm:px-0"><PlayCircle size={14} className="shrink-0" /><span className="max-sm:hidden">Xem kết quả</span></button></td>
              </tr>) })}</tbody></table>
        )}
      </div>
    </div>
  )
}
