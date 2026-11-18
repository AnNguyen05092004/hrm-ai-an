import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileWarning, ArrowRight, Clock, Target, CheckCircle2, Hourglass, PlayCircle } from 'lucide-react'
import { useMe } from '../store'
import { FORMATS } from '../data'
import { Thumb, FormatGlyph, Spinner } from '../ui'
import { TopOrg } from '../Shell'
import { get } from '../api'

const DAY = 864e5
const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN')
function dueState(due) {
  if (!due) return ['Không có hạn', 'text-neutral-500']
  const n = Math.ceil((new Date(due) - Date.now()) / DAY)
  return n < 0 ? [`Quá hạn ${-n} ngày`, 'font-semibold text-red-600'] : n <= 2 ? [`Còn ${n} ngày`, 'font-semibold text-amber-600'] : [`Hạn ${fmtDate(due)}`, 'text-neutral-500']
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
        <div key={g.skillId} className="flex items-center gap-4 rounded-2xl border border-line bg-gradient-to-r from-violet-50 to-sky-50 px-6 py-4">
          {reached ? <CheckCircle2 size={22} className="text-emerald-600" /> : <Target size={22} className="text-violet-600" />}
          <div className="flex-1"><div className="text-[15px] font-semibold">{reached ? `Đã đạt: ${g.name} mức ${g.cur}` : `Mục tiêu kỹ năng: ${g.name} từ mức ${g.cur} lên mức ${g.target}`}</div><div className="mt-0.5 text-[13px] text-neutral-600">{reached ? 'Mức mới đã cập nhật vào hồ sơ năng lực.' : 'Học xong các khóa được giao rồi thi chính thức. Đạt thì mức mới tự cập nhật vào hồ sơ năng lực.'}</div></div>
          <div className="w-40"><div className="h-2 rounded-full bg-white"><div className={`h-2 rounded-full ${reached ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${reached ? 100 : Math.round((100 * g.done) / g.total)}%` }} /></div><div className="mt-1 text-right text-[12px] text-neutral-600">{reached ? 'Hoàn thành' : `${g.done}/${g.total} khóa đã học xong`}</div></div>
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
  const items = [...(q.data?.items ?? [])].sort((a, b) => (a.percent === 100) - (b.percent === 100) || new Date(a.due ?? 8e15) - new Date(b.due ?? 8e15))
  const late = items.filter((x) => x.percent < 100 && x.due && new Date(x.due) < Date.now()).length
  const fin = items.filter((x) => x.percent === 100).length
  const exams = (ex.data ?? []).filter((x) => x.status !== 'in_progress')
  return (
    <div className="min-h-full">
      <TopOrg />
      <div className="px-8 py-8">
        <h1 className="font-display text-[34px] font-medium">Chào {me.name.split(' ').pop()}</h1>
        <p className="mt-0.5 text-[15px] text-neutral-600">Các khóa được giao cho bạn. Bí chỗ nào thì bấm "Hỏi AI Tutor" trong khóa.</p>
        <Goals items={items} skills={q.data?.skills ?? []} names={q.data?.skillNames ?? {}} />

        <div className="mt-10 flex items-baseline gap-4"><h2 className="text-[18px] font-semibold">Khóa của tôi ({items.length})</h2><span className="text-[13px] text-neutral-600">{items.length - fin} đang học · {fin} đã xong{late > 0 && <span className="font-semibold text-red-600"> · {late} quá hạn</span>}</span></div>
        {items.length === 0 ? <p className="mt-4 text-[14px] text-neutral-500">Chưa có khóa nào được giao.</p> : (
          <div className="mt-5 grid grid-cols-3 gap-5">
            {items.map((a) => {
              const [dl, dc] = a.percent === 100 ? ['Đã hoàn thành', 'text-emerald-700'] : dueState(a.due)
              return (
                <button key={a.id} onClick={() => nav(`/learn/${a.id}`)} className="card flex flex-col overflow-hidden text-left transition hover:shadow-pop">
                  <Thumb img={a.img} className="h-36">{a.percent === 100 && <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 text-[12px] font-semibold text-emerald-700"><CheckCircle2 size={13} />Đã xong</span>}</Thumb>
                  <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
                    <div className="flex items-center gap-1.5 text-[13px] font-medium"><FormatGlyph type={a.type} size={14} />{FORMATS[a.type].name}</div>
                    <div className="mt-1.5 text-[15px] font-semibold leading-snug">{a.title}</div>
                    {a.reason && <div className="mt-1 text-[12px] text-neutral-500">{a.reason}</div>}
                    <div className="flex-1" />
                    <div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 rounded-full bg-neutral-200"><div className="h-1.5 rounded-full bg-sky-500" style={{ width: `${a.percent}%` }} /></div><span className="text-[12px] font-semibold">{a.percent}%</span></div>
                    <div className="mt-3 flex items-center justify-between text-[13px]"><span className={`flex items-center gap-1 ${dc}`}><Clock size={13} />{dl}</span><span className="flex items-center gap-1 font-semibold">{a.percent === 0 ? 'Bắt đầu' : a.percent === 100 ? 'Xem lại' : 'Học tiếp'}<ArrowRight size={14} /></span></div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <h2 className="mt-10 text-[18px] font-semibold">Bài thi của tôi</h2>
        {exams.length === 0 ? <p className="mt-3 text-[14px] text-neutral-500">Chưa có bài thi nào. Bài kiểm tra nằm ở cuối mỗi Tài liệu nhanh.</p> : (
          <table className="mt-3 w-full text-[14px]"><thead><tr className="border-b border-line text-left text-[13px] font-semibold text-neutral-600"><th className="px-4 py-3">Bài thi</th><th>Loại</th><th>Nộp lúc</th><th>Kết quả</th><th /></tr></thead>
            <tbody>{exams.map((x) => { const [I, l, c] = RESULT[x.status] ?? RESULT.grading; return (
              <tr key={x.id} className="border-b border-line">
                <td className="px-4 py-3 font-medium">{x.title}</td><td className="text-neutral-600">{x.mode === 'official' ? 'Chính thức' : 'Luyện tập'}</td><td className="text-neutral-600">{x.submittedAt ? new Date(x.submittedAt).toLocaleString('vi-VN') : '—'}</td>
                <td><span className={`flex items-center gap-1.5 font-semibold ${c}`}><I size={15} />{l}{x.score != null && x.status !== 'grading' && ` · ${Math.round(x.score)}%`}</span>{x.status === 'grading' && <div className="text-[12px] text-neutral-500">Phần chấm tự động đã xong; tự luận chờ người chấm xác nhận</div>}</td>
                <td className="pr-4 text-right"><button onClick={() => nav(`/exam/${x.artifactId}?result=${x.id}`)} className="btn-line btn-sm"><PlayCircle size={14} />Xem kết quả</button></td>
              </tr>) })}</tbody></table>
        )}
      </div>
    </div>
  )
}
