import { useNavigate } from 'react-router-dom'
import { FileWarning, ArrowRight, Clock, Target, CheckCircle2, Hourglass, PlayCircle } from 'lucide-react'
import { useStore, useRole } from '../store'
import { FORMATS, ASSIGNED } from '../data'
import { TEAM } from '../data-team'
import { Thumb, FormatGlyph } from '../ui'
import { TopOrg } from '../Shell'

// Ngày "hôm nay" cố định để dữ liệu mẫu luôn nhất quán khi demo
const TODAY = new Date(2026, 10, 18)
const dueState = (due) => { const [d, m, y] = due.split('/').map(Number); const n = Math.round((new Date(y, m - 1, d) - TODAY) / 864e5); return n < 0 ? ['Quá hạn ' + -n + ' ngày', 'text-red-600 font-semibold'] : n <= 2 ? ['Còn ' + n + ' ngày', 'text-amber-600 font-semibold'] : ['Hạn ' + due, 'text-neutral-500'] }
const lessonCount = (a) => a.type === 'qr' ? a.lessons.filter((l) => l.kind === 'lesson').length : a.type === 'video' ? a.chapters.length : a.type === 'guide' ? a.steps.length : 1

/* ---------- Người học: khóa được giao ---------- */
export function MyLearning() {
  const { S } = useStore()
  const { me } = useRole()
  const nav = useNavigate()
  // Khóa giám đốc giao từ trang Năng lực đội ngũ (người học mẫu là NV p6)
  const extra = Object.values(S.wf?.assigned || {}).filter((x) => x.people.includes('p6')).flatMap((x) => (S.kits.find((k) => k.id === x.kitId)?.artifacts || []).map((id) => ({ id, due: x.due, why: `Kế hoạch năng lực · ${x.kpi}`, done: 0 })))
  const items = [...extra.filter((x, i) => !ASSIGNED.some((y) => y.id === x.id) && extra.findIndex((y) => y.id === x.id) === i), ...ASSIGNED].map((x) => ({ ...x, a: S.artifacts[x.id] })).filter((x) => x.a && x.a.status === 'published').map((x) => ({ ...x, pct: Math.round((Math.min(x.done, lessonCount(x.a)) / lessonCount(x.a)) * 100) }))
  const late = items.filter((x) => x.pct < 100 && dueState(x.due)[0].startsWith('Quá')).length
  const fin = items.filter((x) => x.pct === 100).length
  const mine = S.submissions.filter((x) => x.who.startsWith(me.name))
  const rs = { grading: [Hourglass, 'Đang chấm', 'text-amber-600'], passed: [CheckCircle2, 'Đạt', 'text-emerald-600'], failed: [FileWarning, 'Chưa đạt', 'text-red-500'] }
  return (
    <div className="min-h-full">
      <TopOrg />
      <div className="px-8 py-8">
        <h1 className="font-display text-[34px] font-medium">Chào {me.short}</h1>
        <p className="mt-0.5 text-[15px] text-neutral-600">Các khóa được giao cho bạn. Bí chỗ nào thì bấm "Hỏi AI Tutor" trong khóa.</p>

        {(() => {
          // Mức Docker thật của Hà, đổi khi bài thi chính thức được chấm đạt
          const lv = (S.wf?.lv?.p6?.docker ?? TEAM.find((p) => p.id === 'p6').lv.docker), done = lv >= 2
          return (
            <div className="mt-7 flex items-center gap-4 rounded-2xl border border-line bg-gradient-to-r from-violet-50 to-sky-50 px-6 py-5">
              {done ? <CheckCircle2 size={22} className="text-emerald-600" /> : <Target size={22} className="text-violet-600" />}
              <div className="flex-1"><div className="text-[15px] font-semibold">{done ? 'Đã đạt mục tiêu: Container (Docker) mức 2' : 'Mục tiêu kỹ năng: Container (Docker) từ mức 1 lên mức 2'}</div><div className="mt-0.5 text-[13px] text-neutral-600">{done ? 'Bài thi chính thức đã đạt, mức mới đã cập nhật vào hồ sơ năng lực.' : 'Do quản lý giao từ kế hoạch năng lực. Thi chính thức đạt thì mức mới tự cập nhật vào hồ sơ năng lực.'}</div></div>
              <div className="w-40"><div className="h-2 rounded-full bg-white"><div className={`h-2 rounded-full ${done ? 'w-full bg-emerald-500' : 'w-2/3 bg-violet-500'}`} /></div><div className="mt-1 text-right text-[12px] text-neutral-600">{done ? '3/3 bước' : '2/3 bước · chờ chấm thi'}</div></div>
            </div>
          )
        })()}

        <div className="mt-10 flex items-baseline gap-4"><h2 className="text-[18px] font-semibold">Khóa của tôi ({items.length})</h2><span className="text-[13px] text-neutral-600">{items.length - fin} đang học · {fin} đã xong{late > 0 && <span className="font-semibold text-red-600"> · {late} quá hạn</span>}</span></div>
        <div className="mt-5 grid grid-cols-3 gap-5">
          {items.map(({ a, due, why, pct }) => {
            const [dl, dc] = pct === 100 ? ['Đã hoàn thành', 'text-emerald-700'] : dueState(due)
            return (
              <button key={a.id} onClick={() => nav(`/preview/${a.id}`)} className="card flex flex-col overflow-hidden text-left transition hover:shadow-pop">
                <Thumb img={a.img} className="h-36">{pct === 100 && <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 text-[12px] font-semibold text-emerald-700"><CheckCircle2 size={13} />Đã xong</span>}</Thumb>
                <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
                  <div className="flex items-center gap-1.5 text-[13px] font-medium"><FormatGlyph type={a.type} size={14} />{FORMATS[a.type].name}</div>
                  <div className="mt-1.5 text-[15px] font-semibold leading-snug">{a.title}</div>
                  <div className="mt-1 text-[12px] text-neutral-500">{why}</div>
                  <div className="flex-1" />
                  <div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 rounded-full bg-neutral-200"><div className="h-1.5 rounded-full bg-sky-500" style={{ width: `${pct}%` }} /></div><span className="text-[12px] font-semibold">{pct}%</span></div>
                  <div className="mt-3 flex items-center justify-between text-[13px]"><span className={`flex items-center gap-1 ${dc}`}><Clock size={13} />{dl}</span><span className="flex items-center gap-1 font-semibold">{pct === 0 ? 'Bắt đầu' : pct === 100 ? 'Xem lại' : 'Học tiếp'}<ArrowRight size={14} /></span></div>
                </div>
              </button>
            )
          })}
        </div>

        <h2 className="mt-10 text-[18px] font-semibold">Bài thi của tôi</h2>
        {mine.length === 0 ? <p className="mt-3 text-[14px] text-neutral-500">Chưa có bài thi nào. Bài kiểm tra nằm ở cuối mỗi khóa.</p> : (
          <table className="mt-3 w-full text-[14px]"><thead><tr className="border-b border-line text-left text-[13px] font-semibold text-neutral-600"><th className="px-4 py-3">Bài thi</th><th>Nộp lúc</th><th>Kết quả</th><th /></tr></thead>
            <tbody>{mine.map((x) => { const [I, l, c] = rs[x.status] || rs.grading; return (
              <tr key={x.id} className="border-b border-line">
                <td className="px-4 py-3 font-medium">{S.artifacts[x.art]?.title}</td><td className="text-neutral-600">{x.at}</td>
                <td><span className={`flex items-center gap-1.5 font-semibold ${c}`}><I size={15} />{l}</span>{x.status === 'grading' && <div className="text-[12px] text-neutral-500">Trắc nghiệm đã chấm tự động; tự luận chờ người chấm xác nhận</div>}</td>
                <td className="pr-4 text-right"><button onClick={() => nav(`/preview/${x.art}`)} className="btn-line btn-sm"><PlayCircle size={14} />Xem khóa</button></td>
              </tr>) })}</tbody></table>
        )}
      </div>
    </div>
  )
}
