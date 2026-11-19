// Một khóa học với người học: các mục con theo thứ tự học (Tài liệu nhanh → Slide → Tình huống → Video → Đề kiểm tra).
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, CheckCircle2, Hourglass, ArrowRight, Clock, Lock } from 'lucide-react'
import { useMe } from '../store'
import { FORMATS } from '../data'
import { Thumb, FormatIcon, Spinner } from '../ui'
import { DeviceBar } from './Common'
import { get } from '../api'

const DAY = 864e5
export function dueState(due) {
  if (!due) return ['Không có hạn', 'text-neutral-500']
  const n = Math.ceil((new Date(due) - Date.now()) / DAY)
  return n < 0 ? [`Quá hạn ${-n} ngày`, 'font-semibold text-red-600'] : n <= 2 ? [`Còn ${n} ngày`, 'font-semibold text-amber-600'] : [`Hạn ${new Date(due).toLocaleDateString('vi-VN')}`, 'text-neutral-500']
}

/** Trạng thái một mục con và lời mời hành động */
function itemState(x) {
  if (x.type === 'exam') {
    if (x.passed) return ['Đạt', 'text-emerald-700', 'Xem kết quả', true]
    if (x.grading) return ['Đang chấm', 'text-amber-600', 'Xem bài thi', false]
    if (x.best != null) return [`Chưa đạt · ${Math.round(x.best)}%`, 'text-red-600', 'Thi lại', false]
    return ['Chưa thi', 'text-neutral-500', 'Vào thi', false]
  }
  if (x.percent >= 100) return ['Đã xong', 'text-emerald-700', 'Xem lại', true]
  if (x.started || x.percent > 0) return [`Đã học ${x.percent}%`, 'text-sky-700', 'Học tiếp', false]
  return ['Chưa học', 'text-neutral-500', 'Bắt đầu', false]
}

export function CoursePage() {
  const { id, slug } = useParams()
  const nav = useNavigate()
  const { me } = useMe()
  const resolved = useQuery({ queryKey: ['kit-slug', slug], queryFn: () => get(`/learn/k/${slug}`), enabled: !!slug })
  const kid = id ?? resolved.data?.id
  const q = useQuery({ queryKey: ['course', kid], queryFn: () => get(`/learn/kit/${kid}`), enabled: !!kid, staleTime: 0 })
  const err = resolved.error ?? q.error
  const c = q.data
  const done = c ? c.items.filter((x) => itemState(x)[3]).length : 0
  const next = c?.items.find((x) => !itemState(x)[3])
  const open = (x) => nav(x.type === 'exam' ? `/exam/${x.id}` : `/learn/${x.id}`)
  const [dl, dc] = c ? (done === c.items.length ? ['Đã hoàn thành', 'text-emerald-700'] : dueState(c.due)) : []
  return (
    <div className="flex h-full flex-col">
      <DeviceBar devices={false} left={<><button className="icon-btn" onClick={() => nav(me.role === 'learner' ? '/learn' : -1)} aria-label="Quay lại"><ChevronLeft size={20} /></button><span className="h-7 w-px bg-line" /><span className="text-[15px] font-medium">{me.role === 'learner' ? 'Khóa học của tôi' : 'Bản người học thấy'}</span></>} />
      <div className="scroll-thin flex-1 overflow-y-auto">
        {err ? <div className="mx-auto max-w-[760px] px-6 py-14"><h1 className="font-lato text-[28px] font-black">Không mở được khóa học</h1><p className="mt-3 text-neutral-600">{err.message}</p></div>
          : !c ? <div className="grid h-full place-items-center"><Spinner /></div> : (
            <div className="mx-auto max-w-[880px] px-6 pb-20 pt-8">
              <Thumb img={c.img} className="h-48 rounded-2xl"><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-x-6 bottom-5 text-white"><div className="text-[13px] font-semibold uppercase tracking-wider text-orange-200">Khóa học · {c.items.length} phần</div><h1 className="mt-1 font-lato text-[32px] font-black leading-tight">{c.title}</h1></div></Thumb>
              {c.desc && <p className="mt-5 font-serif text-[17px] leading-relaxed text-neutral-800">{c.desc}</p>}
              <div className="mt-5 flex items-center gap-4 rounded-2xl border border-line px-5 py-4">
                <div className="flex-1"><div className="flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-neutral-200"><div className="h-2 rounded-full bg-sky-500" style={{ width: `${c.percent}%` }} /></div><span className="text-[14px] font-semibold">{c.percent}%</span></div>
                  <div className="mt-2 flex items-center gap-4 text-[13px]"><span>{done}/{c.items.length} phần đã xong</span><span className={`flex items-center gap-1 ${dc}`}><Clock size={13} />{dl}</span></div></div>
                {next && <button onClick={() => open(next)} className="btn-dark h-10 shrink-0">{itemState(next)[2]}: {FORMATS[next.type].name}<ArrowRight size={16} /></button>}
              </div>
              <div className="mt-6 divide-y divide-line rounded-2xl border border-line">
                {c.items.map((x, i) => { const [st, sc, cta, ok] = itemState(x); return (
                  <button key={x.id} onClick={() => open(x)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-neutral-50">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>{ok ? <CheckCircle2 size={16} /> : i + 1}</span>
                    <FormatIcon type={x.type} size={38} r={10} />
                    <div className="min-w-0 flex-1"><div className="text-[13px] font-medium text-neutral-500">{FORMATS[x.type].name}</div><div className="truncate text-[16px] font-semibold">{x.title}</div>{x.summary && <div className="truncate text-[13px] text-neutral-500">{x.summary}</div>}</div>
                    <span className={`flex shrink-0 items-center gap-1 text-[13px] ${sc}`}>{x.type === 'exam' && x.grading && <Hourglass size={13} />}{st}</span>
                    <span className="flex w-28 shrink-0 items-center justify-end gap-1 text-[14px] font-semibold">{cta}<ArrowRight size={14} /></span>
                  </button>) })}
              </div>
              {c.items.some((x) => x.type === 'exam') && <p className="mt-3 flex items-center gap-1.5 text-[13px] text-neutral-500"><Lock size={13} />AI Tutor tắt trong lúc thi chính thức. Học hết các phần trước rồi hãy vào thi.</p>}
            </div>
          )}
      </div>
    </div>
  )
}
