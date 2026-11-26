// Tìm việc bằng AI (bố cục theo Teal AI Job Search): ô hỏi ở giữa trang + gợi ý nhanh; trả lời bằng danh sách việc có giải thích.
// Bản demo hiểu câu hỏi bằng quy tắc (lib/extract.parseQuery), không gửi dữ liệu ra ngoài.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, Plus, PanelRight, Sparkles } from 'lucide-react'
import { parseQuery } from '../lib/extract.js'
import { SKILLS, DOMAINS } from '../data/skills.js'
import { GRADES } from '../lib/match.js'
import { WhyList, GapList } from '../components/Explain.jsx'
import { ScoreRing, buttonCls } from '../ui.jsx'
import { Logo } from '../Shell.jsx'
import { useMyRanking } from './useMyRanking.js'

const CHIPS = [
  ['Việc làm từ xa', 'Tìm việc làm từ xa'],
  ['Khám phá lựa chọn', 'Gợi ý những việc hợp với CV của tôi'],
  ['Việc gần tôi', null],
  ['Việc công nghệ', 'Việc công nghệ dùng React, Java hoặc Python'],
]
const TOP = 3

function answer(text, ranking, cv) {
  const q = parseQuery(text)
  const wanted = (job) => {
    const skills = job.criteria.groups.flatMap((g) => g.items).filter((i) => i.type === 'skill').map((i) => i.skill)
    const years = job.criteria.groups.flatMap((g) => g.items).filter((i) => i.type === 'years').flatMap((i) => i.domains)
    return q.skills.filter((x) => skills.includes(x)).length * 2 + q.domains.filter((d) => years.includes(d)).length
  }
  const list = ranking
    .filter(({ job }) => !q.remote || job.mode === 'Từ xa')
    .filter(({ job }) => !q.city || job.city === q.city || job.mode === 'Từ xa')
    .filter(({ job }) => !q.minSalary || job.salary.max >= q.minSalary)
    .map((r) => ({ ...r, rel: wanted(r.job) }))
    .filter((r) => !(q.skills.length || q.domains.length) || r.rel > 0)
    .sort((a, b) => b.rel - a.rel || b.m.raw - a.m.raw)
  const understood = [
    ...q.skills.map((x) => SKILLS[x].name), ...q.domains.map((d) => DOMAINS[d]),
    q.remote && 'Làm từ xa', q.hybrid && 'Hybrid', q.city, q.minSalary && `Lương tối đa ≥ ${q.minSalary} triệu`,
  ].filter(Boolean)
  return { text, understood, list: list.slice(0, TOP), total: list.length, cvName: cv.name }
}

function Reply({ r }) {
  return (
    <div className="flex gap-3">
      <Logo size={32} />
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-[15px] leading-relaxed">
          {r.understood.length ? <>Mình hiểu bạn cần: {r.understood.map((u) => <span key={u} className="mx-0.5 inline-block rounded bg-brand-50 px-1.5 text-sm text-brand-700">{u}</span>)}. </> : 'Mình chưa nhận ra điều kiện cụ thể, nên xếp theo mức phù hợp với CV của bạn. '}
          {r.total ? `Có ${r.total} việc khớp, đây là ${r.list.length} việc hợp nhất với CV của ${r.cvName}:` : 'Hiện chưa có việc nào khớp. Thử nới điều kiện, ví dụ bỏ thành phố hoặc mức lương.'}
        </p>
        {r.list.map(({ job, m }) => (
          <div key={job.id} className="rounded-md border border-line p-4">
            <div className="flex items-start gap-3">
              <ScoreRing value={m.score} grade={m.grade} size={44} stroke={4} />
              <div className="min-w-0 flex-1">
                <Link to={`/me/jobs/${job.id}`} className="font-semibold hover:underline">{job.title}</Link>
                <p className="text-sm text-mute">{GRADES[m.grade].label} · {job.dept} · {job.city} · {job.mode}</p>
              </div>
              <Link to={`/me/resume/match/${job.id}`} className={buttonCls('outline', 'sm')}>Đối chiếu</Link>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2"><WhyList m={m} limit={2} compact /><GapList m={m} limit={2} compact /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AiSearch() {
  const { cv, ranking } = useMyRanking()
  const [text, setText] = useState('')
  const [thread, setThread] = useState([])
  const [pane, setPane] = useState(false)
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread])
  const ask = (t) => {
    const msg = t.trim()
    if (!msg) return
    setThread((x) => [...x, answer(msg, ranking, cv)])
    setText('')
  }
  const box = (
    <form onSubmit={(e) => { e.preventDefault(); ask(text) }} className="rounded-xl border border-line bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} aria-label="Mô tả công việc bạn muốn"
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); ask(text) } }}
        placeholder="Kể về công việc lý tưởng của bạn" className="w-full resize-none border-0 bg-transparent px-1 text-[15px] placeholder:text-mute focus:outline-none" />
      <div className="mt-1 flex items-center justify-between">
        <Link to="/me/resume" aria-label="Cập nhật CV" title="Cập nhật CV" className="flex h-8 w-8 items-center justify-center rounded-md border border-brand-200 text-brand-600 hover:bg-brand-50"><Plus size={17} /></Link>
        <button type="submit" disabled={!text.trim()} aria-label="Gửi" className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white disabled:bg-soft disabled:text-ink/30"><ArrowUp size={17} /></button>
      </div>
    </form>
  )

  return (
    <div className="flex min-h-screen">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-end border-b border-line px-4 sm:px-6">
          <button type="button" onClick={() => setPane((x) => !x)} aria-pressed={pane} aria-label="Lịch sử hỏi" title="Lịch sử hỏi" className="rounded-md p-2 text-ink/70 hover:bg-soft"><PanelRight size={19} /></button>
        </div>
        {thread.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
            <h1 className="text-center text-[28px] font-semibold tracking-tight">Hãy kể về bước tiếp theo trong sự nghiệp</h1>
            <div className="mt-7 w-full max-w-[720px]">{box}</div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {CHIPS.map(([label, q]) => (
                <button key={label} type="button" onClick={() => ask(q ?? `Việc ở ${cv.city}`)} className="h-10 rounded-md border border-line px-5 text-[15px] text-ink/80 hover:bg-soft">{label}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="mx-auto w-full max-w-[760px] flex-1 space-y-6 px-4 py-8">
              {thread.map((r, i) => (
                <div key={i} id={`hoi-${i}`} className="scroll-mt-6 space-y-4">
                  <p className="ml-auto w-fit max-w-[80%] rounded-2xl bg-soft px-4 py-2.5 text-[15px]">{r.text}</p>
                  <Reply r={r} />
                </div>
              ))}
              <div ref={end} />
            </div>
            <div className="sticky bottom-0 border-t border-line bg-white px-4 py-4"><div className="mx-auto max-w-[760px]">{box}</div></div>
          </div>
        )}
        <p className="pb-4 text-center text-xs text-mute">Bản demo: câu hỏi được hiểu ngay trên trình duyệt bằng quy tắc, không gửi đi đâu.</p>
      </div>
      {pane && (
        <aside className="hidden w-72 shrink-0 border-l border-line p-4 md:block">
          <p className="flex items-center gap-1.5 text-sm font-semibold"><Sparkles size={15} aria-hidden />Đã hỏi trong phiên này</p>
          {thread.length ? (
            <ul className="mt-3 space-y-1">{thread.map((r, i) => <li key={i}><button type="button" title={r.text} onClick={() => document.getElementById(`hoi-${i}`)?.scrollIntoView({ behavior: 'smooth' })} className="w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-soft">{r.text}</button></li>)}</ul>
          ) : <p className="mt-3 text-sm text-mute">Chưa có câu hỏi nào.</p>}
        </aside>
      )}
    </div>
  )
}
